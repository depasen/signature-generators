import { type NextRequest, NextResponse } from "next/server"

/* ------------------------------------------------------------------ *
 * Uploads a teammate headshot to a brand assets repo via the GitHub
 * Contents API, then returns the hosted jsDelivr URL.
 *
 * Supports two brands via the `brand` form field:
 *   - "pip" -> depasen/pip-brand-assets  (default)
 *   - "ib"  -> depasen/ib-brand-assets
 *
 * Requires env var PIP_ASSETS_GITHUB_TOKEN — a token with Contents:
 * Read and write on BOTH depasen/pip-brand-assets and
 * depasen/ib-brand-assets.
 * ------------------------------------------------------------------ */

const OWNER = "depasen"
const BRANCH = "main"

const BRANDS: Record<string, { repo: string; prefix: string }> = {
  pip: { repo: "pip-brand-assets", prefix: "pip-headshot" },
  ib: { repo: "ib-brand-assets", prefix: "ib-headshot" },
}

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"])
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

/* Turn a person's name into a safe, unique file slug. */
function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
  return base || "teammate"
}

export async function POST(request: NextRequest) {
  const token = process.env.PIP_ASSETS_GITHUB_TOKEN
  if (!token) {
    return NextResponse.json(
      { error: "Server is missing PIP_ASSETS_GITHUB_TOKEN. Add it in Project Settings." },
      { status: 500 },
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form submission." }, { status: 400 })
  }

  const file = form.get("file")
  const name = String(form.get("name") || "").trim()
  const brandKey = String(form.get("brand") || "pip").trim().toLowerCase()
  const brand = BRANDS[brandKey] || BRANDS.pip
  const REPO = brand.repo

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image file was provided." }, { status: 400 })
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Please upload a JPG, PNG, or WebP image." }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image is too large. Please keep it under 5 MB." }, { status: 400 })
  }

  const ext = EXT[file.type]
  // Unique-ish filename: name slug + short timestamp so re-uploads don't clash.
  const stamp = Date.now().toString(36).slice(-5)
  const filename = `${brand.prefix}-${slugify(name)}-${stamp}.${ext}`
  const path = filename

  const buffer = Buffer.from(await file.arrayBuffer())
  const contentBase64 = buffer.toString("base64")

  const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`
  const putBody = JSON.stringify({
    message: `Add headshot for ${name || "teammate"} (signature generator)`,
    content: contentBase64,
    branch: BRANCH,
  })

  // GitHub serializes commits per branch and intermittently returns 503 ("No
  // server is currently available to service your request") — or 409/429 — when
  // uploads land close together. These are transient, so retry with backoff.
  const RETRY_ON = new Set([409, 429, 500, 502, 503])
  let commit: Response = new Response(null, { status: 500 })
  for (let attempt = 1; attempt <= 6; attempt++) {
    commit = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: putBody,
    })
    if (commit.ok || !RETRY_ON.has(commit.status) || attempt === 6) break
    // Jittered backoff: simultaneous uploads must NOT retry in lockstep, or they
    // just re-collide on GitHub's per-branch commit lock. Randomize each wait.
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 700 * attempt))
  }

  if (!commit.ok) {
    const detail = await commit.text()
    console.log("[v0] GitHub upload failed:", commit.status, detail)
    let ghMsg = ""
    try {
      ghMsg = JSON.parse(detail)?.message || ""
    } catch {
      ghMsg = detail.slice(0, 140)
    }
    const friendly =
      commit.status === 401 || commit.status === 403
        ? `The server's GitHub token is invalid or lacks write access to ${REPO}.`
        : `Could not upload to GitHub (${commit.status}${ghMsg ? `: ${ghMsg}` : ""}). Please try again.`
    return NextResponse.json({ error: friendly, githubStatus: commit.status }, { status: 502 })
  }

  // jsDelivr serves the committed file (may take a few seconds to propagate).
  const cdnUrl = `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@${BRANCH}/${path}`
  const rawUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${path}`

  return NextResponse.json({ url: cdnUrl, rawUrl, filename: path })
}
