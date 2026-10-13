import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasPublicUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!hasPublicUrl || !hasAnonKey) {
    return NextResponse.json(
      {
        status: "misconfigured",
        service: "goalcryst-crm-tcl-2",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      status: "ok",
      service: "goalcryst-crm-tcl-2",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

