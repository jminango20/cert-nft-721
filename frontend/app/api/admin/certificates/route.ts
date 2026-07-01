import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";
const API_KEY = process.env.API_KEY ?? "";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/certificates`, {
      headers: {
        "x-api-key": API_KEY,
      },
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
