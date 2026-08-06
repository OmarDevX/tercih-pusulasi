import Link from "next/link";
import { PreferenceListButton } from "../components/preference-list";
import { DEFAULT_COMPARE_PATH } from "../routes";

const SkeletonLine = ({ width }: { width: string }) => (
  <span className="compare-skeleton-line" style={{ width }} />
);

export default function CompareLoading() {
  return (
    <main className="compare-page compare-route-loading" aria-busy="true" aria-label="Karşılaştırma sayfası yükleniyor">
      <section className="compare-hero">
        <div className="hero-grid" aria-hidden="true" />
        <header className="site-header shell">
          <Link className="brand" href="/" aria-label="Tercih Pusulası ana sayfa">
            <span className="brand-pin"><span>⌁</span></span>
            <span>Tercih<br />Pusulası</span>
          </Link>
          <nav aria-label="Ana menü">
            <Link href="/"><span aria-hidden="true">⌕</span> Ara</Link>
            <Link className="directory-nav-link" href="/bolumler"><span aria-hidden="true">☷</span> Bölümler</Link>
            <Link className="directory-nav-link" href="/universiteler"><span aria-hidden="true">◇</span> Üniversiteler</Link>
            <Link className="active" href={DEFAULT_COMPARE_PATH}><span aria-hidden="true">⇄</span> Karşılaştır</Link>
            <PreferenceListButton />
          </nav>
        </header>

        <div className="compare-hero-content shell">
          <div>
            <div className="eyebrow"><span /> Akademik karşılaştırma laboratuvarı</div>
            <h1>Üniversiteleri <em>veriyle</em> karşılaştır.</h1>
            <p>Karşılaştırma ekranı hazırlanıyor; sayfa düzeni ve konumu sabit tutuluyor.</p>
          </div>
          <div className="compare-live-note compare-skeleton-card">
            <b>VERİLER HAZIRLANIYOR</b>
            <SkeletonLine width="72%" />
            <SkeletonLine width="92%" />
          </div>
        </div>
      </section>

      <section className="compare-picker-wrap">
        <div className="compare-picker shell compare-skeleton-card">
          <div className="compare-picker-heading">
            <div><span>2–3 üniversite</span><h2>Karşılaştırılacak kurumlar</h2></div>
            <span className="compare-skeleton-button" />
          </div>
          <div className="compare-inputs">
            {[0, 1, 2].map((index) => (
              <div className="compare-skeleton-input" key={index}>
                <SkeletonLine width="42%" />
                <span />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="compare-results shell compare-loading-results">
        <div className="compare-loading-status" role="status">
          <span className="loading-ring" aria-hidden="true" />
          <div><strong>Karşılaştırma hazırlanıyor</strong><small>Mevcut sayfa yüksekliği korunur; boş ekran gösterilmez.</small></div>
        </div>
        <div className="compare-loading-winner compare-skeleton-card" />
        <div className="score-grid score-grid-2">
          <div className="compare-loading-score compare-skeleton-card" />
          <div className="compare-loading-score compare-skeleton-card" />
        </div>
      </section>
    </main>
  );
}
