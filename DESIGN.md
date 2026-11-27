---
name: Finance
description: Personal money ledger printed as an Indonesian wall calendar, tanggal muda to tanggal tua.
colors:
  paper: "#fbfaf6"
  sheet: "#ffffff"
  ink: "#151515"
  ink-2: "#4a4740"
  ink-3: "#77726a"
  rule: "#e4dfd3"
  merah: "#c4201a"
  merah-tint: "#fbe9e7"
  aman: "#1f7a4d"
  mepet: "#9a5b00"
  marker: "#1f5fd1"
typography:
  display:
    fontFamily: "Archivo Narrow, Arial Narrow, sans-serif"
    fontSize: "84px"
    fontWeight: 700
    lineHeight: 0.85
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Archivo Narrow, Arial Narrow, sans-serif"
    fontSize: "46px"
    fontWeight: 700
    lineHeight: 1
  amount:
    fontFamily: "Archivo Narrow, Arial Narrow, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Archivo Narrow, Arial Narrow, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.4
  figure:
    fontFamily: "Archivo Narrow, Arial Narrow, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    fontFeature: "tnum"
  calendar-day:
    fontFamily: "Archivo Narrow, Arial Narrow, sans-serif"
    fontSize: "15px"
    fontWeight: 500
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.43
    fontFeature: "tnum"
  label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.33
rounded:
  md: "6px"
  full: "9999px"
spacing:
  gutter: "16px"
  row: "12px"
  section: "28px"
  column-gap: "48px"
  control: "44px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.ink-2}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.merah}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  button-danger-hover:
    backgroundColor: "{colors.merah-tint}"
  input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  chip:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "8px 14px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  nav-add:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
    size: "52px"
---

# Design System: Finance

## Overview

**Creative North Star: "Tanggal Tua"**

The month is an Indonesian wall calendar hanging in the kitchen: warm paper, black ink, a ring of marker around today, and red print on the days that ran ahead of pace. Every screen is a page of that calendar or a ledger tucked behind it. There are no cards, no shadows, and no balance hero; structure comes from ink rules and narrow, calendar-scale numerals.

Density is ledger-like. Rows are separated by hairline rules, figures sit right-aligned in a narrow face, and explanations live behind a `details` disclosure rather than in extra panels. Color is a verdict, never decoration: the page is ink on paper until something is Aman, Mepet, or Lewat.

The system is phone-first (a home-screen web app) and opens into two columns at 1024px for the weekly laptop recap. Dark mode is not part of the system yet.

**Key Characteristics:**
- Warm paper ground, black ink type, hairline warm-grey rules.
- Archivo Narrow numerals at calendar scale over a system-ui body.
- Status colors carry meaning only: red kebablasan, green aman, amber mepet.
- Marker blue is reserved for today and focus.
- Flat: depth is drawn with rules, never shadows.

## Colors

Paper and ink, with three printed verdict colors and one marker pen.

### Primary
- **Ink Black** (`ink`): all primary text, the primary button, the selected chip and type segment, the round add button in the bottom nav, and the 2px frame rules on the header and nav.

### Secondary
- **Kalender Red** (`merah`): kebablasan only. The Lewat verdict, days whose spending ran ahead of pace (number and dot), over-budget fills and "lebih" figures, the "Tahan dulu" state, negative trading results, form errors, and the danger button.
- **Aman Green** (`aman`): the Aman verdict, "Boleh disetor sampai", success messages, positive trading result, and savings-goal progress fills.
- **Mepet Amber** (`mepet`): the Mepet verdict, budget fills in warn state, warn-level suggestion icons, and the "belum bisa dihitung" state.

### Tertiary
- **Marker Blue** (`marker`): today's ring in the calendar, the today tick on budget bars, the focus outline, the text caret, and text selection.

### Neutral
- **Calendar Paper** (`paper`): page background, nav background, and text on ink fills. Also the PWA theme color.
- **Sheet White** (`sheet`): the fill of inputs and unselected chips, so fields read as slips laid on the paper.
- **Ink Brown-Grey** (`ink-2`): secondary text, labels, icon buttons, and the primary button hover.
- **Faded Ink** (`ink-3`): tertiary text: weekday headers, future calendar days, per-day allowance, footnotes, inactive nav items.
- **Calendar Rule** (`rule`): 1px row dividers, calendar cell tops, budget-bar tracks, and translucent hover washes on rows and icon buttons (30 to 60 percent).
- **Red Tint** (`merah-tint`): hover wash of the danger button only.

### Named Rules
**The Verdict-Only Color Rule.** Red, green, and amber appear only when they state a verdict about money. A heading, link, or button is never colored for emphasis.

**The One Marker Rule.** Marker blue means "today" or "you are here" (focus, caret, selection). Never use it for links, data, or accents.

## Typography

**Display Font:** Archivo Narrow 500/700 (with Arial Narrow, sans-serif), loaded via `next/font` as `--font-archivo-narrow` and exposed as `font-narrow`.
**Body Font:** system-ui (with -apple-system, Segoe UI, Roboto, sans-serif).

**Character:** A printed calendar's condensed numerals carry every number that matters; the system face carries the sentences, so the app reads as native on the phone. Tabular numerals are on globally.

### Hierarchy
- **Display** (700, 84px, 0.85, tight tracking): today's date on the leaf. One per screen.
- **Headline** (700, 46px, 1): the month verdict word (Aman / Mepet / Lewat). Empty-state and auth titles use the same face at 34 to 48px.
- **Amount** (700, 32px, 1.25): the dana aman figure on the leaf; the amount field uses the same face at 30px.
- **Title** (700, 20px): section headings (Budget, Saran, Saran AI, Pengeluaran terbesar). The month switcher uses it uppercase with wide tracking.
- **Figure** (700, 18px; 16px in compact lists): right-aligned money in ledger rows.
- **Calendar Day** (500, 15px): day numbers in the month grid.
- **Body** (400, 14px; 15px for the verdict sentence, 16px in inputs): sentences, row names, suggestions.
- **Label** (400, 12 to 13px; 10 to 11px only for nav labels and per-day allowance): meta lines, weekday headers, footnotes.

### Named Rules
**The Narrow Numbers Rule.** Any rupiah figure or date that the eye hunts for is set in Archivo Narrow bold. Prose numbers inside a sentence stay in the body face, bolded.

## Layout

Single column inside a 1024px max container with a 16px gutter on every screen. The app shell is a 56px header (wordmark left, settings right) framed by a 2px ink bottom rule, and a fixed 68px bottom nav framed by a 2px ink top rule, padded for the safe area; content reserves 112px at the bottom so nothing hides behind the nav.

At 1024px and above Beranda splits into a 26rem left column (today's leaf, month verdict, calendar, recap row) and a fluid right column (budget, suggestions, AI, top spending, goals) with a 48px gap. Right-column sections stack 28px apart.

Rhythm is the ledger row: 12px vertical padding (10px in compact lists) between 1px rules. Every tap target is at least 44px (buttons, icon buttons, month arrows). The calendar is a strict 7-column grid starting Monday, 48px cells, each topped by a rule.

## Elevation & Depth

None. The system is flat; there is no box-shadow anywhere. Depth and grouping are drawn the way a printed calendar does it: 1px warm rules between rows, 2px ink rules to frame the shell, and a full ink fill for the one or two things that must be pressed.

### Named Rules
**The Printed Page Rule.** If something needs separating, draw a rule; if it needs weight, fill it with ink. Never lift it with a shadow or wrap it in a card.

## Shapes

Mostly square. Containers have no corners at all: sections are open, bounded only by rules. Buttons and inputs take a gentle 6px corner. Circles are reserved for things a pen would ring or a thumb would press: today's 28px marker ring, spending dots (6 to 16px, sized by square root of the day's spend), round icon buttons, the 52px add button, filter chips, and the "Bulan ini" pill. Progress bars are 6px flat strips on a rule-colored track, square-ended.

Stroke weights are part of the shape language: 1px rules, 1.5px outline buttons and segmented controls, 2px frame rules and today ring. Icons are a single 24px-grid stroke family at 1.8px, round caps and joins.

## Components

### Buttons
Plain and confident, like a stamp.
- **Shape:** gently rounded (6px), 44px tall, 16px horizontal padding, 14px semibold label with an optional trailing arrow icon.
- **Primary:** ink fill, paper text; hover shifts to `ink-2`. Full-width 48px at 16px on form submits and auth.
- **Outline:** 1.5px ink border, ink text; hover takes a translucent rule wash. Used for secondary actions such as Catat setor and Minta saran AI.
- **Danger:** 1.5px red border, red text; hover fills with red tint.
- **Disabled:** 60 percent opacity.
- **Text action:** semibold underlined ink text for inline links ("Atur budget", "Tambah akun trading").

### Chips
- **Style:** pill (full radius), sheet fill, 1px border at 30 percent ink, 14px text, 8px by 14px padding.
- **State:** selected becomes ink fill with paper text and an ink border. Used as the category radio group in the transaction form.

### Segmented control
A 1.5px ink-framed strip of equal cells (Keluar / Masuk / Transfer); the selected cell is ink-filled with paper text, the others `ink-2`. Square corners.

### Cards / Containers
There are none. Sections are open blocks with a narrow-face title above a ruled list (top and bottom rule, rules between rows). Rows that link take a 30 percent rule wash on hover.

### Inputs / Fields
- **Style:** sheet fill, 1px border at 25 percent ink, 6px corners, 10px by 12px padding, 16px text, `ink-3` placeholder. Labels sit above in 14px `ink-2`.
- **Focus:** border darkens to full ink and a 2px marker outline appears.
- **Error:** messages print below the submit in red, success in green, announced politely.

### Navigation
- **Bottom nav:** fixed, paper background, 2px ink top rule, five slots. Items are a 22px icon over an 11px label in `ink-3`; the active item turns ink and semibold. The center slot is a 52px ink circle with a 26px plus icon that scales to 95 percent while pressed.
- **Header:** 22px narrow-face wordmark, 44px round settings button in `ink-2` with a rule-wash hover.
- **Month nav:** 44px round chevrons either side of the uppercase month title; the forward arrow disappears on the current month and a "Bulan ini" outline pill appears when browsing back.

### Today's Leaf (signature)
The top of Beranda is a torn calendar leaf: the 84px date on the left; on the right the weekday and time, a 13px semibold state line in its verdict color ("Boleh disetor sampai", "Tahan dulu", "belum bisa dihitung"), the 32px amount, and the Catat setor outline button. A "Rincian hitungan" disclosure below shows the arithmetic as a ruled two-column definition list.

### Pace Calendar (signature)
The month as a wall calendar: Monday-first 7-column grid, faded weekday headers, a rule atop each 48px cell. Past spending days carry an ink dot sized by spend; days ahead of pace print the number and dot in red; future days fade to `ink-3` and show the per-day allowance in 10px; today is ringed in 2px marker. Each cell links to that day's transactions.

### Budget line (signature)
A ruled row: category name left, "sisa" or "lebih" figure right in the narrow face, a 6px bar (ink when on track, amber in warn, red over) on a rule track with a 2px marker tick at today's share of the month, then a 12px "x dari y" footnote.

## Do's and Don'ts

### Do:
- **Do** set every hunted-for rupiah figure and date in Archivo Narrow bold, right-aligned in ledger rows.
- **Do** separate content with 1px `rule` lines and frame the app shell with 2px ink rules.
- **Do** keep red, green, and amber for Lewat, Aman, and Mepet verdicts only.
- **Do** reserve marker blue for today's ring, the today tick, focus, caret, and selection.
- **Do** put explanations behind a "Rincian" or "Lihat semua" disclosure instead of adding panels.
- **Do** keep every control at least 44px and the page gutter at 16px.

### Don't:
- **Don't** add cards, panels with backgrounds, or box-shadows; the page is printed, not stacked.
- **Don't** build a balance hero or a fintech card stack; the leaf and the calendar lead.
- **Don't** use marker blue for links or data, or verdict colors for emphasis.
- **Don't** set display numerals in the system face.
- **Don't** introduce a second icon style; use the single 1.8px stroke family.
