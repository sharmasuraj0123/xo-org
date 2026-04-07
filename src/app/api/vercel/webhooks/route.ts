import { NextResponse } from "next/server"
import { verifyVercelWebhook } from "../../lib/vercel"
import { updateConnectionStatus } from "../../lib/vercel-store"
import { appendMessage, notifySubscribers } from "../../lib/bridge"

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get("x-vercel-signature")

  const valid = await verifyVercelWebhook(body, signature)
  if (!valid) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 })
  }

  const payload = JSON.parse(body)
  const eventType = payload.type as string

  switch (eventType) {
    case "integration-configuration.removed": {
      const configId = payload.payload?.configuration?.id as string
      if (configId) updateConnectionStatus(configId, "uninstalled")
      break
    }
    case "deployment.created":
    case "deployment.ready":
    case "deployment.error":
    case "deployment.canceled": {
      const dep = payload.payload?.deployment ?? {}
      const status = eventType.split(".")[1]
      const msg = appendMessage("vercel", "#devops", "tell", {
        text: `Deployment ${status}: ${dep.name ?? "unknown"} → ${dep.url ?? ""}`,
        metadata: {
          vercelEvent: eventType,
          deploymentId: dep.id,
          url: dep.url,
          projectId: dep.projectId,
          status,
        },
      })
      notifySubscribers(msg)
      break
    }
    case "project.created":
    case "project.removed": {
      const project = payload.payload?.project ?? {}
      const action = eventType.split(".")[1]
      const msg = appendMessage("vercel", "#devops", "tell", {
        text: `Project ${action}: ${project.name ?? "unknown"}`,
        metadata: { vercelEvent: eventType, projectId: project.id, projectName: project.name },
      })
      notifySubscribers(msg)
      break
    }
  }

  return NextResponse.json({ received: true })
}
