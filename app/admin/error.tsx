"use client";

import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <Link className="admin-brand" href="/">
          <span>⌖</span> Tercih Pusulası
        </Link>
        <p className="admin-kicker">YÖNETİM PANELİ</p>
        <h1>Analytics yüklenemedi</h1>
        <p>
          Supabase bağlantısı veya analytics tablosu okunurken sunucu hatası oluştu.
          Son dağıtımın Vercel loglarını kontrol edin.
        </p>
        {error.digest ? (
          <div className="admin-login-error">Hata kodu: {error.digest}</div>
        ) : null}
        <button type="button" onClick={reset}>
          Yeniden dene <span>→</span>
        </button>
        <Link className="admin-back-link" href="/">
          ← Siteye dön
        </Link>
      </section>
    </main>
  );
}
