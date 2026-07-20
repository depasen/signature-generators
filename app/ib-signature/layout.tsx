import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'IB Email Signature Generator',
}

export default function IbSignatureLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
