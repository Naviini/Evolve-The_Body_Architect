# Evolve: AI Body Architect — Final Report (Revised to match implemented codebase)

**Module:** PUSL3190 Computing Project  
**Supervisor:** Mr. Gayan Perera  
**Author:** Mudiyanselage Ekanayake  
**Plymouth Index Number:** 10953083  
**Degree Programme:** BSc (Hon) in Software Engineering  

---

### Note before submission

The PDF titled `10953083_Final Report.pdf` contained several passages that **no longer matched the shipped prototype** in the `calorie-tracker` repository (Expo / React Native). **Use this Markdown revision as the master copy**: paste sections into your Word template and regenerate the PDF, or attach this file where permitted.

What stays examination-strong:

- Design Science Research + Agile framing  
- Problem definition, literature review themes (personalisation, food imaging, coaching, somatotypes, South Asian metabolic risk)  
- Four-layer **Metabolic Intelligence Engine** (`bodyTypeEngine.ts`), **Mifflin–St Jeor / TDEE** pipeline (`calorieEngine.ts`), **culture-aware rule-based diet planning** (`dietPlanEngine.ts`)  
- **ViT fine-tuning pipeline** on Food-101 (`calorie-tracker/model/`) as an empirical ML artefact **alongside** the multimodal LLM deployment choice  

What was corrected:

- Image-based meals use **OpenAI GPT-4o Vision** in production (`scan.service.ts`), not Hugging Face inference alone  
- Coaching uses **OpenAI GPT-4o-mini** with offline fallback templates (`coach.service.ts`); optional **Gemini 2.0 Flash** exists for **body photo analysis** (`bodyPhotoAnalysis.ts`)  
- Diet/workout planning is **rule-based TypeScript**, not Gemini-generated menus  

Acknowledgements, bibliography, and references — retain from your original PDF; fix minor typography (**Colab, OpenAI**).

---

## Acknowledgements

*(Import verbatim from your original submission.)*

---

## Abstract *(replace paragraph on implementation)*

Rising rates of non-communicable diseases (including obesity-related cardiometabolic risk) motivate personalised digital wellness tools. Many consumer apps still exhibit shallow personalisation, weak culturally contextual dietary guidance, and limited motivational support — gaps that matter especially where BMI-centric norms misrepresent metabolic risk.

This project presents **Evolve: AI Body Architect**, an Agile-developed cross-platform prototype (**React Native / Expo**) combining relational backend security (**Supabase PostgreSQL with Row Level Security**), **offline-first SQLite storage**, and an AI tier mixing **multimodal large-language-model estimation for foods**, **LLM-based empathetic coaching with conservative offline fallbacks**, and a **parallel ViT-based classification pipeline** (Food-101) packaged as Python training and optional FastAPI serving (`model/`). A client-side **four-layer somatotype blend engine** integrates Heath–Carter ectomorphy signals with US Navy-style circumference body-fat estimation when measurements exist (`bodyTypeEngine.ts`). Diet composition uses **deterministic, cuisine-aware meal scaffolding** tied to personalised calorie targets (`dietPlanEngine.ts`), aligning transparency expectations with clinical-style disclaimers.

**Deliverables realised** include secure onboarding and profiling; calorie diary with manual catalogue lookup and camera-assisted estimation returning structured macros and confidence; analytics dashboards; workout scheduling logic with progression safeguards; SVG milestone simulation; gamified progression data structures; and sync scaffolding (**Outbox-style pending rows + Supabase push/pull**, `sync.ts`). Cultural specificity is operationalised through onboarding captures (e.g. cuisine preferences), seeded regional catalogue tooling (`seed-srilankan-foods.mjs`), and explicit multilingual-ish prompting strategies rather than Western-only defaults.

The artefact demonstrates that coupling interpretable metabolic scoring with modern multimodal AI and reproducible ViT benchmarking yields an academically credible **Design Science** contribution — bridging rigorous classical formulae with contemporary transformers — without overstating clinical validation beyond prototype scope.

**Keywords:** Body composition estimation · Personalised wellness · Vision Transformer · Multimodal food estimation · South Asian nutrition · LLM coaching · Offline-first mobile health  

---

## Table of Contents

*(Recreate pagination from your original TOC.)*

---

## Chapter 1 – Introduction

**Retain sections 1.1–1.6 from your original report.** Optionally tighten Research Question 2 wording:

- Replace rigid claims about ViT **alone** on Sri Lankan plates with: benchmark ViT on Food-101 **plus** qualitative/generalisation discussion for composite Asian dishes; note multimodal LLM deployment rationale where taxonomy labels are insufficient.

---

## Chapter 2 – Literature Review

**No substantive change required.**

---

## Chapter 3 – Methodology *(critical corrections)*

### 3.1 Introduction

Unchanged.

### 3.2 High-Level Architectural Diagram

Revise the **AI tier** description:

The Client tier is a React Native / Expo application (camera capture, UI state). Persisted profile/meals/workouts live primarily in **Expo SQLite** for responsiveness and interruption-safe onboarding.

The Server tier is **Supabase** (PostgreSQL, authentication where configured, **Row Level Security** on mirrored entities).

The AI tier is **hybrid**:

| Capability | Primary implementation in codebase |
|------------|-------------------------------------|
| Food photo → dish name + macros | **OpenAI GPT-4o Vision** (`scan.service.ts`), structured JSON extraction; demo fallback when keys absent |
| Conversational coach | **OpenAI GPT-4o-mini** (`coach.service.ts`), crisis-keyword guard + rotating offline supportive templates |
| Optional body photo commentary | **Gemini 2.0 Flash** (`bodyPhotoAnalysis.ts`) when `EXPO_PUBLIC_GEMINI_API_KEY` set |
| ViT Food-101 classifier | Python training + optional **FastAPI** server (`model/inference_server.py`) or HF Hub deployment path |

The **Metabolic Intelligence Engine** (somatotype blending), **calorie target engine**, and **diet/workout assembly rules** execute **client-side in TypeScript**.

### 3.3 Dataset and Data Collection

- **Food-101** remains the supervised ViT corpus — unchanged justification.  
- **Regional corpus:** Replace any claim of a completed *n* = 847 proprietary vision dataset **unless you independently verified those assets**. Safer wording: *planned / supplementary regional imagery for future ViT fine-tuning*, plus **catalogue-level Sri Lankan nutrition seed scripts** already in-repo for manual logging realism.  
- Onboarding + survey narrative — retain if empirically grounded; otherwise label clearly as **formative elicitation**.

### 3.4 Data Pre-Processing

ViT augmentation narrative — retain as design intent for `prepare_dataset.py`.

Remove or qualify extremely specific proprietary QC statistics unless backed by stored annotations.

### 3.6 Model Development *(replace final sentences on diet/workout)*

After the paragraph on Metabolic Intelligence Engine, **replace** the Gemini sentence with:

The **meal-plan generator** (`dietPlanEngine.ts`) allocates calories/macros across breakfast–dinner–snack templates using cuisine affinity derived from nationality + preference arrays, diet archetypes (e.g. keto/vegan), allergies, and contextual notes — producing transparent textual meals rather than opaque LLM-only hallucinations. The **workout planner** applies stratified templates filtered by equipment and safety tags (implementation mirrors modular generation patterns described in implementation chapter).

### 3.7 Model Validation *(honest scope)*

| Artefact | Validation approach aligned with repository |
|----------|---------------------------------------------|
| ViT | Run `evaluate_model.py` after producing `trained_model/food101_vit`; report Top-1 / Top-5 from script output on Food-101 validation split |
| Multimodal scanner | Qualitative / pilot validation + confidence introspection; emphasise strength on unseen composite dishes vs closed-set classifier limits |
| Navy component | Deterministic formula checks vs reference calculators / boundary tests |
| Somatotype blend | Internal consistency + UX-facing confidence labels (`high`/`medium`/`low`) |

**Remove DEXA cohort claims** unless you collected ethics-approved paired measurements.

### 3.8 System Development

Minor tweak to pivot justification: emphasise **OpenAI + Expo + Supabase TypeScript synergy**; ViT remains parallel Python artefact.

---

## Chapter 4 – Requirements

### 4.2 Functional Requirements — bullet amendments

- **Dual-mode calorie tracking:** manual SQLite-backed catalogue **and** image-assisted estimation via **OpenAI GPT-4o Vision**, with deterministic demo fallback; optional ViT endpoint/Hugging Face path documented under `model/README.md`.  
- **Coaching:** LLM coach (`gpt-4o-mini`) plus offline motivational templates; crisis routing without model invocation.

Other bullets largely unchanged.

### 4.3 Non-Functional Requirements

Split overly merged AI metrics:

- ViT Food-101 benchmark ≥85% Top-1 — **applies to trained classifier pathway**, evidencable from evaluation logs  
- Multimodal scanner — phrase as **response-quality / perceived usefulness targets** under pilot testing rather than Top-1 accuracy on open-world dishes  

---

## Chapter 5 – System Architecture and Design

### 5.1 Technology Stack — replace Table 5.1

| Component | Original proposal | **As implemented** | Justification |
|-----------|-------------------|--------------------|---------------|
| Frontend | Flutter | **React Native / Expo** | Rapid device iteration; TS ecosystem |
| Primary persistence | Firebase | **SQLite + Supabase mirror** | Offline-first + relational integrity |
| Food imaging AI | CNN | **GPT-4o Vision (primary)** + **ViT pipeline (research / optional API)** | Closed-set ViT vs open-vocabulary multimodal trade-off |
| Coach LLM | GPT-class | **GPT-4o-mini + offline templates** | Cost/latency balance; gym-context prompting |
| Body photo insights | — | **Gemini 2.0 Flash (optional)** | Separate modality from meal scan |
| Auth | Firebase Auth | **Supabase Auth + RLS** | Policy-driven isolation |

### 5.2 Database Schema

Clarify: **authoritative OLTP during demo/offline development is SQLite** (`database.ts`); Supabase entities mirror critical rows for sync demonstrations.

### 5.3.3 Food Recognition — split into two subsections

**(A) ViT classifier path** — unchanged mathematical description; inference via **local FastAPI** or HF Hub **when wired**, not hard-coded as the mobile path.

**(B) Shipped multimodal path** — JPEG/base64 payload to OpenAI Chat Completions (`gpt-4o`), schema-enforced JSON; alternatives array matches UX expectations.

---

## Chapter 6 – Implementation

### 6.3 Food Recognition System *(complete rewrite)*

The Scan screen captures media via **Expo Camera / picker**. Images convert to **base64** (with `prepareImageForScan` assisting URIs). `recognizeFood` POSTs to OpenAI with **high-detail vision** and parses JSON (stripping accidental Markdown fences). Missing keys trigger **rotate-through demo predictions** so graders always see a functioning vertical slice.

Manual logging searches **local food_items + seeded datasets**.

---

## Chapter 7 – Testing *(integrity-preserving)*

### 7.2 AI Model Evaluation

Report **actual numbers only after** running `evaluate_model.py`. Narratively argue ViT attention advantages vs CNN baselines using literature **even if ablation against ResNet was not re-run** — frame fairly as *design rationale supported by external benchmarks*.

### 7.3 Body-Type Detection Validation

Describe **layer-weight verification**, Navy BF sanity boundaries, and qualitative onboarding reviews — **not percentage accuracy vs DEXA** unless measured.

### 7.4–7.5 Integration / UAT

Keep structured test case counts **only if accurate**. Tie coaching tests to **crisis regex bypass** and fallback behaviour.

---

## Chapter 8 – Results and Evaluation

Remap objectives honestly:

1. **Profiling + somatotype** — achieved (transparent TS engine).  
2. **Diet personalisation** — achieved via rule engine + macro splits + cuisine bias — **not via Gemini menu synthesis**.  
3. **Workouts** — achieved via templated generator logic.  
4. **Calorie tracking + AI scan** — achieved via GPT-4o Vision path + manual DB.  
5. **Motivation** — achieved via coach tab + simulation + rewards scaffolding.  
6. **Pilot evaluation** — describe formative outcomes; attach questionnaires **if they exist**.

Replace Table 8.1 fabricated rows with **Measured (ViT eval script)** vs **Qualitative / pending** columns until populated.

---

## Chapter 9 – End-Project Report

Summarise **dual-track AI strategy** as deliberate engineering: reproducible ViT benchmark vs flexible multimodal deployment.

### 9.3 Changes During Project

Add explicit bullet: **Mobile integration favoured OpenAI Vision over HF-only inference for broader dish naming and macro estimation without maintaining regional ViT weights inside Expo.**

Fix Appendix G PID reference typo (**10953083**, not 10953085) if present.

---

## Chapter 10 – Post-Mortem

Tech regrets row update: primary limitation is **cloud dependence for scan/coach** despite SQLite-first diary — partially mitigated by offline diary + coach templates.

---

## Chapter 11 – Conclusions

Restate contributions:

1. Interpretable multi-layer somatotype fusion suited to mobile measurements  
2. Hybrid AI architecture blending classical nutrition formulae, deterministic planners, ViT reproducibility, and multimodal LLM UX  
3. Offline-aware engineering patterns relevant to LMIC connectivity realities  

Limitations: API costs, privacy of client-side keys in student demos (**document mitigation**: backend proxy for production), regional ViT data scale.

---

## Appendices

### Appendix A – User Guide

- Step referencing ViT-only scanning → **OpenAI-powered scan** (demo mode without keys).  
- Coaching tab offline behaviour — explain template replies.

### Appendix C – Architecture Diagram

Caption must show **OpenAI + optional Gemini + optional ViT server**.

### Appendix D – Source Listings

- **D.1** `bodyTypeEngine.ts` — correct  
- **D.2** `calorieEngine.ts` — correct  
- **D.3** `scan.service.ts` excerpt — **add** alongside sync service  

### Appendix E – Test Summary

Reconcile totals with Chapter 7 — avoid contradictory pass counts.

### Appendix G – PID

Verify filename/index consistency (**10953083**).

---

## Closing checklist for maximum marks without integrity risk

1. Run ViT evaluation once → paste **real Top-1 / Top-5** into Chapter 7–8  
2. Export fresh PDF from faculty template  
3. Ensure demo accounts work **without paywalled keys** (demo scan path)  
4. Screenshots: Scan result JSON UI + Coach tab + Profile body-type breakdown  

---

*End of revised master document.*
