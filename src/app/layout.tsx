import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '官報ダウンローダー | 官報PDFファイルの無料ダウンロード',
  description: '官報のPDFファイルを無料でダウンロードできます。本紙、号外、政府調達、特別号外、目録など、2025年以降の官報を月別・日別に整理して提供。最新の官報情報を簡単にアクセス。',
  keywords: '官報,PDF,ダウンロード,無料,本紙,号外,政府調達,特別号外,目録,2025年,月別,日別,最新,情報,90日,3ヶ月,3か月',
  authors: [{ name: '官報ダウンローダー' }],
  creator: '官報ダウンローダー',
  publisher: '官報ダウンローダー',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://kanpo-downloader.github.io'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: '官報ダウンローダー | 官報PDFファイルの無料ダウンロード',
    description: '官報のPDFファイルを無料でダウンロードできます。本紙、号外、政府調達、特別号外、目録など、2025年以降の官報を月別・日別に整理して提供。',
    url: 'https://kanpo-downloader.github.io',
    siteName: '官報ダウンローダー',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '官報ダウンローダー | 官報PDFファイルの無料ダウンロード',
    description: '官報のPDFファイルを無料でダウンロードできます。本紙、号外、政府調達、特別号外、目録など、2025年以降の官報を月別・日別に整理して提供。',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

  return (
    <html lang="ja">
      <head>
        {gtmId && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${gtmId}');
              `,
            }}
          />
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "官報ダウンローダー",
              "description": "官報のPDFファイルを無料でダウンロードできます。本紙、号外、政府調達、特別号外、目録など、2025年以降の官報を月別・日別に整理して提供。",
              "url": "https://kanpo-downloader.github.io",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://kanpo-downloader.github.io?q={search_term_string}",
                "query-input": "required name=search_term_string"
              },
              "publisher": {
                "@type": "Organization",
                "name": "官報ダウンローダー"
              },
              "inLanguage": "ja-JP",
              "isAccessibleForFree": true
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Service",
              "name": "官報PDFダウンロードサービス",
              "description": "官報のPDFファイルを無料でダウンロードできるサービス",
              "provider": {
                "@type": "Organization",
                "name": "官報ダウンローダー"
              },
              "serviceType": "官報情報提供",
              "areaServed": "JP",
              "availableLanguage": "ja",
              "keywords": "官報,PDF,ダウンロード,無料,本紙,号外,政府調達,特別号外,目録,90日,3ヶ月,3か月"
            })
          }}
        />
      </head>
      <body className={inter.className}>
        {gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}
        {children}
      </body>
    </html>
  )
} 