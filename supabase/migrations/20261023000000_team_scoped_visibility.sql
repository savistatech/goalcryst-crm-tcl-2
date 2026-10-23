-- ============================================================================
-- Team-scoped visibility for follow-ups, reports and the supervisor dashboard.
--   Admin              -> everyone
--   everyone else      -> themselves + everyone below them in the reporting tree
--                         (profiles.reporting_to, set on the Org Chart page)
-- Contract call history (Customer 360) is intentionally NOT restricted.
-- ============================================================================

-- Returns the employee ids the current user may see, or NULL meaning "everyone".
-- Inactive subordinates are included so their past follow-ups stay visible.
CREATE OR REPLACE FUNCTION public.visible_employee_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE me AS (
    SELECT id, role FROM public.profiles WHERE id = auth.uid() AND is_active = true
  ),
  tree AS (
    SELECT id FROM me
    UNION
    SELECT p.id FROM public.profiles p JOIN tree t ON p.reporting_to = t.id
  )
  SELECT CASE
    WHEN (SELECT role FROM me) = 'Admin'::public.user_role THEN NULL
    ELSE COALESCE((SELECT array_agg(id) FROM tree), ARRAY[]::UUID[])
  END;
$$;

REVOKE ALL ON FUNCTION public.visible_employee_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.visible_employee_ids() TO authenticated, service_role;

-- Dashboard stats, now limited to the caller's scope. Contract and import
-- counts stay portfolio-wide; call, PTP, leaderboard and user counts are scoped.
CREATE OR REPLACE FUNCTION public.get_global_dashboard_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
WITH
  scope AS (
    SELECT public.visible_employee_ids() AS ids
  ),
  scoped_dispositions AS (
    SELECT d.*
    FROM dispositions d, scope s
    WHERE s.ids IS NULL OR d.employee_id = ANY(s.ids)
  ),
  sys_counts AS (
    SELECT
      (SELECT count(*) FROM contracts) AS total_contracts,
      (SELECT count(*) FROM contracts WHERE is_archived = false) AS active_contracts,
      (SELECT count(*) FROM profiles p, scope s
        WHERE p.is_active = true AND (s.ids IS NULL OR p.id = ANY(s.ids))) AS total_users,
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
    FROM scoped_dispositions d
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
    LEFT JOIN scoped_dispositions d ON
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
    CROSS JOIN scope s
    LEFT JOIN dispositions d ON d.employee_id = p.id AND d.created_at >= current_date
    LEFT JOIN sub_dispositions sd ON d.sub_disposition_id = sd.id
    WHERE p.is_active = true AND (s.ids IS NULL OR p.id = ANY(s.ids))
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
