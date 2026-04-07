import { NextResponse } from "next/server"
import { testEnvironment } from "../../../lib/openclaw-adapter"

/**
 * POST /api/openclaw/agents/test-environment
 *
 * Test if a Gateway URL is reachable and has active sessions.
 * Matches Paperclip's "Test environment" button.
 *
 * Body: { gatewayUrl?: string, gatewayToken?: string }
 */
export async function POST(req: Request) {
  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch { /* use defaults */ }

  const { gatewayUrl, gatewayToken } = body as {
    gatewayUrl?: string
    gatewayToken?: string
  }

  const result = await testEnvironment(gatewayUrl, gatewayToken)

  return NextResponse.json({
    ok: true,
    data: result,
  })
}
