# Tercih Pusulası

YKS programlarını başarı sıralaması, kontenjan ve üniversitelerin akademik göstergeleriyle araştırmaya ve karşılaştırmaya yardımcı olan Next.js uygulaması.

## Gereksinimler

- Node.js 22.13 veya üstü
- npm

## Yerel geliştirme

```bash
npm ci
npm run dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde açılır.

## Üretim derlemesi

```bash
npm run build
npm start
```

Vercel, standart Next.js ayarlarını otomatik olarak algılar; özel bir build komutu gerekmez.

## Ortam değişkenleri

`.env.example` dosyasını `.env.local` olarak kopyalayın ve gerektiğinde düzenleyin:

```env
NEXT_PUBLIC_SITE_URL=https://tercih-pusulasi.vercel.app
NEXT_PUBLIC_CONTACT_EMAIL=omardevxme@gmail.com
```

## Veri güncelleme komutları

```bash
npm run sync:university-logos
npm run sync:university-research
```

ÖSYM 2026 program özellikleri için:

```bash
python3 scripts/sync-osym-2026-program-traits.py
```

2026 YKS başarı sıraları sunucu tarafında YÖK Atlas'ın güncel tercih-kılavuzu JSON verisinden alınır ve kısa süreli önbelleğe alınır. Statik katalog 2025/2024 geçmişini ve 2026 kontenjan verisini taşımaya devam eder; YÖK Atlas geçici olarak erişilemezse uygulama katalog sayfalarını çalıştırmaya devam eder ve 2026 sırasını boş gösterir.

## Temel sayfalar

- `/` — Bölüm ve üniversite arama
- `/bolumler` — Tüm bölümler
- `/universiteler` — Tüm üniversiteler
- `/bolum/[slug]` — Bölüm sayfası
- `/universite/[slug]` — Üniversite profili ve programları
- `/program/[slug]` — Program sayfası
- `/karsilastir/[slug]` — Kalıcı üniversite karşılaştırması
- `/sitemap.xml` — Arama motoru site haritası
- `/robots.txt` — Tarama kuralları

## Gizlilik ve kimlik doğrulama

Uygulamada kullanıcı hesabı, giriş sistemi veya sunucu tarafı veritabanı bulunmaz. Tercih listesi yalnızca kullanıcının tarayıcısındaki `localStorage` alanında tutulur.


## Admin analytics (Supabase PostgreSQL)

The analytics dashboard is available at `/admin`. Analytics are stored in Supabase PostgreSQL, which is durable on Vercel and does not use the Vercel filesystem.

### 1. Create the table

Create a Supabase project, open **SQL Editor**, paste `supabase/analytics.sql`, and run it once. The script creates the table, indexes, enables RLS, and blocks browser roles.

### 2. Configure Vercel

Add these variables in **Vercel > Project > Settings > Environment Variables**:

```env
ADMIN_ANALYTICS_TOKEN=your-long-random-admin-token
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=sb_secret_your_server_secret
```

The legacy `SUPABASE_SERVICE_ROLE_KEY` variable is also supported. Never use a `NEXT_PUBLIC_` prefix for the secret/service-role key. Redeploy after adding the variables.

Generate the admin token locally with:

```bash
openssl rand -hex 32
```

The dashboard records anonymous page views, searches, route popularity, API calls, latency, status codes, device/browser data, and Vercel-provided country/city headers. Raw IP addresses are not stored; when an IP is available, it is converted into a daily rotating hash.

`ANALYTICS_DATA_DIR` is no longer used.
