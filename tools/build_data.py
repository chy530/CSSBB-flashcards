#!/usr/bin/env python3
"""Convert the CSSBB flashcard workbook into data/cards.json for the web app.

Usage:
    python tools/build_data.py                 # uses the first .xlsx file in source/
    python tools/build_data.py path/to/file.xlsx

The script validates the workbook and stops with a clear message if anything
is wrong, so a broken workbook never replaces a working site.
"""
import glob
import hashlib
import json
import os
import sys
from datetime import datetime, timezone

try:
    from openpyxl import load_workbook
except ImportError:
    sys.exit("openpyxl is required: pip install openpyxl")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "cards.json")

SECTIONS = [
    ("Fundamental", "Fundamentals"),
    ("I. Organization-Wide Planning and Deployment", "I. Org-wide planning"),
    ("II. Organizational Process Management and Measures", "II. Process management"),
    ("III. Team Management", "III. Team management"),
    ("IV. Define", "IV. Define"),
    ("V. Measure", "V. Measure"),
    ("VI. Analyze", "VI. Analyze"),
    ("VII. Improve", "VII. Improve"),
    ("VIII. Control", "VIII. Control"),
    ("IX. Design for Six Sigma (DFSS)", "IX. DFSS"),
]
SUBSECTIONS = {
    "I.A": "Organization-wide considerations", "I.B": "Leadership",
    "II.A": "Impact on stakeholders", "II.B": "Benchmarking", "II.C": "Business measures",
    "III.A": "Team formation", "III.B": "Team facilitation", "III.C": "Team dynamics", "III.D": "Team training",
    "IV.A": "Voice of the customer", "IV.B": "Business case and project charter",
    "IV.C": "Project management tools", "IV.D": "Analytical tools",
    "V.A": "Process characteristics", "V.B": "Data collection", "V.C": "Measurement systems",
    "V.D": "Basic statistics", "V.E": "Probability", "V.F": "Process capability",
    "VI.A": "Measuring and modeling relationships", "VI.B": "Hypothesis testing",
    "VI.C": "Risk analysis and management", "VI.D": "Additional analysis methods",
    "VII.A": "Design of experiments", "VII.B": "Lean methods", "VII.C": "Implementation",
    "VIII.A": "Statistical process control", "VIII.B": "Other controls",
    "VIII.C": "Maintain controls", "VIII.D": "Sustain improvements",
    "IX.A": "Common DFSS methodologies", "IX.B": "Design for X", "IX.C": "Robust designs",
    "Not in 2022 BoK": "Not in the 2022 BoK",
}


def clean(v):
    if v is None:
        return ""
    s = str(v).strip()
    return "" if s.startswith("=") else s  # formulas are recomputed here


def header_map(ws):
    hdr = [clean(c.value) for c in ws[1]]
    return {h: i for i, h in enumerate(hdr) if h}


def col(hmap, *names):
    for n in names:
        for h, i in hmap.items():
            if h.lower().startswith(n.lower()):
                return i
    raise KeyError(f"Column not found: {names[0]}")


def main():
    if len(sys.argv) > 1:
        path = sys.argv[1]
    else:
        files = sorted(glob.glob(os.path.join(ROOT, "source", "*.xlsx")))
        files = [f for f in files if not os.path.basename(f).startswith("~$")]
        if not files:
            sys.exit("No .xlsx workbook found in source/")
        if len(files) > 1:
            names = ", ".join(os.path.basename(f) for f in files)
            sys.exit(f"source/ must contain exactly one workbook, but it has {len(files)}: {names}. "
                     "Delete the old one and commit again.")
        path = files[0]

    wb = load_workbook(path, data_only=False)
    errors = []

    # ---------- Terms ----------
    ws = wb["Terms"]
    h = header_map(ws)
    c_id, c_term, c_acr = col(h, "ID"), col(h, "Term"), col(h, "Acronym")
    c_def, c_sec, c_diff, c_bok = col(h, "Definition"), col(h, "CSSBB Exam Section"), col(h, "Difficulty"), col(h, "BoK")
    known_secs = [s for s, _ in SECTIONS]
    terms, seen = [], set()
    for rn, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        tid = clean(row[c_id])
        if not tid:
            continue
        name, acr, d = clean(row[c_term]), clean(row[c_acr]), clean(row[c_def])
        sec, bok = clean(row[c_sec]), clean(row[c_bok])
        try:
            diff = int(float(clean(row[c_diff])))
        except ValueError:
            diff = 0
        if tid in seen:
            errors.append(f"Terms row {rn}: duplicate ID {tid}")
        seen.add(tid)
        if not name:
            errors.append(f"Terms row {rn} ({tid}): missing term name")
        if not d:
            errors.append(f"Terms row {rn} ({tid}): missing definition")
        if sec not in known_secs:
            errors.append(f"Terms row {rn} ({tid}): unknown section '{sec}'")
        if diff not in (1, 2, 3, 4, 5):
            errors.append(f"Terms row {rn} ({tid}): difficulty must be 1-5")
        sub = bok if bok.startswith("Not") else ".".join(bok.split(".")[:2])
        terms.append({
            "id": tid, "term": name, "acr": acr, "def": d,
            "sec": known_secs.index(sec) if sec in known_secs else 0,
            "diff": diff, "bok": bok, "sub": sub, "nonBok": bok.startswith("Not"),
        })
    display = {(t["term"] + (f" ({t['acr']})" if t["acr"] else "")): t["id"] for t in terms}

    # ---------- Distractor glossary (optional) ----------
    glossary = {}
    if "Distractor Glossary" in wb.sheetnames:
        for row in wb["Distractor Glossary"].iter_rows(min_row=2, values_only=True):
            if row and clean(row[0]):
                glossary[clean(row[0])] = clean(row[1])

    # ---------- Quiz Bank ----------
    ws = wb["Quiz Bank"]
    h = header_map(ws)
    c_qid, c_tid, c_prompt = col(h, "Question ID"), col(h, "Term ID"), col(h, "Question Prompt")
    wrong_cols = [col(h, f"Wrong Answer {i}") for i in range(1, 7)]
    why_cols = [col(h, f"Why Wrong {i}") for i in range(1, 7)]
    ids = {t["id"] for t in terms}
    questions, qseen = [], set()
    for rn, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        qid = clean(row[c_qid])
        if not qid:
            continue
        tid, prompt = clean(row[c_tid]), clean(row[c_prompt])
        if qid in qseen:
            errors.append(f"Quiz Bank row {rn}: duplicate question ID {qid}")
        qseen.add(qid)
        if tid not in ids:
            errors.append(f"Quiz Bank row {rn} ({qid}): term ID '{tid}' not on Terms sheet")
        if not prompt:
            errors.append(f"Quiz Bank row {rn} ({qid}): missing question prompt")
        wrong = []
        for wc, yc in zip(wrong_cols, why_cols):
            text, why = clean(row[wc]), clean(row[yc])
            if not text or not why:
                errors.append(f"Quiz Bank row {rn} ({qid}): every wrong answer needs text and an explanation")
                continue
            if display.get(text) == tid:
                errors.append(f"Quiz Bank row {rn} ({qid}): wrong answer '{text}' is the correct answer")
            if text not in display and text not in glossary:
                print(f"Note: {qid} wrong answer '{text}' is not a term or glossary entry")
            wrong.append({"text": text, "why": why, "tid": display.get(text)})
        if len({w['text'] for w in wrong}) != len(wrong):
            errors.append(f"Quiz Bank row {rn} ({qid}): wrong answers repeat")
        questions.append({"id": qid, "tid": tid, "prompt": prompt, "wrong": wrong})

    if errors:
        print("\nThe workbook has problems that must be fixed before publishing:\n")
        for e in errors[:60]:
            print("  - " + e)
        if len(errors) > 60:
            print(f"  ... and {len(errors) - 60} more")
        sys.exit(1)

    payload = {"terms": terms, "questions": questions, "glossary": glossary,
               "sections": [{"name": n, "short": s} for n, s in SECTIONS], "subsections": SUBSECTIONS}
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()[:8]
    payload["version"] = {
        "id": digest,
        "built": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "source": os.path.basename(path),
        "terms": len(terms), "questions": len(questions),
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Wrote {os.path.relpath(OUT, ROOT)}: {len(terms)} terms, {len(questions)} questions (version {digest})")


if __name__ == "__main__":
    main()
