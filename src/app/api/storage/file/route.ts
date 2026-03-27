import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"

const STORAGE_ROOT = process.env.XO_STORAGE_ROOT || path.join(process.cwd(), "workspace")

const MIME_TYPES: Record<string, string> = {
  md: "text/markdown",
  txt: "text/plain",
  json: "application/json",
  ts: "text/typescript",
  tsx: "text/typescript",
  js: "application/javascript",
  jsx: "application/javascript",
  py: "text/x-python",
  yml: "text/yaml",
  yaml: "text/yaml",
  toml: "text/toml",
  csv: "text/csv",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
  gif: "image/gif",
  webp: "image/webp",
  zip: "application/zip",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

export async function GET(request: NextRequest) {
  const relativePath = request.nextUrl.searchParams.get("path") || ""

  if (!relativePath) {
    return NextResponse.json({ error: "No path specified" }, { status: 400 })
  }

  const filePath = path.resolve(STORAGE_ROOT, relativePath)
  if (!filePath.startsWith(path.resolve(STORAGE_ROOT))) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  try {
    const stat = await fs.promises.stat(filePath)
    if (stat.isDirectory()) {
      return NextResponse.json({ error: "Cannot download a directory" }, { status: 400 })
    }

    const buffer = await fs.promises.readFile(filePath)
    const ext = path.extname(filePath).slice(1)
    const contentType = MIME_TYPES[ext] || "application/octet-stream"

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${path.basename(filePath)}"`,
        "Content-Length": String(buffer.length),
      },
    })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 })
  }
}
