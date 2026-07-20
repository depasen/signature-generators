import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PIP Email Signature Generator',
}

export default function PipSignatureLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
