import type { Metadata } from "next";
import Link from "next/link";
import SeoHeader from "../components/seo-header";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description: "Tercih Pusulası'nın amacı, veri kapsamı ve bağımsız tercih yaklaşımı.",
  alternates: { canonical: "/hakkimizda" },
};

export default function AboutPage() {
  return (
    <main className="seo-page">
      <SeoHeader eyebrow="Bağımsız tercih aracı" title="Tercih Pusulası hakkında" description="Üniversite tercih verilerini tek yerde anlaşılır, karşılaştırılabilir ve şeffaf hâle getiren bağımsız bir rehber." />
      <div className="seo-content shell prose-page">
        <section><h2>Neyi çözüyoruz?</h2><p>YKS adayları bölüm sıralamaları, kontenjanlar ve üniversite performansı için farklı kaynaklar arasında kaybolabiliyor. Tercih Pusulası bu verileri aynı program kodu ve üniversite adı altında bir araya getirir.</p></section>
        <section><h2>Ne değildir?</h2><p>Bu site ÖSYM, YÖK veya herhangi bir üniversitenin resmî hizmeti değildir. Tercih sonucu garantisi vermez; kullanıcıların resmî kılavuzu daha hızlı yorumlamasına yardımcı olur.</p></section>
        <section><h2>Temel ilkeler</h2><ul><li>Başarı sıralamasını puandan öncelikli göstermek.</li><li>Eksik veriyi gizlemek yerine açıkça “—” veya “Listelenmedi” olarak işaretlemek.</li><li>Kontenjan tahminlerini kesin sonuç gibi sunmamak.</li><li>Akademik sıralamaların neyi ölçtüğünü ve neyi ölçmediğini açıklamak.</li></ul></section>
        <div className="inline-links"><Link href="/veri-kaynaklari">Veri kaynakları</Link><Link href="/metodoloji">Metodoloji</Link><Link href="/">Program ara</Link></div>
      </div>
    </main>
  );
}
