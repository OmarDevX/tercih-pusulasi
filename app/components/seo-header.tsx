import Link from "next/link";
import { PreferenceListButton } from "./preference-list";
import CompareNavLink from "./compare-nav-link";

type SeoHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
};

export default function SeoHeader({ eyebrow, title, description }: SeoHeaderProps) {
  return (
    <section className="seo-hero">
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
          <CompareNavLink><span aria-hidden="true">⇄</span> Karşılaştır</CompareNavLink>
          <PreferenceListButton />
        </nav>
      </header>
      <div className="seo-hero-content shell">
        <div className="eyebrow"><span /> {eyebrow ?? "YKS tercih verisi"}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </section>
  );
}
