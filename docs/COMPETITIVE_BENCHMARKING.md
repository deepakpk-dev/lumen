# Lumen — Competitive Benchmarking & Strategic Brief

**Audience:** anyone deciding what Lumen builds next — product, strategy, or an engineer weighing priorities.
**Purpose:** benchmark Lumen against the reproductive-health app market as of **July 2026**, identify the real gaps, and translate them into a ranked set of actions. Read the [README](../README.md) for product framing and the [Engineering doc](./ENGINEERING.md) for how the current capabilities are actually built.

> **A note on honesty.** This document is deliberately candid about where Lumen trails. Every ✅/⚠️/❌ for Lumen is cross-checked against the shipped code (routes in `app/`, domain in `src/domain/`, crypto in `src/crypto/`), not the marketing. Where a capability is designed but not live, it is marked *planned*, never ✅.

---

## 1. Executive summary

The period/fertility app market is a barbell. At one end sit **surveillance-cloud incumbents** — Flo (420M+ downloads, ~67M MAU), Clue, Ovia, Glow — feature-rich but historically monetized on data, with Flo settling a $59.5M FTC/class-action case over sharing health data with Facebook and Google (Sept 2025). At the other end sits a small **privacy-first, local-only** segment — Euki, Drip, Periodical — trusted precisely because your data never leaves the phone, but crippled by the same flaw: **no backup, no sync, weak or no prediction, no reminders.** Lose your phone, lose your history.

**Lumen occupies the empty space between them.** It is the only entrant that combines (a) local-first, no-account-by-default privacy, (b) *full reproductive life-cycle* coverage — cycle → TTC → pregnancy → postpartum with clinical PPD screening — (c) deterministic, explainable predictions with no ML/LLM, and (d) an **opt-in, end-to-end-encrypted, zero-knowledge sync** that closes the #1 weakness of every other privacy-first app: it gives you backup and multi-device continuity *without* handing your data to anyone.

That combination is genuinely differentiated. The catch is delivery: Lumen is a **web PWA** (sync is now **live in production**), and it lacks two things the market now treats as table stakes — a native mobile app and wearable/temperature import (a perimenopause mode shipped July 2026). The strategic story is therefore not "find a wedge" — the wedge exists and is defensible — it is **"finish shipping the wedge before the incumbents' privacy theater catches up."**

---

## 2. The competitive landscape

Two axes separate this market: **privacy posture** (does your data leave the device / can the vendor read it?) and **capability breadth** (single-purpose tracker → whole life cycle).

```
  CAPABILITY BREADTH
  full life cycle │  Ovia        Flo                     ★ LUMEN
                  │  Glow      (cycle→menopause,          (cycle→postpartum,
                  │             AI, community)             deterministic, ZK-sync)
                  │
                  │              Clue
                  │            (cycle + peri,
     mid          │             science-led)
                  │
                  │  Natural Cycles          Drip
                  │  (contraception,       (cycle only,
  single-purpose  │   BBT/wearable)     Apple    local-only)   Euki
                  │                    Cycle Tr.            (cycle + edu,
                  │                    (on-device,           local-only)
                  └──────────────────────────────────────────────────────
                    surveillance-cloud  ──────────►  zero-knowledge / local-only
                                    PRIVACY POSTURE
```

- **Top-right (breadth + privacy) is nearly empty.** Flo has breadth but its privacy is a *paid, cloud-based* add-on (Anonymous Mode). The local-only apps have privacy but no breadth. Lumen is alone in the top-right — *and* adds sync, which none of the privacy-first peers offer at all.
- This is the strategic opening. It is also fragile: Flo is spending real money to *look* like it belongs in the top-right (Anonymous Mode with OHTTP + post-quantum crypto), and Clue's default privacy is already respectable. Lumen's edge is **architectural** (private by construction) vs. their **procedural** (private by policy + optional feature).

---

## 3. Feature comparison matrix

Legend: ✅ shipped / strong · ⚠️ partial, paywalled, or caveated · ❌ absent · 🔵 planned/roadmap

| Capability | **Lumen** | Flo | Clue | Natural Cycles | Apple Cycle Tr. | Euki | Drip |
|---|---|---|---|---|---|---|---|
| Local-first, data stays on device by default | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Usable with **no account** | ✅ | ❌ | ⚠️ | ❌ | ✅ | ✅ | ✅ |
| E2E / zero-knowledge design | ✅ (opt-in) | ⚠️ (Anon Mode, paid) | ❌ | ❌ | ⚠️ (on-device) | ✅ (local) | ✅ (local) |
| **Cross-device sync + backup** | ✅ | ✅ | ✅ | ✅ | ✅ (iCloud) | ❌ | ❌ |
| Cycle prediction | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ⚠️ |
| Prediction **confidence + explanation** | ✅ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ |
| Deterministic / no black-box ML | ✅ | ❌ | ❌ | ⚠️ | ❌ | n/a | ⚠️ |
| TTC / BBT / fertility mode | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | ❌ | ⚠️ |
| Pregnancy mode | ✅ | ✅ | ❌ | ⚠️ | ❌ | ⚠️ | ❌ |
| Postpartum + **PPD screening (EPDS)** | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Menopause / perimenopause mode | ✅ | ✅ | ✅ (2026) | ❌ | ⚠️ | ❌ | ❌ |
| Educational content library | ✅ (cited) | ✅ | ✅ | ⚠️ | ❌ | ✅ | ❌ |
| Community | ❌ (by choice) | ✅ (Secret Chats) | ⚠️ | ❌ | ❌ | ❌ | ❌ |
| AI assistant / symptom checker | ❌ (by choice) | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ |
| Wearable / temperature import | ⚠️ (CSV import) | ✅ | ✅ | ✅ (Watch/Oura) | ✅ | ❌ | ❌ |
| Partner sharing | 🔵 (Phase 8) | ✅ | ❌ | ⚠️ | ❌ | ❌ | ❌ |
| **Native mobile app** | ❌ (PWA only) | ✅ | ✅ | ✅ | ✅ (OS) | ✅ | ✅ |
| Reminders / notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ⚠️ |
| Doctor summary / export report | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| Regulated contraceptive claim | ❌ (by design) | ❌ | ❌ | ✅ (FDA) | ❌ | ❌ | ❌ |
| Data monetization / ads | **None** | ⚠️ (history) | ⚠️ (limited) | ❌ (paid) | ❌ | ❌ | ❌ |
| Open-source / auditable | ✅ (MIT) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

**How to read this:** Lumen's row is dense with ✅ on the *left half* of the market's concerns (privacy, breadth, explainability, no monetization) and has its ❌/🔵 concentrated in a **coherent cluster** — native app, wearables, menopause, and the two deliberate omissions (AI, community). That clustering is good news: the gaps are a short, addressable list, not a scattering of weaknesses.

---

## 4. Head-to-head

### vs. Flo — the incumbent
- **Flo does better:** distribution (420M+ downloads, ~67M MAU), native apps, AI Health Assistant, Symptom Checker, "Secret Chats" community, partner sharing, a shipped menopause program (17k-woman Mayo Clinic study, Jan 2026), and wearable integration.
- **Lumen does better:** privacy is *structural*, not a paid tier. Flo's Anonymous Mode is real engineering (OHTTP, post-quantum) but it is **cloud-based and behind a subscription** — and Flo carries the reputational and legal scar tissue of the FTC finding and $59.5M settlement. Lumen has no data-sharing surface to regulate and no plaintext egress to leak.
- **Steal:** the *menopause program* framing and the *partner-share* flow — both are life-cycle coverage Lumen already half-owns.

### vs. Clue — the credible-privacy science app
- **Clue does better:** native apps, GDPR-native brand trust, a science-communication reputation, and a shipped Perimenopause mode (2026, Clue Plus).
- **Lumen does better:** Clue is still a *cloud account* model at $40/yr for the good stuff; Lumen's default is no-account and no-server. Lumen also spans pregnancy + postpartum, which Clue does not.
- **Steal:** Clue's clinical-citation rigor in content — Lumen already cites NHS/ACOG/OWH; lean into it as a trust signal the way Clue does.

### vs. Natural Cycles — the regulated contraceptive
- **NC does better:** FDA De Novo clearance as a digital contraceptive, and best-in-class BBT analysis with Apple Watch / Oura temperature feeds (~93% typical-use).
- **Lumen does better:** NC is a paid, cloud, single-purpose contraceptive; Lumen is broader and private. Lumen explicitly makes **no contraceptive-efficacy claim** — a liability choice, not a capability gap.
- **Steal:** the *wearable temperature import*. Lumen already has a BBT logging + thermal-shift engine (`src/domain/fertility/`); ingesting Apple Health/Oura temperature would make its TTC mode credible against NC without any regulatory exposure.

### vs. Apple Cycle Tracking — the free platform default
- **Apple does better:** it's free, native, on-device, and gets passive wrist-temperature ovulation estimates from Apple Watch with zero user effort. It's the "good enough and already installed" competitor.
- **Lumen does better:** Apple is iOS-only, shallow (no pregnancy/postpartum depth, no explainable insights, no content), and locked to Apple's ecosystem. Lumen is cross-platform and life-cycle-complete.
- **Steal:** the *effortlessness*. Apple wins on "I did nothing and it knew." Lumen's answer is HealthKit import + great defaults.

### vs. Euki & Drip — Lumen's true archetype
- **They do better:** they're **native apps** and have years of privacy-advocate trust and open-source auditability (Drip especially).
- **Lumen does better — decisively:** both are hobbled by local-only storage with **no sync and no backup** (Euki's own team acknowledges manual device-to-device transfer is a poor stopgap), and Euki has **no prediction and no reminders**. Lumen matches their privacy posture *and* adds zero-knowledge sync (backup + multi-device) *and* real prediction *and* reminders *and* pregnancy/postpartum. Lumen is essentially "Euki/Drip without the fatal flaw."
- **Steal:** their *nonprofit / open-source trust narrative*. Lumen is MIT-licensed and auditable — it should market that as loudly as Drip does.

---

## 5. Gap analysis

### 5.1 Table-stakes gaps — must close
1. **No native mobile app (web PWA only).** This is the ceiling on everything: discoverability (no App Store presence), retention (PWA install friction), notifications reliability, *and* the privacy story (see 5.3). Every serious competitor — including the local-only ones — ships native.
2. ~~**Sync is dormant.**~~ **Closed (July 2026).** Neon Postgres is provisioned and the zero-knowledge sync engine is live in production, verified end-to-end by `scripts/sync-smoke.mjs`.
3. **No wearable / temperature import.** Apple, NC, Clue, and Flo all consume wrist/finger temperature. Lumen has the BBT engine but no HealthKit/Oura ingestion — a credibility gap for TTC users.
4. ~~**No menopause / perimenopause mode (Phase 5b).**~~ **Closed (July 2026).** Perimenopause is a first-class stage: settings toggle + onboarding goal, vasomotor symptom logging, fertile-window suppression (safety stance), and a cited three-article program.

### 5.2 Differentiator gaps — deliberately skipped (position, don't apologize)
- **AI assistant / symptom checker** and **community** are absent *by strategic choice* (no LLM anywhere; no moderation surface). These are not oversights — they are the flip side of the "deterministic, explainable, no data product" positioning. Treat them as **stated non-goals**, and revisit only if evidence shows they drive retention that Lumen can't win otherwise.

### 5.3 Trust-boundary gap — the honest-E2E caveat
- Lumen candidly discloses that because the browser fetches its crypto code from the server on every load, the zero-knowledge guarantee holds against a stolen DB or a passive/subpoenaed operator, **but not against a malicious or compromised server.** This is the ceiling of web delivery. The fix — a **store-distributed native wrapper** (Capacitor/Tauri) or a code-transparency log — is the same fix as 5.1(1). Closing the native gap closes this one too.

### 5.4 Known deliberate limitations (from the code)
- Preferences sync as one whole-snapshot last-write-wins record → concurrent edits on two devices can silently lose one side (`src/data/sync-engine.ts`).
- The restore flow is built for the empty-new-device case; data that existed on a device before a restore stays local-only until re-saved.
- ~~EPDS crisis guidance is region-agnostic~~ **Closed (July 2026).** The crisis block now shows curated national helplines (region from device locale, user-overridable) with a findahelpline.com fallback (`src/domain/postpartum/crisis-resources.ts`).

These are acceptable for today's scope but should be tracked before sync goes wide.

---

## 6. Where Lumen wins (the moats)

1. **Privacy by architecture, not by policy.** The default state physically cannot leak data; the zero-knowledge property is enforced by a CI test that fails the build if any plaintext health field appears in a request body. No competitor can say this.
2. **Zero-knowledge sync *with backup*.** The one thing every privacy-first peer lacks. This is the single most valuable, most defensible feature — once it's live.
3. **Deterministic, explainable forecasts.** Every prediction ships a confidence level and a human-readable reason. In a post-Dobbs, low-trust environment, "here's exactly why we predicted this, and no black box was involved" is a differentiator, not a footnote.
4. **Postpartum + EPDS crisis-aware screening.** Genuinely rare. Most apps drop the user at birth; Lumen carries them through recovery with clinically-grounded depression screening and crisis-support surfacing.
5. **No monetization of data — and therefore no liability.** No ads, no paywall, no data sales, no FTC-shaped risk. The business model *is* the privacy story.
6. **Compassion as a code path.** The loss-aware pregnancy exit flow (suppressed celebratory copy and re-engagement nudges on loss) is a first-class feature, not conditional styling — a real trust and dignity signal.

---

## 7. Market size & context

- **Scale of the prize:** period/fertility tracking is one of the largest femtech categories, and Flo alone reports 420M+ downloads and ~67M monthly actives — the ceiling for a mainstream tracker. Lumen is not competing for that whole pool; it is competing for the **privacy-motivated slice** of it.
- **The tailwind:** the post-*Dobbs* (2022→) collapse in trust around cycle data created the entire privacy-first segment (Euki, Drip, Stardust) and pushed even incumbents to add privacy features (Flo Anonymous Mode). Demand for "my cycle data can't be used against me" is structural and growing, not a fad.
- **The opening:** that demand is currently served by apps that force a brutal trade — *either* privacy (Euki/Drip: lose your data) *or* capability (Flo/Clue: trust our cloud). Lumen dissolves the trade-off. The addressable segment is "people who want Flo's completeness but refuse Flo's data model" — and it has no strong incumbent.

---

## 8. Positioning & messaging

**Core wedge (one line):** *"Private by architecture, not by promise."* Your data lives on your device; sync is end-to-end encrypted so even we can't read it; and there's nothing to sell because there's no business in your body.

**Contrast messaging that writes itself:**
- **vs. Flo:** "Privacy shouldn't be a subscription." (Flo's Anonymous Mode is paid and cloud-based; Lumen's is the default and on-device.)
- **vs. Euki/Drip:** "Private *and* you keep your history." (They lose your data on a lost phone; Lumen's zero-knowledge sync backs it up without anyone reading it.)
- **vs. Apple:** "Your whole cycle of life, not just your period — on any phone."

**Target segments, in priority order:**
1. Privacy-motivated / post-Dobbs-concerned trackers currently on Euki/Drip who are frustrated by the lost-data problem.
2. TTC, pregnancy, and postpartum users — *underserved by the privacy-first peers entirely*, and the stage where Lumen's depth (EPDS, loss-aware flows) is most differentiated.
3. Ex-Flo/Clue users who left over trust but miss the completeness.

---

## 9. Prioritized recommendations

Ranked by leverage. Each closes a specific gap above and aligns with the standing strategy (fix table-stakes → ship the one big bet → hold deliberate non-goals).

| # | Action | Closes gap | Why it's ranked here |
|---|---|---|---|
| **1** | ✅ **Done (July 2026)** — **Ship sync to production**: Neon provisioned, `DATABASE_URL` set, smoke-tested live | 5.1(2) | Lowest effort, highest leverage. The single biggest differentiator no privacy peer has is built — and is now on. |
| **2** | **Native wrapper (Capacitor or Tauri)** | 5.1(1) + 5.3 | One move closes *two* gaps: the web-only ceiling (distribution, notifications, App Store trust) **and** the honest-E2E trust-boundary caveat. Highest strategic value after sync. |
| **3** | **Wearable / temperature import (Apple Health + Oura)** | 5.1(3) | Makes the existing BBT/TTC engine credible against Natural Cycles and Apple with no regulatory exposure. Meets users where the effort bar now is. |
| **4** | ✅ **Done (July 2026)** — **Perimenopause / menopause mode (Phase 5b)** | 5.1(4) | Was table stakes for the "whole life cycle" claim after Flo and Clue shipped it. The arc Lumen advertises is now complete. |
| **5** | **Hold the line on no-AI / no-community** | 5.2 | Actively position these as features of the privacy stance. Revisit only with hard evidence they drive retention Lumen can't otherwise win. |
| — | **Track the deferred sync limitations** (5.4) before wide rollout | 5.4 | Not urgent today; becomes urgent the moment multi-device sync is on by default. |

**The through-line:** Lumen doesn't need to *find* a strategy — it needs to *finish* one. The differentiated position (private-by-architecture + full life cycle + zero-knowledge sync) is real and defensible. Recommendations 1 and 2 are the whole ballgame; 3 and 4 close the credibility gaps that would otherwise let a competitor's "we're private now too" campaign muddy the story.

---

## 10. Sources

Competitive and market claims in this document are drawn from public reporting and vendor material reviewed July 2026:

- [Best Period Tracker App 2026: Clue vs Flo vs Ovia](https://www.go-go-gaia.com/blog/how-to-choose-period-tracker-app.html)
- [Flo vs Clue vs Stardust: Period Apps Ranked (2026) — Unstar](https://unstar.app/blog/flo-clue-stardust-apple-health-period-tracking-apps-ranked-2026)
- [Natural Cycles vs. Flo vs. Clue](https://www.naturalcycles.com/nc-vs-competition)
- [The Best Period Tracking Apps for Data Privacy in 2026 — All About Cookies](https://allaboutcookies.org/safe-period-tracking-apps)
- [Period Tracker Apps and Privacy — Consumer Reports](https://www.consumerreports.org/health/health-privacy/period-tracker-apps-privacy-a2278134145/)
- [Euki — The period tracker that doesn't track you](https://eukiapp.org/)
- [Flo vs Clue (2026): Privacy, FTC Settlement, and GDPR — Floriva](https://floriva.app/compare/versus/flo-vs-clue/)
- [Flo — Anonymous Mode product tour](https://flo.health/product-tour/anonymous-mode)
- [Flo Launches Anonymous Mode — newsroom](https://flo.health/newsroom/flo-launches-anonymous-mode)
- [Track your nightly wrist temperature on Apple Watch — Apple Support](https://support.apple.com/en-us/102674)
- [How does Apple Watch work with Natural Cycles?](https://help.naturalcycles.com/hc/en-us/articles/13528212980893-How-does-Apple-Watch-work-with-Natural-Cycles)
- [How's Flo Health doing these days? — New Market Pitch](https://newmarketpitch.com/blogs/news/femtech-flo-health-update)
- [Okay, Fine, Let's Talk About Period Tracking — Maggie Delano](https://medium.com/@maggied/okay-fine-lets-talk-about-period-tracking-the-detailed-explainer-2f45112eebb4)

> Lumen capability claims are verified against this repository's source, not third-party coverage. Lumen is an independent project and is **not a medical device**; nothing here is a diagnostic or contraceptive-efficacy claim.
