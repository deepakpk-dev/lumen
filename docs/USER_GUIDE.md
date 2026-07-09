# Lumen — User Guide

> **Lumen** is a private, offline‑first period, fertility, pregnancy, and postpartum tracker. Everything you log stays **on your device** — there's no account and no tracking. If you ever want your data on a second phone, you can turn on **end‑to‑end encrypted sync**, where even our server only ever holds scrambled data it can't read. This guide walks you through every screen so you can get the most out of it.

<p align="center"><em>🌙 Track your cycle · 🌱 Plan for a baby · 🤰 Follow a pregnancy · 🤱 Recover after birth — privately, in one place.</em></p>

---

## Table of contents

1. [Quick start (60 seconds)](#quick-start-60-seconds)
2. [How Lumen is organized](#how-lumen-is-organized)
3. [First launch & onboarding](#first-launch--onboarding)
4. [The Home screen](#the-home-screen)
5. [Logging your day](#logging-your-day)
6. [Calendar](#calendar)
7. [History & trends](#history--trends)
8. [Insights](#insights)
9. [Reminders](#reminders)
10. [Library](#library)
11. [Understanding your cycle phases](#understanding-your-cycle-phases)
12. [Trying‑to‑conceive (TTC) mode](#trying-to-conceive-ttc-mode)
13. [Pregnancy mode](#pregnancy-mode)
14. [Postpartum mode](#postpartum-mode)
15. [Perimenopause mode](#perimenopause-mode)
16. [Doctor summary (print / PDF)](#doctor-summary-print--pdf)
17. [Privacy, encryption & your data](#privacy-encryption--your-data)
18. [Moving to a new phone](#moving-to-a-new-phone)
19. [Install Lumen as an app](#install-lumen-as-an-app)
20. [Troubleshooting & FAQ](#troubleshooting--faq)
21. [Important: medical disclaimer](#important-medical-disclaimer)

---

## Quick start (60 seconds)

| Step | What you do | Where |
|:----:|-------------|-------|
| 1️⃣ | Open Lumen, tap **Continue**, then pick a goal — **Track my cycle**, **Trying to conceive**, or **I'm pregnant**. | Welcome screen |
| 2️⃣ | Enter the date your **last period started** (or your **due date** if pregnant), then tap **Get started**. | Setup screen |
| 3️⃣ | Each day, tap **Log today** and record your flow, symptoms, and mood. | Home → Log |
| 4️⃣ | After a cycle or two, check **Calendar**, **Insights**, and **History** for predictions. | Home |
| 5️⃣ | *(Optional)* Set a passcode to **encrypt** your data, and turn on **sync** to use Lumen on more than one device. | Settings |

> 💡 **The golden rule:** the more days you log, the smarter and more confident Lumen's predictions become. A minute a day is plenty.

---

## How Lumen is organized

Lumen has one **Home** hub. From there, tiles take you to each screen. Use your browser's **Back** button to return Home (most screens also have a **Home** link).

```mermaid
flowchart TD
    H(["🏠 Home"]) --> L["📝 Log today"]
    H --> C["📅 Calendar"]
    H --> Y["📊 History"]
    H --> I["💡 Insights"]
    H --> B["📚 Library"]
    H --> PR["🎓 Programs"]
    H --> S["⚙️ Settings"]
    H -. "TTC mode on" .-> F["🌡️ Fertility"]
    H -. "Pregnancy mode on" .-> P["🤰 Pregnancy"]
    H -. "Postpartum mode on" .-> PP["🤱 Postpartum"]
    P --> K["👣 Kick counter"]
    P --> T["⏱️ Contraction timer"]
    PP --> E["💗 Mood check-in"]
    S --> M{{"Switch modes · Passcode · Sync · Export/Delete"}}

    style H fill:#e11d48,color:#fff
    style M fill:#fff,stroke:#e11d48
```

Lumen works in **four modes**. You're always in one of them. You choose most modes in **Settings** (or at onboarding), while **Postpartum** is entered automatically after a birth:

| Mode | For | Turn it on in |
|------|-----|---------------|
| 🩸 **Cycle** (default) | Tracking periods, symptoms, and predictions | On by default |
| 🌱 **TTC** (trying to conceive) | Pinpointing your fertile window with BBT, LH tests & mucus | Onboarding, or Settings → *Trying to conceive* |
| 🤰 **Pregnancy** | Week‑by‑week pregnancy, kick counts & contractions | Onboarding, or Settings → *Pregnancy* |
| 🤱 **Postpartum** | Recovery + mental‑health support after birth | Automatic when you confirm **Baby arrived** |

---

## First launch & onboarding

The very first time you open Lumen, you'll see a **Welcome** screen explaining the two things that matter most: your data stays on your device, and Lumen is not medical advice. Tap **Continue** to set up (this is **Step 2 of 2** — quick).

```
┌──────────────────────────────────────┐
│  Let's set things up      Step 2 of 2│
│                                      │
│  What brings you to Lumen?           │
│  ┌──────────────────────────────────┐│
│  │ 💧 Track my cycle                ││  ← periods, symptoms, predictions
│  ├──────────────────────────────────┤│
│  │ 🌱 Trying to conceive            ││  ← fertile window, BBT, ovulation
│  ├──────────────────────────────────┤│
│  │ 💗 I'm pregnant                  ││  ← week-by-week, kicks, contractions
│  └──────────────────────────────────┘│
│                                      │
│  When did your last period start?    │
│  ┌──────────────────────────────────┐│
│  │ 2026-06-18                  📅   ││  ← date picker
│  └──────────────────────────────────┘│
│  ┌──────────────────────────────────┐│
│  │            Get started           ││
│  └──────────────────────────────────┘│
└──────────────────────────────────────┘
```

Pick the goal that fits:

- **Track my cycle** → enter **when your last period started**. This anchors your first prediction.
- **Trying to conceive** → also enter **when your last period started**; Lumen opens in [TTC mode](#trying-to-conceive-ttc-mode) with fertility logging enabled.
- **I'm pregnant** → enter your **due date**, or tap **"Not sure? Enter your last period instead"** and Lumen calculates it for you. Opens straight into [Pregnancy mode](#pregnancy-mode).

> 💡 Don't remember the exact date? An approximate one is fine — predictions sharpen automatically as you log real periods. You can change your goal or dates anytime in Settings.

> 🔁 **Already used Lumen on another device?** On the Welcome screen tap **"Already use Lumen? Restore your data"** to bring everything over with your recovery phrase or a backup file. See [Moving to a new phone](#moving-to-a-new-phone).

---

## The Home screen

Home adapts to your mode, with your most relevant information at the top.

```
┌──────────────────────────────────────┐
│  Luteal phase                        │
│        Day 6                         │   ← today's cycle summary
│  Next period in ~22 days             │
│  Confidence: high                    │
│                                      │
│  💡 Insight of the day …             │   ← top insight (tap for more)
│  📚 Daily read: "…"                  │   ← a relevant article
│                                      │
│  ┌────────────┐ ┌────────────┐       │
│  │ Log today  │ │ Calendar   │       │
│  ├────────────┤ ├────────────┤       │
│  │ History    │ │ Settings   │       │
│  ├────────────┤ ├────────────┤       │
│  │ Insights   │ │ Library    │       │
│  │ Programs   │ │            │       │
│  └────────────┘ └────────────┘       │
└──────────────────────────────────────┘
```

| Tile | What it does |
|------|--------------|
| **Log today** (pink) | Record today's flow, symptoms, and mood. Your main daily action. |
| **Calendar** | A month view of your past and predicted cycle. |
| **History** | Averages and a list of every cycle. |
| **Insights** | Personalized patterns and gentle flags. |
| **Library** | Cited articles, picked for you. |
| **Programs** | Short, guided reading paths for your stage. |
| **Settings** | Switch modes, set a passcode, sync, export or delete data. |
| **Fertility** | *Appears only in TTC mode* — your BBT chart and conception guidance. |
| **Pregnancy** | *Appears only in Pregnancy mode* — your week‑by‑week hub. |
| **Postpartum** | *Appears only in Postpartum mode* — your recovery hub and mood check‑in. |

The card at the very top changes with your situation:
- **Cycle mode** → current phase, cycle day, and your next‑period prediction with a **confidence** label.
- **TTC mode** → a **conception guidance** card (today's chance: high / medium / low).
- **Pregnancy mode** → your **week, trimester, and countdown to your due date**.
- **Postpartum mode** → your **recovery week and stage**, plus the band of your most recent mood check‑in.

---

## Logging your day

Tap **Log today** from Home. Logging takes seconds — tap the chips that apply, then **Save**.

```
┌──────────────────────────────────────┐
│  Log for today                       │
│                                      │
│  Flow                                │
│  (none) (spotting) (light) (medium)  │
│  (heavy)                             │
│                                      │
│  Symptoms                            │
│  (Cramps) (Headache) (Bloating) …    │
│                                      │
│  Mood                                │
│  (Happy) (Calm) (Anxious) …          │
│                                      │
│  Notes                               │
│  ┌──────────────────────────────────┐│
│  │                                  ││
│  └──────────────────────────────────┘│
│  ┌──────────────────────────────────┐│
│  │               Save               ││
│  └──────────────────────────────────┘│
└──────────────────────────────────────┘
```

### What you can record

| Field | Options |
|-------|---------|
| **Flow** | none · spotting · light · medium · heavy |
| **Symptoms** | Cramps · Headache · Bloating · Tender breasts · Acne · Fatigue · Backache · Nausea |
| **Mood** | Happy · Calm · Anxious · Irritable · Sad · Energetic · Mood swings |
| **Notes** | Free text — anything you want to remember |

Tap a chip to select it (it turns **pink**); tap again to deselect. You can pick **multiple** symptoms and moods. Tap **Save** and you'll see a green **Saved** confirmation.

> ⚠️ **How periods are detected:** Logging a **Light**, **Medium**, or **Heavy** flow tells Lumen your period has started, and it automatically begins a new cycle. **Spotting** and **None** do *not* start a cycle. If you log a period flow within a couple of days of your last bleeding day, Lumen treats it as the *same* period continuing — not a new one.

> 💡 **The Log screen opens on today.** To log or edit **any past day**, open the **Calendar** and tap that day.

In **TTC mode**, **Pregnancy mode**, and **Postpartum mode**, this same screen grows extra fields — see those sections below.

---

## Calendar

A month‑at‑a‑glance view of your cycle. **Today** is marked with a pink ring.

```
┌──────────────────────────────────────┐
│  Calendar                            │
│   ←        June 2026        →        │   ← tap arrows to change month
│   S  M  T  W  T  F  S                 │
│   1  2  3  4  5  6  7                 │
│   …             (23)  24  25 …        │   ← (23) = today, ringed
│                                      │
│  ● Period   ◐ Predicted period       │
│  ● Fertile window   ◉ Ovulation      │   ← legend
└──────────────────────────────────────┘
```

| Marker | Meaning |
|--------|---------|
| ● **Period** | Days you logged a period flow |
| ◐ **Predicted period** | Lumen's estimate of your next period |
| ● **Fertile window** | The days around ovulation when conception is most likely |
| ◉ **Ovulation** | The estimated ovulation day |

- Use **←** / **→** to move between months and reach past cycles or future predictions.
- Jumped away? Tap **Back to this month** to return to today.
- **Tap any past day (or today)** to open its log — this is how you back‑fill a day you missed or edit what you recorded. Future days aren't tappable.

> ♿ Calendar states are shown with **labels and shapes**, not color alone, so they're readable with any color vision.

---

## History & trends

See your cycle at a higher level. Three summary tiles sit on top, followed by a list of every cycle (newest first).

| Tile | Meaning |
|------|---------|
| **Avg cycle** | Your average number of days from one period to the next |
| **Avg period** | Your average number of bleeding days |
| **Regularity** | **Regular** if your cycles are consistent, **Variable** if they swing |

Each row shows a cycle's start date and its length (e.g. *"28 day cycle"*). Your most recent cycle is labelled **Current cycle** because it isn't finished yet.

> 💡 **Variable** isn't a problem on its own — it just means Lumen widens its prediction range and shows lower confidence until things settle.

---

## Insights

Lumen reads your logs and surfaces plain‑language **insights** — and it's transparent about *why* each one appears. There are four kinds:

| Type | Example |
|------|---------|
| 🔁 **Patterns** | "You often log cramps in your luteal phase." |
| 📈 **Trends** | "Your cycles have been getting a little longer." |
| ⚠️ **Anomalies** | "Your period is a few days overdue compared with your average." |
| 🌿 **Guidance** | Phase‑appropriate self‑care tips. |

Insights are sorted so **attention** items (worth a closer look) appear above general **info**. The single most relevant one is also shown on Home.

> 💡 Seeing *"Keep logging to unlock insights"*? That just means Lumen needs a bit more data. Keep logging and the cards will appear.

> ⚠️ An anomaly flag is **informational, not a diagnosis**. If something worries you, talk to a clinician.

---

## Reminders

Lumen can gently nudge you so you don't miss what matters — every reminder is computed on your device from your own data.

- **On Home**, a reminder banner appears when something is due: your **period is expected soon**, you're in your **fertile window** (or it's your estimated ovulation day), or you simply **haven't logged today**. Tap it to jump straight to the right screen.
- **Optional device notifications.** In **Settings → Reminders**, turn on **Show device notifications** to also receive these as system notifications. Your browser asks permission once.

| Setting | What it controls |
|---------|------------------|
| **Show device notifications** | Whether reminders also appear as system notifications (needs browser permission) |
| **Period is coming up** | The "period expected soon" reminder |
| **Fertile window & ovulation** | The fertile‑window / ovulation‑day reminder |
| **Reminder to log today** | The nudge shown when you haven't logged today |

> 🔒 **Because Lumen keeps everything on your device, reminders appear when you open the app** — nothing in the cloud pushes messages to you. It's the honest trade‑off for privacy.

> 💡 The Home banner needs no permission and only shows when a reminder is actually relevant — no daily spam. Device notifications are entirely opt‑in.

---

## Library

A built‑in collection of **medically cited, plain‑language articles** (sources include the NHS, ACOG, and the Office on Women's Health).

- **For you** — up to three articles picked for your current phase and life stage and what you've been logging, each with a short reason for the match.
- **Browse** — every article, with tools to narrow them down:

| Tool | Use |
|------|-----|
| 🔎 **Search articles** | Find by title or summary |
| **All topics** ▾ | Filter by subject |
| **All phases** ▾ | Filter by cycle phase (menstrual · follicular · ovulation · luteal) |

Tap any article to open the full reader. Tap **Home** to go back.

> 🎓 **Programs** (from the Home tile) bundle articles into short, ordered reading paths for your stage — e.g. understanding your cycle, or preparing for a baby. Tick off each step as you go; your progress is saved.

The daily read on Home and the "For you" feed are always **scoped to your active life stage**, so a pregnant user sees pregnancy content, not period/PMS material.

---

## Understanding your cycle phases

Lumen uses four phase names across the Calendar, Insights, and Library. Here's what they mean (lengths vary per person):

```mermaid
flowchart LR
    A["🩸 Menstrual<br/>days 1–5<br/>your period"] --> B["🌱 Follicular<br/>days 6–13<br/>energy rising"]
    B --> C["✨ Ovulation<br/>~day 14<br/>most fertile"]
    C --> D["🌙 Luteal<br/>days 15–28<br/>PMS can appear"]
    D --> A
```

| Phase | Roughly when | What's happening |
|-------|--------------|------------------|
| 🩸 **Menstrual** | Days 1–5 | Your period — the bleeding days. |
| 🌱 **Follicular** | Days 6–13 | Hormones rise; many people feel more energetic. |
| ✨ **Ovulation** | Around day 14 | An egg is released — your most fertile time. |
| 🌙 **Luteal** | Days 15–28 | The lead‑up to your next period; PMS symptoms may show up. |

> 💡 All of Lumen's predictions are **deterministic and explainable** — they come from your own logged data with clear math, never from a black‑box guess.

---

## Trying-to-conceive (TTC) mode

Turn this on when you're trying for a baby and want to pinpoint your fertile window.

### Turn it on

1. Go to **Settings → Trying to conceive** (or pick **Trying to conceive** at onboarding).
2. Tap **Turn on TTC mode**.
3. Choose your temperature unit: **°C** or **°F**.

A new **Fertility** tile now appears on Home, and your **Log** screen gains extra fields.

### Extra fields on the Log screen (TTC)

| Field | What to enter |
|-------|---------------|
| **Basal body temperature** | Your waking temperature, taken before getting up |
| **Ovulation test (LH)** | The result of an LH strip: *negative* or *positive* |
| **Cervical mucus** | dry · sticky · creamy · watery · egg‑white |
| **Intercourse** | Tick if applicable; a **Protected** option then appears |

### The Fertility screen

```mermaid
flowchart TD
    L["📝 Log BBT, LH & mucus daily"] --> A{"Lumen analyzes<br/>the signals"}
    A --> B["📈 BBT chart shows<br/>your temperature shift"]
    A --> C["✅ Ovulation status<br/>confirmed / not yet"]
    A --> D["💗 Daily conception<br/>guidance: high · med · low"]
    style A fill:#e11d48,color:#fff
```

- **BBT chart** — plots your morning temperatures so you can see the post‑ovulation rise.
- **Ovulation status** — confirms ovulation once your logged signals (temperature shift, a positive LH test, egg‑white mucus) line up. Confirmed ovulation also **sharpens your period prediction**.
- **Conception guidance** — a simple read on today's chances.

### Import temperatures from a CSV

Under the BBT chart on the **Fertility** screen, you can bulk‑import temperatures instead of typing each day:

1. Export a CSV from your thermometer app or spreadsheet. Lumen needs **one row per reading, with a date and a temperature** — extra columns are ignored.
2. Dates can be `YYYY-MM-DD` or `M/D/YYYY`; temperatures can be °C or °F (Lumen converts °F automatically).
3. Tap **Import temperatures from a CSV** and pick the file. Lumen reports how many it imported, how many days it skipped because you'd already logged a temperature (**your typed‑in value always wins**), and how many lines it couldn't read.

> Note: exports that only contain a **relative "temperature deviation"** (e.g. some wearable summaries) can't be imported — Lumen needs absolute temperatures to place the ovulation shift.

> 💡 After several cycles of tracking, Lumen may gently suggest talking to a healthcare provider — this is common and supportive, not a warning.

> ⚠️ **Lumen is not a contraceptive** and is not a substitute for fertility treatment or medical advice.

---

## Pregnancy mode

Follow your pregnancy week by week, with a kick counter and contraction timer built in.

### Turn it on

Go to **Settings → Pregnancy** and choose how to start:

| Option | When to use it |
|--------|----------------|
| **Enter my due date** | You already know your estimated due date |
| **Enter my last period date (LMP)** | Lumen calculates the due date for you |
| **Use my last logged period** | Reuse a period you already logged in Lumen |

Tap **Start pregnancy mode**. (You can also choose **I'm pregnant** during first‑time onboarding.)

### The Pregnancy hub

The **Pregnancy** tile opens your hub:

- A header card with your **current week, trimester, and a countdown to your due date**.
- **Baby this week** — fetal development highlights.
- **Your body this week** — what to expect for you.
- **Sources** for the week's information, plus quick links:

| Link | What it opens |
|------|---------------|
| 👣 **Kick counter** | Count your baby's movements |
| ⏱️ **Contraction timer** | Time contractions during labor |
| 📝 **Log symptoms** | The daily log, with pregnancy‑specific symptoms added |
| ⚙️ **Manage pregnancy** | Edit your due date or end pregnancy mode |

> 💡 In pregnancy mode, the Log screen adds symptoms like *Heartburn, Swelling, Round ligament pain, Braxton Hicks,* and *Pelvic pressure*. Cycle‑only content (period/PMS material) is hidden so it stays relevant.

### Kick counter

1. Tap **Start a session**.
2. Tap **Record a kick** each time you feel movement. The counter climbs toward the daily target of **10**.
3. Tap **Finish** to save. Past sessions are listed below.

> ⚠️ Counting movements is informational. **Contact your provider if you notice reduced movement.**

### Contraction timer

1. Tap **Start contraction** when one begins, **Stop contraction** when it ends.
2. Repeat for each contraction. Lumen watches for the well‑known **5‑1‑1 pattern** (contractions ~5 minutes apart, lasting ~1 minute, for ~1 hour) and shows an alert when that pattern appears.
3. Tap **Save session** to keep a record.

> ⚠️ The timer is **informational only and does not diagnose labor.** Follow your provider's guidance.

### When your pregnancy ends

Under **Settings → Pregnancy → Manage pregnancy**, you can tell Lumen your pregnancy has ended:

- **Baby arrived** 🎉 — Lumen congratulates you and switches into [**Postpartum mode**](#postpartum-mode) to support your recovery. You can return to cycle tracking whenever you're ready.
- **My pregnancy has ended** 🤍 — Lumen responds with a **compassionate, no‑pressure** screen: no celebratory messaging, no period prompts, and links to support. You return to cycle mode only when *you* choose to. (This path never enters postpartum mode.)

---

## Postpartum mode

Postpartum mode is a recovery‑focused home for the weeks after birth. Instead of dropping you straight back into period tracking, it supports your **physical recovery and mental health** with week‑by‑week guidance, a validated mood check‑in, and gentle recovery logging.

> 💙 Postpartum mode is **about you, the mother** — not a baby tracker. It doesn't log feeds, diapers, or baby sleep.

### How you get here

Postpartum mode turns on **automatically** when you confirm **Baby arrived** under *Settings → Pregnancy → Manage pregnancy* (or in the Pregnancy hub). Lumen anchors a recovery clock to your **birth date** and opens a recovery space. There's no manual toggle to start it — it always follows a birth.

> 🤍 The **pregnancy‑loss** path never enters postpartum mode. It stays on its own compassionate screen and returns to cycle tracking only when you choose.

### The Postpartum hub

A **Postpartum** tile appears on Home and in the nav. It opens your hub:

- A header card showing **Postpartum · week N** and your **recovery stage**:
  | Stage | Roughly when |
  |-------|--------------|
  | **Early recovery** | Weeks 0–6 (the acute phase) |
  | **Recovering** | Weeks 6–12 |
  | **Ongoing recovery** | 12 weeks onward |
- **This week's focus** — plain‑language recovery notes covering bleeding (lochia), perineal/C‑section healing, afterpains, night sweats, pelvic floor, sleep, mood, and feeding.
- **When your cycle returns** — an honest note that periods can take weeks to many months to come back, that breastfeeding can delay them, and that **Lumen will not guess a date**.
- Quick links: **Mood check‑in**, **Log recovery**, and **Manage postpartum** (Settings).
- **Sources** for the week's content (NHS, ACOG, Office on Women's Health) and an educational‑only disclaimer.

> 💡 Recovery content runs through about week 12; after that, the hub keeps showing the "three months and beyond" guidance.

### The mood check‑in (EPDS)

The heart of postpartum mode is a **mood check‑in** based on the **Edinburgh Postnatal Depression Scale (EPDS)** — a widely used, validated screening questionnaire.

1. From the hub, tap **Mood check‑in**.
2. Answer **10 short questions** about how you've felt **over the past 7 days**.
3. Tap **See my result** to get your **score out of 30** and a supportive, plain‑language reading.

```mermaid
flowchart TD
    Q["💗 10 questions<br/>(past 7 days)"] --> S{"Lumen scores<br/>your answers"}
    S --> R["Score / 30 +<br/>supportive summary"]
    S -. "score is high, or any<br/>self-harm response" .-> C["🆘 Support resources<br/>appear"]
    style S fill:#e11d48,color:#fff
    style C fill:#fff,stroke:#e11d48
```

| Score | What Lumen shows |
|-------|------------------|
| **Under 10** | Lower range |
| **10–12** | Some symptoms — worth sharing with your provider |
| **13 or more** | Please reach out to your provider |

Every result carries the same reminder: **this is a screening tool, not a diagnosis — please share it with your healthcare provider.**

> 🆘 If your score is high **or** you give any answer above zero to the question about thoughts of harming yourself, Lumen shows a prominent **"Support is available"** block: contact your provider, and contact emergency services if you're in immediate danger. It also lists **crisis helplines for your region** — Lumen guesses your country from your device's language setting (never your location), you can switch it with the dropdown, and if your country isn't listed there's a link to [findahelpline.com](https://findahelpline.com) to find one.

Your past check‑ins are saved and listed under *Settings → Postpartum*.

### Logging your recovery

In postpartum mode, **Log recovery** swaps in postpartum‑specific fields:

| Field | Options |
|-------|---------|
| **Lochia (bleeding)** | none · spotting · light · medium · heavy |
| **Symptoms** | Afterpains · Perineal pain · C‑section pain · Breast pain · Engorgement · Sore nipples · Night sweats · Constipation · Hemorrhoids · Fatigue · Back pain · Hair loss |
| **Mood** | Happy · Calm · Bonding · Anxious · Overwhelmed · Tearful · Irritable · Sad · Numb · Guilty |

> ⚠️ **Lochia is recorded separately from period flow.** Postpartum bleeding never feeds your cycle stats or predictions — it's kept apart so your recovery and your cycle history don't get tangled.

### Manage postpartum & moving on

Under **Settings → Postpartum** you can:

- Mark **I am breastfeeding** — this tunes the educational copy only and is **never** used as a prediction input.
- **Edit your birth date** if the recovery clock needs adjusting.
- Review your **mood check‑in history**.
- **End postpartum mode** when you're ready, choosing where to go next:
  - **Back to cycle tracking**
  - **Start trying to conceive** (TTC mode)

Exit is entirely **your choice** — Lumen never predicts when your cycle will return and never nags you to move on.

---

## Perimenopause mode

Turn this on for the transition years before menopause, when cycles naturally become irregular.

### Turn it on

1. Go to **Settings → Perimenopause** (or pick **Navigating perimenopause** at onboarding).
2. Tap **Turn on perimenopause mode**.

### What changes

- **Predictions soften instead of alarming.** Period prediction stays — irregular cycles simply widen the estimate and lower the stated confidence — and Home adds a gentle reminder that predictions carry extra uncertainty in this stage.
- **No fertile window.** Ovulation timing is unreliable in perimenopause, so Lumen stops showing the fertile window, calendar fertile/ovulation markers, and the fertile-window reminder. This is deliberate: showing one would imply precision that doesn't exist, and it must never be read as contraceptive guidance. **Pregnancy remains possible until you've gone 12 months without a period.**
- **Symptoms that fit the stage.** The Log screen swaps in perimenopause symptoms — hot flashes, night sweats, sleep problems, brain fog, and more — so patterns you can bring to a doctor are one tap away.
- **Stage-specific reading.** The Library and Programs surface a cited three-part guide: what changes, handling hot flashes, and which bleeding patterns deserve a doctor visit.

Turning the mode off returns you to standard cycle tracking with nothing lost.

---

## Doctor summary (print / PDF)

Need to share your history with a clinician? Go to **Settings → Your data → Doctor summary (print / PDF)**.

- It opens a clean, printable page summarizing your cycles, averages, and recent logs.
- Use your browser's **Print** (or *Save as PDF*) to save or print it.
- It's generated **entirely on your device** — nothing is sent anywhere.

> 💡 Great for a first appointment, a fertility work‑up, or a postpartum check‑in — it gives your provider your real history at a glance.

---

## Privacy, encryption & your data

Privacy is Lumen's headline promise. There are three layers, and **you choose how many to use**:

```mermaid
flowchart TD
    U["👤 You"] -->|log data| D[("📱 On your device")]
    D --> P{"Set a passcode?"}
    P -->|No| Plain["Readable on this device<br/>(protect it with your screen lock)"]
    P -->|Yes| Enc["🔒 Encrypted on this device<br/>(AES-256)"]
    Enc --> SY{"Turn on sync?"}
    SY -->|No| Local["Stays on this device only"]
    SY -->|Yes| Cloud["☁️ End-to-end encrypted copy<br/>server can't read it"]
    style D fill:#e11d48,color:#fff
    style Enc stroke:#e11d48
    style Cloud stroke:#e11d48
```

- **Local‑first, always.** Everything you log lives in your browser on this device. By default nothing is ever uploaded.
- **No account, no ads, no tracking SDKs.** Nothing to sign up for.

Everything below is managed under **Settings**.

### 1. Passcode & encryption

Under **Settings → Passcode lock**, tap **Turn on encryption** and choose a passcode.

- Lumen encrypts your on‑device data with **AES‑256** and shows you a **12‑word recovery phrase**.
- **Write the recovery phrase down and keep it safe.** It is the **only** way back in if you forget your passcode — Lumen can't reset it for you, because it never stores your passcode or phrase.
- After that, you unlock Lumen with your passcode each time you open it. You can **Change passcode** later (your recovery phrase stays the same).

> 🔒 This is **real encryption at rest**, not just a screen lock — without your passcode or recovery phrase, the stored data is unreadable, even to someone with full access to your device or browser storage.

> ⚠️ **The recovery phrase is unrecoverable if lost.** Treat it like a house key: no phrase + forgotten passcode = no way back into encrypted data. Store it somewhere only you can reach.

### 2. Backup & restore (a file you keep)

Under **Settings → Your data**:

| Action | What happens |
|--------|--------------|
| **Export my data** | Downloads a single JSON file with everything you've logged — your personal backup. |
| **Restore from a backup** | Loads a previously exported JSON file back into Lumen (e.g. on a new device or after clearing your browser). |

> 💡 Backups are simple and portable. Keep the file somewhere safe — it contains your health data in plain form, so store it like any private document.

### 3. Sync across devices (end‑to‑end encrypted)

Want Lumen on your phone *and* laptop, kept in step automatically? Under **Settings → Sync across devices**:

1. **Turn on encryption first** (step 1 above) — sync uses the same recovery phrase as its key.
2. Tap **Turn on sync**. From now on, changes are encrypted **on your device** and an encrypted copy is kept on Lumen's server.
3. **Sync now** forces an immediate sync; otherwise it happens automatically when you open Lumen.

**On your second device:** on the Welcome screen tap **"Already use Lumen? Restore your data"** (or **Settings → Sync → Restore from another device**), enter your **12‑word recovery phrase**, and choose a passcode for that device. Your data flows in, and both devices stay in sync from then on.

> 🔐 **Zero‑knowledge by design.** Your data is encrypted before it leaves your device, and the key stays on your devices — it never reaches the server. So the server only ever holds scrambled data it has no key for, and it can't tell your dates, symptoms, life stage, or even what kind of data you have. Only your recovery phrase can unlock it. *(One honest caveat — see the FAQ "Can Lumen (or anyone) read my synced data?" below.)*

> ⚠️ Lose the recovery phrase and you lose the synced copy — there is no password‑reset back door. That's the price of true end‑to‑end encryption.

**Turning sync off:** tap **Turn off sync**. Your data on this device is untouched. You'll also be offered **Turn off and delete server copy** to wipe the encrypted copy from the server.

### 4. Delete everything

Under **Settings → Your data → Delete all data** (confirm with **Yes, delete**):

- Permanently erases everything on this device — logs, passcode, and preferences.
- If sync is on, it **also deletes your encrypted copy from the server** first. (If the server can't be reached, Lumen stops and keeps your data so you can retry — it never leaves a stranded copy behind.)
- This **cannot be undone**.

---

## Moving to a new phone

You have two easy paths — pick whichever suits you:

| Method | Best when | How |
|--------|-----------|-----|
| **Sync** (automatic) | You want both devices kept in step going forward | Turn on encryption + sync on the old device, then **Restore your data** with your recovery phrase on the new one. |
| **Backup file** (one‑off) | You just want a clean copy moved once | **Export my data** on the old device, transfer the file, then **Restore from a backup** on the new one. |

> ⚠️ Because Lumen is private and device‑local, **your data does not appear on a new device by itself**. Set up sync, or keep a recent backup file, *before* you switch phones or clear your browser — otherwise device‑only data can't be recovered.

---

## Install Lumen as an app

Lumen is a **Progressive Web App (PWA)** — you can install it to your home screen and use it offline.

| Device | How |
|--------|-----|
| **Android / Chrome** | Open the menu (⋮) → **Install app** / **Add to Home screen** |
| **iPhone / Safari** | Tap **Share** → **Add to Home Screen** |
| **Desktop** | Click the **install icon** in the address bar |

Once installed, Lumen launches full‑screen with its crescent‑moon icon and works **without a connection** — your data is already on your device.

---

## Troubleshooting & FAQ

<details>
<summary><strong>I don't see any predictions or insights yet.</strong></summary>

Lumen needs at least one logged period to start predicting, and a cycle or two before insights and confidence improve. Keep logging — it gets smarter quickly.
</details>

<details>
<summary><strong>My period is longer than usual — did Lumen start a new cycle by mistake?</strong></summary>

No. Lumen anchors to your last bleeding day, so a period that runs longer than your average stays part of the *same* cycle rather than being split into a new one.
</details>

<details>
<summary><strong>How do I log a day I missed?</strong></summary>

Open the **Calendar** and tap the day you missed — that opens its log so you can fill it in. Any past day (or today) can be edited the same way. The **Log today** button always opens today.
</details>

<details>
<summary><strong>How do I move my data to a new phone?</strong></summary>

Two ways: turn on **encryption + sync** and use **Restore your data** with your recovery phrase on the new device, or **Export my data** to a file and **Restore from a backup** on the new device. See [Moving to a new phone](#moving-to-a-new-phone). Do this *before* clearing your old browser.
</details>

<details>
<summary><strong>I switched phones / cleared my browser and my data is gone.</strong></summary>

Data is stored on the device where you logged it. If you had **sync** on, restore it on the new device with your recovery phrase. If you kept an **exported backup file**, use *Restore from a backup*. If you had neither, device‑only data can't be recovered — set up sync or keep backups going forward.
</details>

<details>
<summary><strong>What is the recovery phrase, and what if I lose it?</strong></summary>

It's a **12‑word key** created when you turn on encryption. It unlocks your encrypted data and restores your synced copy on a new device. Lumen never stores it, so **it can't be reset** — if you forget your passcode *and* lose the phrase, encrypted/synced data can't be recovered. Write it down and keep it safe.
</details>

<details>
<summary><strong>Is my data safe if I lose my phone?</strong></summary>

Turn on a **passcode** (Settings → Passcode lock) to **encrypt** your data with AES‑256 — without your passcode or recovery phrase it's unreadable, even to someone with your device. Also rely on your device's own lock screen as a first line of defense.
</details>

<details>
<summary><strong>Can Lumen (or anyone) read my synced data?</strong></summary>

Here's the honest version. Your data is encrypted on your device before upload, and the key that unlocks it **never leaves your devices** — so the server only ever holds scrambled data it has no key for. If someone stole the server's database, they'd get nothing readable, and Lumen has no password‑reset back door into it.

The one caveat worth stating plainly: Lumen runs in your browser and loads its code from our servers each time you open it, so you are trusting us to keep that code honest. We've built it so we never receive your key or your unencrypted data, and a future installed app will remove even that last bit of trust in the browser. So: safe against a stolen database or a nosy operator — and we've deliberately kept ourselves *unable* to read what you've synced.
</details>

<details>
<summary><strong>How do I switch between cycle, TTC, pregnancy, and postpartum modes?</strong></summary>

*Trying to conceive* and *Pregnancy* each have a toggle/start button in **Settings** (and can be chosen at onboarding); turning a mode off returns you to standard cycle tracking. **Postpartum** mode is the exception — it isn't a manual toggle. It starts automatically when you confirm **Baby arrived** in the pregnancy end flow, and you leave it from *Settings → Postpartum* (back to cycle, or into TTC).
</details>

<details>
<summary><strong>Is the postpartum mood check‑in a diagnosis?</strong></summary>

No. It's a **screening tool** (the Edinburgh Postnatal Depression Scale) that gives you a score and a supportive summary. It is not a diagnosis — always share your result with your healthcare provider, and use the on‑screen support resources if you're struggling.
</details>

---

## Important: medical disclaimer

> Lumen provides **estimates and educational information only**. It is **not medical advice**, not a contraceptive, and not a substitute for professional care. Predictions are based on the data you enter and can be wrong. Always consult a qualified healthcare provider with any health concerns or before making decisions about contraception, conception, pregnancy, or treatment.

---

<p align="center"><em>Made for tracking that respects your privacy. 🌙</em></p>
