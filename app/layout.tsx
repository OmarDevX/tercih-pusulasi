import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { getSiteUrl, SITE_NAME } from "./site";
import { PreferenceListProvider } from "./components/preference-list";
import CompareNavLink from "./components/compare-nav-link";
import AnalyticsTracker from "./components/analytics/tracker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "YKS Tercih Pusulası: 2026 Sıralamaları ve Kontenjanları",
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Üniversite programlarını 2026 başarı sıralamaları, 2026 kontenjanları, URAP, THE, QS ve araştırma verileriyle karşılaştırın.",
  applicationName: SITE_NAME,
  category: "education",
  keywords: [
    "YKS tercih",
    "üniversite sıralamaları",
    "2025 taban sıralamaları",
    "2026 kontenjanları",
    "üniversite karşılaştırma",
    "YÖK Atlas",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: { email: false, address: false, telephone: false },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: SITE_NAME,
    title: "YKS Tercih Pusulası",
    description:
      "2026 başarı sıralamaları, 2026 kontenjanları ve üniversite akademik verileri tek yerde.",
    url: "/",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Tercih Pusulası" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "YKS Tercih Pusulası",
    description: "2026 sıralamaları ve üniversite kontenjanları.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#11131f",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <PreferenceListProvider>
          <AnalyticsTracker />
          {children}
        </PreferenceListProvider>
        <footer className="site-footer">
          <div className="shell footer-grid">
            <div>
              <Link className="footer-brand" href="/">Tercih Pusulası</Link>
              <p>YKS programlarını sıralama, kontenjan ve akademik verilerle karşılaştıran bağımsız tercih rehberi.</p>
            </div>
            <nav aria-label="Katalog">
              <strong>Katalog</strong>
              <Link href="/">Bölüm ve üniversite ara</Link>
              <Link href="/bolumler">Tüm bölümler</Link>
              <Link href="/universiteler">Tüm üniversiteler</Link>
              <CompareNavLink>Üniversite karşılaştır</CompareNavLink>
              <Link href="/veri-kaynaklari">Veri kaynakları</Link>
            </nav>
            <nav aria-label="Kurumsal">
              <strong>Bilgi</strong>
              <Link href="/hakkimizda">Hakkımızda</Link>
              <Link href="/metodoloji">Metodoloji</Link>
              <Link href="/gizlilik">Gizlilik</Link>
              <Link href="/iletisim">İletişim</Link>
            </nav>
          </div>
          <div className="shell footer-bottom">
            <span>Resmî ÖSYM veya YÖK hizmeti değildir.</span>
            <span>Son veri paketi: 1 Ağustos 2026</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
