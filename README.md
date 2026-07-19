# PIP + IB Email Signature Generators

Standalone, publicly usable email-signature generators for **Pacific Integrative
Psychiatry** and **IntraBalance**. No login required — staff open a URL, fill in
their details, preview live, and copy the signature into their email client.

## Routes

| Path  | Tool                              |
| ----- | --------------------------------- |
| `/`   | Landing page linking to both      |
| `/pip-signature` | PIP email-signature generator    |
| `/ib-signature`  | IntraBalance email-signature generator |

## How it works

Each generator is a single self-contained client component. The output HTML is
built from the same string that feeds the live preview, so what you see is
exactly what lands in the email client.

Signature image assets (logos, icons, patterns, headshots) are served from
independent public jsDelivr CDNs, so the generated signatures are **host-independent** —
they render the same regardless of which domain the generator itself is hosted on:

- PIP: `https://cdn.jsdelivr.net/gh/depasen/pip-brand-assets@main`
- IB: `https://cdn.jsdelivr.net/gh/depasen/ib-brand-assets@main`

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
