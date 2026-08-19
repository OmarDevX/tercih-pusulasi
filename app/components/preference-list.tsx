"use client";

import {
  createContext,
  DragEvent as ReactDragEvent,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Program } from "../data";
import { exportPreferenceListAsPdf } from "./preference-pdf";

const STORAGE_KEY = "tercih-pusulasi-list-v2";

const formatRank = (rank: number | null | undefined) =>
  rank == null ? "—" : new Intl.NumberFormat("tr-TR").format(rank);

const formatAcademicScore = (score: number) =>
  new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(score);

const normalizeStoredProgram = (value: unknown): Program | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Program>;
  if (typeof candidate.id !== "string" || typeof candidate.programName !== "string") return null;
  return { ...candidate, rank2026: candidate.rank2026 ?? null } as Program;
};

type PreferenceListContextValue = {
  selectedPrograms: Program[];
  selectedIds: Set<string>;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  togglePreference: (program: Program) => void;
};

const PreferenceListContext = createContext<PreferenceListContextValue | null>(null);

export function PreferenceListProvider({ children }: { children: ReactNode }) {
  const [selectedPrograms, setSelectedPrograms] = useState<Program[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [draggedPreferenceId, setDraggedPreferenceId] = useState<string | null>(null);
  const [dragOverPreferenceId, setDragOverPreferenceId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [pdfExporting, setPdfExporting] = useState(false);
  const [autoSorting, setAutoSorting] = useState(false);
  const [academicScores, setAcademicScores] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setSelectedPrograms(
              parsed.map(normalizeStoredProgram).filter((program): program is Program => program !== null),
            );
          }
        }
      } catch {
        // Local storage can be unavailable in strict browsing modes.
      }
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedPrograms));
    } catch {
      // Keep the in-memory list usable even when storage is unavailable.
    }
  }, [hydrated, selectedPrograms]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!drawerOpen) return;
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", closeWithEscape);
    return () => window.removeEventListener("keydown", closeWithEscape);
  }, [drawerOpen]);

  const selectedIds = useMemo(
    () => new Set(selectedPrograms.map((program) => program.id)),
    [selectedPrograms],
  );

  const togglePreference = (program: Program) => {
    const selected = selectedIds.has(program.id);
    setAcademicScores(null);
    setSelectedPrograms((current) =>
      selected
        ? current.filter((item) => item.id !== program.id)
        : [...current, program],
    );
    setToast(selected ? "Tercih listesinden çıkarıldı." : "Tercih listene eklendi.");
  };

  const movePreference = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setAcademicScores(null);
    setSelectedPrograms((current) => {
      const sourceIndex = current.findIndex((program) => program.id === sourceId);
      const targetIndex = current.findIndex((program) => program.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const reordered = [...current];
      const [moved] = reordered.splice(sourceIndex, 1);
      reordered.splice(targetIndex, 0, moved);
      return reordered;
    });
    setToast("Tercih sırası güncellendi.");
  };

  const movePreferenceBy = (programId: string, offset: -1 | 1) => {
    const index = selectedPrograms.findIndex((program) => program.id === programId);
    const target = selectedPrograms[index + offset];
    if (index < 0 || !target) return;
    movePreference(programId, target.id);
  };

  const beginPreferenceDrag = (
    event: ReactDragEvent<HTMLButtonElement>,
    programId: string,
  ) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", programId);
    setDraggedPreferenceId(programId);
  };

  const dropPreference = (
    event: ReactDragEvent<HTMLElement>,
    targetId: string,
  ) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/plain") || draggedPreferenceId;
    if (sourceId) movePreference(sourceId, targetId);
    setDraggedPreferenceId(null);
    setDragOverPreferenceId(null);
  };

  const autoSortPreferences = async () => {
    if (selectedPrograms.length < 2 || autoSorting) return;
    setAutoSorting(true);
    try {
      const response = await fetch("/api/preferences/sort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programIds: selectedPrograms.map((program) => program.id) }),
      });
      const payload = await response.json() as {
        sortedProgramIds?: string[];
        scores?: Record<string, number>;
        error?: string;
      };
      if (!response.ok || !payload.sortedProgramIds || !payload.scores) {
        throw new Error(payload.error ?? "Tercihler otomatik sıralanamadı.");
      }
      const programsById = new Map(selectedPrograms.map((program) => [program.id, program]));
      const sortedPrograms = payload.sortedProgramIds
        .map((id) => programsById.get(id))
        .filter((program): program is Program => program !== undefined);
      if (sortedPrograms.length !== selectedPrograms.length) {
        throw new Error("Otomatik sıralama sonucu eksik döndü.");
      }
      setSelectedPrograms(sortedPrograms);
      setAcademicScores(payload.scores);
      setToast("Tercihler karşılaştırmadaki akademik puana göre sıralandı.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Tercihler otomatik sıralanamadı.");
    } finally {
      setAutoSorting(false);
    }
  };

  const exportAsPdf = async () => {
    if (selectedPrograms.length === 0 || pdfExporting) return;
    setPdfExporting(true);
    try {
      await exportPreferenceListAsPdf(selectedPrograms.map((program) => program.id));
      setToast("PDF raporu açıldı. Yazdırma penceresinde PDF olarak kaydet'i seç.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "PDF raporu oluşturulamadı.");
    } finally {
      setPdfExporting(false);
    }
  };

  return (
    <PreferenceListContext.Provider
      value={{
        selectedPrograms,
        selectedIds,
        drawerOpen,
        openDrawer: () => setDrawerOpen(true),
        closeDrawer: () => setDrawerOpen(false),
        togglePreference,
      }}
    >
      {children}

      {drawerOpen && (
        <div className="drawer-backdrop" role="presentation" onMouseDown={() => setDrawerOpen(false)}>
          <aside
            className="preference-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="preference-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <span>Tercih planın</span>
                <h2 id="preference-title">Tercih Listem ({selectedPrograms.length})</h2>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Tercih listesini kapat">×</button>
            </div>
            <div className="drawer-sort-tools">
              <p className="drawer-info">Sıralamayı elle değiştirebilir veya karşılaştırmadaki akademik puanla otomatik düzenleyebilirsin. Liste bu cihazda saklanır.</p>
              <button
                className="auto-sort-preferences"
                type="button"
                onClick={autoSortPreferences}
                disabled={selectedPrograms.length < 2 || autoSorting || pdfExporting}
              >
                <span aria-hidden="true">⇅</span>
                {autoSorting ? "Puanlar hesaplanıyor..." : "Akademik puana göre sırala"}
              </button>
            </div>
            <div className="drawer-list">
              {selectedPrograms.length === 0 ? (
                <div className="drawer-empty"><span>▯</span><p>Henüz program eklemedin.</p></div>
              ) : (
                selectedPrograms.map((program, index) => (
                  <article
                    key={program.id}
                    className={`${draggedPreferenceId === program.id ? "is-dragging" : ""} ${dragOverPreferenceId === program.id ? "is-drop-target" : ""}`.trim()}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      if (draggedPreferenceId !== program.id) setDragOverPreferenceId(program.id);
                    }}
                    onDragLeave={() => {
                      if (dragOverPreferenceId === program.id) setDragOverPreferenceId(null);
                    }}
                    onDrop={(event) => dropPreference(event, program.id)}
                  >
                    <button
                      className="preference-drag-handle"
                      type="button"
                      draggable
                      onDragStart={(event) => beginPreferenceDrag(event, program.id)}
                      onDragEnd={() => {
                        setDraggedPreferenceId(null);
                        setDragOverPreferenceId(null);
                      }}
                      aria-label={`${index + 1}. tercihi sürükleyerek sırala`}
                      title="Sürükleyerek sırala"
                    >
                      <span aria-hidden="true">⠿</span>
                    </button>
                    <span className="preference-number">{index + 1}</span>
                    <div>
                      <h3>{program.university}</h3>
                      <p>{program.programName}</p>
                      <small>2026: {formatRank(program.rank2026)} · {program.city}{academicScores?.[program.university] !== undefined ? ` · Akademik puan ${formatAcademicScore(academicScores[program.university])}` : ""}</small>
                    </div>
                    <div className="preference-actions">
                      <button type="button" disabled={index === 0} onClick={() => movePreferenceBy(program.id, -1)} aria-label={`${program.university} tercihini yukarı taşı`}>↑</button>
                      <button type="button" disabled={index === selectedPrograms.length - 1} onClick={() => movePreferenceBy(program.id, 1)} aria-label={`${program.university} tercihini aşağı taşı`}>↓</button>
                      <button className="remove-preference" type="button" onClick={() => togglePreference(program)} aria-label={`${program.university} programını çıkar`}>×</button>
                    </div>
                  </article>
                ))
              )}
            </div>
            {selectedPrograms.length > 0 && (
              <div className="drawer-footer-actions">
                <button
                  className="export-pdf"
                  type="button"
                  onClick={exportAsPdf}
                  disabled={pdfExporting || autoSorting}
                >
                  <span aria-hidden="true">⇩</span>
                  {pdfExporting ? "PDF hazırlanıyor..." : "PDF olarak dışa aktar"}
                </button>
                <button className="clear-list" type="button" onClick={() => { setSelectedPrograms([]); setAcademicScores(null); }} disabled={pdfExporting || autoSorting}>Listeyi temizle</button>
              </div>
            )}
          </aside>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </PreferenceListContext.Provider>
  );
}

export function usePreferenceList() {
  const context = useContext(PreferenceListContext);
  if (!context) throw new Error("usePreferenceList must be used inside PreferenceListProvider");
  return context;
}

export function PreferenceListButton() {
  const { selectedPrograms, openDrawer } = usePreferenceList();
  return (
    <button type="button" onClick={openDrawer} aria-label={`Tercih listemi aç, ${selectedPrograms.length} program`}>
      <span aria-hidden="true">▯</span>
      Tercih Listem <b>({selectedPrograms.length})</b>
    </button>
  );
}
