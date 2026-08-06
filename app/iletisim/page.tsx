import type { Metadata } from "next";
import Link from "next/link";
import SeoHeader from "../components/seo-header";

export const metadata: Metadata = {
  title: "İletişim ve Veri Düzeltme",
  description: "Tercih Pusulası için veri düzeltme, kaynak bildirimi ve teknik geri bildirim yönergeleri.",
  alternates: { canonical: "/iletisim" },
};

export default function ContactPage() {
  const email = "omardevxme@gmail.com";
  return (
    <main className="seo-page">
      <SeoHeader eyebrow="Geri bildirim" title="İletişim ve veri düzeltme" description="Yanlış veya güncelliğini yitirmiş bir kayıt gördüğünde doğrulanabilir kaynakla bildirim yap." />
      <div className="seo-content shell prose-page">
        <section><h2>Veri düzeltme bildirimi</h2><p>Bildirimde ÖSYM program kodunu, üniversite ve program adını, hatalı görünen alanı ve doğrulayan resmî bağlantıyı ekle. Ekran görüntüsü tek başına yeterli kaynak sayılmaz.</p></section>
        <section><h2>Teknik hata bildirimi</h2><p>Kullandığın cihaz ve tarayıcıyı, açtığın sayfanın adresini, beklenen sonucu ve gerçekleşen hatayı yaz. Mümkünse hatayı tekrar oluşturma adımlarını ekle.</p></section>
        {email ? <a className="contact-action" href={`mailto:${email}`}>E-posta gönder: {email}</a> : <p className="contact-placeholder">Yayın sahibi iletişim adresini <code>NEXT_PUBLIC_CONTACT_EMAIL</code> ortam değişkeniyle ekleyebilir.</p>}
        <div className="inline-links"><Link href="/veri-kaynaklari">Kaynak kapsamı</Link><Link href="/gizlilik">Gizlilik</Link></div>
      </div>
    </main>
  );
}
