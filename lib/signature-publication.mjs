import { createHash } from "node:crypto"

const OWNER = "depasen"
const BRANCH = "main"

// A token is bound to one brand and one exact repository. Do not replace these
// with a shared token: independent credentials are the runtime least-privilege
// boundary between the businesses.
export const PUBLICATION_TARGETS = Object.freeze({
  pip: Object.freeze({
    brand: "pip",
    owner: OWNER,
    repo: "pip-brand-assets",
    branch: BRANCH,
    dir: "",
    prefix: "pip-headshot",
    tokenEnv: "PIP_SIGNATURE_ASSETS_GITHUB_TOKEN",
  }),
  ib: Object.freeze({
    brand: "ib",
    owner: OWNER,
    repo: "ib-brand-assets",
    branch: BRANCH,
    dir: "",
    prefix: "ib-headshot",
    tokenEnv: "IB_SIGNATURE_ASSETS_GITHUB_TOKEN",
  }),
  es: Object.freeze({
    brand: "es",
    available: false,
    reason:
      "Effortless Sleep signature assets are private. No authorized public publication target is configured.",
  }),
})

const EXTENSIONS = Object.freeze({
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
})

export class PublicationError extends Error {
  constructor(message, status = 502, code = "publication_failed", details = {}) {
    super(message)
    this.name = "PublicationError"
    this.status = status
    this.code = code
    this.details = details
  }
}

export function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex")
}

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/")
}

function githubHeaders(token, accept = "application/vnd.github+json") {
  return {
    Authorization: `Bearer ${token}`,
    Accept: accept,
    "X-GitHub-Api-Version": "2022-11-28",
  }
}

function exactEqual(left, right) {
  return left.length === right.length && left.equals(right)
}

async function responseBytes(response) {
  return Buffer.from(await response.arrayBuffer())
}

async function readExactPath({ fetchImpl, target, token, path }) {
  const url = `https://api.github.com/repos/${target.owner}/${target.repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(target.branch)}`
  const response = await fetchImpl(url, {
    method: "GET",
    headers: githubHeaders(token, "application/vnd.github.raw"),
    cache: "no-store",
  })
  if (response.status === 404) return { state: "absent" }
  if (!response.ok) {
    throw new PublicationError(
      `Could not reconcile ${target.repo}/${path} (${response.status}).`,
      503,
      "reconciliation_unavailable",
      { githubStatus: response.status, path },
    )
  }
  return { state: "present", bytes: await responseBytes(response) }
}

async function createOrReconcileExact({
  fetchImpl,
  target,
  token,
  path,
  expectedBytes,
  message,
  kind,
}) {
  const before = await readExactPath({ fetchImpl, target, token, path })
  if (before.state === "present") {
    if (!exactEqual(before.bytes, expectedBytes)) {
      throw new PublicationError(
        `Existing ${kind} does not match this request.`,
        409,
        `${kind}_conflict`,
        { path },
      )
    }
    return { state: "already_present" }
  }

  const url = `https://api.github.com/repos/${target.owner}/${target.repo}/contents/${encodePath(path)}`
  let response
  let networkFailure = null
  try {
    response = await fetchImpl(url, {
      method: "PUT",
      headers: {
        ...githubHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        content: expectedBytes.toString("base64"),
        branch: target.branch,
      }),
    })
  } catch (error) {
    networkFailure = error
  }

  // A timeout, 5xx, 409, or 422 may follow a successful external write. Read
  // the durable target before deciding whether a retry is safe.
  const after = await readExactPath({ fetchImpl, target, token, path })
  if (after.state === "present") {
    if (!exactEqual(after.bytes, expectedBytes)) {
      throw new PublicationError(
        `Reconciled ${kind} does not match this request.`,
        409,
        `${kind}_conflict`,
        { path },
      )
    }
    return { state: response?.ok ? "created" : "reconciled_after_ambiguous_write" }
  }

  if (networkFailure || !response || response.status >= 500) {
    throw new PublicationError(
      `The ${kind} outcome is still unknown. Do not retry until reconciliation succeeds.`,
      503,
      "outcome_unknown",
      { path },
    )
  }

  let githubMessage = ""
  try {
    githubMessage = (await response.json())?.message || ""
  } catch {
    // The status and typed state are sufficient; never echo an arbitrary body.
  }
  throw new PublicationError(
    `GitHub rejected the ${kind} write (${response.status}${githubMessage ? `: ${githubMessage}` : ""}).`,
    response.status === 401 || response.status === 403 ? 503 : 502,
    "github_write_rejected",
    { githubStatus: response.status, path },
  )
}

async function assertPublicTarget({ fetchImpl, target, token }) {
  const response = await fetchImpl(`https://api.github.com/repos/${target.owner}/${target.repo}`, {
    method: "GET",
    headers: githubHeaders(token),
    cache: "no-store",
  })
  if (!response.ok) {
    throw new PublicationError(
      `The ${target.brand.toUpperCase()} publication identity cannot read its bound target (${response.status}).`,
      503,
      "target_access_unavailable",
      { githubStatus: response.status, target: `${target.owner}/${target.repo}` },
    )
  }
  const metadata = await response.json()
  if (metadata.private !== false) {
    throw new PublicationError(
      `The bound ${target.brand.toUpperCase()} target is not publicly readable.`,
      503,
      "public_target_not_verified",
      { target: `${target.owner}/${target.repo}` },
    )
  }
}

async function latestPathCommit({ fetchImpl, target, token, path }) {
  const params = new URLSearchParams({
    path,
    sha: target.branch,
    per_page: "1",
  })
  const response = await fetchImpl(
    `https://api.github.com/repos/${target.owner}/${target.repo}/commits?${params}`,
    { method: "GET", headers: githubHeaders(token), cache: "no-store" },
  )
  if (!response.ok) {
    throw new PublicationError(
      `Could not resolve the immutable publication identity (${response.status}).`,
      503,
      "commit_identity_unavailable",
      { githubStatus: response.status, path },
    )
  }
  const commits = await response.json()
  const commitSha = commits?.[0]?.sha
  if (!/^[0-9a-f]{40}$/.test(commitSha || "")) {
    throw new PublicationError(
      "GitHub did not return an exact publication commit identity.",
      503,
      "commit_identity_unavailable",
      { path },
    )
  }
  return commitSha
}

async function verifyPublicBytes({ fetchImpl, target, commitSha, path, expectedBytes, expectedSha256 }) {
  const rawUrl = `https://raw.githubusercontent.com/${target.owner}/${target.repo}/${commitSha}/${encodePath(path)}`
  const response = await fetchImpl(rawUrl, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/octet-stream" },
  })
  if (!response.ok) {
    throw new PublicationError(
      `The committed asset is not publicly readable (${response.status}).`,
      503,
      "public_readback_unavailable",
      { publicStatus: response.status, commitSha, path },
    )
  }
  const actualBytes = await responseBytes(response)
  const actualSha256 = sha256Hex(actualBytes)
  if (!exactEqual(actualBytes, expectedBytes) || actualSha256 !== expectedSha256) {
    throw new PublicationError(
      "Public read-back bytes do not match the requested asset.",
      502,
      "public_readback_mismatch",
      {
        commitSha,
        path,
        expectedSha256,
        actualSha256,
        expectedBytes: expectedBytes.length,
        actualBytes: actualBytes.length,
      },
    )
  }
  return { rawUrl, actualSha256, byteLength: actualBytes.length }
}

export async function publishSignatureAsset({
  brandKey,
  bytes,
  contentType,
  fetchImpl = fetch,
  env = process.env,
}) {
  const key = String(brandKey || "").trim().toLowerCase()
  const target = PUBLICATION_TARGETS[key]
  if (!target) {
    throw new PublicationError(
      `Unknown brand "${key}". Expected one of: ${Object.keys(PUBLICATION_TARGETS).join(", ")}.`,
      400,
      "unknown_brand",
    )
  }
  if (target.available === false) {
    throw new PublicationError(target.reason, 503, "public_target_unavailable", { brand: key })
  }

  const extension = EXTENSIONS[contentType]
  if (!extension) {
    throw new PublicationError("Please upload a JPG, PNG, or WebP image.", 400, "unsupported_media_type")
  }
  const content = Buffer.from(bytes)
  const token = env[target.tokenEnv]
  if (!token) {
    throw new PublicationError(
      `${target.tokenEnv} is not configured for ${key.toUpperCase()}.`,
      503,
      "brand_identity_unavailable",
      { brand: key, tokenEnv: target.tokenEnv },
    )
  }
  const sharedWith = Object.values(PUBLICATION_TARGETS).find(
    (candidate) =>
      candidate.tokenEnv &&
      candidate.tokenEnv !== target.tokenEnv &&
      env[candidate.tokenEnv] &&
      env[candidate.tokenEnv] === token,
  )
  if (sharedWith) {
    throw new PublicationError(
      "The configured publication identity is shared across brands.",
      503,
      "shared_brand_identity",
      { brand: key, otherBrand: sharedWith.brand },
    )
  }

  await assertPublicTarget({ fetchImpl, target, token })

  const contentSha256 = sha256Hex(content)
  const filename = `${target.prefix}-${contentSha256}.${extension}`
  const assetPath = target.dir ? `${target.dir}/${filename}` : filename
  const reservationPath = `.signature-publication-reservations/${key}/${contentSha256}.json`
  const reservation = Buffer.from(
    `${JSON.stringify({
      schema: "signature-asset-publication-reservation/v1",
      brand: key,
      target: `${target.owner}/${target.repo}@${target.branch}`,
      assetPath,
      contentType,
      byteLength: content.length,
      contentSha256,
    })}\n`,
    "utf8",
  )

  const reservationResult = await createOrReconcileExact({
    fetchImpl,
    target,
    token,
    path: reservationPath,
    expectedBytes: reservation,
    message: `Reserve signature asset ${contentSha256}`,
    kind: "reservation",
  })

  const publicationResult = await createOrReconcileExact({
    fetchImpl,
    target,
    token,
    path: assetPath,
    expectedBytes: content,
    message: `Publish content-addressed ${key.toUpperCase()} signature headshot ${contentSha256}`,
    kind: "asset",
  })

  const commitSha = await latestPathCommit({ fetchImpl, target, token, path: assetPath })
  const readback = await verifyPublicBytes({
    fetchImpl,
    target,
    commitSha,
    path: assetPath,
    expectedBytes: content,
    expectedSha256: contentSha256,
  })

  return {
    brand: key,
    target: `${target.owner}/${target.repo}`,
    filename: assetPath,
    contentSha256,
    byteLength: readback.byteLength,
    commitSha,
    reservationPath,
    reservationState: reservationResult.state,
    publicationState: publicationResult.state,
    rawUrl: readback.rawUrl,
    url: `https://cdn.jsdelivr.net/gh/${target.owner}/${target.repo}@${commitSha}/${encodePath(assetPath)}`,
    verification: {
      publicReadback: "VERIFIED",
      sha256: readback.actualSha256,
      byteLength: readback.byteLength,
    },
  }
}
