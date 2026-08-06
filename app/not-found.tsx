import Link from "next/link";

export default function NotFound() {
  return <main className="not-found-page"><div><span>404</span><h1>Sayfa bulunamadı</h1><p>Bağlantı değişmiş veya katalogda bu kayıt bulunmuyor olabilir.</p><Link href="/">Program aramasına dön →</Link></div></main>;
}
