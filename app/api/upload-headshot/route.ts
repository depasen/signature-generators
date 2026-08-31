import { type NextRequest, NextResponse } from "next/server"
import {
  PublicationError,
  publishSignatureAsset,
} from "../../../lib/signature-publication.mjs"

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_BYTES = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form submission." }, { status: 400 })
  }

  const file = form.get("file")
  const rawBrand = form.get("brand")
  // Every caller binds the request to an exact brand. There is no implicit PIP
  // fallback because a missing field must never redirect a write across brands.
  const brandKey = rawBrand === null ? "" : String(rawBrand).trim().toLowerCase()

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image file was provided." }, { status: 400 })
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Please upload a JPG, PNG, or WebP image." }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image is too large. Please keep it under 5 MB." }, { status: 400 })
  }

  try {
    const result = await publishSignatureAsset({
      brandKey,
      bytes: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
    })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof PublicationError) {
      return NextResponse.json(
        { error: error.message, code: error.code, ...error.details },
        { status: error.status },
      )
    }
    return NextResponse.json(
      { error: "Signature asset publication failed before authoritative read-back.", code: "publication_failed" },
      { status: 502 },
    )
  }
}
