#!/usr/bin/env python3
"""
Build Evolve final report as .docx using only Python stdlib (no pip).
Reads chapter markers from report_revised_chapters.txt and intro/lit from the PDF text export.

Usage (from this directory):
  py generate_final_report_docx.py

Output:
  10953083_Final_Report_UPDATED.docx
"""

from __future__ import annotations

import re
import zipfile
from datetime import UTC, datetime
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape

DIR = Path(__file__).resolve().parent
PDF_EXPORT = DIR / "10953083_Final Report.pdf"
REVISED = DIR / "report_revised_chapters.txt"
OUT_DOCX = DIR / "10953083_Final_Report_UPDATED.docx"


def clean_pdf_export(text: str) -> str:
    text = re.sub(r"\n-- \d+ of \d+ --\n", "\n\n", text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    return text


def extract_between(src: str, start: str, end: str | None) -> str:
    i = src.find(start)
    if i < 0:
        return ""
    i += len(start)
    if end is None:
        return src[i:].strip()
    j = src.find(end, i)
    if j < 0:
        return src[i:].strip()
    return src[i:j].strip()


def split_ack_abstract_keywords(full: str) -> tuple[str, str, str]:
    ack = extract_between(full, "Acknowledgements", "Abstract")
    abst = extract_between(full, "Abstract", "Keywords:")
    kw_line = ""
    if "Keywords:" in full:
        kw_line = full.split("Keywords:", 1)[1].split("--", 1)[0].strip()
    return ack.strip(), abst.strip(), kw_line


NEW_ABSTRACT = """Rising rates of non-communicable diseases — notably obesity-related cardiometabolic risk — motivate personalised digital wellness tools. Many consumer applications remain weak on culturally contextual dietary guidance, transparent metabolic estimation, and sustained motivational support; these gaps are magnified where BMI-centric thresholds misrepresent risk.

Evolve: AI Body Architect is an Agile-developed cross-platform prototype built with React Native / Expo. Sensitive relational data is protected using Supabase PostgreSQL with Row Level Security; primary transactional storage uses Expo SQLite with an outbox-style synchronisation path toward Supabase for resilient demos.

The AI tier deliberately mixes reproducible machine-learning engineering with pragmatic multimodal deployment: (i) a Food-101 fine-tuned Vision Transformer pipeline is maintained in Python (training, evaluation, optional FastAPI inference server); (ii) the shipped meal scanner calls OpenAI GPT-4o Vision with structured JSON outputs so users obtain specific dish labels and estimated macros across heterogeneous cuisines including South Asian plates; (iii) an Evolve Coach tab uses OpenAI GPT-4o-mini with workout-streak context and humane offline templates, including crisis-keyword routing that bypasses the model for safety; (iv) optional Gemini 2.0 Flash vision analysis supports structured commentary on body photos where keys are configured.

Interpretable wellness logic runs client-side in TypeScript: a four-layer Metabolic Intelligence Engine blends Heath–Carter ectomorphy cues with US Navy circumference body-fat estimation when measurements exist; calorie targets derive from Mifflin–St Jeor BMR with composite TDEE modulation; culturally aware meal ideas are assembled deterministically from templates rather than unconstrained generative menus, improving auditability for an academic artefact.

Deliverables include onboarding, diary (manual + scan), analytics views, workout planning, SVG milestone simulation, rewards scaffolding, and Coach chat. Cultural specificity is reinforced through onboarding preferences and seeded regional catalogue utilities in the repository.

Keywords: Body composition estimation; Personalised wellness; Vision Transformer; Multimodal food estimation; South Asian nutrition; LLM coaching; Offline-first mobile health"""


def parse_revised_file(text: str) -> dict[str, str]:
    chunks: dict[str, str] = {}
    pattern = re.compile(r"^<<<(?P<name>[A-Z0-9_]+)>>>\s*$", re.MULTILINE)
    matches = list(pattern.finditer(text))
    for i, m in enumerate(matches):
        name = m.group("name")
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        chunks[name] = text[start:end].strip()
    return chunks


def plain_to_paragraphs(body: str) -> list[str]:
    paras = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
    # Merge single newlines inside paragraphs for PDF-pasted text
    out: list[str] = []
    for p in paras:
        p = re.sub(r"\n(?!\n)", " ", p)
        out.append(p.strip())
    return out


def p_para(text: str) -> str:
    t = xml_escape(text)
    return (
        "<w:p>"
        '<w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr>'
        "<w:r><w:rPr><w:rFonts w:ascii=\"Calibri\" w:hAnsi=\"Calibri\"/><w:sz w:val=\"22\"/></w:rPr>"
        f'<w:t xml:space="preserve">{t}</w:t>'
        "</w:r></w:p>"
    )


def p_heading(text: str, outline_level: int) -> str:
    sz = {1: 32, 2: 28, 3: 26}.get(outline_level, 24)
    return (
        "<w:p>"
        '<w:pPr><w:spacing w:before="240" w:after="120"/>'
        f"<w:outlineLvl w:val=\"{outline_level - 1}\"/>"
        "</w:pPr>"
        "<w:r><w:rPr><w:b/><w:rFonts w:ascii=\"Calibri\" w:hAnsi=\"Calibri\"/>"
        f'<w:sz w:val="{sz}"/></w:rPr>'
        f'<w:t xml:space="preserve">{xml_escape(text)}</w:t>'
        "</w:r></w:p>"
    )


def build_document_xml(
    title_meta: str,
    sections: list[tuple[str, list[str]]],
) -> str:
    blocks: list[str] = []
    blocks.append(
        p_heading("Evolve: AI Body Architect — Final Project Report", 1)
        + p_para(title_meta)
    )
    for heading, paras in sections:
        blocks.append(p_heading(heading, 1))
        for para in paras:
            if para.startswith("• ") or para.startswith("- "):
                blocks.append(
                    "<w:p>"
                    '<w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>'
                    "<w:r><w:rPr><w:rFonts w:ascii=\"Calibri\" w:hAnsi=\"Calibri\"/><w:sz w:val=\"22\"/></w:rPr>"
                    f'<w:t xml:space="preserve">{xml_escape(para)}</w:t>'
                    "</w:r></w:p>"
                )
            elif para.startswith("TABLE_ROW:"):
                row = para[len("TABLE_ROW:") :]
                cells = row.split("|")
                tc_cells = "".join(
                    "<w:tc><w:tcPr/><w:p><w:r><w:t>"
                    + xml_escape(c.strip())
                    + "</w:t></w:r></w:p></w:tc>"
                    for c in cells
                )
                blocks.append(
                    "<w:tbl>"
                    "<w:tblPr><w:tblW w:w=\"9000\" w:type=\"dxa\"/></w:tblPr>"
                    "<w:tr>"
                    f"{tc_cells}"
                    "</w:tr>"
                    "</w:tbl>"
                )
            else:
                blocks.append(p_para(para))
    body_inner = "".join(blocks)
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        "<w:body>"
        f"{body_inner}"
        "<w:sectPr><w:pgSz w:w=\"11906\" w:h=\"16838\"/><w:pgMar w:top=\"1440\" w:right=\"1440\" "
        'w:bottom="1440" w:left="1440"/></w:sectPr>'
        "</w:body></w:document>"
    )


CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>"""

RELS_ROOT = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>"""

DOC_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>"""


def write_docx(document_xml: str, target: Path) -> None:
    now = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    core = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Evolve: AI Body Architect — Final Report</dc:title>
  <dc:creator>Mudiyanselage Ekanayake</dc:creator>
  <cp:lastModifiedBy>Evolve Report Generator</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
</cp:coreProperties>"""
    app = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Python zipfile</Application>
</Properties>"""

    target.unlink(missing_ok=True)
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CONTENT_TYPES)
        z.writestr("_rels/.rels", RELS_ROOT)
        z.writestr("word/_rels/document.xml.rels", DOC_RELS)
        z.writestr("word/document.xml", document_xml)
        z.writestr("docProps/core.xml", core)
        z.writestr("docProps/app.xml", app)


def main() -> None:
    ndash = "\u2013"  # en dash used in PDF headings
    raw_pdf = PDF_EXPORT.read_text(encoding="utf-8", errors="replace")
    cleaned = clean_pdf_export(raw_pdf)

    ack, _old_abst, _kw = split_ack_abstract_keywords(cleaned)
    ack = ack.replace("Google Colab. OpenAI", "Google Colab, OpenAI")

    ch1 = extract_between(
        cleaned,
        f"Chapter 1 {ndash} Introduction",
        f"Chapter 2 {ndash} Literature Review",
    )
    ch2 = extract_between(
        cleaned,
        f"Chapter 2 {ndash} Literature Review",
        f"Chapter 3 {ndash} Methodology",
    )

    rq_note = (
        "Research Question 2 refinement (alignment with implementation): the ViT pathway is primarily validated on "
        "Food-101 using the repository evaluation script; deployment-facing scanning additionally leverages multimodal LLMs "
        "for open-vocabulary dishes where a closed label set is insufficient — especially relevant for composite South Asian meals."
    )

    refs = extract_between(cleaned, "Reference List", "Bibliography")
    bib = extract_between(cleaned, "Bibliography", "Appendices")

    revised_txt = REVISED.read_text(encoding="utf-8")
    rv = parse_revised_file(revised_txt)

    meta = (
        "Module: PUSL3190 Computing Project | Supervisor: Mr. Gayan Perera | "
        "Author: Mudiyanselage Ekanayake | Plymouth Index: 10953083 | "
        "Degree: BSc (Hon) in Software Engineering\n\n"
        "Document integrity: This version aligns narrative claims with the calorie-tracker Expo codebase "
        "(scan.service.ts, coach.service.ts, bodyTypeEngine.ts, dietPlanEngine.ts, sync.ts, model/). "
        "Insert figures from your interim report where bracketed."
    )

    sections: list[tuple[str, list[str]]] = [
        ("Acknowledgements", plain_to_paragraphs(ack)),
        ("Abstract", plain_to_paragraphs(NEW_ABSTRACT)),
        ("Chapter 1 – Introduction", plain_to_paragraphs(ch1) + [rq_note]),
        ("Chapter 2 – Literature Review", plain_to_paragraphs(ch2)),
        ("Chapter 3 – Methodology", plain_to_paragraphs(rv.get("CH03", ""))),
        ("Chapter 4 – Requirements", plain_to_paragraphs(rv.get("CH04", ""))),
        ("Chapter 5 – System Architecture and Design", plain_to_paragraphs(rv.get("CH05", ""))),
        ("Chapter 6 – Implementation", plain_to_paragraphs(rv.get("CH06", ""))),
        ("Chapter 7 – Testing", plain_to_paragraphs(rv.get("CH07", ""))),
        ("Chapter 8 – Results and Evaluation", plain_to_paragraphs(rv.get("CH08", ""))),
        ("Chapter 9 – End-Project Report", plain_to_paragraphs(rv.get("CH09", ""))),
        ("Chapter 10 – Project Post-Mortem", plain_to_paragraphs(rv.get("CH10", ""))),
        ("Chapter 11 – Conclusions", plain_to_paragraphs(rv.get("CH11", ""))),
        ("Professional practice, ethics, and limitations", plain_to_paragraphs(rv.get("ETHICS", ""))),
        ("Future work", plain_to_paragraphs(rv.get("FUTURE", ""))),
        ("Reference List", plain_to_paragraphs(refs)),
        ("Bibliography", plain_to_paragraphs(bib)),
        ("Appendices", plain_to_paragraphs(rv.get("APPENDICES", ""))),
    ]

    xml = build_document_xml(meta, sections)
    write_docx(xml, OUT_DOCX)
    print(f"Wrote: {OUT_DOCX}")


if __name__ == "__main__":
    main()
