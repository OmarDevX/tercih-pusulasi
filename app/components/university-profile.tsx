import Link from "next/link";
import type { CSSProperties } from "react";

export type UniversityProfileYear = {
  year: number;
  works_count: number;
  cited_by_count: number;
};

export type UniversityProfileData = {
  name: string;
  city: string;
  type: string;
  logo: string | null;
  programCount: number;
  rankings: {
    urap: number | null;
    the: string;
    qs: string;
  };
  researchUpdatedAt: string;
  research: null | {
    established: number | null;
    officialWebsite: string | null;
    worksCount: number;
    citedByCount: number;
    citationsPerWork: number | null;
    hIndex: number | null;
    i10Index: number | null;
    meanCitedness2y: number | null;
    outputGrowth: number | null;
    countsByYear: UniversityProfileYear[];
  };
};

const formatNumber = (value: number | null | undefined, digits = 0) =>
  value === null || value === undefined
    ? "—"
    : new Intl.NumberFormat("tr-TR", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }).format(value);

type TrendTone = "neutral" | "up" | "down";

type TrendInfo = {
  label: string;
  tone: TrendTone;
  value: string;
};

const trendInfo = (growth: number | null | undefined): TrendInfo => {
  if (growth === null || growth === undefined) {
    return { label: "Veri yok", tone: "neutral", value: "—" };
  }
  const value = `${growth >= 0 ? "+" : ""}${formatNumber(growth, 1)}%`;
  if (growth >= 10) return { label: "Belirgin yükseliş", tone: "up", value };
  if (growth >= 2) return { label: "Yükseliyor", tone: "up", value };
  if (growth > -8) return { label: "Dengeli", tone: "neutral", value };
  return { label: "Geriliyor", tone: "down", value };
};

const RankingCard = ({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) => (
  <article className="university-ranking-card">
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{note}</small>
  </article>
);

export default function UniversityProfile({ profile }: { profile: UniversityProfileData }) {
  const research = profile.research;
  const counts = (research?.countsByYear ?? [])
    .filter((item) => item.year >= 2021 && item.year <= 2025)
    .sort((a, b) => a.year - b.year);
  const maxWorks = Math.max(...counts.map((item) => item.works_count), 1);
  const trend = trendInfo(research?.outputGrowth);
  const updatedAt = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" }).format(
    new Date(profile.researchUpdatedAt),
  );

  const metrics: Array<{
    label: string;
    value: string;
    tone?: TrendTone;
  }> = [
    { label: "Kuruluş yılı", value: formatNumber(research?.established) },
    { label: "Toplam akademik çıktı", value: formatNumber(research?.worksCount) },
    { label: "Toplam atıf", value: formatNumber(research?.citedByCount) },
    { label: "H-indeksi", value: formatNumber(research?.hIndex) },
    { label: "i10-indeksi", value: formatNumber(research?.i10Index) },
    { label: "Atıf / yayın", value: formatNumber(research?.citationsPerWork, 1) },
    { label: "2 yıllık ort. etki", value: formatNumber(research?.meanCitedness2y, 2) },
    { label: "2021–2025 yayın ivmesi", value: trend.value, tone: trend.tone },
  ];

  return (
    <section className="university-profile-section" aria-labelledby="university-profile-title">
      <div className="shell">
        <div className="university-profile-heading">
          <div className="university-profile-identity">
            <div className="university-profile-mark" aria-hidden="true">
              {profile.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.logo} alt="" />
              ) : (
                <span>
                  {profile.name
                    .split(" ")
                    .slice(0, 2)
                    .map((word) => word[0])
                    .join("")}
                </span>
              )}
            </div>
            <div>
              <span className="university-profile-kicker">Üniversite akademik profili</span>
              <h2 id="university-profile-title">{profile.name}</h2>
              <p>
                {profile.city} · {profile.type} · {formatNumber(profile.programCount)} program
              </p>
            </div>
          </div>
          <div className="university-profile-actions">
            {research?.officialWebsite && (
              <a href={research.officialWebsite} target="_blank" rel="noreferrer">
                Resmî site <span aria-hidden="true">↗</span>
              </a>
            )}
            <Link href="#universite-bolumleri">
              Bölümlere geç <span aria-hidden="true">↓</span>
            </Link>
          </div>
        </div>

        <div className="university-ranking-grid" aria-label="Üniversite sıralamaları">
          <RankingCard
            label="URAP Türkiye"
            value={profile.rankings.urap === null ? "Listelenmedi" : `#${profile.rankings.urap}`}
            note="2025–2026 Türkiye sıralaması"
          />
          <RankingCard
            label="THE Dünya"
            value={profile.rankings.the || "Listelenmedi"}
            note="THE World University Rankings 2026"
          />
          <RankingCard
            label="QS Dünya"
            value={profile.rankings.qs || "Listelenmedi"}
            note="QS World University Rankings 2027"
          />
        </div>

        <div className="university-profile-content">
          <section className="university-metrics-card" aria-labelledby="academic-metrics-title">
            <div className="university-card-heading">
              <div>
                <span>OpenAlex + ROR</span>
                <h3 id="academic-metrics-title">Akademik göstergeler</h3>
              </div>
              <small>{updatedAt} güncellemesi</small>
            </div>

            {research ? (
              <dl className="university-metrics-grid">
                {metrics.map((metric) => (
                  <div key={metric.label} className={metric.tone ? `metric-${metric.tone}` : undefined}>
                    <dt>{metric.label}</dt>
                    <dd>{metric.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="university-profile-empty">
                <strong>Araştırma kaydı eşleşmedi.</strong>
                <p>Programlar ve sıralama verileri yine aşağıda eksiksiz gösterilir.</p>
              </div>
            )}
          </section>

          <section className="university-trend-card" aria-labelledby="research-trend-title">
            <div className="university-card-heading university-trend-heading">
              <div>
                <span>2021–2025</span>
                <h3 id="research-trend-title">Yıllık araştırma üretimi</h3>
              </div>
              <div className="university-trend-score">
                <span className={`trend-pill ${trend.tone}`}>{trend.label}</span>
                <strong>{trend.value}</strong>
              </div>
            </div>

            {counts.length > 0 ? (
              <div className="university-trend-bars" aria-label="Yıllara göre akademik çıktı">
                {counts.map((item, index) => (
                  <div key={item.year}>
                    <span>
                      <i
                        style={{
                          height: `${Math.max(9, (item.works_count / maxWorks) * 100)}%`,
                          "--bar-index": index,
                        } as CSSProperties}
                      />
                    </span>
                    <b>{item.year}</b>
                    <small>{formatNumber(item.works_count)}</small>
                  </div>
                ))}
              </div>
            ) : (
              <div className="university-profile-empty compact">
                <p>Yıllık yayın serisi bulunamadı.</p>
              </div>
            )}
            <p className="university-profile-source-note">
              Akademik çıktı sayıları kurumun OpenAlex eşleşmesine dayanır. 2026 tamamlanmadığı için ivme hesabında kullanılmaz.
            </p>
          </section>
        </div>

        <div className="university-programs-divider" id="universite-bolumleri">
          <div>
            <span>Bölümler ve sıralamalar</span>
            <h2>{profile.name} programları</h2>
            <p>Şimdi aşağıdaki ayrıntılı kartlardan bölüm, başarı sırası ve kontenjanları inceleyebilirsin.</p>
          </div>
          <strong>{formatNumber(profile.programCount)}<small> program</small></strong>
        </div>
      </div>
    </section>
  );
}
