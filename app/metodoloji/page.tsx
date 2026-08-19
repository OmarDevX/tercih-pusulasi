import type { Metadata } from "next";
import Link from "next/link";
import CompareNavLink from "../components/compare-nav-link";
import SeoHeader from "../components/seo-header";

export const metadata: Metadata = {
  title: "Üniversite Karşılaştırma Metodolojisi",
  description: "Tercih Pusulası sıralama, araştırma ve akademik ivme puanlarının nasıl hesaplandığını açıklar.",
  alternates: { canonical: "/metodoloji" },
};

export default function MethodologyPage() {
  return (
    <main className="seo-page">
      <SeoHeader eyebrow="Şeffaf hesaplama" title="Karşılaştırma metodolojisi" description="Üniversite karşılaştırma puanındaki ağırlıklar, eksik veri yaklaşımı ve yorumlama sınırları." />
      <div className="seo-content shell prose-page">
        <section><h2>Toplam puan</h2><p>Karşılaştırma ekranındaki toplam puan üç bileşenden oluşur: akademik sıralamalar %55, araştırma gücü %35 ve yayın ivmesi %10. Kullanılabilir bir bileşen eksikse kalan bileşenlerin ağırlığı kendi içinde yeniden ölçeklenir.</p></section>
        <section className="methodology-cards"><article><strong>%55</strong><h3>Sıralama</h3><p>URAP bileşeni %50, THE %25 ve QS %25 oranında birleşir. URAP sırası 1–198 arasında doğrusal puanlanır. THE ve QS bantları kademeli puana dönüştürülür.</p></article><article><strong>%35</strong><h3>Araştırma</h3><p>H-indeksi %40, atıf/yayın %20, iki yıllık ortalama etki %20 ve logaritmik yayın hacmi %20 ağırlık taşır. Değerler yalnızca seçilen üniversiteler arasında göreli ölçeklenir.</p></article><article><strong>%10</strong><h3>İvme</h3><p>OpenAlex yıllık yayın sayılarındaki değişim 0–100 aralığına sıkıştırılır. Bu puan toplam yayın gücünü değil, son dönemdeki üretim yönünü gösterir.</p></article></section>
        <section><h2>Listelenmeyen üniversiteler</h2><p>THE veya QS’de “Listelenmedi” sonucu sıfır yerine 5/100 kabul edilir. Böylece eksik kayıt ortalamadan çıkarılıp kuruma yapay avantaj sağlamaz; aynı zamanda tamamen sıfır değerle aşırı cezalandırılmaz.</p></section>
        <section><h2>Kontenjan tahmini</h2><p>“Daha seçici olabilir” veya “sıra genişleyebilir” etiketleri yalnızca 2025–2026 kontenjan farkına dayanır. Aday talebi, sınav dağılımı, burs koşulları, yeni program açılışları ve şehir tercihleri sonucu değiştirebilir.</p></section>
        <section><h2>Doğru kullanım</h2><p>Toplam puanı mutlak kalite sırası olarak kullanma. Önce hedef bölümü, sonra o bölümün öğretim kadrosunu, akreditasyonunu, laboratuvarlarını, staj ağını, şehri ve maliyeti incele. Akademik göstergeler bu kararın yalnızca bir parçasıdır.</p></section>
        <div className="inline-links"><CompareNavLink>Üniversite karşılaştır</CompareNavLink><Link href="/veri-kaynaklari">Kaynakları gör</Link></div>
      </div>
    </main>
  );
}
