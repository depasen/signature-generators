import Link from 'next/link'

export default function HomePage() {
  const tools = [
    {
      href: '/pip',
      eyebrow: 'Pacific Integrative Psychiatry',
      title: 'PIP Signature Generator',
      body: 'Create a branded PIP email signature. Fill in your details, preview it live, and copy it straight into your email client.',
    },
    {
      href: '/ib',
      eyebrow: 'IntraBalance',
      title: 'IB Signature Generator',
      body: 'Create a branded IntraBalance email signature with the same live preview and one-click copy.',
    },
  ]

  return (
    <main className="min-h-screen bg-porcelain">
      <div className="mx-auto max-w-3xl px-5 py-14 md:py-20">
        <p className="pip-eyebrow text-copper">Internal tools</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-ink md:text-4xl text-balance">
          Email Signature Generators
        </h1>
        <p className="mt-3 leading-relaxed text-body">
          Pick a brand to build a signature. Everything renders in the browser and copies
          straight into your email client &mdash; no login required.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="block rounded-lg border border-hairline bg-white p-6 shadow-brand-sm transition hover:border-reef"
            >
              <p className="pip-eyebrow text-copper">{tool.eyebrow}</p>
              <h2 className="mt-2 font-serif text-xl font-semibold text-ink">{tool.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-body">{tool.body}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-reef-deep">
                Open generator &rarr;
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
