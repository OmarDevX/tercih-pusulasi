import type { Metadata } from "next";
import SeoHeader from "../components/seo-header";

export const metadata: Metadata = {
  title: "Gizlilik",
  description: "Tercih Pusulası'nın yerel tercih listesi, sunucu günlükleri ve haricî bağlantılarla ilgili gizlilik açıklaması.",
  alternates: { canonical: "/gizlilik" },
};

export default function PrivacyPage() {
  return (
    <main className="seo-page">
      <SeoHeader eyebrow="Açık gizlilik özeti" title="Gizlilik" description="Sitenin tarayıcıda hangi bilgiyi tuttuğu ve hangi verileri doğrudan toplamadığı." />
      <div className="seo-content shell prose-page">
        <section><h2>Tercih listesi</h2><p>Eklediğin programlar hesabına gönderilmez; tarayıcının yerel depolama alanında saklanır. Tarayıcı verilerini temizlediğinde tercih listesi silinir.</p></section>
        <section><h2>Hesap ve form verisi</h2><p>Mevcut sürüm kullanıcı hesabı, ödeme, yorum veya kişisel profil toplamaz. Arama ve filtreler katalog üzerinde çalışır.</p></section>
        <section><h2>Barındırma günlükleri</h2><p>Siteyi barındıran sağlayıcı güvenlik, hata ayıklama ve trafik yönetimi için IP adresi, tarayıcı türü ve istek zamanı gibi standart teknik günlükler tutabilir. Bu günlüklerin süresi ve kapsamı seçilen barındırma sağlayıcısının politikasına bağlıdır.</p></section>
        <section><h2>Haricî bağlantılar</h2><p>YÖK, ÖSYM, URAP, THE, QS, OpenAlex, ROR ve GSB bağlantıları kendi gizlilik politikalarına tabidir. Bu siteler açıldığında Tercih Pusulası onların veri işleme süreçlerini kontrol etmez.</p></section>
      </div>
    </main>
  );
}
