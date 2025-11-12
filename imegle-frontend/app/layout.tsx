import type { Metadata } from 'next'
import './globals.css'
import Script from 'next/script'
import ToastContainer from '@/components/Toast'

export const metadata: Metadata = {
  title: 'imegle.io - Random Video Chat111',
  description: 'Connect with strangers via video and text chat',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
      </head>
      <body>
        {children}
        <ToastContainer />
      </body>
    </html>
  )
}

