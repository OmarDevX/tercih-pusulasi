import Link from "next/link";
import { isAnalyticsAdmin } from "../lib/analytics/auth";
import { readAnalyticsEvents } from "../lib/analytics/server";
import type { AnalyticsEvent, AnalyticsRange } from "../lib/analytics/types";

export const dynamic = "force-dynamic";

function countBy(events: AnalyticsEvent[], getKey: (event: AnalyticsEvent) => string | undefined) {
  const counts = new Map<string, number>();
  for (const event of events) {
    const key = getKey(event) || "Bilinmiyor";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]);
}

function pct(value: number, total: number) { return total ? Math.round((value / total) * 100) : 0; }
function formatNumber(value: number) { return new Intl.NumberFormat("tr-TR").format(value); }
function rangeLabel(range: AnalyticsRange) { return ({ "24h": "Son 24 saat", "7d": "Son 7 gün", "30d": "Son 30 gün", "90d": "Son 90 gün", all: "Tüm zamanlar" })[range]; }

function BarList({ rows, total, empty = "Henüz veri yok" }: { rows: [string, number][]; total: number; empty?: string }) {
  if (!rows.length) return <p className="admin-empty">{empty}</p>;
  const max = rows[0]?.[1] || 1;
  return <div className="admin-bar-list">{rows.slice(0, 8).map(([label, value]) => (
    <div className="admin-bar-row" key={label}>
      <div className="admin-bar-label"><span title={label}>{label}</span><b>{formatNumber(value)} <small>%{pct(value, total)}</small></b></div>
      <div className="admin-bar-track"><span style={{ width: `${Math.max(3, (value / max) * 100)}%` }} /></div>
    </div>
  ))}</div>;
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const authenticated = await isAnalyticsAdmin();
  if (!authenticated) return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <Link className="admin-brand" href="/"><span>⌖</span> Tercih Pusulası</Link>
        <p className="admin-kicker">YÖNETİM PANELİ</p>
        <h1>Analytics erişimi</h1>
        <p>Trafik, arama ve API kullanım verilerini görüntülemek için yönetici anahtarını girin.</p>
        {params.error ? <div className="admin-login-error">Anahtar geçersiz.</div> : null}
        {!process.env.ADMIN_ANALYTICS_TOKEN ? <div className="admin-login-error">Sunucuda <code>ADMIN_ANALYTICS_TOKEN</code> ayarlanmamış.</div> : null}
        <form action="/api/admin/login" method="post">
          <label htmlFor="token">Yönetici anahtarı</label>
          <input id="token" name="token" type="password" autoComplete="current-password" required />
          <button type="submit">Panele gir <span>→</span></button>
        </form>
        <Link className="admin-back-link" href="/">← Siteye dön</Link>
      </section>
    </main>
  );

  const range = (["24h", "7d", "30d", "90d", "all"].includes(String(params.range)) ? params.range : "7d") as AnalyticsRange;
  const [events, allEvents] = await Promise.all([
    readAnalyticsEvents(range),
    range === "all" ? Promise.resolve<AnalyticsEvent[]>([]) : readAnalyticsEvents("all"),
  ]);
  const pageViews = events.filter((event) => event.type === "page_view");
  const searches = events.filter((event) => event.type === "search");
  const apiCalls = events.filter((event) => event.type === "api_call");
  const visitors = new Set(pageViews.map((event) => event.visitorId || event.sessionId).filter(Boolean)).size;
  const allPageViews = range === "all" ? pageViews : allEvents.filter((event) => event.type === "page_view");
  const allTimeVisitors = new Set(allPageViews.map((event) => event.visitorId || event.sessionId).filter(Boolean)).size;
  const sessions = new Set(events.map((event) => event.sessionId).filter(Boolean)).size;
  const errors = apiCalls.filter((event) => (event.status || 0) >= 400).length;
  const avgLatency = apiCalls.length ? Math.round(apiCalls.reduce((sum, event) => sum + (event.durationMs || 0), 0) / apiCalls.length) : 0;
  const universitySearches = countBy(searches.filter((event) => event.searchKind === "university"), (event) => event.searchResult || event.query);
  const subjectSearches = countBy(searches.filter((event) => event.searchKind === "subject"), (event) => event.searchResult || event.query);
  const routes = countBy(pageViews, (event) => event.path?.split("?")[0]);
  const endpoints = countBy(apiCalls, (event) => event.endpoint);
  const countries = countBy(pageViews, (event) => event.country);
  const cities = countBy(pageViews, (event) => event.city);
  const devices = countBy(pageViews, (event) => event.device);
  const browsers = countBy(pageViews, (event) => event.browser);
  const hourly = Array.from({ length: 24 }, (_, hour) => [String(hour).padStart(2, "0"), 0] as [string, number]);
  pageViews.forEach((event) => { const hour = new Date(event.timestamp).getHours(); hourly[hour][1] += 1; });
  const maxHour = Math.max(1, ...hourly.map((row) => row[1]));

  return <main className="admin-page">
    <aside className="admin-sidebar">
      <Link className="admin-brand" href="/"><span>⌖</span><b>Tercih<br />Pusulası</b></Link>
      <nav><a className="active" href="#overview">⌁ <span>Genel Bakış</span></a><a href="#traffic">↗ <span>Trafik</span></a><a href="#searches">⌕ <span>Aramalar</span></a><a href="#api">⚡ <span>API</span></a><a href="#demographics">◎ <span>Demografi</span></a></nav>
      <div className="admin-sidebar-bottom"><Link href="/">Siteyi aç ↗</Link><form action="/api/admin/logout" method="post"><button>Çıkış yap</button></form></div>
    </aside>
    <section className="admin-content">
      <header className="admin-topbar"><div><p className="admin-kicker">ANALYTICS</p><h1>Genel Bakış</h1></div><div className="admin-range">{(["24h", "7d", "30d", "90d", "all"] as AnalyticsRange[]).map((item) => <Link className={item === range ? "active" : ""} key={item} href={`/admin?range=${item}`}>{item === "24h" ? "24S" : item === "all" ? "TÜMÜ" : item.toUpperCase()}</Link>)}</div></header>
      <div className="admin-period"><span className="live-dot" /> {rangeLabel(range)} · canlı kayıt</div>
      <section className="admin-kpis" id="overview">
        <article><span>Sayfa Görüntüleme</span><strong>{formatNumber(pageViews.length)}</strong><small>{sessions ? `${formatNumber(sessions)} oturum` : "Veri toplanıyor"}</small></article>
        <article><span>Dönem Tekil Ziyaretçi</span><strong>{formatNumber(visitors)}</strong><small>Yenilemeler tekrar sayılmaz</small></article>
        <article><span>Toplam Farklı Kullanıcı</span><strong>{formatNumber(allTimeVisitors)}</strong><small>Tüm zamanlardaki anonim cihazlar</small></article>
        <article><span>Arama</span><strong>{formatNumber(searches.length)}</strong><small>{pageViews.length ? `Her ${Math.max(1, Math.round(pageViews.length / Math.max(1, searches.length)))} görüntülemede bir` : "Veri toplanıyor"}</small></article>
        <article><span>API Çağrısı</span><strong>{formatNumber(apiCalls.length)}</strong><small className={errors ? "negative" : ""}>{errors ? `${errors} hata · %${pct(errors, apiCalls.length)}` : "Hata yok"}</small></article>
      </section>
      <section className="admin-grid admin-grid-wide" id="traffic">
        <article className="admin-card admin-chart-card"><div className="admin-card-head"><div><p className="admin-kicker">TRAFİK DAĞILIMI</p><h2>Saatlere göre ziyaret</h2></div><strong>{formatNumber(pageViews.length)}</strong></div><div className="hour-chart">{hourly.map(([hour, value]) => <div className="hour-column" key={hour} title={`${hour}:00 · ${value}`}><span style={{ height: `${Math.max(value ? 8 : 2, (value / maxHour) * 100)}%` }} /><small>{Number(hour) % 3 === 0 ? hour : ""}</small></div>)}</div></article>
        <article className="admin-card"><div className="admin-card-head"><div><p className="admin-kicker">POPÜLER SAYFALAR</p><h2>En çok açılan rotalar</h2></div></div><BarList rows={routes} total={pageViews.length} /></article>
      </section>
      <section className="admin-grid" id="searches">
        <article className="admin-card"><div className="admin-card-head"><div><p className="admin-kicker">ÜNİVERSİTE ARAMALARI</p><h2>En çok aranan üniversiteler</h2></div></div><BarList rows={universitySearches} total={universitySearches.reduce((s, r) => s + r[1], 0)} /></article>
        <article className="admin-card"><div className="admin-card-head"><div><p className="admin-kicker">BÖLÜM ARAMALARI</p><h2>En çok aranan bölümler</h2></div></div><BarList rows={subjectSearches} total={subjectSearches.reduce((s, r) => s + r[1], 0)} /></article>
      </section>
      <section className="admin-grid admin-grid-wide" id="api">
        <article className="admin-card"><div className="admin-card-head"><div><p className="admin-kicker">API KULLANIMI</p><h2>En çok çağrılan endpointler</h2></div><strong>{avgLatency}<small> ms</small></strong></div><BarList rows={endpoints} total={apiCalls.length} /></article>
        <article className="admin-card admin-health"><p className="admin-kicker">SERVİS SAĞLIĞI</p><h2>Performans özeti</h2><div><span>Ortalama yanıt</span><b>{avgLatency} ms</b></div><div><span>Başarılı çağrı</span><b>%{apiCalls.length ? 100 - pct(errors, apiCalls.length) : 100}</b></div><div><span>4xx / 5xx hata</span><b className={errors ? "negative" : "positive"}>{errors}</b></div></article>
      </section>
      <section className="admin-grid admin-grid-three" id="demographics">
        <article className="admin-card"><p className="admin-kicker">ÜLKELER</p><h2>Ziyaretçi konumu</h2><BarList rows={countries} total={pageViews.length} /></article>
        <article className="admin-card"><p className="admin-kicker">ŞEHİRLER</p><h2>En aktif şehirler</h2><BarList rows={cities} total={pageViews.length} /></article>
        <article className="admin-card"><p className="admin-kicker">TEKNOLOJİ</p><h2>Cihaz ve tarayıcı</h2><BarList rows={devices} total={pageViews.length} /><div className="admin-divider" /><BarList rows={browsers} total={pageViews.length} /></article>
      </section>
      <footer className="admin-footer">Tekil kullanıcı sayısı tarayıcıda kalıcı, anonim bir kimlikle hesaplanır; sayfayı yenilemek yeni kullanıcı oluşturmaz. Çerezleri/site verisini silmek veya farklı cihaz kullanmak yeni kullanıcı olarak sayılabilir.</footer>
    </section>
  </main>;
}
