"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { trackAnalytics } from "./components/analytics/tracker";
import {
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CATALOG_STATS,
  SCHOLARSHIP_OPTIONS,
  SUBJECT_GROUPS,
  type Program,
  type ProgramTuple,
  type ScholarshipType,
  type SubjectGroup,
  programFromTuple,
} from "./data";
import { slugify } from "./slug";
import CompareNavLink from "./components/compare-nav-link";
import { PreferenceListButton, usePreferenceList } from "./components/preference-list";
import UniversityProfile, { type UniversityProfileData } from "./components/university-profile";

type TypeFilter = "Tümü" | "Devlet" | "Vakıf";
type LocationFilter = "Türkiye" | "Türkiye + KKTC" | "KKTC" | "Tümü";
type ScholarshipFilter = "Tümü" | ScholarshipType;
type ProgramFilter = "Tümü" | "Standart" | "M.T.O.K.";
type LevelFilter = "Tümü" | Program["level"];
type LanguageFilter = "Tümü" | "Türkçe" | "İngilizce" | "İngilizce (%30)";
type ScoreTypeFilter = "Tümü" | "TYT" | "SAY" | "EA" | "SÖZ";
type SortField = "rank2026" | "urap" | "the" | "qs";
type SortDirection = "asc" | "desc";
type SortOption =
  | "rank2026-asc"
  | "rank2026-desc"
  | "urap-asc"
  | "urap-desc"
  | "the-asc"
  | "the-desc"
  | "qs-asc"
  | "qs-desc";
type ProgramChunk = {
  programs: ProgramTuple[];
  total: number;
  page: number;
  pageCount: number;
};
type SearchSelection =
  | { kind: "subject"; group: SubjectGroup }
  | { kind: "university"; university: string };
type SearchSuggestion =
  | { kind: "subject"; label: string; group: SubjectGroup }
  | { kind: "university"; label: string; university: string };

const DEFAULT_GROUP =
  SUBJECT_GROUPS.find((group) => group.name === "Elektrik-Elektronik Mühendisliği") ??
  SUBJECT_GROUPS[0];

const subjectPagePath = (subject: string) => `/bolum/${slugify(subject)}`;
const universityPagePath = (university: string) => `/universite/${slugify(university)}`;
const programPagePath = (program: Pick<Program, "id" | "programName">) =>
  `/program/${program.id}-${slugify(program.programName)}`;

const formatRank = (rank: number | null) =>
  rank === null ? "—" : new Intl.NumberFormat("tr-TR").format(rank);

const UniversityMark = ({ program }: { program: Program }) => {
  return (
    <div className="uni-monogram" aria-hidden="true">
      <span>{program.university.split(" ").slice(0, 2).map((word) => word[0]).join("")}</span>
      {program.universityLogo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="university-logo-image"
          src={program.universityLogo}
          alt=""
          loading="lazy"
        />
      )}
    </div>
  );
};

const formatCount = (value: number) => new Intl.NumberFormat("tr-TR").format(value);

const SORT_LABELS: Record<SortOption, string> = {
  "rank2026-asc": "2026 başarı sırası: düşük → yüksek",
  "rank2026-desc": "2026 başarı sırası: yüksek → düşük",
  "urap-asc": "URAP: en iyi → en düşük",
  "urap-desc": "URAP: en düşük → en iyi",
  "the-asc": "THE: en iyi → en düşük",
  "the-desc": "THE: en düşük → en iyi",
  "qs-asc": "QS: en iyi → en düşük",
  "qs-desc": "QS: en düşük → en iyi",
};

const worldRankingNumber = (value: string) => {
  if (!value || value === "Listelenmedi") return null;
  const match = value.replaceAll(".", "").match(/\d+/);
  return match ? Number(match[0]) : null;
};

const compareRankValues = (
  left: number | null,
  right: number | null,
  direction: SortDirection,
) => {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return direction === "asc" ? left - right : right - left;
};

const programRankingValue = (program: Program, field: SortField) => {
  if (field === "rank2026") return program.rank2026;
  if (field === "urap") return program.urap;
  return worldRankingNumber(field === "the" ? program.the : program.qs);
};

const quotaTrend = (program: Program) => {
  if (program.quota2025 === null || program.quota2026 === null) {
    return { tone: "unknown", change: "Karşılaştırma yok", prediction: "Tahmin yok" };
  }

  const difference = program.quota2026 - program.quota2025;
  if (difference < 0) {
    return {
      tone: "tighter",
      change: `${formatCount(Math.abs(difference))} kontenjan azaldı`,
      prediction: "Daha seçici olabilir",
    };
  }
  if (difference > 0) {
    return {
      tone: "wider",
      change: `${formatCount(difference)} kontenjan arttı`,
      prediction: "Sıra genişleyebilir",
    };
  }
  return { tone: "stable", change: "Kontenjan aynı", prediction: "Benzer seyredebilir" };
};

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("müh.", "mühendisliği")
    .replaceAll("muh", "müh")
    .replace(/[^a-zçğıöşü0-9]+/g, " ")
    .trim();

const findSubject = (input: string): SubjectGroup | undefined => {
  const query = normalize(input);
  if (!query) return undefined;

  const exact = SUBJECT_GROUPS.find((group) => normalize(group.name) === query);
  if (exact) return exact;

  return SUBJECT_GROUPS.filter((group) => {
    const name = normalize(group.name);
    return name.includes(query) || query.includes(name);
  }).sort((a, b) => a.name.length - b.name.length)[0];
};

const findUniversity = (input: string, universities: string[]) => {
  const query = normalize(input);
  if (!query) return undefined;

  const exact = universities.find((university) => normalize(university) === query);
  if (exact) return exact;

  return universities
    .filter((university) => {
      const name = normalize(university);
      return name.includes(query) || query.includes(name);
    })
    .sort((a, b) => a.length - b.length)[0];
};

const matchScore = (label: string, input: string) => {
  const name = normalize(label);
  const query = normalize(input);
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (name.split(" ").some((word) => word.startsWith(query))) return 2;
  return 3;
};


const fetchProgramChunk = async (selection: SearchSelection, page: number) => {
  const params = new URLSearchParams({ page: String(page), data: "2026-placement-v1" });
  if (selection.kind === "subject") {
    params.set("ids", selection.group.ids.join(","));
  } else {
    params.set("university", selection.university);
  }

  const response = await fetch(`/api/programs?${params.toString()}`);
  if (!response.ok) throw new Error("Catalog request failed");
  return response.json() as Promise<ProgramChunk>;
};

const fetchPrograms = async (selection: SearchSelection) => {
  const first = await fetchProgramChunk(selection, 0);
  if (first.pageCount <= 1) return first.programs;

  const remaining = await Promise.all(
    Array.from({ length: first.pageCount - 1 }, (_, index) =>
      fetchProgramChunk(selection, index + 1),
    ),
  );
  return [first, ...remaining].flatMap((chunk) => chunk.programs);
};

type CatalogHeroCopy = {
  eyebrow: string;
  title: string;
  highlight: string;
  description: string;
};

type ProgramSearchProps = {
  initialPrograms: ProgramTuple[];
  initialUniversities: string[];
  initialSelection?: SearchSelection;
  hero?: CatalogHeroCopy;
  focusedProgramId?: string;
  hideActivePageLink?: boolean;
  universityProfile?: UniversityProfileData;
};

export default function ProgramSearch({
  initialPrograms,
  initialUniversities,
  initialSelection,
  hero,
  focusedProgramId: initialFocusedProgramId,
  hideActivePageLink = false,
  universityProfile,
}: ProgramSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { selectedIds, togglePreference } = usePreferenceList();
  const resolvedInitialSelection: SearchSelection = initialSelection ?? {
    kind: "subject",
    group: DEFAULT_GROUP,
  };
  const initialSearchLabel =
    resolvedInitialSelection.kind === "subject"
      ? resolvedInitialSelection.group.name
      : resolvedInitialSelection.university;
  const requestRef = useRef(0);
  const resultsRef = useRef<HTMLElement>(null);
  const [searchInput, setSearchInput] = useState(initialSearchLabel);
  const [activeSelection, setActiveSelection] = useState<SearchSelection>(resolvedInitialSelection);
  const [universities, setUniversities] = useState<string[]>(initialUniversities);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1);
  const [programs, setPrograms] = useState<Program[]>(() => initialPrograms.map(programFromTuple));
  const [catalogLoading, setCatalogLoading] = useState(initialPrograms.length === 0);
  const [catalogError, setCatalogError] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("Tümü");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>(
    initialFocusedProgramId || resolvedInitialSelection.kind === "university"
      ? "Tümü"
      : "Türkiye",
  );
  const [scholarshipFilter, setScholarshipFilter] = useState<ScholarshipFilter>("Tümü");
  const [programFilter, setProgramFilter] = useState<ProgramFilter>("Tümü");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("Tümü");
  const [languageFilter, setLanguageFilter] = useState<LanguageFilter>("Tümü");
  const [scoreTypeFilter, setScoreTypeFilter] = useState<ScoreTypeFilter>("Tümü");
  const [cityFilter, setCityFilter] = useState("Tümü");
  const [minRank, setMinRank] = useState("");
  const [maxRank, setMaxRank] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("rank2026-asc");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [routeChanging, setRouteChanging] = useState(false);
  const [focusedProgramId, setFocusedProgramId] = useState<string | null>(
    initialFocusedProgramId ?? null,
  );
  const routeStateKey = [
    initialSearchLabel,
    initialFocusedProgramId ?? "",
    initialPrograms.length,
    initialPrograms[0]?.[0] ?? "",
    initialPrograms[initialPrograms.length - 1]?.[0] ?? "",
  ].join("|");

  useEffect(() => {
    requestRef.current += 1;
    setActiveSelection(resolvedInitialSelection);
    setSearchInput(initialSearchLabel);
    setUniversities(initialUniversities);
    setPrograms(initialPrograms.map(programFromTuple));
    setCatalogLoading(initialPrograms.length === 0);
    setCatalogError(false);
    setFocusedProgramId(initialFocusedProgramId ?? null);
    setTypeFilter("Tümü");
    setLocationFilter(
      initialFocusedProgramId || resolvedInitialSelection.kind === "university"
        ? "Tümü"
        : "Türkiye",
    );
    setScholarshipFilter("Tümü");
    setProgramFilter("Tümü");
    setLevelFilter("Tümü");
    setLanguageFilter("Tümü");
    setScoreTypeFilter("Tümü");
    setCityFilter("Tümü");
    setMinRank("");
    setMaxRank("");
    setSortOption("rank2026-asc");
    setSuggestionsOpen(false);
    setHighlightedSuggestion(-1);
    setRouteChanging(false);
    // The route key deliberately represents all server-owned catalog state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeStateKey]);

  const loadPrograms = (selection: SearchSelection) => {
    const requestId = ++requestRef.current;
    setFocusedProgramId(null);
    setCatalogLoading(true);
    setCatalogError(false);
    setPrograms([]);
    fetchPrograms(selection)
      .then((rows) => {
        if (requestRef.current !== requestId) return;
        setPrograms(rows.map(programFromTuple));
        setCatalogLoading(false);
      })
      .catch(() => {
        if (requestRef.current !== requestId) return;
        setCatalogError(true);
        setCatalogLoading(false);
      });
  };

  useEffect(() => {
    const requestId = ++requestRef.current;
    let active = true;

    if (initialUniversities.length === 0) {
      fetch("/api/universities")
        .then((response) => {
          if (!response.ok) throw new Error("University catalog request failed");
          return response.json() as Promise<{ universities: string[] }>;
        })
        .then((data) => {
          if (active) setUniversities(data.universities);
        })
        .catch(() => {
          // Keep the server-provided list (or the empty fallback) on failure.
        });
    }

    // The committed catalog is the instant fallback. Refresh it after mount so
    // newly published 2026 YÖK Atlas placement ranks appear without rebuilding
    // the application or discarding the 2025/2024 history.
    fetchPrograms(resolvedInitialSelection)
      .then((rows) => {
        if (!active || requestRef.current !== requestId) return;
        setPrograms(rows.map(programFromTuple));
        setCatalogLoading(false);
        setCatalogError(false);
      })
      .catch(() => {
        if (!active || requestRef.current !== requestId) return;
        if (initialPrograms.length === 0) setCatalogError(true);
        setCatalogLoading(false);
      });

    return () => {
      active = false;
    };
    // routeStateKey captures the server-owned initial selection/catalog state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeStateKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const searchSuggestions = useMemo<SearchSuggestion[]>(() => {
    const query = normalize(searchInput);
    if (!query) return [];

    const subjects: SearchSuggestion[] = SUBJECT_GROUPS
      .filter((group) => normalize(group.name).includes(query))
      .sort(
        (a, b) =>
          matchScore(a.name, query) - matchScore(b.name, query) ||
          a.name.localeCompare(b.name, "tr"),
      )
      .slice(0, 5)
      .map((group) => ({ kind: "subject", label: group.name, group }));

    const universityMatches: SearchSuggestion[] = universities
      .filter((university) => normalize(university).includes(query))
      .sort(
        (a, b) =>
          matchScore(a, query) - matchScore(b, query) || a.localeCompare(b, "tr"),
      )
      .slice(0, 5)
      .map((university) => ({
        kind: "university",
        label: university,
        university,
      }));

    return [...subjects, ...universityMatches]
      .sort(
        (a, b) =>
          matchScore(a.label, query) - matchScore(b.label, query) ||
          a.label.localeCompare(b.label, "tr"),
      )
      .slice(0, 10);
  }, [searchInput, universities]);

  const cities = useMemo(
    () =>
      [...new Set(programs.map((program) => program.city))].sort((a, b) =>
        a.localeCompare(b, "tr"),
      ),
    [programs],
  );

  const filteredPrograms = useMemo(() => {
    const min = minRank ? Number(minRank) : null;
    const max = maxRank ? Number(maxRank) : null;
    const [sortField, sortDirection] = sortOption.split("-") as [
      SortField,
      SortDirection,
    ];

    return programs
      .filter((program) => typeFilter === "Tümü" || program.universityType === typeFilter)
      .filter((program) => {
        if (locationFilter === "Tümü") return true;
        if (locationFilter === "Türkiye + KKTC") return program.location !== "Yurtdışı";
        return program.location === locationFilter;
      })
      .filter((program) => cityFilter === "Tümü" || program.city === cityFilter)
      .filter((program) => {
        if (scholarshipFilter === "Tümü") return true;
        if (scholarshipFilter === "Burslu") {
          return (
            program.scholarship === "Burslu" ||
            (program.universityType === "Devlet" && program.scholarship === "Ücretsiz")
          );
        }
        if (program.universityType === "Devlet") return program.scholarship === "Ücretsiz";
        return program.scholarship === scholarshipFilter;
      })
      .filter((program) => levelFilter === "Tümü" || program.level === levelFilter)
      .filter((program) => languageFilter === "Tümü" || program.language === languageFilter)
      .filter(
        (program) => scoreTypeFilter === "Tümü" || program.scoreType === scoreTypeFilter,
      )
      .filter((program) => {
        if (programFilter === "Tümü") return true;
        return programFilter === "M.T.O.K." ? program.mtok : !program.mtok;
      })
      .filter((program) => {
        if (program.rank2026 === null) return min === null && max === null;
        if (min !== null && program.rank2026 < min) return false;
        if (max !== null && program.rank2026 > max) return false;
        return true;
      })
      .sort((a, b) => {
        const rankingComparison = compareRankValues(
          programRankingValue(a, sortField),
          programRankingValue(b, sortField),
          sortDirection,
        );
        if (rankingComparison !== 0) return rankingComparison;

        const universityComparison = a.university.localeCompare(b.university, "tr");
        if (universityComparison !== 0) return universityComparison;
        return a.programName.localeCompare(b.programName, "tr");
      });
  }, [
    cityFilter,
    languageFilter,
    levelFilter,
    locationFilter,
    maxRank,
    minRank,
    programFilter,
    programs,
    scholarshipFilter,
    scoreTypeFilter,
    sortOption,
    typeFilter,
  ]);

  const visiblePrograms = useMemo(() => {
    if (!focusedProgramId) return filteredPrograms;
    const focusedIndex = filteredPrograms.findIndex(
      (program) => program.id === focusedProgramId,
    );
    if (focusedIndex <= 0) return filteredPrograms;
    return [
      filteredPrograms[focusedIndex],
      ...filteredPrograms.slice(0, focusedIndex),
      ...filteredPrograms.slice(focusedIndex + 1),
    ];
  }, [filteredPrograms, focusedProgramId]);

  const prefetchSuggestion = (suggestion: SearchSuggestion) => {
    const nextPath = suggestion.kind === "subject"
      ? subjectPagePath(suggestion.group.name)
      : universityPagePath(suggestion.university);
    router.prefetch(nextPath);
  };

  const activateSuggestion = (suggestion: SearchSuggestion) => {
    const selection: SearchSelection =
      suggestion.kind === "subject"
        ? { kind: "subject", group: suggestion.group }
        : { kind: "university", university: suggestion.university };
    const nextPath =
      selection.kind === "subject"
        ? subjectPagePath(selection.group.name)
        : universityPagePath(selection.university);

    setSuggestionsOpen(false);
    setHighlightedSuggestion(-1);
    trackAnalytics({
      type: "search",
      path: pathname,
      query: searchInput,
      searchKind: suggestion.kind,
      searchResult: suggestion.label,
    });

    if (pathname !== nextPath) {
      setRouteChanging(true);
      router.push(nextPath, { scroll: false });
      return;
    }

    setFocusedProgramId(null);
    setActiveSelection(selection);
    setSearchInput(suggestion.label);
    setCityFilter("Tümü");

    if (selection.kind === "university") {
      setTypeFilter("Tümü");
      setLocationFilter("Tümü");
      setScholarshipFilter("Tümü");
      setProgramFilter("Tümü");
      setLevelFilter("Tümü");
      setLanguageFilter("Tümü");
      setScoreTypeFilter("Tümü");
      setMinRank("");
      setMaxRank("");
    }

    loadPrograms(selection);
    window.setTimeout(
      () => resultsRef.current?.scrollIntoView({ behavior: "smooth" }),
      30,
    );
  };

  const search = (event: FormEvent) => {
    event.preventDefault();

    const highlighted =
      suggestionsOpen && highlightedSuggestion >= 0
        ? searchSuggestions[highlightedSuggestion]
        : undefined;
    const exactSubject = SUBJECT_GROUPS.find(
      (group) => normalize(group.name) === normalize(searchInput),
    );
    const exactUniversity = universities.find(
      (university) => normalize(university) === normalize(searchInput),
    );
    const fallbackSubject = findSubject(searchInput);
    const fallbackUniversity = findUniversity(searchInput, universities);
    const match: SearchSuggestion | undefined =
      highlighted ??
      (exactSubject
        ? { kind: "subject", label: exactSubject.name, group: exactSubject }
        : exactUniversity
          ? {
              kind: "university",
              label: exactUniversity,
              university: exactUniversity,
            }
          : searchSuggestions[0] ??
            (fallbackSubject
              ? {
                  kind: "subject",
                  label: fallbackSubject.name,
                  group: fallbackSubject,
                }
              : fallbackUniversity
                ? {
                    kind: "university",
                    label: fallbackUniversity,
                    university: fallbackUniversity,
                  }
                : undefined));

    if (!match) {
      setToast("Bölüm veya üniversite bulunamadı. Önerilerden birini seç.");
      return;
    }

    activateSuggestion(match);
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSuggestionsOpen(true);
      setHighlightedSuggestion((current) =>
        Math.min(current + 1, searchSuggestions.length - 1),
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedSuggestion((current) => Math.max(current - 1, 0));
    } else if (
      event.key === "Enter" &&
      suggestionsOpen &&
      highlightedSuggestion >= 0 &&
      searchSuggestions[highlightedSuggestion]
    ) {
      event.preventDefault();
      activateSuggestion(searchSuggestions[highlightedSuggestion]);
    } else if (event.key === "Escape") {
      setSuggestionsOpen(false);
      setHighlightedSuggestion(-1);
    }
  };

  const retryActiveSelection = () => loadPrograms(activeSelection);

  const activeTitle =
    activeSelection.kind === "subject"
      ? activeSelection.group.name
      : activeSelection.university;
  const activeMeta =
    activeSelection.kind === "subject"
      ? activeSelection.group.scoreTypes.join(" / ")
      : "Tüm bölümler";

  const activePagePath =
    activeSelection.kind === "subject"
      ? subjectPagePath(activeSelection.group.name)
      : universityPagePath(activeSelection.university);
  const activePageLabel =
    activeSelection.kind === "subject"
      ? "Bölüm sayfasını aç"
      : "Üniversite profilini aç";
  const initialPagePath =
    resolvedInitialSelection.kind === "subject"
      ? subjectPagePath(resolvedInitialSelection.group.name)
      : universityPagePath(resolvedInitialSelection.university);
  const isInitialCanonicalActive = activePagePath === initialPagePath;
  const showActivePageLink = !hideActivePageLink || !isInitialCanonicalActive;
  const resultAnimationKey = [
    routeStateKey,
    typeFilter,
    locationFilter,
    scholarshipFilter,
    programFilter,
    levelFilter,
    languageFilter,
    scoreTypeFilter,
    cityFilter,
    minRank,
    maxRank,
    sortOption,
  ].join("::");

  const resetFilters = () => {
    setTypeFilter("Tümü");
    setLocationFilter(
      focusedProgramId || activeSelection.kind === "university" ? "Tümü" : "Türkiye",
    );
    setScholarshipFilter("Tümü");
    setProgramFilter("Tümü");
    setLevelFilter("Tümü");
    setLanguageFilter("Tümü");
    setScoreTypeFilter("Tümü");
    setCityFilter("Tümü");
    setMinRank("");
    setMaxRank("");
    setSortOption("rank2026-asc");
  };

  const scholarshipDisabled = typeFilter === "Devlet";
  const resolvedHero: CatalogHeroCopy = hero ?? {
    eyebrow: "Tam YÖK program kataloğu",
    title: "Sıralamana göre",
    highlight: "doğru üniversiteyi",
    description:
      "2025–2026 YKS son yerleşen sıralamaları, 2024–2026 kontenjanları, URAP 2025–2026, THE 2026 ve QS 2027 tek ekranda.",
  };

  return (
    <main className="catalog-page">
      <div className={`route-progress ${routeChanging ? "is-active" : ""}`} aria-hidden="true" />
      <section className="hero" id="bolum-ara">
        <div className="hero-grid" aria-hidden="true" />
        <header className="site-header shell">
          <Link className="brand" href="/" aria-label="Tercih Pusulası ana sayfa">
            <span className="brand-pin"><span>⌁</span></span>
            <span>Tercih<br />Pusulası</span>
          </Link>
          <nav aria-label="Ana menü">
            <a href="#bolum-ara"><span aria-hidden="true">⌕</span> Ara</a>
            <Link className="directory-nav-link" href="/bolumler"><span aria-hidden="true">☷</span> Bölümler</Link>
            <Link className="directory-nav-link" href="/universiteler"><span aria-hidden="true">◇</span> Üniversiteler</Link>
            <CompareNavLink><span aria-hidden="true">⇄</span> Karşılaştır</CompareNavLink>
            <PreferenceListButton />
          </nav>
        </header>

        <div className="hero-content shell">
          <div className="hero-copy">
            <div className="eyebrow"><span /> {resolvedHero.eyebrow}</div>
            <h1>{resolvedHero.title} <em>{resolvedHero.highlight}</em></h1>
            <p>{resolvedHero.description}</p>
            <form className="search-form" onSubmit={search}>
              <div className="search-field">
                <label className="search-input" htmlFor="catalog-search">
                  <span className="search-icon" aria-hidden="true" />
                  <span className="sr-only">Bölüm veya üniversite</span>
                  <input
                    id="catalog-search"
                    value={searchInput}
                    onChange={(event) => {
                      setSearchInput(event.target.value);
                      setSuggestionsOpen(true);
                      setHighlightedSuggestion(-1);
                    }}
                    onFocus={() => setSuggestionsOpen(true)}
                    onBlur={() => setSuggestionsOpen(false)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Bölüm veya üniversite ara"
                    autoComplete="off"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={suggestionsOpen && searchSuggestions.length > 0}
                    aria-controls="catalog-suggestions"
                    aria-activedescendant={
                      highlightedSuggestion >= 0
                        ? `catalog-suggestion-${highlightedSuggestion}`
                        : undefined
                    }
                  />
                </label>
                {suggestionsOpen && searchSuggestions.length > 0 && (
                  <div
                    className="search-suggestions"
                    id="catalog-suggestions"
                    role="listbox"
                    aria-label="Arama önerileri"
                  >
                    {searchSuggestions.map((suggestion, index) => (
                      <button
                        id={`catalog-suggestion-${index}`}
                        className={index === highlightedSuggestion ? "highlighted" : ""}
                        key={`${suggestion.kind}-${suggestion.label}`}
                        type="button"
                        role="option"
                        aria-selected={index === highlightedSuggestion}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => {
                          setHighlightedSuggestion(index);
                          prefetchSuggestion(suggestion);
                        }}
                        onClick={() => activateSuggestion(suggestion)}
                      >
                        <span className={`suggestion-kind ${suggestion.kind}`}>
                          {suggestion.kind === "subject" ? "Bölüm" : "Üniversite"}
                        </span>
                        <span className="suggestion-label">{suggestion.label}</span>
                        <span className="suggestion-arrow" aria-hidden="true">→</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button className="search-button" type="submit">
                Sonuçları Gör <span aria-hidden="true">→</span>
              </button>
            </form>
            <div className="trust-row">
              <span className="status-dot" />
              {formatCount(CATALOG_STATS.subjects)} bölüm · {formatCount(CATALOG_STATS.universities)} üniversite · {formatCount(CATALOG_STATS.programs)} program
            </div>
            <div className="hero-directory-links" aria-label="Katalog dizinleri">
              <Link href="/bolumler">Tüm bölümler A–Z <span aria-hidden="true">→</span></Link>
              <Link href="/universiteler">Tüm üniversiteler A–Z <span aria-hidden="true">→</span></Link>
            </div>
          </div>

          <div className="compass-art" aria-hidden="true">
            <span className="orbit orbit-one" />
            <span className="orbit orbit-two" />
            <span className="orbit orbit-three" />
            <span className="compass-core">◆</span>
            <span className="map-point point-one" />
            <span className="map-point point-two" />
            <span className="map-point point-three" />
          </div>
        </div>
      </section>

      {universityProfile && <UniversityProfile profile={universityProfile} />}

      <section
        className={`results ${routeChanging ? "is-route-changing" : ""}`.trim()}
        ref={resultsRef}
        aria-busy={routeChanging}
      >
        <div className="shell">
          <div className="results-heading">
            <div>
              <span className="result-count-icon" aria-hidden="true">☷</span>
              <h2>{catalogError ? "Programlar yüklenemedi" : catalogLoading ? "Tam katalog yükleniyor…" : `${filteredPrograms.length} sonuç bulundu`}</h2>
              <p>{activeTitle} · {activeMeta}</p>
              {routeChanging && (
                <span className="catalog-update-pill" role="status">
                  <span className="catalog-update-spinner" aria-hidden="true" />
                  Yeni sayfa hazırlanıyor; mevcut sonuçlar görünür kalıyor.
                </span>
              )}
              {showActivePageLink && (
                <Link className="active-guide-link" href={activePagePath}>
                  {activePageLabel} <span aria-hidden="true">→</span>
                </Link>
              )}
              {focusedProgramId && (
                <span className="focused-result-note">Açtığın program listenin başında vurgulandı.</span>
              )}
            </div>
            <button
              className="mobile-filter-button"
              type="button"
              onClick={() => setMobileFiltersOpen((open) => !open)}
              aria-expanded={mobileFiltersOpen}
            >
              Filtreler <span>⌄</span>
            </button>
            <label className="sort-chip" htmlFor="sort-option">
              <span aria-hidden="true">↕</span>
              <span className="sr-only">Sonuçları sırala</span>
              <select
                id="sort-option"
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value as SortOption)}
                aria-label="Sonuçları sırala"
              >
                {Object.entries(SORT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className={`filter-panel ${mobileFiltersOpen ? "open" : ""}`}>
            <label htmlFor="type-filter">
              <span>Üniversite türü</span>
              <select
                id="type-filter"
                value={typeFilter}
                onChange={(event) => {
                  const value = event.target.value as TypeFilter;
                  setTypeFilter(value);
                  if (value === "Devlet") setScholarshipFilter("Tümü");
                }}
              >
                <option value="Tümü">Devlet + Vakıf</option>
                <option value="Devlet">Sadece Devlet</option>
                <option value="Vakıf">Sadece Vakıf</option>
              </select>
            </label>
            <label htmlFor="location-filter">
              <span>Konum</span>
              <select id="location-filter" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value as LocationFilter)}>
                <option>Türkiye</option>
                <option>Türkiye + KKTC</option>
                <option>KKTC</option>
                <option value="Tümü">Tümü (Yurtdışı dahil)</option>
              </select>
            </label>
            <label htmlFor="city-filter">
              <span>Şehir</span>
              <select id="city-filter" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
                <option value="Tümü">Tüm şehirler</option>
                {cities.map((city) => <option key={city}>{city}</option>)}
              </select>
            </label>
            <label htmlFor="scholarship-filter" className={scholarshipDisabled ? "disabled" : ""}>
              <span>Burs / indirim türü</span>
              <select
                id="scholarship-filter"
                value={scholarshipFilter}
                onChange={(e) => setScholarshipFilter(e.target.value as ScholarshipFilter)}
                disabled={scholarshipDisabled}
              >
                <option value="Tümü">Tüm burs türleri</option>
                {SCHOLARSHIP_OPTIONS.map((item) => (
                  <option key={item} value={item}>{item}{item === "Burslu" ? " + Ücretsiz Devlet" : ""}</option>
                ))}
              </select>
            </label>
            <label htmlFor="level-filter">
              <span>Öğrenim düzeyi</span>
              <select id="level-filter" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value as LevelFilter)}>
                <option>Tümü</option>
                <option>Lisans</option>
                <option>Önlisans</option>
              </select>
            </label>
            <label htmlFor="language-filter">
              <span>Eğitim dili</span>
              <select
                id="language-filter"
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value as LanguageFilter)}
              >
                <option value="Tümü">Tüm diller</option>
                <option value="Türkçe">Türkçe</option>
                <option value="İngilizce">İngilizce (%100)</option>
                <option value="İngilizce (%30)">İngilizce (%30)</option>
              </select>
            </label>
            <label htmlFor="score-type-filter">
              <span>Puan türü</span>
              <select
                id="score-type-filter"
                value={scoreTypeFilter}
                onChange={(e) => setScoreTypeFilter(e.target.value as ScoreTypeFilter)}
              >
                <option value="Tümü">Tüm puan türleri</option>
                <option value="TYT">TYT</option>
                <option value="SAY">SAY</option>
                <option value="EA">EA</option>
                <option value="SÖZ">SÖZ</option>
              </select>
            </label>
            <label htmlFor="program-filter">
              <span>Program türü</span>
              <select id="program-filter" value={programFilter} onChange={(e) => setProgramFilter(e.target.value as ProgramFilter)}>
                <option>Tümü</option>
                <option>Standart</option>
                <option>M.T.O.K.</option>
              </select>
            </label>
            <label htmlFor="min-rank">
              <span>2026 sıra alt sınırı</span>
              <input
                id="min-rank"
                type="number"
                inputMode="numeric"
                min="1"
                value={minRank}
                onChange={(e) => setMinRank(e.target.value)}
                placeholder="Örn. 10000"
              />
            </label>
            <label htmlFor="max-rank">
              <span>2026 sıra üst sınırı</span>
              <input
                id="max-rank"
                type="number"
                inputMode="numeric"
                min="1"
                value={maxRank}
                onChange={(e) => setMaxRank(e.target.value)}
                placeholder="Örn. 100000"
              />
            </label>
            <button type="button" className="reset-button" onClick={resetFilters}>Temizle</button>
          </div>

          <div className="filter-summary" aria-live="polite">
            <span>
              {scholarshipFilter !== "Tümü" ? (
                <><strong>{scholarshipFilter}</strong> programları + yalnızca ücretsiz Devlet programları gösteriliyor.</>
              ) : languageFilter !== "Tümü" || scoreTypeFilter !== "Tümü" ? (
                <>
                  <strong>
                    {[
                      languageFilter === "İngilizce" ? "İngilizce (%100)" : languageFilter,
                      scoreTypeFilter,
                    ].filter((value) => value !== "Tümü").join(" · ")}
                  </strong>{" "}
                  programları gösteriliyor.
                </>
              ) : minRank || maxRank ? (
                <>Kişisel aralık: {minRank ? formatRank(Number(minRank)) : "1"} – {maxRank ? formatRank(Number(maxRank)) : "sınırsız"}</>
              ) : (
                <>Dil, puan türü, burs, M.T.O.K., KKTC ve diğer özel nitelikler filtrelenebilir.</>
              )}
            </span>
            <span><strong>Sıralama:</strong> {SORT_LABELS[sortOption]}. Listelenmeyen üniversiteler en sonda tutulur.</span>
          </div>

          <div className="program-list" key={resultAnimationKey}>
            {catalogError ? (
              <div className="empty-state">
                <span>!</span>
                <h3>Tam program kataloğu yüklenemedi.</h3>
                <p>İstek tamamlanamadı. Tekrar deneyebilirsin.</p>
                <button type="button" onClick={retryActiveSelection}>Tekrar dene</button>
              </div>
            ) : catalogLoading ? (
              <div className="empty-state loading-state">
                <span className="loading-ring" />
                <h3>Program seçenekleri hazırlanıyor.</h3>
                <p>İlk arama birkaç saniye sürebilir.</p>
              </div>
            ) : filteredPrograms.length === 0 ? (
              <div className="empty-state">
                <span>⌕</span>
                <h3>Bu filtrelerle eşleşen program yok.</h3>
                <p>Sıralama aralığını genişlet veya filtreleri temizle.</p>
                <button type="button" onClick={resetFilters}>Filtreleri temizle</button>
              </div>
            ) : (
              visiblePrograms.map((program, programIndex) => {
                const selected = selectedIds.has(program.id);
                const capacityTrend = quotaTrend(program);
                const improved =
                  program.rank2026 !== null &&
                  program.rank2025 !== null &&
                  program.rank2026 < program.rank2025;
                const currentUniversityPage =
                  hideActivePageLink &&
                  isInitialCanonicalActive &&
                  resolvedInitialSelection.kind === "university" &&
                  program.university === resolvedInitialSelection.university;
                const currentSubjectPage =
                  hideActivePageLink &&
                  isInitialCanonicalActive &&
                  resolvedInitialSelection.kind === "subject" &&
                  program.subject === resolvedInitialSelection.group.name;
                const currentProgramPage = focusedProgramId === program.id;
                return (
                  <article
                    id={`program-${program.id}`}
                    className={`program-card ${focusedProgramId === program.id ? "program-card-focused" : ""}`.trim()}
                    key={program.id}
                    style={{ "--card-index": Math.min(programIndex, 12) } as CSSProperties}
                  >
                    <div className="university-cell">
                      <UniversityMark program={program} />
                      <div>
                        {focusedProgramId === program.id && (
                          <span className="focused-program-label">Açtığın program</span>
                        )}
                        <div className="university-title-row">
                          <h3>
                            {currentUniversityPage ? (
                              <span className="current-page-label">{program.university}</span>
                            ) : (
                              <Link
                                className="university-profile-link"
                                href={universityPagePath(program.university)}
                                title={`${program.university} profilini aç`}
                              >
                                {program.university}<span aria-hidden="true"> ↗</span>
                              </Link>
                            )}
                          </h3>
                          {!currentUniversityPage && (
                            <button
                              className="university-filter-button"
                              type="button"
                              title={`${program.university} programlarını bu ekranda filtrele`}
                              aria-label={`${program.university} programlarını bu ekranda filtrele`}
                              onClick={() =>
                                activateSuggestion({
                                  kind: "university",
                                  label: program.university,
                                  university: program.university,
                                })
                              }
                            >
                              Burada filtrele
                            </button>
                          )}
                        </div>
                        {currentProgramPage ? (
                          <span className="program-name program-page-link current-page-label">
                            {program.programName}
                          </span>
                        ) : (
                          <Link className="program-name program-page-link" href={programPagePath(program)}>
                            {program.programName}<span aria-hidden="true"> ↗</span>
                          </Link>
                        )}
                        <p className="meta-line">⌖ {program.city} · {program.universityType} · {program.faculty}</p>
                        {!currentSubjectPage && (
                          <Link className="subject-guide-link" href={subjectPagePath(program.subject)}>
                            {program.subject} bölüm rehberi <span aria-hidden="true">→</span>
                          </Link>
                        )}
                        <div className="badges">
                          {program.location === "KKTC" && <span className="badge kktc">KKTC</span>}
                          {program.mtok && <span className="badge mtok">M.T.O.K.</span>}
                          {program.universityType !== "Devlet" && <span className="badge scholarship">{program.scholarship}</span>}
                          <span className="badge level">{program.level}</span>
                          <span className="badge score">{program.scoreType}</span>
                          {program.language !== "Türkçe" && <span className="badge language">{program.language}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="metric rank-metric">
                      <span>2026 son yerleşen</span>
                      <strong>{formatRank(program.rank2026)}</strong>
                      {program.rank2025 !== null && program.rank2026 !== null && (
                        <small className={improved ? "improved" : "widened"}>
                          {improved ? "↗ Daha seçici" : "↘ Aralık genişledi"}
                        </small>
                      )}
                    </div>
                    <div className="metric">
                      <span>2025 son yerleşen</span>
                      <strong>{formatRank(program.rank2025)}</strong>
                    </div>
                    <div className="metric urap-metric">
                      <span>URAP Türkiye genel</span>
                      <strong>{program.urap ? `#${program.urap}` : "—"}</strong>
                      <small>2025–2026</small>
                    </div>
                    <div className="metric the-metric">
                      <span>THE Dünya</span>
                      <strong>{program.the}</strong>
                      <small>WUR 2026</small>
                    </div>
                    <div className="metric qs-metric">
                      <span>QS Dünya</span>
                      <strong>{program.qs}</strong>
                      <small>WUR 2027</small>
                    </div>
                    <button
                      className={`add-button ${selected ? "selected" : ""}`}
                      type="button"
                      onClick={() => togglePreference(program)}
                      aria-pressed={selected}
                    >
                      <span>{selected ? "✓" : "+"}</span> {selected ? "Eklendi" : "Ekle"}
                    </button>
                    <div className="quota-panel">
                      <div className="quota-title">
                        <span>Genel kontenjan</span>
                        <small>ÖSYM program kodu: {program.id}</small>
                      </div>
                      <div className="quota-years" aria-label="2024, 2025 ve 2026 genel kontenjanları">
                        <span><small>2024</small><strong>{program.quota2024 ?? "—"}</strong></span>
                        <span><small>2025</small><strong>{program.quota2025 ?? "—"}</strong></span>
                        <span className="current"><small>2026 kılavuz</small><strong>{program.quota2026 ?? "—"}</strong></span>
                      </div>
                      <div className={`quota-prediction ${capacityTrend.tone}`}>
                        <small>{capacityTrend.change}</small>
                        <strong>{capacityTrend.prediction}</strong>
                      </div>
                      <p>Yalnızca kontenjan değişimine dayalı tahmindir; talep, sınav dağılımı ve burs koşulları sıralamayı ayrıca etkiler.</p>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <section className="source-section" aria-labelledby="sources-title">
            <div>
              <span className="source-kicker">Şeffaf veri</span>
              <h2 id="sources-title">Hangi sıralama neyi gösteriyor?</h2>
            </div>
            <div className="source-grid">
              <a href="https://yokatlas.yok.gov.tr/" target="_blank" rel="noreferrer">
                <span>YKS</span>
                <strong>2025–2026 son yerleşen</strong>
                <p>YÖK Atlas’ın güncel 2026 yerleştirme verisi ile 2025 geçmiş başarı sıralamaları.</p>
              </a>
              <a href="https://www.osym.gov.tr/2026-yuksekogretim-kurumlari-sinavi-yks-yuksekogretim-programlari-ve-kontenjanlari-kilavuzu" target="_blank" rel="noreferrer">
                <span>KONTENJAN</span>
                <strong>2024–2026 genel kontenjan</strong>
                <p>Her programın resmî ÖSYM koduyla eşleştirilen 2024, 2025 ve tercih döneminde yayımlanan son 2026 kılavuz verisi.</p>
              </a>
              <a href="https://newtr.urapcenter.org/cdn/storage/PDFs/mezDn2uAd4mx2mZzW/original/mezDn2uAd4mx2mZzW.pdf" target="_blank" rel="noreferrer">
                <span>URAP</span>
                <strong>2025–2026 Türkiye genel sırası</strong>
                <p>28 Ekim 2025 tarihli revize nihai tabloda yer alan 198 üniversitenin genel akademik performans sırası. Tabloda olmayan kurumlar “—” olarak gösterilir.</p>
              </a>
              <a href="https://www.timeshighereducation.com/student/best-universities/best-universities-turkey" target="_blank" rel="noreferrer">
                <span>THE</span>
                <strong>World University Rankings 2026</strong>
                <p>109 Türkiye üniversitesi dünya sırası bandıyla gösterilir; diğerleri “Listelenmedi” olarak işaretlenir.</p>
              </a>
              <a href="https://www.topuniversities.com/world-university-rankings?countries=tr&amp;region=Asia" target="_blank" rel="noreferrer">
                <span>QS</span>
                <strong>World University Rankings 2027</strong>
                <p>En güncel QS listesinde yer alan 25 Türkiye üniversitesi dünya sırası veya resmî bandıyla gösterilir.</p>
              </a>
            </div>
            <p className="dataset-note">Tam katalog: 634 bölüm adı, 228 üniversite ve 21.493 program seçeneği. Yeni açılan veya dolmayan programlarda geçmiş sıra “—” görünür.</p>
          </section>
        </div>
      </section>

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
