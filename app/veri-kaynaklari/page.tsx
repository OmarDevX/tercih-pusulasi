import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "../components/json-ld";
import SeoHeader from "../components/seo-header";
import { CATALOG_STATS } from "../data";
import { absoluteUrl, DATA_UPDATED_AT } from "../site";

export const metadata: Metadata = {
  title: "Veri Kaynakları ve Güncelleme Tarihi",
  description: "YKS sıralamaları, 2026 kontenjanları, ÖSYM akreditasyon sütunları, URAP, THE, QS, OpenAlex ve ROR verilerinin kapsamı.",
  alternates: { canonical: "/veri-kaynaklari" },
};

const sources = [
  ["YÖK Atlas", "Program adları, üniversiteler, fakülteler ve 2024–2026 son yerleşen başarı sıralamaları; 2026 sırası güncel YÖK Atlas JSON verisinden alınır.", "https://yokatlas.yok.gov.tr/"],
  ["ÖSYM 2026-YKS Kılavuzu", "Program koduyla eşleştirilen 2026 kontenjanı; program akreditasyonu, TYÇ işareti ve YÖKAK kurumsal akreditasyon sütunları.", "https://dokuman.osym.gov.tr/web/2026/7/2026-yuksekogretim-kurumlari-sinavi-yks-yuksekogretim-programlari-ve-kontenjanlari-kilavuzu-h5q8kv-30170002.pdf"],
  ["URAP", "Türkiye üniversitelerinin 2025–2026 akademik performans sıralaması.", "https://newtr.urapcenter.org/"],
  ["Times Higher Education", "World University Rankings 2026 Türkiye kurumları ve resmî sıralama bantları.", "https://www.timeshighereducation.com/world-university-rankings"],
  ["QS", "World University Rankings 2027 Türkiye kurumları ve resmî sıralama/bant bilgileri.", "https://www.topuniversities.com/world-university-rankings"],
  ["OpenAlex", "Akademik yayın, atıf, H-indeksi, yakın dönem etki ve yıllık üretim verileri.", "https://openalex.org/"],
  ["ROR", "Üniversite kimliği, kuruluş yılı ve resmî kurum eşleştirmesine yardımcı kuruluş verisi.", "https://ror.org/"],
];

export default function SourcesPage() {
  return (
    <main className="seo-page">
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "Dataset",
        name: "Tercih Pusulası üniversite program kataloğu",
        description: "Türkiye üniversite programları, başarı sıralamaları, kontenjanlar ve akademik göstergeler.",
        url: absoluteUrl("/veri-kaynaklari"), dateModified: DATA_UPDATED_AT,
        temporalCoverage: "2024/2026", spatialCoverage: "Türkiye",
      }} />
      <SeoHeader eyebrow={`Son veri paketi · ${DATA_UPDATED_AT}`} title="Veri kaynakları" description="Katalogdaki her göstergenin kaynağı, dönemi, kapsamı ve sınırlaması." />
      <div className="seo-content shell prose-page">
        <section className="seo-stats"><article><span>Bölüm</span><strong>{CATALOG_STATS.subjects.toLocaleString("tr-TR")}</strong></article><article><span>Üniversite</span><strong>{CATALOG_STATS.universities.toLocaleString("tr-TR")}</strong></article><article><span>Program</span><strong>{CATALOG_STATS.programs.toLocaleString("tr-TR")}</strong></article><article><span>Son paket</span><strong>19 Ağustos 2026</strong></article></section>
        <section><h2>Kaynak listesi</h2><div className="source-directory">{sources.map(([name, description, href]) => <a href={href} target="_blank" rel="noreferrer" key={name}><strong>{name}</strong><p>{description}</p><span>Resmî kaynağı aç ↗</span></a>)}</div></section>
        <section><h2>Eksik ve listelenmeyen veriler</h2><p>Yeni açılan, dolmayan veya kaynak tabloda bulunmayan programlarda geçmiş başarı sırası gösterilemeyebilir. THE, QS veya URAP listesinde bulunmayan üniversiteler “Listelenmedi” ya da “—” olarak işaretlenir; bu durum üniversitenin eğitim vermediği anlamına gelmez.</p></section>
        <section><h2>Güncellik</h2><p>Katalog ve kontenjanlar sürüm bazlı yerel dosyalarda tutulur. 2026 son yerleşen başarı sırası ise YÖK Atlas’ın güncel JSON servisinden program koduna göre alınır ve kısa süreli sunucu önbelleğiyle birleştirilir. Canlı kaynak erişilemezse geçmiş yerel katalog korunur; 2026 alanı veri gelene kadar “—” olarak kalır.</p></section>
        <div className="inline-links"><Link href="/metodoloji">Hesaplama yöntemini oku</Link><Link href="/">Kataloğa dön</Link></div>
      </div>
    </main>
  );
}
