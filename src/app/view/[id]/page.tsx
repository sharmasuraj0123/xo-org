import { SiteHeader } from "@/components/site-header"
import { SessionView } from "./session-view"

export default async function ViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ archived?: string }>
}) {
  const { id } = await params
  const { archived } = await searchParams

  return (
    <>
      <SiteHeader title="Session" />
      <SessionView sessionId={id} archivedFileId={archived} />
    </>
  )
}
