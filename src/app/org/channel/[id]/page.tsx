import { SiteHeader } from "@/components/site-header"
import { ChannelChat } from "./chat"

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <>
      <SiteHeader />
      <ChannelChat channelName={id} />
    </>
  )
}
