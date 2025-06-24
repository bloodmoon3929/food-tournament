import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '맛집 이상형 월드컵',
  description: '내 주변 맛집으로 이상형 월드컵을 해보세요!',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}