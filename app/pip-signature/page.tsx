"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"

/* ------------------------------------------------------------------ *
 * PIP email-signature generator
 *
 * Teammates fill in five personal fields; everything else (logo, wave
 * pattern, brand colors, company name, website, social links) is shared
 * and stays identical to signature/signature.html.
 *
 * The live preview is produced from the SAME string that gets copied, so
 * what you see is exactly what lands in the email client.
 * ------------------------------------------------------------------ */

const CDN = "https://cdn.jsdelivr.net/gh/depasen/pip-brand-assets@main"
const DEFAULT_HEADSHOT = `${CDN}/pip-sandeep-headshot.jpg`

type Fields = {
  name: string
  title: string
  email: string
  phone: string
  headshot: string
}

type Variant = "dark" | "light"

/* Per-variant colors + asset names. Contact icons (pip-ic-*.png) are shared. */
const THEMES: Record<
  Variant,
  {
    tableStyleExtra: string
    ring: string
    name: string
    title: string
    accent: string
    company: string
    tagline: string
    contact: string
    sep: string
    mark: string
    socialSuffix: string
    pattern: string
    markFill: string
    markBorder: string
  }
> = {
  dark: {
    tableStyleExtra: "background-color:#0c2b39;",
    ring: "rgba(240,201,174,0.45)",
    name: "#f6f1e7",
    title: "#aec6cb",
    accent: "#f0c9ae",
    company: "#f0c9ae",
    tagline: "#8fb0b8",
    contact: "#e8f1f0",
    sep: "#3a5560",
    mark: "pip-signature-mark-dark.png",
    socialSuffix: "-dark",
    pattern: "pip-pattern-cell.png",
    markFill: "#0c2b39",
    markBorder: "#24424b",
  },
  light: {
    tableStyleExtra: "background-color:#fbf7ee;border:1px solid #e8dcc8;",
    ring: "rgba(168,90,56,0.35)",
    name: "#0c2b39",
    title: "#5f7d86",
    accent: "#a85a38",
    company: "#a85a38",
    tagline: "#6b8590",
    contact: "#1a2b30",
    sep: "#d8cbb8",
    mark: "pip-signature-mark-light.png",
    socialSuffix: "-light",
    pattern: "pip-pattern-cell-light.png",
    markFill: "#ece0c9",
    markBorder: "#ddceb2",
  },
}

const DEFAULTS: Fields = {
  name: "Sandeep Patil",
  title: "Co-Founder & CEO",
  email: "sandeep@pacificintegrativepsych.com",
  phone: "(415) 941-8110",
  headshot: DEFAULT_HEADSHOT,
}

/* Escape a plain-text value so stray &, <, > can't break the markup. */
function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/* Build a tel: href from a human-typed phone number. */
function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (!digits) return ""
  return digits.length === 10 ? `+1${digits}` : `+${digits}`
}

function buildSignature(f: Fields, variant: Variant = "dark"): string {
  const t = THEMES[variant]
  const name = esc(f.name.trim() || DEFAULTS.name)
  const title = esc(f.title.trim() || DEFAULTS.title)
  const email = f.email.trim() || DEFAULTS.email
  const emailEsc = esc(email)
  const phone = f.phone.trim()
  const phoneEsc = esc(phone)
  const tel = telHref(phone)
  const headshot = f.headshot.trim() || DEFAULT_HEADSHOT

  // Optional phone segment — omitted entirely if the teammate clears it.
  const phoneBlock = phone
    ? `<a href="tel:${tel}" target="_blank" style="text-decoration:none;color:${t.contact};white-space:nowrap;"><img src="${CDN}/pip-ic-phone.png" width="13" height="13" alt="Phone" style="width:13px;height:13px;border:0;outline:none;vertical-align:-2px;">&nbsp;&nbsp;<span style="color:${t.contact};">${phoneEsc}</span></a>&nbsp;&nbsp;&nbsp;<span style="color:${t.sep};" aria-hidden="true">|</span>&nbsp;&nbsp;&nbsp;`
    : ""

  // Right cell uses the woven pattern + VML fallback in both variants; the tile
  // and panel fill differ per theme.
  const markCell = `<td class="piph-mark-cell" width="96" bgcolor="${t.markFill}" background="${CDN}/${t.pattern}" style="width:96px;vertical-align:middle;text-align:center;padding:16px 18px 16px 0;border-left:1px solid ${t.markBorder};background-color:${t.markFill};background-image:url('${CDN}/${t.pattern}');background-position:center center;background-repeat:repeat;">
          <!--[if gte mso 9]>
          <v:rect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" fill="true" stroke="false" style="width:96px;height:164px;">
          <v:fill type="tile" src="${CDN}/${t.pattern}" color="${t.markFill}" />
          <v:textbox inset="0,0,0,0"><![endif]-->
          <a href="https://pacificintegrativepsych.com/" target="_blank" style="display:inline-block;border:0;outline:none;">
            <img src="${CDN}/${t.mark}"
                 width="56" height="48" alt="Pacific Integrative Psychiatry"
                 style="width:56px;height:48px;display:inline-block;border:0;outline:none;">
          </a>
          <div style="font-size:0;line-height:0;height:9px;">&nbsp;</div>
          <div style="font-size:0;line-height:0;"><a href="https://instagram.com/pacificintegrativepsych/" target="_blank" style="display:inline-block;"><img width="16" height="16" alt="Instagram" src="${CDN}/pip-social-instagram${t.socialSuffix}.png" style="width:16px;height:16px;border:0;outline:none;display:inline-block;"></a><a href="https://facebook.com/pacificintegrativepsych" target="_blank" style="display:inline-block;margin-left:10px;"><img width="16" height="16" alt="Facebook" src="${CDN}/pip-social-facebook${t.socialSuffix}.png" style="width:16px;height:16px;border:0;outline:none;display:inline-block;"></a><br><a href="https://linkedin.com/company/pacificintegrativepsych" target="_blank" style="display:inline-block;margin-top:10px;"><img width="16" height="16" alt="LinkedIn" src="${CDN}/pip-social-linkedin${t.socialSuffix}.png" style="width:16px;height:16px;border:0;outline:none;display:inline-block;"></a><a href="https://www.youtube.com/@pacificintegrativepsych" target="_blank" style="display:inline-block;margin-left:10px;margin-top:10px;"><img width="16" height="16" alt="YouTube" src="${CDN}/pip-social-youtube${t.socialSuffix}.png" style="width:16px;height:16px;border:0;outline:none;display:inline-block;"></a></div>
          <!--[if gte mso 9]></v:textbox></v:rect><![endif]-->
        </td>`

  return `<div data-spark-custom-html="true">
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  .piph-sig a { text-decoration: none; }
  a[x-apple-data-detectors] {
    color: inherit !important; text-decoration: none !important;
    font-size: inherit !important; font-family: inherit !important;
    font-weight: inherit !important; line-height: inherit !important;
  }
  @media only screen and (max-width: 480px) {
    .piph-mark-cell { display: none !important; }
  }
</style>

<div dir="auto"><div dir="ltr" class="piph-sig">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="direction:ltr;border-collapse:collapse;font-family:'Figtree',Tahoma,Arial,sans-serif;">
<tbody>
  <tr><td style="font-size:0;height:14px;line-height:0;">&nbsp;</td></tr>
  <tr><td>

    <!--[if mso]>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"><tr><td>
    <![endif]-->

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:separate;${t.tableStyleExtra}border-radius:14px;overflow:hidden;">
    <tbody>
      <tr>

        <!-- LEFT: headshot -->
        <td width="90" style="width:90px;vertical-align:middle;text-align:center;padding:16px 0 16px 18px;">
          <a href="https://pacificintegrativepsych.com/" target="_blank" style="display:inline-block;border:0;outline:none;text-decoration:none;">
            <img src="${headshot}"
                 width="68" height="68" alt="${name}"
                 style="width:68px;height:68px;border-radius:50%;display:inline-block;border:0;outline:none;object-fit:cover;box-shadow:0 0 0 2px ${t.ring};">
          </a>
        </td>

        <!-- MIDDLE: identity + contact -->
        <td style="vertical-align:middle;padding:16px 18px;">
          <div style="line-height:1.2;">
            <span style="font-family:'Newsreader',Georgia,serif;font-size:18px;font-weight:600;color:${t.name};letter-spacing:.005em;">${name}</span>
          </div>
          <div style="line-height:1.4;padding-top:2px;">
            <span style="font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:${t.title};">${title}</span>
          </div>

          <div style="font-size:0;line-height:0;padding:7px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr>
              <td bgcolor="${t.accent}" style="width:28px;height:2px;background-color:${t.accent};font-size:0;line-height:0;" aria-hidden="true">&nbsp;</td>
            </tr></table>
          </div>

          <div style="line-height:1.35;">
            <span style="font-family:'Newsreader',Georgia,serif;font-size:12.5px;font-weight:600;color:${t.company};letter-spacing:.01em;">Pacific Integrative Psychiatry</span>
          </div>
          <div style="line-height:1.4;padding-top:1px;">
            <span style="font-size:10.5px;color:${t.tagline};">Insomnia &amp; Mental Health &middot; California</span>
          </div>

          <div style="line-height:1.7;font-size:11px;color:${t.contact};padding-top:8px;">
            ${phoneBlock}<a href="https://pacificintegrativepsych.com/" target="_blank" style="text-decoration:none;color:${t.contact};white-space:nowrap;"><img src="${CDN}/pip-ic-web.png" width="13" height="13" alt="Website" style="width:13px;height:13px;border:0;outline:none;vertical-align:-2px;">&nbsp;&nbsp;<span style="color:${t.contact};">pacificintegrativepsych.com</span></a><br>
            <a href="mailto:${email}" target="_blank" style="text-decoration:none;color:${t.contact};white-space:nowrap;"><img src="${CDN}/pip-ic-email.png" width="13" height="13" alt="Email" style="width:13px;height:13px;border:0;outline:none;vertical-align:-2px;">&nbsp;&nbsp;<span style="color:${t.contact};">${emailEsc}</span></a>
          </div>
        </td>

        <!-- RIGHT: mark + social -->
        ${markCell}

      </tr>
    </tbody>
    </table>

    <!--[if mso]>
    </td></tr></table>
    <![endif]-->

  </td></tr>
</tbody>
</table>
</div></div>
</div>`
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-ink">{label}</span>
      {hint ? <span className="mt-0.5 block text-xs leading-relaxed text-muted">{hint}</span> : null}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-md border border-hairline bg-white px-3 py-2 text-sm text-body outline-none transition focus:border-reef focus:ring-2 focus:ring-reef/30"
      />
    </label>
  )
}

type UploadState = "idle" | "uploading" | "done" | "error"

// Center-crop to a square and resize to 400x400 so every headshot is consistent
// regardless of the original aspect ratio or size. Runs entirely in the browser.
async function cropToSquare(file: File, size = 400): Promise<Blob> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("Could not read the image file."))
    reader.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.crossOrigin = "anonymous"
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error("Could not load the image."))
    el.src = dataUrl
  })

  const side = Math.min(img.naturalWidth, img.naturalHeight)
  const sx = (img.naturalWidth - side) / 2
  const sy = (img.naturalHeight - side) / 2

  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas is not supported in this browser.")
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not process the image."))),
      "image/jpeg",
      0.9,
    )
  })
}

export default function SignatureGeneratorPage() {
  const [fields, setFields] = useState<Fields>(DEFAULTS)
  const [variant, setVariant] = useState<Variant>("dark")
  const [previewDark, setPreviewDark] = useState(false)
  const [copied, setCopied] = useState(false)
  const [uploadState, setUploadState] = useState<UploadState>("idle")
  const [uploadMsg, setUploadMsg] = useState<string>("")
  const [dragging, setDragging] = useState(false)

  // Prefill from URL query params so an admin can hand someone a ready-made link,
  // e.g. ?style=light&name=Jane%20Doe&title=...&email=...&phone=...&headshot=...
  useEffect(() => {
    if (typeof window === "undefined") return
    const p = new URLSearchParams(window.location.search)
    setFields((prev) => {
      const next = { ...prev }
      for (const k of ["name", "title", "email", "phone", "headshot"] as const) {
        const v = p.get(k)
        if (v) next[k] = v
      }
      return next
    })
    const style = (p.get("style") || p.get("variant") || "").toLowerCase()
    if (style === "light" || style === "dark") setVariant(style as Variant)
  }, [])

  const set = (key: keyof Fields) => (v: string) => {
    setFields((prev) => ({ ...prev, [key]: v }))
    setCopied(false)
  }

  async function uploadHeadshot(file: File) {
    setUploadState("uploading")
    setUploadMsg("Cropping to a square…")
    setCopied(false)
    try {
      const square = await cropToSquare(file, 400)
      setUploadMsg("Uploading…")
      const body = new FormData()
      body.append("file", square, "headshot.jpg")
      body.append("name", fields.name || "teammate")
      const res = await fetch("/api/upload-headshot", { method: "POST", body })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Upload failed.")
      // cache-bust the preview so a re-upload with the same name refreshes immediately
      setFields((prev) => ({ ...prev, headshot: data.url }))
      setUploadState("done")
      setUploadMsg("Photo added. It was cropped to a clean square and saved automatically—no other steps needed.")
    } catch (err) {
      setUploadState("error")
      setUploadMsg(err instanceof Error ? err.message : "Upload failed. Please try again.")
    }
  }

  function onFilePicked(files: FileList | null) {
    const file = files?.[0]
    if (file) void uploadHeadshot(file)
  }

  const html = useMemo(() => buildSignature(fields, variant), [fields, variant])

  // Render the preview inside an iframe so NONE of this page's CSS (Tailwind
  // resets, global line-heights, etc.) can leak into the email markup. This is
  // how real email clients isolate a signature, so the preview matches exactly.
  const CARD_WIDTH = 600
  const previewWrapRef = useRef<HTMLDivElement>(null)
  const [previewScale, setPreviewScale] = useState(1)
  const [docHeight, setDocHeight] = useState(220)

  const srcDoc = useMemo(
    () => `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=600">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap" rel="stylesheet">
<style>html,body{margin:0;padding:0;background:${previewDark ? "#0f1416" : "#ffffff"};}
#pv{padding:4px 8px;}</style>
</head><body><div id="pv">${html}</div>
<script>
(function(){
  function report(){
    var el=document.getElementById('pv');
    var h=el?el.getBoundingClientRect().height:document.body.scrollHeight;
    parent.postMessage({__sigPreview:true,height:Math.ceil(h)},'*');
  }
  window.addEventListener('load',report);
  if(document.fonts&&document.fonts.ready){document.fonts.ready.then(report);}
  setTimeout(report,300);setTimeout(report,900);
  if(window.ResizeObserver){new ResizeObserver(report).observe(document.getElementById('pv'));}
})();
</script>
</body></html>`,
    [html, previewDark],
  )

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data && e.data.__sigPreview && typeof e.data.height === "number") {
        setDocHeight(e.data.height)
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  useEffect(() => {
    function recompute() {
      const wrap = previewWrapRef.current
      if (!wrap) return
      const inner = wrap.clientWidth - 40 // account for p-5 (20px each side)
      setPreviewScale(Math.min(1, inner / CARD_WIDTH))
    }
    recompute()
    const ro = new ResizeObserver(recompute)
    if (previewWrapRef.current) ro.observe(previewWrapRef.current)
    return () => ro.disconnect()
  }, [])

  async function copyRendered() {
    try {
      // Copy as rich HTML so pasting into Spark keeps the formatting.
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        const blob = new Blob([html], { type: "text/html" })
        const plain = new Blob([html], { type: "text/plain" })
        await navigator.clipboard.write([
          new ClipboardItem({ "text/html": blob, "text/plain": plain }),
        ])
      } else {
        await navigator.clipboard.writeText(html)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  async function copySource() {
    await navigator.clipboard.writeText(html)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function downloadHtml() {
    const safe = (fields.name || "signature").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `pip-signature-${safe}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen bg-porcelain">
      <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
        <header className="max-w-2xl">
          <p className="pip-eyebrow text-copper">Pacific Integrative Psychiatry</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-ink md:text-4xl text-balance">
            Email signature generator
          </h1>
          <p className="mt-3 leading-relaxed text-body">
            Fill in your details below, preview your card, then copy it straight into Spark. The logo, colors, and
            company info stay consistent for everyone&mdash;you only personalize the highlighted fields.
          </p>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          {/* ---- Form ---- */}
          <section aria-label="Your details" className="rounded-lg border border-hairline bg-white p-6 shadow-brand-sm">
            <h2 className="font-serif text-xl font-semibold text-ink">Your details</h2>
            <div className="mt-5 grid gap-5">
              <fieldset>
                <legend className="text-sm font-semibold text-ink">Signature style</legend>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                  Dark is the standard card. Choose Light if your email is usually read on a white background.
                </span>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {(
                    [
                      { key: "dark", label: "Dark", desc: "Navy card" },
                      { key: "light", label: "Light", desc: "Cream card" },
                    ] as { key: Variant; label: string; desc: string }[]
                  ).map((opt) => (
                    <label
                      key={opt.key}
                      className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 transition ${
                        variant === opt.key ? "border-reef bg-reef/5" : "border-hairline bg-white hover:border-reef/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="signature-style"
                        value={opt.key}
                        checked={variant === opt.key}
                        onChange={() => {
                          setVariant(opt.key)
                          setCopied(false)
                        }}
                        className="h-4 w-4 accent-reef"
                      />
                      <span>
                        <span className="block text-sm font-medium text-body">{opt.label}</span>
                        <span className="block text-xs text-muted">{opt.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field label="Full name" value={fields.name} onChange={set("name")} placeholder="Jane Doe" />
              <Field
                label="Title"
                value={fields.title}
                onChange={set("title")}
                placeholder="Psychiatric Nurse Practitioner"
              />
              <Field
                label="Email"
                type="email"
                value={fields.email}
                onChange={set("email")}
                placeholder="jane@pacificintegrativepsych.com"
              />
              <Field
                label="Phone"
                hint="Leave blank to omit the phone line entirely."
                value={fields.phone}
                onChange={set("phone")}
                placeholder="(415) 941-8110"
              />
              {/* Headshot: auto-uploads to the brand repo and fills the URL for you. */}
              <div className="block">
                <span className="text-sm font-semibold text-ink">Headshot photo</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                  Drop in a photo (JPG, PNG, or WebP, under 5&nbsp;MB). We&apos;ll automatically crop it to a neat square
                  and save it for you&mdash;nothing else to do. For the best result, read the quick photo tips below first.
                </span>

                <details className="mt-2 rounded-md border border-hairline bg-ivory p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-ink">
                    How to prepare your photo (please read)
                  </summary>
                  <div className="mt-2 text-xs leading-relaxed text-body">
                    <p>
                      Your photo is automatically cropped to a <strong>square</strong>, keeping the very center of the
                      image. To make sure you look your best, prepare your photo before uploading:
                    </p>
                    <ol className="mt-2 grid list-decimal gap-1.5 pl-4">
                      <li>
                        Use a <strong>clear, well-lit</strong> photo of just you&mdash;no other people in the frame.
                      </li>
                      <li>
                        <strong>Center your face</strong> horizontally and vertically. Because we crop from the middle,
                        anything far to one side or in a corner will get cut off.
                      </li>
                      <li>
                        Frame it as a <strong>head-and-shoulders</strong> shot: leave a little space above your head and
                        stop around the top of your chest. Avoid full-body photos&mdash;your face will look tiny.
                      </li>
                      <li>
                        If you can, crop it to a <strong>square (1:1)</strong> yourself first so you control exactly what
                        stays in. On a phone: open the photo, tap <strong>Edit &rarr; Crop</strong>, choose the{" "}
                        <strong>Square</strong> ratio, position your face in the middle, and save. On a computer, any
                        photo editor&apos;s crop tool with a 1:1 or square setting works.
                      </li>
                      <li>
                        Aim for at least <strong>400&times;400 pixels</strong> so it stays sharp. Larger is fine.
                      </li>
                    </ol>
                    <p className="mt-2 text-muted">
                      After you upload, check the preview on the right&mdash;if your face looks off-center or cut off,
                      re-crop the original and upload again.
                    </p>
                  </div>
                </details>

                <label
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragging(false)
                    onFilePicked(e.dataTransfer.files)
                  }}
                  className={`mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-6 text-center transition ${
                    dragging ? "border-reef bg-reef/5" : "border-hairline bg-white hover:border-reef/60"
                  }`}
                >
                  <img
                    src={fields.headshot || DEFAULT_HEADSHOT}
                    alt="Headshot preview"
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-copper/40"
                    crossOrigin="anonymous"
                  />
                  <span className="text-sm font-medium text-body">
                    {uploadState === "uploading" ? "Uploading…" : "Drag a photo here, or click to choose"}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={uploadState === "uploading"}
                    onChange={(e) => onFilePicked(e.target.files)}
                  />
                </label>

                {uploadMsg ? (
                  <p
                    role="status"
                    className={`mt-2 text-xs leading-relaxed ${
                      uploadState === "error" ? "text-red-600" : uploadState === "done" ? "text-reef" : "text-muted"
                    }`}
                  >
                    {uploadMsg}
                  </p>
                ) : null}

                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-muted">Or paste an image URL</summary>
                  <input
                    type="text"
                    value={fields.headshot}
                    placeholder={DEFAULT_HEADSHOT}
                    onChange={(e) => set("headshot")(e.target.value)}
                    className="mt-2 w-full rounded-md border border-hairline bg-white px-3 py-2 text-sm text-body outline-none transition focus:border-reef focus:ring-2 focus:ring-reef/30"
                  />
                </details>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={copyRendered}
                className="pip-cta rounded-md bg-abyss px-4 py-2.5 text-sm font-semibold text-white"
              >
                {copied ? "Copied!" : `Copy ${variant === "dark" ? "dark" : "light"} signature`}
              </button>
              <button
                type="button"
                onClick={copySource}
                className="pip-cta rounded-md border border-hairline bg-white px-4 py-2.5 text-sm font-semibold text-ink"
              >
                Copy HTML source
              </button>
              <button
                type="button"
                onClick={downloadHtml}
                className="pip-cta rounded-md border border-hairline bg-white px-4 py-2.5 text-sm font-semibold text-ink"
              >
                Download .html
              </button>
              <button
                type="button"
                onClick={() => {
                  setFields(DEFAULTS)
                  setCopied(false)
                }}
                className="pip-cta rounded-md px-4 py-2.5 text-sm font-semibold text-muted"
              >
                Reset
              </button>
            </div>
          </section>

          {/* ---- Preview ---- */}
          <section aria-label="Live preview" className="rounded-lg border border-hairline bg-white p-6 shadow-brand-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="inline-flex items-center gap-2 font-serif text-xl font-semibold text-ink">
                Live preview
                <span className="rounded-full border border-hairline px-2 py-0.5 font-sans text-xs font-semibold text-ink">
                  {variant === "dark" ? "Dark style" : "Light style"}
                </span>
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Preview against:</span>
                <div className="inline-flex overflow-hidden rounded-md border border-hairline text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPreviewDark(false)}
                    className={`px-3 py-1.5 transition ${!previewDark ? "bg-abyss text-white" : "bg-white text-muted"}`}
                  >
                    Light bg
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDark(true)}
                    className={`px-3 py-1.5 transition ${previewDark ? "bg-abyss text-white" : "bg-white text-muted"}`}
                  >
                    Dark bg
                  </button>
                </div>
              </div>
            </div>

            <div
              ref={previewWrapRef}
              className="mt-4 overflow-hidden rounded-md transition-colors"
              style={{ backgroundColor: previewDark ? "#0f1416" : "#ffffff" }}
            >
              {/* Rendered in an isolated iframe at the true 600px email width, then
                  scaled to fit the panel — so it matches the real email exactly. */}
              <div style={{ height: docHeight * previewScale }}>
                <iframe
                  title="Signature preview"
                  srcDoc={srcDoc}
                  scrolling="no"
                  style={{
                    width: CARD_WIDTH,
                    height: docHeight,
                    border: 0,
                    display: "block",
                    transform: `scale(${previewScale})`,
                    transformOrigin: "top left",
                  }}
                />
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-muted">
              This is the actual size your signature appears in email. The card carries its own {variant === "dark" ? "navy" : "cream"}{" "}
              background, so it looks identical on light or dark email themes. On a narrow screen you can scroll the
              preview sideways.
            </p>
          </section>
        </div>

        {/* ---- How to use ---- */}
        <section aria-label="How to add it to Spark" className="mt-10 rounded-lg border border-hairline bg-ivory p-6">
          <h2 className="font-serif text-xl font-semibold text-ink">Adding it to Spark</h2>
          <ol className="mt-4 grid gap-3 text-sm leading-relaxed text-body">
            <li>
              <span className="font-semibold text-ink">1.</span> Drop your headshot into the upload box above&mdash;it
              hosts automatically. Then fill in your name, title, email, and phone, and check the preview.
            </li>
            <li>
              <span className="font-semibold text-ink">2.</span> Click <span className="font-semibold">Copy signature</span>.
            </li>
            <li>
              <span className="font-semibold text-ink">3.</span> In Spark go to{" "}
              <span className="font-semibold">Settings &rarr; Signatures</span>, create a new signature, and paste. If
              formatting looks off, use <span className="font-semibold">Copy HTML source</span> and paste into the
              signature editor&apos;s source/<code className="rounded bg-white px-1 py-0.5 text-xs">&lt;&gt;</code> view
              instead.
            </li>
            <li>
              <span className="font-semibold text-ink">4.</span> Send yourself a test email on both a light and dark
              background to confirm.
            </li>
          </ol>
        </section>
      </div>
    </main>
  )
}
