import assert from "node:assert/strict"
import { test } from "node:test"

import {
  PUBLICATION_TARGETS,
  PublicationError,
  publishSignatureAsset,
  sha256Hex,
} from "../lib/signature-publication.mjs"

const SHA = "0123456789abcdef0123456789abcdef01234567"

function githubMock({ ambiguousKinds = [], publicBytesOverride = null, preloaded = new Map() } = {}) {
  const stored = new Map(preloaded)
  const writes = []
  const calls = []
  const ambiguous = new Set(ambiguousKinds)

  async function fetchImpl(url, init = {}) {
    const parsed = new URL(url)
    const method = init.method || "GET"
    calls.push({ url, method, headers: init.headers })

    if (parsed.hostname === "raw.githubusercontent.com") {
      const path = decodeURIComponent(parsed.pathname.split("/").slice(4).join("/"))
      const bytes = publicBytesOverride ?? stored.get(path)
      return bytes
        ? new Response(bytes, { status: 200 })
        : new Response("not found", { status: 404 })
    }

    if (parsed.pathname === "/repos/depasen/pip-brand-assets" || parsed.pathname === "/repos/depasen/ib-brand-assets") {
      return Response.json({ private: false }, { status: 200 })
    }

    if (parsed.pathname.endsWith("/commits")) {
      return Response.json([{ sha: SHA }], { status: 200 })
    }

    const marker = "/contents/"
    const markerIndex = parsed.pathname.indexOf(marker)
    if (markerIndex < 0) throw new Error(`Unhandled URL: ${url}`)
    const path = decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length))

    if (method === "GET") {
      const value = stored.get(path)
      return value ? new Response(value, { status: 200 }) : new Response("not found", { status: 404 })
    }

    if (method === "PUT") {
      const body = JSON.parse(init.body)
      const bytes = Buffer.from(body.content, "base64")
      const kind = path.includes(".signature-publication-reservations") ? "reservation" : "asset"
      writes.push({ path, kind, bytes })
      stored.set(path, bytes)
      if (ambiguous.has(kind)) return new Response("temporary", { status: 503 })
      return Response.json({ commit: { sha: SHA } }, { status: 201 })
    }

    throw new Error(`Unhandled request: ${method} ${url}`)
  }

  return { fetchImpl, stored, writes, calls }
}

function request(overrides = {}) {
  return {
    brandKey: "pip",
    bytes: Buffer.from("exact image bytes"),
    contentType: "image/png",
    env: { PIP_SIGNATURE_ASSETS_GITHUB_TOKEN: "pip-only-token" },
    ...overrides,
  }
}

test("brands use distinct exact identities and Effortless Sleep stays unavailable", () => {
  assert.equal(PUBLICATION_TARGETS.pip.tokenEnv, "PIP_SIGNATURE_ASSETS_GITHUB_TOKEN")
  assert.equal(PUBLICATION_TARGETS.ib.tokenEnv, "IB_SIGNATURE_ASSETS_GITHUB_TOKEN")
  assert.equal(PUBLICATION_TARGETS.es.available, false)
  assert.equal(PUBLICATION_TARGETS.es.repo, undefined)
})

test("an empty brand cannot fall back to another business", async () => {
  await assert.rejects(
    publishSignatureAsset(request({ brandKey: "" })),
    (error) => error instanceof PublicationError && error.code === "unknown_brand",
  )
})

test("rejects one credential reused across brand identities", async () => {
  await assert.rejects(
    publishSignatureAsset(
      request({
        env: {
          PIP_SIGNATURE_ASSETS_GITHUB_TOKEN: "shared-token",
          IB_SIGNATURE_ASSETS_GITHUB_TOKEN: "shared-token",
        },
      }),
    ),
    (error) => error instanceof PublicationError && error.code === "shared_brand_identity",
  )
})

test("reserves before publishing, uses a content address, and verifies exact public bytes", async () => {
  const mock = githubMock()
  const result = await publishSignatureAsset(request({ fetchImpl: mock.fetchImpl }))
  const digest = sha256Hex(Buffer.from("exact image bytes"))

  assert.deepEqual(mock.writes.map(({ kind }) => kind), ["reservation", "asset"])
  assert.equal(result.filename, `pip-headshot-${digest}.png`)
  assert.equal(result.contentSha256, digest)
  assert.equal(result.commitSha, SHA)
  assert.equal(result.verification.publicReadback, "VERIFIED")
  assert.equal(result.verification.sha256, digest)
  assert.match(result.url, new RegExp(`@${SHA}/pip-headshot-${digest}\\.png$`))
})

test("reconciles ambiguous reservation and asset outcomes without duplicate writes", async () => {
  const mock = githubMock({ ambiguousKinds: ["reservation", "asset"] })
  const first = await publishSignatureAsset(request({ fetchImpl: mock.fetchImpl }))
  assert.equal(first.reservationState, "reconciled_after_ambiguous_write")
  assert.equal(first.publicationState, "reconciled_after_ambiguous_write")
  assert.equal(mock.writes.length, 2)

  const second = await publishSignatureAsset(request({ fetchImpl: mock.fetchImpl }))
  assert.equal(second.reservationState, "already_present")
  assert.equal(second.publicationState, "already_present")
  assert.equal(mock.writes.length, 2)
})

test("a conflicting durable reservation stops before asset publication", async () => {
  const bytes = Buffer.from("exact image bytes")
  const digest = sha256Hex(bytes)
  const preloaded = new Map([
    [`.signature-publication-reservations/pip/${digest}.json`, Buffer.from("different reservation")],
  ])
  const mock = githubMock({ preloaded })

  await assert.rejects(
    publishSignatureAsset(request({ fetchImpl: mock.fetchImpl })),
    (error) => error instanceof PublicationError && error.code === "reservation_conflict",
  )
  assert.equal(mock.writes.length, 0)
})

test("Effortless Sleep cannot publish without a separately authorized public target", async () => {
  await assert.rejects(
    publishSignatureAsset(
      request({
        brandKey: "es",
        env: { ES_SIGNATURE_ASSETS_GITHUB_TOKEN: "not-sufficient" },
      }),
    ),
    (error) => error instanceof PublicationError && error.code === "public_target_unavailable",
  )
})

test("rejects a private target before creating a reservation", async () => {
  const mock = githubMock()
  const originalFetch = mock.fetchImpl
  mock.fetchImpl = async (url, init) => {
    if (url === "https://api.github.com/repos/depasen/pip-brand-assets") {
      return Response.json({ private: true }, { status: 200 })
    }
    return originalFetch(url, init)
  }
  await assert.rejects(
    publishSignatureAsset(request({ fetchImpl: mock.fetchImpl })),
    (error) => error instanceof PublicationError && error.code === "public_target_not_verified",
  )
  assert.equal(mock.writes.length, 0)
})

test("fails closed when public read-back bytes differ", async () => {
  const mock = githubMock({ publicBytesOverride: Buffer.from("wrong public bytes") })
  await assert.rejects(
    publishSignatureAsset(request({ fetchImpl: mock.fetchImpl })),
    (error) => error instanceof PublicationError && error.code === "public_readback_mismatch",
  )
})
