-- Migration: Dashboard Analytics RPCs to offload in-memory calculation

-- 1. Global Dashboard Stats (Bypasses RLS locally to get exact system totals)
CREATE OR REPLACE FUNCTION public.get_global_dashboard_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
WITH
  sys_counts AS (
    SELECT
      (SELECT count(*) FROM contracts) AS total_contracts,
      (SELECT count(*) FROM contracts WHERE is_archived = false) AS active_contracts,
      (SELECT count(*) FROM profiles WHERE is_active = true) AS total_users,
      (SELECT count(*) FROM import_batches) AS total_batches
  ),
  dispo_counts AS (
    SELECT
      count(*) AS total_dispositions,
      count(*) FILTER (WHERE md.name = 'Contactable') AS contactable,
      count(*) FILTER (WHERE md.name = 'Non-Contactable') AS non_contactable,
      count(*) FILTER (WHERE sd.name = 'Promise to Pay') AS ptp,
      count(*) FILTER (WHERE sd.name = 'Agree to Pay') AS agree_to_pay,
      count(*) FILTER (WHERE sd.name = 'Part Paid') AS part_paid,
      count(*) FILTER (WHERE sd.name = 'Broken PTP') AS broken_ptp,
      count(*) FILTER (WHERE sd.name IN ('Call Back', 'Callback Scheduled')) AS callback
    FROM dispositions d
    LEFT JOIN main_dispositions md ON d.main_disposition_id = md.id
    LEFT JOIN sub_dispositions sd ON d.sub_disposition_id = sd.id
  ),
  weeks AS (
    SELECT generate_series(0, 3) AS week_offset
  ),
  ptp_analysis_raw AS (
    SELECT 
      w.week_offset,
      COUNT(d.id) FILTER (WHERE sd.name = 'Promise to Pay') AS ptp_count,
      COALESCE(SUM(CAST(d.dynamic_data->>'ptp_amount' AS NUMERIC)) FILTER (WHERE sd.name = 'Promise to Pay'), 0) AS ptp_value,
      COUNT(d.id) FILTER (WHERE md.name = 'Contactable') AS contactable_count
    FROM weeks w
    LEFT JOIN dispositions d ON 
      d.created_at >= (current_date - interval '28 days') AND
      FLOOR(EXTRACT(epoch FROM (current_date - d.created_at)) / 86400 / 7) = w.week_offset
    LEFT JOIN main_dispositions md ON d.main_disposition_id = md.id
    LEFT JOIN sub_dispositions sd ON d.sub_disposition_id = sd.id
    GROUP BY w.week_offset
  ),
  ptp_analysis AS (
    SELECT 
      COALESCE(json_agg(
        json_build_object(
          'week', 'Week ' || (4 - week_offset),
          'ptpCount', ptp_count,
          'ptpValue', ptp_value,
          'contactable', contactable_count
        ) ORDER BY week_offset DESC
      ), '[]'::json) AS ptp_analysis_json
    FROM ptp_analysis_raw
  ),
  leaderboard_raw AS (
    SELECT
      p.id as employee_id,
      p.full_name as name,
      p.role,
      COUNT(d.id) as calls,
      COALESCE(SUM(CAST(d.dynamic_data->>'ptp_amount' AS NUMERIC)) FILTER (WHERE sd.name = 'Promise to Pay'), 0) as ptp_value
    FROM profiles p
    LEFT JOIN dispositions d ON d.employee_id = p.id AND d.created_at >= current_date
    LEFT JOIN sub_dispositions sd ON d.sub_disposition_id = sd.id
    WHERE p.is_active = true
    GROUP BY p.id, p.full_name, p.role
    HAVING COUNT(d.id) > 0 OR COALESCE(SUM(CAST(d.dynamic_data->>'ptp_amount' AS NUMERIC)) FILTER (WHERE sd.name = 'Promise to Pay'), 0) > 0
    ORDER BY ptp_value DESC, calls DESC
  ),
  leaderboard AS (
    SELECT
      COALESCE(json_agg(
        json_build_object(
          'name', name,
          'team', CASE WHEN role::text = 'Employee' THEN 'South Team Operations' ELSE role::text END,
          'calls', calls,
          'ptpValue', ptp_value
        )
      ), '[]'::json) AS leaderboard_json
    FROM leaderboard_raw
  )
SELECT
  json_build_object(
    'system', (SELECT row_to_json(sys_counts) FROM sys_counts),
    'dispositions', (SELECT row_to_json(dispo_counts) FROM dispo_counts),
    'ptpAnalysis', (SELECT ptp_analysis_json FROM ptp_analysis),
    'leaderboard', (SELECT leaderboard_json FROM leaderboard)
  );
$$;

-- 2. Employee Dashboard Stats
CREATE OR REPLACE FUNCTION public.get_employee_dashboard_stats(emp_id UUID)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
WITH
  my_calls AS (
    SELECT
      count(*) AS total_calls,
      count(*) FILTER (WHERE created_at >= current_date) AS calls_today
    FROM dispositions
    WHERE employee_id = emp_id
  ),
  my_contactable AS (
    SELECT
      count(*) AS contactable_count
    FROM dispositions d
    JOIN main_dispositions md ON d.main_disposition_id = md.id
    WHERE d.employee_id = emp_id AND md.name = 'Contactable'
  ),
  my_ptps AS (
    SELECT
      count(*) AS ptp_count,
      COALESCE(SUM(CAST(d.dynamic_data->>'ptp_amount' AS NUMERIC)), 0) AS ptp_value
    FROM dispositions d
    JOIN sub_dispositions sd ON d.sub_disposition_id = sd.id
    WHERE d.employee_id = emp_id 
      AND sd.name = 'Promise to Pay'
      AND NULLIF(d.dynamic_data->>'ptp_date', '') IS NOT NULL
      AND CAST(NULLIF(d.dynamic_data->>'ptp_date', '') AS DATE) >= current_date
  ),
  my_waivers AS (
    SELECT
      count(*) FILTER (WHERE status = 'Pending') AS pending_count,
      count(*) FILTER (WHERE status = 'Approved') AS approved_count,
      count(*) FILTER (WHERE status = 'Rejected') AS rejected_count
    FROM waiver_requests
    WHERE employee_id = emp_id
  ),
  alloc_count AS (
    SELECT count(*) AS total_active_contracts FROM contracts WHERE is_archived = false
  )
SELECT
  json_build_object(
    'myCallsTotal', (SELECT total_calls FROM my_calls),
    'myCallsToday', (SELECT calls_today FROM my_calls),
    'myContactable', (SELECT contactable_count FROM my_contactable),
    'myPtpCount', (SELECT ptp_count FROM my_ptps),
    'myPtpValue', (SELECT ptp_value FROM my_ptps),
    'myWaiversPending', (SELECT pending_count FROM my_waivers),
    'myWaiversApproved', (SELECT approved_count FROM my_waivers),
    'myWaiversRejected', (SELECT rejected_count FROM my_waivers),
    'myAllocatedCount', (SELECT total_active_contracts FROM alloc_count)
  );
$$;
