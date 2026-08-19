"use client";

import type { Program } from "../data";
import type { OsymProgramTraits } from "../osym-traits";

type ExportProgram = Program & {
  traits: OsymProgramTraits;
};

type ExportResponse = {
  generatedAt: string;
  osymGuide: {
    name: string;
    date: string;
    url: string;
  };
  programs: ExportProgram[];
};

const escapeHtml = (value: string | number | null | undefined) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatNumber = (value: number | null) =>
  value === null ? "-" : new Intl.NumberFormat("tr-TR").format(value);

const detailItem = (label: string, value: string, className = "") => `
  <div class="detail-item ${className}">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(value)}</strong>
  </div>
`;

const traitBadges = (values: string[]) =>
  values.length > 0
    ? `<div class="trait-badges">${values.map((value) => `<b>${escapeHtml(value)}</b>`).join("")}</div>`
    : `<strong class="empty-value">Ek özellik etiketi yok</strong>`;

const accreditationMarkup = (program: ExportProgram) => {
  if (program.traits.accreditations.length === 0) {
    return `
      <div class="detail-item status-neutral accreditation-card">
        <span>Program akreditasyonu</span>
        <strong>Kılavuzda belirtilmemiş</strong>
      </div>
    `;
  }

  return `
    <div class="detail-item status-positive accreditation-card">
      <span>Program akreditasyonu</span>
      <div class="accreditation-list">
        ${program.traits.accreditations.map((item) => `
          <div>
            <strong>${escapeHtml(item.code)}</strong>
            <small>${escapeHtml(item.name)}</small>
          </div>
        `).join("")}
      </div>
    </div>
  `;
};

const buildProgramCard = (program: ExportProgram, index: number) => `
  <article class="program-card">
    <div class="program-heading">
      <span class="order-number">${index + 1}</span>
      <div>
        <p class="university-name">${escapeHtml(program.university)}</p>
        <h2>${escapeHtml(program.programName)}</h2>
        <p class="program-meta">${escapeHtml(program.faculty)} · ${escapeHtml(program.city)} · ${escapeHtml(program.scoreType)} · ${escapeHtml(program.language)} · ${escapeHtml(program.scholarship)}</p>
      </div>
      <div class="osym-code">
        <span>ÖSYM program kodu</span>
        <strong>${escapeHtml(program.id)}</strong>
      </div>
    </div>

    <div class="section-title">Başarı sıralaması</div>
    <div class="detail-grid three-column">
      ${detailItem("2024 başarı sırası", formatNumber(program.rank2024))}
      ${detailItem("2025 başarı sırası", formatNumber(program.rank2025))}
      ${detailItem("2026 başarı sırası", formatNumber(program.rank2026), "detail-accent")}
    </div>

    <div class="section-title">Kontenjan geçmişi</div>
    <div class="detail-grid three-column">
      ${detailItem("2024 kontenjan", formatNumber(program.quota2024))}
      ${detailItem("2025 kontenjan", formatNumber(program.quota2025))}
      ${detailItem("2026 kontenjan", formatNumber(program.quota2026), "detail-accent")}
    </div>

    <div class="section-title">Akreditasyon ve program özellikleri</div>
    <div class="trait-grid">
      ${accreditationMarkup(program)}
      ${detailItem("Türkiye Yeterlilikler Çerçevesi", program.traits.tyc ? "TYÇ logosu var" : "Kılavuzda belirtilmemiş", program.traits.tyc ? "status-positive" : "status-neutral")}
      ${detailItem("Kurumsal akreditasyon", program.traits.yokak ? "YÖKAK" : "Kılavuzda belirtilmemiş", program.traits.yokak ? "status-positive" : "status-neutral")}
      <div class="detail-item program-tags-card">
        <span>Program özellikleri</span>
        ${traitBadges(program.traits.tags)}
      </div>
    </div>

    <div class="section-title">Üniversite sıralamaları</div>
    <div class="detail-grid three-column">
      ${detailItem("URAP Türkiye", program.urap === null ? "Listelenmedi" : formatNumber(program.urap))}
      ${detailItem("THE Dünya", program.the || "Listelenmedi")}
      ${detailItem("QS Dünya", program.qs || "Listelenmedi")}
    </div>
  </article>
`;

export const buildPreferenceReportHtml = (data: ExportResponse) => {
  const generatedDate = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(data.generatedAt));
  const accreditedCount = data.programs.filter(
    (program) => program.traits.accreditations.length > 0,
  ).length;
  const tycCount = data.programs.filter((program) => program.traits.tyc).length;
  const yokakCount = data.programs.filter((program) => program.traits.yokak).length;

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tercih-Listem-${new Date(data.generatedAt).getFullYear()}</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #171923;
      --muted: #6b6f79;
      --line: #dfe2dc;
      --paper: #ffffff;
      --soft: #f4f5f0;
      --green: #6b942c;
      --mint: #ddffab;
      --purple: #725fc4;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      color: var(--ink);
      font-family: Inter, Arial, Helvetica, sans-serif;
      font-size: 10.5pt;
      line-height: 1.4;
      background: #eef0eb;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .print-toolbar {
      position: sticky;
      z-index: 10;
      top: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 12px max(18px, calc((100vw - 210mm) / 2));
      color: #fff;
      background: #161923;
      box-shadow: 0 8px 30px rgba(0, 0, 0, .18);
    }

    .print-toolbar p { margin: 0; font-size: 13px; }
    .print-toolbar div { display: flex; gap: 8px; }
    .print-toolbar button {
      min-height: 38px;
      padding: 0 16px;
      color: #161923;
      font: inherit;
      font-weight: 800;
      border: 0;
      border-radius: 8px;
      background: var(--mint);
      cursor: pointer;
    }
    .print-toolbar button.secondary { background: #fff; }

    .report {
      width: 210mm;
      min-height: 297mm;
      margin: 20px auto;
      padding: 14mm;
      background: var(--paper);
      box-shadow: 0 15px 45px rgba(18, 20, 28, .12);
    }

    .report-header {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 18px;
      align-items: end;
      padding: 0 0 8mm;
      border-bottom: 2px solid var(--ink);
    }

    .brand {
      margin: 0 0 3px;
      color: var(--green);
      font-size: 9pt;
      font-weight: 900;
      letter-spacing: .13em;
      text-transform: uppercase;
    }

    h1 { margin: 0; font-size: 25pt; letter-spacing: -.045em; }
    .report-subtitle { margin: 7px 0 0; color: var(--muted); }

    .summary {
      display: grid;
      grid-template-columns: repeat(2, minmax(90px, 1fr));
      gap: 7px;
      min-width: 250px;
    }

    .summary div {
      padding: 9px 11px;
      border: 1px solid var(--line);
      border-radius: 9px;
      background: var(--soft);
    }

    .summary span, .detail-item > span, .osym-code span {
      display: block;
      margin-bottom: 3px;
      color: var(--muted);
      font-size: 7.2pt;
      font-weight: 800;
      letter-spacing: .04em;
      text-transform: uppercase;
    }

    .summary strong { font-size: 14pt; }
    .program-list { display: grid; gap: 6mm; padding-top: 7mm; }

    .program-card {
      padding: 5mm;
      border: 1px solid var(--line);
      border-radius: 4mm;
      background: var(--paper);
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .program-heading {
      display: grid;
      grid-template-columns: 11mm 1fr auto;
      gap: 4mm;
      align-items: start;
      padding-bottom: 4mm;
      border-bottom: 1px solid var(--line);
    }

    .order-number {
      width: 10mm;
      height: 10mm;
      display: grid;
      place-items: center;
      font-size: 11pt;
      font-weight: 900;
      border-radius: 50%;
      background: var(--mint);
    }

    .university-name {
      margin: 0 0 2px;
      color: var(--green);
      font-size: 9pt;
      font-weight: 900;
    }

    h2 { margin: 0; font-size: 14pt; line-height: 1.2; letter-spacing: -.02em; }
    .program-meta { margin: 5px 0 0; color: var(--muted); font-size: 8.5pt; }

    .osym-code {
      min-width: 38mm;
      padding: 9px 11px;
      text-align: right;
      border-radius: 8px;
      background: #eff0f6;
    }
    .osym-code strong { font-size: 11pt; letter-spacing: .04em; }

    .section-title {
      margin: 4mm 0 2mm;
      color: #454954;
      font-size: 8pt;
      font-weight: 900;
      letter-spacing: .075em;
      text-transform: uppercase;
    }

    .detail-grid { display: grid; gap: 2.4mm; }
    .two-column { grid-template-columns: repeat(2, 1fr); }
    .three-column { grid-template-columns: repeat(3, 1fr); }
    .trait-grid {
      display: grid;
      grid-template-columns: 1.4fr .8fr .8fr;
      gap: 2.4mm;
    }

    .detail-item {
      min-height: 16mm;
      padding: 3mm;
      border: 1px solid var(--line);
      border-radius: 2.5mm;
      background: var(--soft);
    }
    .detail-item > strong { display: block; font-size: 10.5pt; line-height: 1.25; }
    .detail-accent { border-color: #b9d98a; background: #f0f9e3; }
    .status-positive { border-color: #a9d56d; background: #eff9e2; }
    .status-positive > strong { color: #3e6810; }
    .status-neutral > strong, .empty-value { color: #666a74; }
    .accreditation-card { grid-row: span 2; }
    .program-tags-card { grid-column: 2 / -1; }

    .accreditation-list { display: grid; gap: 7px; }
    .accreditation-list div {
      padding-top: 6px;
      border-top: 1px solid rgba(70, 104, 25, .18);
    }
    .accreditation-list div:first-child { padding-top: 0; border-top: 0; }
    .accreditation-list strong { display: block; color: #3e6810; font-size: 11pt; }
    .accreditation-list small { display: block; margin-top: 2px; color: #5c6750; font-size: 7.2pt; line-height: 1.25; }

    .trait-badges { display: flex; flex-wrap: wrap; gap: 5px; }
    .trait-badges b {
      padding: 4px 7px;
      color: #4d3d8b;
      font-size: 7.2pt;
      line-height: 1;
      border: 1px solid #d9d0f5;
      border-radius: 999px;
      background: #f1edff;
    }

    .report-notes {
      margin-top: 8mm;
      padding-top: 5mm;
      color: var(--muted);
      font-size: 7.5pt;
      line-height: 1.32;
      border-top: 1px solid var(--line);
    }
    .report-notes p { margin: 0 0 3px; }
    .report-notes a { color: inherit; overflow-wrap: anywhere; }

    @page { size: A4 portrait; margin: 11mm; }

    @media print {
      body { background: #fff; }
      .print-toolbar { display: none !important; }
      .report {
        width: auto;
        min-height: 0;
        margin: 0;
        padding: 0;
        box-shadow: none;
      }
      .program-list { gap: 5mm; }
    }

    @media (max-width: 760px) {
      .report { width: 100%; margin: 0; padding: 18px; }
      .report-header, .program-heading { grid-template-columns: 1fr; }
      .summary, .two-column, .three-column, .trait-grid { grid-template-columns: 1fr 1fr; }
      .accreditation-card, .program-tags-card { grid-column: 1 / -1; grid-row: auto; }
      .osym-code { text-align: left; }
      .print-toolbar { position: static; padding: 12px; }
    }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <p>Yazdırma penceresinde hedef olarak <strong>PDF olarak kaydet</strong> seç.</p>
    <div>
      <button type="button" onclick="window.print()">PDF'yi kaydet</button>
      <button class="secondary" type="button" onclick="window.close()">Kapat</button>
    </div>
  </div>

  <main class="report">
    <header class="report-header">
      <div>
        <p class="brand">Tercih Pusulası</p>
        <h1>Tercih Listem</h1>
        <p class="report-subtitle">Sıralı tercih raporu · ${escapeHtml(generatedDate)}</p>
      </div>
      <div class="summary">
        <div><span>Toplam tercih</span><strong>${data.programs.length}</strong></div>
        <div><span>Akredite program</span><strong>${accreditedCount}</strong></div>
        <div><span>TYÇ işaretli</span><strong>${tycCount}</strong></div>
        <div><span>YÖKAK kurum</span><strong>${yokakCount}</strong></div>
      </div>
    </header>

    <section class="program-list">
      ${data.programs.map(buildProgramCard).join("")}
    </section>

    <footer class="report-notes">
      <p><strong>Veri notu:</strong> Başarı sıralamaları 2024, 2025 ve 2026 yerleştirme verilerini; kontenjanlar 2024, 2025 ve 2026 sayılarını gösterir. “-” işareti veri bulunmadığını belirtir.</p>
      <p><strong>Akreditasyon:</strong> Program akreditasyonu, TYÇ işareti ve YÖKAK kurumsal akreditasyon bilgileri ${escapeHtml(data.osymGuide.date)} tarihli resmî ÖSYM kılavuzundaki ilgili sütunlardan program koduna göre alınmıştır. Boş sütunlar “kılavuzda belirtilmemiş” olarak gösterilir.</p>
      <p><strong>Kaynak:</strong> ${escapeHtml(data.osymGuide.name)} · <a href="${escapeHtml(data.osymGuide.url)}">${escapeHtml(data.osymGuide.url)}</a> · Bu rapor tercih desteği içindir; nihai kontrolü ÖSYM kılavuzu ve üniversitelerin resmî duyurularından yap.</p>
    </footer>
  </main>

  <script>
    window.addEventListener("load", function () {
      window.setTimeout(function () { window.print(); }, 450);
    });
  </script>
</body>
</html>`;
};

const loadingHtml = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>Tercih listesi hazırlanıyor</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Arial,sans-serif;color:#171923;background:#f4f5f0}.box{text-align:center;padding:40px}.spinner{width:42px;height:42px;margin:0 auto 18px;border:4px solid #dfe2dc;border-top-color:#719c2f;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}p{color:#6b6f79}</style>
</head><body><div class="box"><div class="spinner"></div><h1>PDF raporu hazırlanıyor</h1><p>Program, sıralama, kontenjan ve resmî ÖSYM akreditasyon bilgileri hazırlanıyor.</p></div></body></html>`;

const errorHtml = (message: string) => `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>PDF oluşturulamadı</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Arial,sans-serif;color:#171923;background:#f4f5f0}.box{max-width:520px;text-align:center;padding:40px;border:1px solid #dedfd9;border-radius:16px;background:#fff}button{height:42px;padding:0 18px;font:inherit;font-weight:800;border:0;border-radius:8px;background:#ddffab}</style>
</head><body><div class="box"><h1>PDF oluşturulamadı</h1><p>${escapeHtml(message)}</p><button onclick="window.close()">Kapat</button></div></body></html>`;

const writeWindow = (target: Window, html: string) => {
  target.document.open();
  target.document.write(html);
  target.document.close();
};

export const exportPreferenceListAsPdf = async (programIds: string[]) => {
  const reportWindow = window.open("", "_blank", "width=1100,height=850");
  if (!reportWindow) throw new Error("Tarayıcı yeni pencereyi engelledi. Açılır pencerelere izin verip tekrar dene.");

  reportWindow.opener = null;
  writeWindow(reportWindow, loadingHtml);

  try {
    const response = await fetch("/api/preferences/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: programIds }),
    });

    const payload = (await response.json()) as ExportResponse | { error?: string };
    if (!response.ok || !("programs" in payload)) {
      throw new Error("error" in payload && payload.error ? payload.error : "PDF verileri alınamadı.");
    }

    writeWindow(reportWindow, buildPreferenceReportHtml(payload));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu.";
    writeWindow(reportWindow, errorHtml(message));
    throw error;
  }
};
