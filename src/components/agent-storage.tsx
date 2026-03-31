"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  CodeIcon,
  FileTextIcon,
  ImageIcon,
  DatabaseIcon,
  ArchiveIcon,
  HardDriveIcon,
} from "lucide-react"

const STORAGE_CATEGORIES = [
  { name: "Code", icon: CodeIcon, size: "1.2 GB", files: 847, pct: 40 },
  { name: "Documents", icon: FileTextIcon, size: "680 MB", files: 234, pct: 23 },
  { name: "Images", icon: ImageIcon, size: "520 MB", files: 156, pct: 17 },
  { name: "Data", icon: DatabaseIcon, size: "410 MB", files: 89, pct: 14 },
  { name: "Archives", icon: ArchiveIcon, size: "190 MB", files: 42, pct: 6 },
]

export function AgentStorage() {
  const totalSize = "3.0 GB"
  const totalFiles = STORAGE_CATEGORIES.reduce((sum, c) => sum + c.files, 0)

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Storage</CardTitle>
        <CardDescription>
          {totalSize} used across {totalFiles.toLocaleString()} files
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* Usage bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: "60%" }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>3.0 GB used</span>
          <span>5.0 GB total</span>
        </div>

        {/* Category breakdown */}
        <div className="flex flex-col gap-0">
          {STORAGE_CATEGORIES.map((cat, i) => (
            <div key={cat.name}>
              {i > 0 && <Separator />}
              <div className="flex items-center gap-3 py-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60 ring-1 ring-foreground/5">
                  <cat.icon className="size-3.5 text-muted-foreground" />
                </div>
                <div className="flex flex-1 flex-col min-w-0">
                  <span className="text-sm font-medium">{cat.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {cat.files} files
                  </span>
                </div>
                <Badge variant="secondary" className="shrink-0 tabular-nums">
                  {cat.size}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
