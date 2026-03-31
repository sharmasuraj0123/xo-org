import { SiteHeader } from "@/components/site-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileChartColumnIcon } from "lucide-react"

const reports = [
  { name: "Q1 Agent Performance Summary", status: "completed", generatedBy: "Aria", date: "2d ago", pages: 12 },
  { name: "Deployment Pipeline Analysis", status: "completed", generatedBy: "Rex", date: "5d ago", pages: 8 },
  { name: "Security Audit — March 2026", status: "in_progress", generatedBy: "Kira", date: "1w ago", pages: 0 },
  { name: "Platform Reliability Report", status: "completed", generatedBy: "Aria", date: "2w ago", pages: 15 },
  { name: "Design System Inventory", status: "draft", generatedBy: "Lux", date: "3w ago", pages: 6 },
]

const STATUS_STYLE = {
  completed: "border-primary/30 text-primary",
  in_progress: "border-blue-400/30 text-blue-400",
  draft: "border-border text-muted-foreground",
}

export default function AgentSoloReportsPage() {
  return (
    <>
      <SiteHeader title="Reports" />
      <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Generated Reports</CardTitle>
            <CardDescription>Reports created by this agent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {reports.map((report) => (
                <div key={report.name} className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-muted/30 transition-colors">
                  <FileChartColumnIcon className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{report.name}</div>
                    <div className="text-xs text-muted-foreground">by {report.generatedBy}{report.pages > 0 ? ` · ${report.pages} pages` : ""}</div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_STYLE[report.status as keyof typeof STATUS_STYLE]}`}>
                    {report.status.replace("_", " ")}
                  </Badge>
                  <span className="text-xs text-muted-foreground/50 w-12 text-right">{report.date}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
