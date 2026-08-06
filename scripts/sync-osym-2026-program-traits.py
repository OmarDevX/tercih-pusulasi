#!/usr/bin/env python3
"""Generate app/osym-2026-program-traits.json from the official 2026 ÖSYM guide.

Requirements: Python 3, PyMuPDF (`pip install pymupdf`) and `pdftotext` on PATH.
This script is a maintenance tool only; the generated JSON is committed so the
production build never downloads or parses a PDF.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import tempfile
import urllib.request
from pathlib import Path

import fitz

DEFAULT_URL = (
    "https://cdn.osym.gov.tr/pdfdokuman/2026/YKS/TERCIH/"
    "kontkilavuz_yktd21072026.pdf"
)
DISPLAY_URL = (
    "https://dokuman.osym.gov.tr/web/2026/7/"
    "2026-yuksekogretim-kurumlari-sinavi-yks-yuksekogretim-programlari-"
    "ve-kontenjanlari-kilavuzu-h5q8kv-30170002.pdf"
)
SOURCE_DATE = "21 Temmuz 2026"
ACCREDITATION_TOKEN = re.compile(r"^[A-ZÇĞİÖŞÜ0-9][A-ZÇĞİÖŞÜ0-9-]{1,20}$")
EXCLUDED_ACCREDITATION_TOKENS = {"TYÇ", "YÖKAK", "GRV"}



def normalized_tokens(values: list[str]) -> list[str]:
    """Normalize every acronym printed in the accreditation column.

    The guide occasionally wraps a code across lines (for example ``FTR-`` and
    ``AD``). Joining trailing-hyphen fragments keeps the extractor independent
    from a hard-coded organization list, so newly added accreditation bodies
    are retained automatically.
    """
    cleaned = [value.strip().strip(",.;:()[]") for value in values]
    combined: list[str] = []
    index = 0
    while index < len(cleaned):
        token = cleaned[index]
        if token.endswith("-") and index + 1 < len(cleaned):
            token = f"{token}{cleaned[index + 1]}"
            index += 1
        index += 1
        if (
            token
            and token not in EXCLUDED_ACCREDITATION_TOKENS
            and ACCREDITATION_TOKEN.fullmatch(token)
        ):
            combined.append(token)
    return list(dict.fromkeys(combined))


def extract_program_traits(pdf_path: Path, catalog_ids: set[str]) -> dict[str, dict[str, object]]:
    document = fitz.open(pdf_path)
    traits: dict[str, dict[str, object]] = {}

    for page in document:
        words = page.get_text("words", sort=True)
        rows = []
        for word in words:
            if word[0] < 80 and re.fullmatch(r"\d{9}", word[4]):
                rows.append({"id": word[4], "y": (word[1] + word[3]) / 2, "accreditations": [], "tyc": False})
        if not rows:
            continue

        accreditation_x_min = 552.0 if page.rect.width > 700 else 532.0
        accreditation_x_max = 620.0 if page.rect.width > 700 else 585.0

        for row in rows:
            row_words = []
            for word in words:
                text = word[4].strip()
                y_center = (word[1] + word[3]) / 2
                if abs(row["y"] - y_center) > 6.0:
                    continue
                if text == "*":
                    row["tyc"] = True
                    continue
                if accreditation_x_min <= word[0] < accreditation_x_max:
                    row_words.append((word[1], word[0], text))

            row_words.sort()
            row["accreditations"] = normalized_tokens(
                [text for _y, _x, text in row_words]
            )

        for row in rows:
            program_id = row["id"]
            if program_id not in catalog_ids:
                continue
            if row["accreditations"] or row["tyc"]:
                value: dict[str, object] = {}
                if row["accreditations"]:
                    value["a"] = row["accreditations"]
                if row["tyc"]:
                    value["t"] = 1
                traits[program_id] = value

    return traits


def extract_yokak_universities(pdf_path: Path) -> list[str]:
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as output:
        text_path = Path(output.name)
    subprocess.run(["pdftotext", "-layout", str(pdf_path), str(text_path)], check=True)
    text = text_path.read_text(encoding="utf-8", errors="replace")
    text_path.unlink(missing_ok=True)

    pattern = re.compile(
        r"^\s*(.+?(?:ÜNİVERSİTESİ|YÜKSEK TEKNOLOJİ ENSTİTÜSÜ)(?:\s*\([^)]*\))?)"
        r"\s+\((?:Devlet|Vakıf|KKTC|Yurt Dışı)[^)]*\)\s+YÖKAK\s*$",
        re.IGNORECASE,
    )
    universities: list[str] = []
    for line in text.splitlines():
        match = pattern.search(line)
        if not match:
            continue
        name = match.group(1).strip()
        if name not in universities:
            universities.append(name)
    return universities


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", type=Path)
    parser.add_argument("--output", type=Path, default=Path("app/osym-2026-program-traits.json"))
    parser.add_argument("--catalog", type=Path, default=Path("app/api/programs/catalog.json"))
    args = parser.parse_args()

    pdf_path = args.pdf
    temporary_pdf = None
    if pdf_path is None:
        temporary_pdf = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
        temporary_pdf.close()
        pdf_path = Path(temporary_pdf.name)
        urllib.request.urlretrieve(DEFAULT_URL, pdf_path)

    catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
    catalog_ids = {row[0] for row in catalog}
    output = {
        "source": "2026-YKS Yükseköğretim Programları ve Kontenjanları Kılavuzu",
        "sourceDate": SOURCE_DATE,
        "sourceUrl": DISPLAY_URL,
        "programs": extract_program_traits(pdf_path, catalog_ids),
        "yokakUniversities": extract_yokak_universities(pdf_path),
    }
    args.output.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    if temporary_pdf is not None:
        pdf_path.unlink(missing_ok=True)

    print(
        f"Wrote {len(output['programs'])} program trait rows and "
        f"{len(output['yokakUniversities'])} YÖKAK universities to {args.output}"
    )


if __name__ == "__main__":
    main()
