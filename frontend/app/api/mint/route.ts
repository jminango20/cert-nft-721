import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";
const API_KEY = process.env.API_KEY ?? "";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";

    // Multipart form-data: forward as-is with API key injected
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();

      const res = await fetch(`${BACKEND_URL}/api/mint`, {
        method: "POST",
        headers: {
          "x-api-key": API_KEY,
          // Do NOT set Content-Type — fetch sets it automatically with boundary
        },
        body: formData,
      });

      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    // JSON body (legacy path)
    const body = await req.json();
    const res = await fetch(`${BACKEND_URL}/api/mint`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
