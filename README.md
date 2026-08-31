# PIP + IB + ES Email Signature Generators

Standalone, publicly usable email-signature generators for **Pacific Integrative
Psychiatry**, **IntraBalance** and **Effortless Sleep**. No login required —
staff and coaches open a URL, fill in their details, preview live, and copy the
signature into their email client.

## Routes

| Path  | Tool                              |
| ----- | --------------------------------- |
| `/`   | Landing page linking to all three |
| `/pip-signature` | PIP email-signature generator    |
| `/ib-signature`  | IntraBalance email-signature generator |
| `/es-signature`  | Effortless Sleep email-signature generator |

## How it works

Each generator is a single self-contained client component. The output HTML is
built from the same string that feeds the live preview, so what you see is
exactly what lands in the email client.

Signature image assets (logos, icons, patterns, headshots) are served from
independent public jsDelivr CDNs, so the generated signatures are **host-independent** —
they render the same regardless of which domain the generator itself is hosted on:

- PIP: `https://cdn.jsdelivr.net/gh/depasen/pip-brand-assets@main`
- IB: `https://cdn.jsdelivr.net/gh/depasen/ib-brand-assets@main`
- ES: `https://cdn.jsdelivr.net/gh/depasen/es-brand-assets@main/signature`

**jsDelivr only serves PUBLIC repos.** Headshot publication therefore fails
closed unless the exact brand target is publicly readable. PIP and IB use
separate `PIP_SIGNATURE_ASSETS_GITHUB_TOKEN` and
`IB_SIGNATURE_ASSETS_GITHUB_TOKEN` identities, each scoped only to its bound
asset repository. Every request names its brand explicitly, and the route
rejects a credential reused across brand identities. The old cross-brand token
is not accepted.

Effortless Sleep's asset repository remains private and is not a publication
target. ES headshot uploads return `public_target_unavailable` until an exact
public target and its distinct least-privilege identity are separately
authorized in code. Do not make `es-brand-assets` public to satisfy this route.

Published headshots use a full SHA-256 content address. The route first writes
and reads back a durable reservation, then creates or reconciles the exact
asset, resolves the immutable commit, and verifies the unauthenticated public
bytes and SHA-256 before returning a commit-pinned URL. An ambiguous write is
never blindly repeated.

## Effortless Sleep — three deliberate differences from the other two

Each one is a rule, not drift, so don't "tidy" them back into line with IB:

1. **No pattern behind the mark.** IB tiles its woven pattern behind its logo
   cell. The ES brand kit forbids exactly that — the pattern is a surface in its
   own right and never sits with the logo. ES uses a solid panel, which also
   means it needs no Outlook VML tile fallback.
2. **No social row.** Effortless Sleep has no social accounts of its own; the
   site's own schema points at IntraBalance's and PIP's. Borrowing another
   brand's feed for a coach's signature would be wrong, so the row is omitted.
3. **The website line shows `geteffortlesssleep.com` and links to
   `effortlesssleep.co`.** That is the standing domain rule, not a typo: ".co"
   is misheard and mistyped as ".com", so the longer domain is the safe one to
   read off a screen or printout while every href stays canonical. The redirect
   preserves path and query. The page explains this to the user so nobody
   "corrects" it.

## Origin

These two generators were extracted from the `depasen/pip-wellness` design site
(routes `app/signature-generator` and `app/ib-signature-generator`) into this
standalone repo so the design site can be locked private without taking the
signature tools offline. The extracted code is unchanged apart from the route
paths (`/signature-generator` → `/pip-signature`, `/ib-signature-generator` → `/ib-signature`).

## Local development

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS v4. No runtime dependencies
beyond React/Next — the heavy design-site dependencies were dropped during
extraction.
