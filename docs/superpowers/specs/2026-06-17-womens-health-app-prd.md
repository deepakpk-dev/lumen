# Product Requirements Document — Women's Health Platform (Flo-style)

**Working title:** Lumen
**Status:** Draft v1 for review
**Date:** 2026-06-17
**Owner:** deepakp.tvla@gmail.com
**Type:** Product Requirements Document (full-feature clone)

---

## 0. Document purpose & how to read it

This PRD describes a comprehensive, women's-health platform modeled on [Flo Health](https://flo.health/). It is deliberately broad — it maps the *entire* product surface across every life stage — but it is sequenced so the team can build in coherent phases. Each major feature area is a self-contained section with its own requirements, so it can be lifted into its own design doc and implementation plan later.

**Key product decisions locked for this PRD (from scoping):**

| Decision | Choice | Why it matters |
|---|---|---|
| Scope | Full-feature clone, all life stages | The roadmap covers cycle, fertility/TTC, pregnancy, and peri/menopause. |
| Primary surface | **Web-first** responsive PWA; native mobile is a later phase | Faster iteration; PWA gives installable, offline, push-capable app without app-store gatekeeping for v1. |
| AI | **Supporting** feature, not centerpiece | Rules-based predictions are the backbone; AI augments insights + assistant with strict guardrails. |
| Monetization | **Free, ad-free, no paywall** | Removes the incentive to monetize personal health data — this is the engine of the privacy story. |
| Privacy | **Headline pillar** | Anonymous Mode, encryption, data minimization, and post-*Dobbs* protections are a first-class product area. |

---

## 1. Background & market analysis

### 1.1 What Flo is
Flo is the world's most-used female-health app (200M+ downloads, ~70M+ MAU range historically reported). It started as a period tracker and expanded into a full "health companion for every life stage": menstrual cycle prediction, ovulation/fertility windows, a "trying to conceive" (TTC) mode, a full pregnancy week-by-week mode, symptom and mood logging, a large library of expert-reviewed health content, AI-driven insights, anonymous community chats ("Secret Chats"), partner sharing, and a premium subscription.

### 1.2 Why this category matters
- **Massive underserved need.** Menstrual and reproductive health has been historically under-researched and under-served by software. Daily-use health tracking is one of the stickiest consumer categories.
- **High retention & frequency.** Cycle tracking is inherently a daily/near-daily habit with a strong notification loop, producing exceptional retention vs. typical consumer apps.
- **Longitudinal value.** The product gets *more useful the longer you use it* — predictions improve, history accrues, and the app can accompany a user through distinct life stages (a multi-decade relationship).

### 1.3 The privacy reckoning (critical context)
Flo settled with the U.S. FTC (2021) over allegations it shared sensitive health data with third parties (e.g., analytics/ad SDKs) despite privacy promises. Post-settlement, Flo launched **Anonymous Mode** (decoupling identity from health data) and has leaned hard into privacy marketing. The *Dobbs* decision (2022) raised the stakes dramatically in the U.S.: period/pregnancy data became potential legal evidence, making **data protection a survival-level requirement and a genuine differentiator**, not a checkbox.

**Strategic implication for Lumen:** Because we are choosing a **free, ad-free, no-paywall** model, we have *no commercial reason to retain or share identifiable health data*. We can make privacy structurally true (data minimization, client-side encryption, no ad SDKs) rather than merely promised. This is our sharpest wedge.

### 1.4 Competitive landscape

| App | Positioning | Strength | Gap we can exploit |
|---|---|---|---|
| **Flo** | Mass-market all-in-one | Content depth, brand, scale | Past trust damage; ads/upsell pressure; closed |
| **Clue** | Science-forward, EU/privacy | Credible, clean data viz | Less content/community breadth |
| **Natural Cycles** | FDA-cleared contraception | Regulatory moat (BBT-based) | Narrow; requires daily temping |
| **Apple Health / Cycle Tracking** | OS-native, private | Privacy, ubiquity (iOS) | Shallow features, no content/community |
| **Stardust / Ovia / Glow** | Niche (astrology / pregnancy / fertility) | Specific audiences | Fragmented experience |

**Our wedge:** the *trust-first, genuinely-free, all-life-stage* companion — Flo's breadth with Clue's credibility and a privacy architecture nobody else structurally guarantees.

### 1.5 Non-negotiable constraints
- **This is not a medical device** in v1. We must avoid making diagnostic or contraceptive-efficacy claims, and we surface medical disclaimers and "consult a clinician" prompts at appropriate moments.
- **Medical accuracy.** All health content and rules must be reviewed by qualified medical professionals (or sourced from reputable bodies: ACOG, NHS, WHO). Predictions must be honest about uncertainty.
- **Inclusive & sensitive by default.** The product touches grief (miscarriage, infertility), identity (trans/nonbinary users menstruate too), and trauma. Tone, defaults, and copy must reflect this.

---

## 2. Vision, goals & success metrics

### 2.1 Vision
> A health companion that women and people who menstruate can trust completely — accompanying them accurately through every life stage, without ever turning their bodies into a data product.

### 2.2 Goals
1. **Accurate, honest predictions** for cycle, period, fertile window, and ovulation, with transparent confidence.
2. **Complete life-stage coverage** — one app from first period to menopause.
3. **Structural privacy** — the safest place to record reproductive health data, provably.
4. **Daily-habit engagement** through a warm, low-friction logging loop and timely, relevant insights.
5. **Trusted education & community** — medically reviewed content and a safe, anonymous peer space.

### 2.3 Success metrics (North Star + supporting)

**North Star:** *Weekly Logging Active Users* (users who log ≥1 health data point in a 7-day window) — captures the core habit that drives all downstream value.

| Category | Metric | Target (12 mo post-launch) |
|---|---|---|
| Acquisition | Onboarding completion rate | ≥ 75% |
| Activation | % logging within first 3 days | ≥ 60% |
| Engagement | D30 retention | ≥ 35% |
| Engagement | Avg. logging days / week | ≥ 4 |
| Prediction | Period-start prediction error | ≤ 2 days median (regular cycles) |
| Trust | Anonymous Mode adoption | ≥ 25% of new users |
| Content | % WAU reading ≥1 article/week | ≥ 30% |
| Community | Weekly community participation | ≥ 10% of WAU |
| Quality | Crash-free sessions | ≥ 99.5% |

---

## 3. Target users & personas

| Persona | Life stage | Primary need | Key features |
|---|---|---|---|
| **Maya, 19** | First years of menstruation | Understand her body, predict periods, reduce surprise | Cycle tracking, education, symptom logging, discreet UI |
| **Priya, 29 (TTC)** | Trying to conceive | Maximize conception odds, reduce anxiety | Fertile window, ovulation, BBT/LH/cervical mucus logging, partner share |
| **Sara, 32 (pregnant)** | Pregnancy | Week-by-week guidance, symptom safety | Pregnancy mode, kick counter, weight, content, appointments |
| **Lena, 34 (avoiding)** | Contraception-aware | Track cycle, avoid pregnancy (non-clinical awareness) | Fertile-window awareness + clear non-contraception disclaimers |
| **Carol, 48** | Perimenopause | Make sense of irregular cycles & new symptoms | Irregular-cycle handling, peri symptom set, content |
| **Alex, 26 (nonbinary)** | Any | Track health without gendered, alienating UI | Inclusive language settings, customizable identity |
| **Privacy-conscious (cross-cutting)** | Any | Track without surveillance risk | Anonymous Mode, passcode lock, local-first, export/delete |

Design principle: **a user is never "in the wrong app."** Life stage is a *mode the user switches into*, not a separate product, and switching must be effortless and judgment-free (including the painful transitions: pregnancy loss → back to cycle mode).

---

## 4. Product pillars & feature map

The product is organized into **eight pillars**. Each is detailed in §5–§12.

```
1. Cycle & Period Tracking      (core habit loop)
2. Fertility & Conception (TTC) (life-stage mode)
3. Pregnancy                    (life-stage mode)
4. Perimenopause & Menopause    (life-stage mode)
5. Health Logging & Insights    (symptoms, mood, vitals, patterns)
6. Education & Content Library   (medically reviewed)
7. Community ("Circles")        (anonymous peer support)
8. Privacy, Trust & Account     (headline pillar, cross-cutting)
   + Cross-cutting: AI Assistant, Partner Sharing, Notifications, Settings
```

---

## 5. Pillar 1 — Cycle & Period Tracking (core)

The heart of the app and the daily habit loop.

### 5.1 Core concepts
- **Cycle:** day 1 = first day of period; length = days until next period starts.
- **Phases:** menstrual, follicular, ovulation, luteal — visualized.
- **Prediction:** next period start, period length, fertile window, ovulation day, with confidence.

### 5.2 Requirements

**Logging**
- One-tap "period started" / "period ended"; edit start/end dates retroactively.
- Flow intensity (spotting → heavy), per day.
- Quick-log of symptoms/mood/sex/notes attached to a day (see §9).

**Prediction & visualization**
- A central **calendar view** (month) showing past periods, predicted periods, fertile window, and ovulation, color-coded.
- A **today/home "ring" view**: cycle day, current phase, days to next period/period in progress, and the single most relevant insight.
- Predictions adapt to logged actuals; the model explains *why* (e.g., "your last 3 cycles averaged 29 days").
- **Honest uncertainty:** irregular cycles show widened windows and a clear "prediction confidence: low" state rather than false precision.

**History & analytics**
- Cycle history list (length, period length, symptoms summary per cycle).
- Trends: average cycle length, variation, period length over time; symptom frequency charts.
- "Cycle report" exportable as PDF (for clinicians) — local generation, no server round-trip required.

**Edge cases**
- First-time users with no history → prompt for last period date + typical length; show low-confidence predictions until data accrues.
- Irregular / PCOS-pattern cycles → never shame; offer relevant content; widen windows.
- Skipped/late periods → surface gentle prompts and possible-reasons content (not alarmist).

### 5.3 Acceptance criteria (sample)
- Given a user with ≥3 logged cycles of regular length, predicted next-period date is within ±2 days of actual for ≥80% of cycles.
- Logging a period start updates the home view and calendar within the same session, offline-capable.

---

## 6. Pillar 2 — Fertility & Conception (TTC mode)

A mode users opt into when trying to conceive.

### 6.1 Requirements
- **Fertile window & ovulation** prominently surfaced with daily conception-probability guidance ("high"/"medium"/"low" — qualitative, never a guarantee).
- **Advanced fertility signals** logging:
  - Basal Body Temperature (BBT) with a chart and biphasic-shift detection.
  - LH/ovulation test results (negative/positive).
  - Cervical mucus type (dry → egg-white).
  - Intercourse logging (with optional protection flag).
- **Ovulation confirmation** by combining BBT shift + LH + mucus (rules-based, transparent).
- **TTC content track**: conception tips, when to seek help, understanding results.
- **Partner sharing** (see §13.2): share fertile window / "good day to try" with a partner.
- **Sensitive handling**: long TTC journeys → supportive tone; surface infertility resources after N cycles without success; never celebratory-pushy.
- **Strong non-medical disclaimer**: not a substitute for fertility treatment or contraception.

---

## 7. Pillar 3 — Pregnancy mode

Switched on at confirmation of pregnancy (or imported from TTC).

### 7.1 Requirements
- **Week-by-week experience**: current gestational week, trimester, due-date countdown.
- **Baby development**: weekly "size of" visualization, what's developing, what to expect.
- **Maternal changes & symptoms**: weekly maternal content, symptom logging tuned to pregnancy.
- **Weight tracking** with healthy-range guidance (informational).
- **Kick counter** (timed session to count fetal movements).
- **Contraction timer** (late pregnancy).
- **Appointments & to-dos**: prenatal appointment reminders, trimester checklists.
- **Symptom safety prompts**: flag symptoms that warrant contacting a clinician (educational triage, not diagnosis).
- **Due date calculation** from LMP or user-provided due date; editable.
- **Graceful exit paths**:
  - Birth → transition to postpartum (v2) or back to cycle mode.
  - **Pregnancy loss** → a dedicated, compassionate flow: pause, offer support content/resources, allow quiet return to cycle mode without re-traumatizing prompts. *This flow is a first-class requirement, not an afterthought.*

---

## 8. Pillar 4 — Perimenopause & Menopause

Often ignored by competitors; a real differentiator.

### 8.1 Requirements
- **Irregular-cycle-first tracking**: the prediction engine must degrade gracefully and stop forcing regular-cycle assumptions.
- **Peri/menopause symptom set**: hot flashes, night sweats, sleep, mood changes, vaginal/urinary symptoms, libido, brain fog.
- **Stage education**: perimenopause vs. menopause vs. postmenopause; what's normal; treatment options overview (HRT etc. — informational, clinician-referring).
- **Symptom trend tracking** to share with clinicians.
- **Tone**: affirming, de-stigmatizing.

---

## 9. Pillar 5 — Health logging & insights

The cross-life-stage logging system that feeds everything.

### 9.1 Loggable categories (configurable)
- **Symptoms**: cramps, headache, acne, tender breasts, bloating, fatigue, etc.
- **Mood & emotions**: happy, sad, anxious, irritable, calm, mood swings, etc.
- **Vaginal discharge / cervical mucus**.
- **Sexual activity** (protected/unprotected, drive).
- **Vitals & lifestyle**: weight, BBT, water, sleep, physical activity, medication/birth-control intake, energy.
- **Notes**: free-text per day.
- **Custom symptoms** (user-defined tags).

### 9.2 Insights engine
- **Personalized daily insights**: "You often report headaches in your luteal phase" — derived from the user's own logged data (rules + lightweight stats; AI-augmented summaries per §13.1).
- **Pattern detection**: correlate symptoms with cycle phase; surface notable recurrences.
- **Cycle-phase guidance**: phase-appropriate tips (nutrition, exercise, expected feelings).
- **Anomaly nudges**: unusually long cycle, missed period, symptom clusters → educational content + "consider seeing a clinician" where appropriate (never diagnostic).
- **Health Assistant entry point** for free-text questions (§13.1).

### 9.3 Requirements
- Logging must be **fast** (home screen → logged in ≤ 2 taps for common items).
- All logging works **offline** and syncs later.
- Insights must be **explainable** (every insight links to "why am I seeing this?").
- Insights must **never** be alarmist or diagnostic; medical disclaimers present.

---

## 10. Pillar 6 — Education & content library

### 10.1 Requirements
- **Library** of articles/videos organized by topic and life stage; searchable.
- **Medically reviewed**: every piece carries author + medical reviewer + last-reviewed date.
- **Personalized feed**: surface content matched to the user's life stage, cycle phase, and logged symptoms.
- **Courses / programs**: multi-part guided programs (e.g., "Understanding PCOS", "Preparing for pregnancy").
- **Daily content card** on home, tied to where the user is in their cycle/stage.
- **Sources cited**; clear distinction between education and medical advice.

### 10.2 Content operations
- CMS-driven; content is data, not code.
- Editorial workflow: draft → medical review → publish; review-date expiry triggers re-review.

---

## 11. Pillar 7 — Community ("Circles")

Flo's "Secret Chats" equivalent — anonymous peer support.

### 11.1 Requirements
- **Anonymous-by-default** participation (pseudonymous handle, never tied to real identity in UI).
- **Topic spaces** ("Circles"): TTC, pregnancy, PCOS, endometriosis, first periods, menopause, mental health, relationships, etc.
- **Posts + threaded replies**, reactions, follow/bookmark.
- **Expert presence**: verified expert badges; optional expert-answered threads.
- **Safety & moderation (critical)**:
  - Proactive moderation: profanity/harassment filters, rate limits, report/block.
  - Crisis detection: self-harm/abuse language → surface helpline resources; escalation path.
  - Strict prohibition + detection of medical-misinformation and dangerous "advice"; clear community guidelines.
  - Human moderation queue + trusted-flagger system.
- **Privacy**: community identity is fully decoupled from health-tracking identity; nothing a user logs is ever exposed in community.

### 11.2 Risks
Community is the highest-risk pillar (safety, legal, moderation cost). It is sequenced **after** core tracking is solid (see §16) and may launch with a tighter, moderated MVP (fewer Circles, stronger filters).

---

## 12. Pillar 8 — Privacy, trust & account (headline pillar)

This is the spine of the product and our primary differentiator. It is cross-cutting but specified here as a pillar to give it first-class weight.

### 12.1 Principles
1. **Data minimization** — collect only what the feature needs; no behavioral/ad tracking SDKs, ever.
2. **Local-first** — health data lives encrypted on-device; sync is opt-in and encrypted.
3. **No data-for-money** — the free/ad-free model removes the incentive to monetize data; state this publicly and structurally enforce it.
4. **User ownership** — full export and one-tap, real delete (not "deactivate").
5. **Transparency** — plain-language privacy policy; clear in-app explanations of what's stored where.

### 12.2 Requirements

**Anonymous Mode**
- Allow full use of the app **without** providing name, email, or any direct identifier — account keyed to a device/credential the user controls.
- Health data **decoupled** from any identity: even if an account identifier exists (for sync), it must not be linkable to health records by the operator.
- Clear UI explaining the trade-off (e.g., harder account recovery) and how it protects them.

**Encryption**
- At rest: encrypted local store; if synced, **end-to-end encryption** so the server cannot read health content (zero-knowledge sync as the north-star design).
- In transit: TLS everywhere.

**Access controls**
- App-level **passcode / biometric lock**; auto-lock timeout.
- "Disguise/stealth" options (e.g., neutral app naming/icon) considered for at-risk users (v2).

**Data rights**
- Export all data (machine-readable + human-readable PDF).
- **Delete account & data** with immediate, verifiable effect.
- Granular consent toggles for any optional processing (e.g., anonymized research) — **off by default**.

**Post-*Dobbs* protections**
- Minimize retention of legally sensitive data on servers; prefer local-only where feasible.
- No server-side logs that reconstruct reproductive events tied to identity.
- Clear policy on law-enforcement requests; design so we *cannot* hand over what we don't hold.

**Compliance**
- GDPR/CCPA compliant; privacy-by-design and DPIA documented.
- Honor "do not sell/share"; no third-party ad/analytics that exfiltrate health data (use privacy-respecting, self-hosted/aggregate analytics only).

### 12.3 Account model
- **Anonymous account** (default offered): device-key based, optional recovery phrase.
- **Identified account** (optional): email/passwordless or OAuth, for cross-device sync convenience — still E2E encrypted.
- Onboarding presents the privacy choice clearly and respectfully.

---

## 13. Cross-cutting features

### 13.1 AI Health Assistant (supporting feature)
- **Conversational assistant** answering general reproductive-health questions in plain language, grounded in the vetted content library (RAG over our own medically-reviewed corpus — *not* open-web).
- **Personalized insight summaries**: turn the user's own logged patterns into readable, supportive summaries.
- **Guardrails (mandatory)**:
  - Never diagnoses, never prescribes, never states contraceptive efficacy.
  - Always cites sources from the vetted library; refuses/deflects out-of-scope or emergency queries to "contact a clinician / emergency services."
  - Crisis content → helpline resources.
  - Clearly labeled as AI; not a doctor.
  - **Privacy**: personalization happens with strict data handling; if logged health data is sent to a model, it must be consistent with the privacy pillar (prefer on-device or privacy-preserving inference; user consent required). No training on user health data.
- **Model strategy**: a current frontier model via a provider gateway, with the corpus as ground truth; deterministic rule outputs (predictions) are *never* delegated to the LLM.

### 13.2 Partner sharing
- Invite a partner to view a **scoped, consented** subset (e.g., fertile window, period dates, mood "heads-up", pregnancy milestones).
- User controls exactly what is shared; revocable anytime.
- Partner has a **limited companion view**, never edit access to the user's health log.

### 13.3 Notifications & reminders
- Predictive: upcoming period, fertile window, ovulation, "log today?" nudges.
- Pill/birth-control reminders.
- Pregnancy: weekly update, appointment reminders.
- Content nudges (relevant article).
- **Respectful**: all opt-in/configurable, frequency-capped, discreet wording (no embarrassing lock-screen text by default).

### 13.4 Onboarding
- Warm, fast, life-stage-routing onboarding: goal selection (track cycle / get pregnant / pregnant / understand body / menopause), last-period + cycle-length capture, identity/privacy choice (incl. Anonymous Mode), notification opt-in.
- Sets up first prediction immediately; defers optional setup.

### 13.5 Settings
- Profile, life-stage mode switch, privacy & security, notifications, units/locale, inclusive-language toggle, data export/delete, partner management, help/support.

---

## 14. Cross-cutting UX & design principles

- **Calm, warm, non-clinical** visual tone; not pink-by-default, not sterile-medical. Inclusive imagery.
- **Inclusive language setting** (gendered ↔ neutral) respected app-wide.
- **Discreet & safe**: passcode lock, neutral notifications, no shaming copy ever.
- **Accessibility**: WCAG 2.2 AA — color-contrast (don't rely on color alone for calendar states), screen-reader labels, dynamic type, reduced-motion.
- **Offline-first**: logging always works; sync is invisible.
- **Performance**: home/log interactions feel instant; PWA installable; fast cold start.
- **Localization-ready**: copy externalized; date/locale aware (v1 English, architected for i18n).

---

## 15. Technical architecture (recommended)

> Product-team note: this is a recommended starting architecture, web-first. Native mobile (React Native or native) is a later phase reusing the same API and prediction core.

### 15.1 High-level stack
- **Frontend:** Next.js (App Router) as an installable **PWA**, React, TypeScript, Tailwind + a component library (e.g., shadcn/ui). Service worker for offline + push.
- **Hosting/infra:** Vercel (Fluid Compute functions for API/SSR; Cron for scheduled jobs like re-prediction & content review reminders).
- **Data:**
  - **Local-first store** on device (IndexedDB) holding the user's health log; the app is fully usable offline.
  - **Sync/backend store**: a Postgres (e.g., Neon via Vercel Marketplace) holding **only** what's needed for sync/account — and for health data, storing **ciphertext** the server cannot read (E2E/zero-knowledge design as the target).
  - Object storage (Vercel Blob) for content media and user PDF exports (private).
- **Auth:** passwordless/OAuth for identified accounts; device-key + recovery phrase for Anonymous Mode. Sessions short-lived; biometric/passcode gate in-app.
- **AI:** model access via an AI gateway; RAG over the vetted content corpus (vector store); strict prompt/guardrail layer; predictions stay in the deterministic engine, *not* the LLM.
- **Content:** headless CMS (or Git-backed MDX for v1) with editorial + medical-review workflow metadata.
- **Analytics:** privacy-preserving, aggregate-only, self-hosted/first-party (no third-party ad/health-data SDKs).

### 15.2 Prediction engine (the core IP)
- Deterministic, explainable service that computes: next period start/length, fertile window, ovulation day, cycle phase, and **confidence**.
- Inputs: historical cycle lengths, period lengths, logged ovulation signals (BBT shift, LH+, mucus), and irregularity statistics.
- Approach: start with **rolling statistical model** (averages + variance → confidence intervals) with rules for irregular/peri patterns; evolve toward a more adaptive personalized model later. **Every output carries a human-readable explanation.**
- Runs both **client-side** (for offline/local-first predictions) and is reproducible server-side; client is source of truth for the logged data.

### 15.3 Data model (core entities, sketch)
- `User` (account, privacy mode, preferences) — minimal, identity-light.
- `CycleProfile` (avg length, variance, life-stage mode).
- `Cycle` (start date, end date, length, computed fields).
- `DailyLog` (date, flow, symptoms[], moods[], vitals, sex, notes) — the encrypted heart of the data.
- `Prediction` (period/fertile/ovulation forecasts + confidence + explanation; recomputed, not authoritative history).
- `PregnancyProfile` (due date, week, milestones).
- `ContentItem` (article/video, life-stage tags, medical reviewer, review date).
- `CommunityProfile` (pseudonymous, fully decoupled from `User` health data).
- `PartnerShare` (scope, consent, revocation).

### 15.4 Security & privacy engineering
- E2E encryption for synced health data (client holds keys); server stores ciphertext.
- No third-party trackers in the client bundle (enforced via CI check).
- Strict CSP, secure headers, audit of all egress.
- Verifiable hard-delete pipeline.
- Threat model documented (incl. law-enforcement-request and lost-device scenarios).

---

## 16. Phasing & roadmap

Build order respects dependencies and de-risks the hardest/most-sensitive pillars by placing them after the core habit loop is proven. **All phases are free/ad-free.**

### Phase 0 — Foundations
Account model (incl. Anonymous Mode), privacy/security baseline, offline-first local store, design system, onboarding skeleton.

### Phase 1 — Core cycle tracking (MVP)
Period/symptom/mood logging, calendar + home ring, prediction engine v1 (period + fertile window + ovulation + confidence), history & trends, notifications, data export/delete. **This is the launchable MVP.**

### Phase 2 — Insights & content
Insights engine (personalized, explainable), medically-reviewed content library + personalized feed, daily content card.

### Phase 3 — Fertility (TTC) mode
BBT/LH/mucus logging, ovulation confirmation, TTC content, partner sharing (scoped).

### Phase 4 — Pregnancy mode
Week-by-week, baby development, kick counter, contraction timer, appointments/checklists, compassionate loss flow.

### Phase 5 — Peri/menopause mode
Irregular-cycle handling, peri symptom set, stage education.

### Phase 6 — AI Health Assistant
RAG assistant over vetted corpus with full guardrails; AI-augmented insight summaries.

### Phase 7 — Community ("Circles")
Anonymous Circles with strong moderation + crisis handling (tighter MVP first).

### Phase 8 — Native mobile + scale
React Native/native apps reusing API + prediction core; localization; deeper personalization model.

---

## 17. Risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Privacy/legal breach erodes core promise | Critical | E2E/zero-knowledge design, data minimization, no ad SDKs, audits, documented threat model |
| Medical inaccuracy / harmful advice | Critical | Medical review of all content & rules; deterministic predictions; AI guardrails; disclaimers; clinician-referral prompts |
| Community toxicity / misinformation / crisis | High | Moderation stack, crisis detection + resources, phased rollout, expert oversight |
| Prediction over-confidence (irregular cycles, peri) | High | Honest confidence intervals; never present false precision; clear "not contraception" framing |
| Free/ad-free model sustainability | High | Out of v1 scope by decision; document future non-data monetization (donations, grants, B2B partnerships) without compromising the privacy pillar |
| Sensitive-moment harm (loss, infertility) | High | First-class compassionate flows; careful copy; suppress celebratory nudges contextually |
| Scope sprawl (full clone) | Medium | Strict phasing; each pillar = its own design doc + plan; MVP = Phase 1 only |
| Regulatory creep toward "medical device" | Medium | Avoid diagnostic/efficacy claims; legal review before any clinical positioning |

---

## 18. Open questions (to resolve in per-pillar design docs)
1. Exact monetization-free **sustainability plan** (donations / grants / privacy-preserving B2B) — needed before scale, not for MVP.
2. **Zero-knowledge sync** depth for v1 — full E2E from day one vs. encrypted-at-rest with a documented path to E2E. (Recommend: encrypted local-first + TLS for MVP, E2E sync by Phase 3 when cross-device matters most.)
3. Native mobile choice (React Native vs. native) — defer to Phase 8.
4. Community moderation: in-house vs. tooling vendor; staffing model.
5. Medical review panel: sourcing and ongoing-review SLA.
6. Localization priority markets.

---

## 19. Out of scope for v1 (explicit YAGNI)
- Wearable/hardware integrations (Apple Health/Google Fit import) — later.
- FDA clearance / contraceptive-grade claims.
- In-app telehealth / clinician marketplace.
- Postpartum & baby-tracking module.
- Astrology/non-evidence features.
- Multi-region data residency complexity beyond baseline compliance.

---

*This PRD is intentionally comprehensive. The recommended next step is to take **Phase 1 (Core cycle tracking MVP)** into its own focused design doc and implementation plan, since that is the launchable, dependency-light foundation everything else builds on.*
