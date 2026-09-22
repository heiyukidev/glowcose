---
name: Gluciel
description: A personal capillary glucose carnet, warm as paper on a kitchen table.
colors:
  cream: "oklch(0.985 0.012 85)"
  card-cream: "oklch(0.995 0.008 85)"
  sand: "oklch(0.94 0.03 85)"
  muted-cream: "oklch(0.95 0.022 85)"
  warm-line: "oklch(0.9 0.025 80)"
  warm-brown: "oklch(0.28 0.035 55)"
  muted-brown: "oklch(0.5 0.03 60)"
  muted-teal: "oklch(0.48 0.08 168)"
  teal-ink: "oklch(0.99 0.01 95)"
  focus-teal: "oklch(0.55 0.07 168)"
  in-range-green: "oklch(0.68 0.13 155)"
  in-range-green-ink: "oklch(0.35 0.08 155)"
  high-amber: "oklch(0.78 0.14 75)"
  high-amber-ink: "oklch(0.42 0.1 55)"
  alert-coral: "oklch(0.65 0.18 25)"
  alert-coral-ink: "oklch(0.42 0.14 25)"
  low-blue: "oklch(0.68 0.1 230)"
  low-blue-ink: "oklch(0.38 0.08 230)"
  destructive-red: "oklch(0.577 0.245 27.325)"
typography:
  display:
    fontFamily: "Fraunces, ui-serif, Georgia, serif"
    fontSize: "3.75rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Fraunces, ui-serif, Georgia, serif"
    fontSize: "1.875rem"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Fraunces, ui-serif, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Outfit, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "normal"
  label:
    fontFamily: "Outfit, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "normal"
rounded:
  sm: "calc(0.9rem - 4px)"
  md: "calc(0.9rem - 2px)"
  lg: "0.9rem"
  xl: "calc(0.9rem + 4px)"
  "2xl": "1rem"
  "3xl": "1.5rem"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "32px"
components:
  button-primary:
    backgroundColor: "{colors.muted-teal}"
    textColor: "{colors.teal-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "color-mix(in oklch, oklch(0.48 0.08 168) 80%, transparent)"
    textColor: "{colors.teal-ink}"
    rounded: "{rounded.lg}"
    height: "32px"
  button-add:
    backgroundColor: "{colors.muted-teal}"
    textColor: "{colors.teal-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.2xl}"
    padding: "0 16px"
    height: "56px"
    width: "100%"
  button-outline:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.warm-brown}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.warm-brown}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-destructive:
    backgroundColor: "color-mix(in oklch, oklch(0.577 0.245 27.325) 10%, transparent)"
    textColor: "{colors.destructive-red}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.warm-brown}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "4px 10px"
    height: "32px"
    width: "100%"
  chip-selected:
    backgroundColor: "{colors.muted-teal}"
    textColor: "{colors.teal-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: "8px 12px"
  chip-idle:
    backgroundColor: "{colors.card-cream}"
    textColor: "{colors.warm-brown}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.card-cream}"
    textColor: "{colors.warm-brown}"
    typography: "{typography.body}"
    rounded: "{rounded.2xl}"
    padding: "16px"
---

# Design System: Gluciel

## Overview

**Creative North Star: "The Kitchen Carnet"**

Gluciel looks like a paper notebook left on the kitchen table between meals. The page is Cream, the words are Warm Brown, and the only ink that asks for a tap is Muted Teal. Fraunces carries the glucose number and the page title. Outfit carries everything you scan. The mood is warm, quiet, and domestic: paper and ink, not a clinic.

Density stays low. One column, about a phone wide, centered on every viewport. The reading is the loudest thing on the page. Controls are quiet and sure, and they feel pressable: a color shift on hover, a one-pixel drop on press. Saturated color is reserved for the four glucose bands.

The system refuses clinic dashboards, neon continuous-glucose apps, and purple wellness gradients. Light is the shipped theme.

**Key Characteristics:**

- A single cream column, never a dashboard grid
- Fraunces for the number and the title, Outfit for the rest
- Muted Teal for actions, four bands for glucose status
- Tonal paper: lighter cards, hairline rings, no drop shadows
- Quiet, sure, pressable controls

## Colors

A warm paper page, brown ink, one muted teal for actions, and four glucose bands that are the only saturated colors.

### Primary

- **Muted Teal** (`oklch(0.48 0.08 168)`): The action ink. Primary buttons, the add-reading action, selected meal chips, and the active tab. It is quiet on purpose. Teal Ink (`oklch(0.99 0.01 95)`) is the text on it. Focus Teal (`oklch(0.55 0.07 168)`) is the focus ring only.

### Secondary

- **In-range Green** (`oklch(0.68 0.13 155)`): The band for a reading inside the personal target. Used as a dot, a tinted badge, and the fasting reference line on the graph. In-range Green Ink (`oklch(0.35 0.08 155)`) is the badge text.
- **High Amber** (`oklch(0.78 0.14 75)`): The band above target, and the 2-hour reference line. Also the faint warm wash in the top-right of the page. High Amber Ink (`oklch(0.42 0.1 55)`) is the badge text.
- **Alert Coral** (`oklch(0.65 0.18 25)`): The very-high band. Alert Coral Ink (`oklch(0.42 0.14 25)`) is the badge text.
- **Low Blue** (`oklch(0.68 0.1 230)`): The hypo band. Low Blue Ink (`oklch(0.38 0.08 230)`) is the badge text.

### Neutral

- **Cream** (`oklch(0.985 0.012 85)`): The page. Two faint washes sit on it: Muted Teal at the top-left, High Amber at the top-right, both mostly transparent.
- **Card Cream** (`oklch(0.995 0.008 85)`): Cards, idle chips, and grouped readings. A step lighter than the page, which is how a sheet sits on the table.
- **Sand** (`oklch(0.94 0.03 85)`): The secondary button fill.
- **Muted Cream** (`oklch(0.95 0.022 85)`): Hover fills, skeletons, and the quiet press behind a ghost control.
- **Warm Line** (`oklch(0.9 0.025 80)`): Borders, input strokes, and the line above the bottom navigation.
- **Warm Brown** (`oklch(0.28 0.035 55)`): Text, titles, and the wordmark.
- **Muted Brown** (`oklch(0.5 0.03 60)`): Dates, secondary lines, inactive tabs, placeholders, and the disclaimer.
- **Destructive Red** (`oklch(0.577 0.245 27.325)`): Archive and invalid fields. It is not a glucose band. Alert Coral owns the very-high reading.

### Named Rules

**The Band Rule.** Saturated color belongs to the four glucose bands, or to Muted Teal when something can be tapped. The page stays Cream and Warm Brown. If a screen is mostly teal or mostly amber, it has broken the carnet.

**The Light Rule.** The shipped theme is light. A dark token block exists in the stylesheet and the app forces light. Do not design a screen against the dark block.

## Typography

**Display Font:** Fraunces (with Georgia, then a serif)
**Body Font:** Outfit (with the system sans)
**Label/Mono Font:** Outfit. There is no separate mono.

**Character:** Fraunces is the notebook’s hand, used rarely and large. Outfit is the pencil that writes the rest. The pair should feel like a titled page and its notes, not a poster over a UI font.

On the iPhone app the display role is Georgia, and the body is the system sans. Fraunces and Outfit are the website’s faces. The iPhone colors are hex stand-ins of these tokens in `mobile/src/theme.ts`.

### Hierarchy

- **Display** (400, 3.75rem, line-height 1, tracking tight): The glucose value being entered or read. Nothing else uses this size.
- **Headline** (400, 1.875rem, line-height 1.25, tracking tight): The page title. Aujourd’hui, Historique, Graphique, and the onboarding question.
- **Title** (400, 1.5rem, tracking tight): A section title inside a page, including an invite code set large. The wordmark is the same face at 1.25rem. Card titles drop to 1rem, medium weight, still Fraunces.
- **Body** (400, 0.875rem, line-height 1.25): Dates, meal lines, helper copy, buttons, and chips. Inputs use 1rem below the `md` breakpoint so iOS does not zoom, then return to 0.875rem.
- **Label** (500, 0.6875rem): Bottom navigation. Badges sit slightly larger, at 0.75rem, medium. The disclaimer is 0.75rem Muted Brown.

### Named Rules

**The Number Rule.** The glucose value is Fraunces at display size, and it is the loudest thing on the page. A button, a chip, or a badge does not outrank it.

**The Serif Rarity Rule.** Fraunces is for the value, the page title, the section title, and the wordmark. Outfit sets every repeated label, list row, and control.

## Layout

The spatial model is one column. Content sits in a centered measure of 32rem (`max-w-lg`), with 16px of side padding and 32px under the last block. The same column is used on a phone and on a desktop window. There is no second column and no sidebar.

The rhythm is a 4px grid: 4px, 8px, 16px, and 32px. 16px is the page inset and the card padding. 32px separates a screen’s closing note from the work above it.

Bottom navigation is fixed, four equal tabs, and the column keeps 80px clear of it (`pb-20`). Flows that are a single task — add a reading, a single measure, onboarding, sign-in, join — hide that bar.

The only breakpoint that changes type is `md` (768px), and it only drops input text from 1rem to 0.875rem. The column does not reflow.

### Named Rules

**The One Column Rule.** A new screen is a single 32rem column with 16px of side padding. If a layout needs a sidebar, a data table across the viewport, or a multi-column dashboard, it is not this carnet.

## Elevation & Depth

Depth is tonal paper. The page is Cream. A card is Card Cream, one step lighter, with a hairline ring of Warm Brown at 10% opacity. Empty states use a dashed Warm Line instead of that ring. Nothing casts a drop shadow.

The wordmark’s droplet sits in a Muted Teal tile with one soft glow (`0 0 18px`, Muted Teal mixed toward transparent). That glow belongs to the mark only.

Press is a 1px downward shift on a button. Hover replaces a fill with Muted Cream, or softens Muted Teal to 80% opacity. Focus is a 3px ring of Focus Teal at half strength.

### Named Rules

**The Paper Rule.** Surfaces do not cast shadows. Depth is a lighter card on Cream, plus a hairline ring. The logo mark is the only glow.

## Shapes

Corners are soft and consistent, not mixed for decoration. The base radius is 0.9rem.

Controls — buttons, inputs, notes — use that 0.9rem. The primary add action and grouped reading cards use 1rem. Graph cards and loading blocks use 1.5rem. Meal chips, status badges, and status dots are pills.

Borders are hairlines. A resting input is a Warm Line stroke on a transparent field. A card ring is Warm Brown at 10%. An empty state is a dashed Warm Line on Card Cream.

### Named Rules

**The Soft Corner Rule.** A control is 0.9rem. A card is 1rem, or 1.5rem when it holds a chart. A status or a meal choice is a pill. Do not introduce a sharp corner or a new radius step.

## Components

Controls are quiet and sure, and they feel pressable. The glucose number stays louder than any of them.

### Buttons

- **Shape:** Gently curved (0.9rem). The add-reading action is a wider curve (1rem) and full column width.
- **Primary:** Muted Teal fill, Teal Ink text, 32px tall, 10px of side padding, Outfit at 0.875rem medium. The add action is 56px tall, 1rem type, semibold.
- **Hover / Focus:** Hover fades the teal to 80% opacity. Press drops the button 1px. Focus draws a 3px Focus Teal ring at half strength. Disabled drops to 50% opacity.
- **Outline:** Cream fill, Warm Line border, Warm Brown text. Hover fills with Muted Cream.
- **Ghost:** No fill. Hover fills with Muted Cream.
- **Destructive:** Destructive Red at 10% fill, Destructive Red text. Used to archive. It is not a glucose color.
- **Link:** Muted Teal text with an underline on hover.

### Chips

- **Style:** Pills. Idle is Card Cream, Warm Line border, Warm Brown text, 8px by 12px of padding, Outfit 0.875rem medium.
- **State:** Selected fills with Muted Teal and Teal Ink, and drops the warm border for a teal one. These are meal and range choices, not tags.

### Cards / Containers

- **Corner Style:** 1rem on a reading group. 1.5rem when the card holds the graph. The primitive card radius is slightly larger than 0.9rem; screens override it to 1rem or 1.5rem.
- **Background:** Card Cream.
- **Shadow Strategy:** None. See the Paper Rule.
- **Border:** A hairline ring, Warm Brown at 10%. Empty states swap it for a dashed Warm Line.
- **Internal Padding:** 16px. The primitive card uses the same 16px, and 12px at the small size.

### Inputs / Fields

- **Style:** 32px tall, 0.9rem corners, Warm Line stroke, transparent fill, 10px of side padding. Placeholder is Muted Brown. The note field is the same stroke with at least 64px of height.
- **Focus:** The stroke becomes Focus Teal and a 3px ring at half strength appears. The glucose value field is the exception: no border, no ring, Fraunces at display size, centered.
- **Error / Disabled:** Invalid draws a Destructive Red stroke and a red ring at 20% strength. Disabled is 50% opacity and refuses pointer events.

### Navigation

Four tabs in a fixed bar along the bottom: Aujourd’hui, Historique, Graphique, Réglages. The bar is Cream at 95% opacity with a blur, a Warm Line along the top, and 6px of vertical padding. Each tab is a column: a 20px icon and an 11px medium label. Active is Muted Teal. Inactive is Muted Brown, warming to Warm Brown on hover. The bar hides on a single-task flow.

### Glucose value

The number being written or read is Fraunces at 3.75rem, tracking tight, centered, with no field chrome. Unit and meal sit around it in Outfit. This is the signature of the carnet. A new screen that shows a reading gives the number this treatment.

### Status badge

A pill, 24px tall, 0.75rem medium type. The fill is the band color at about 15% strength, and the text is that band’s ink. A 10px dot in the solid band color may stand in for the badge in a row. The four bands are the only status colors. Do not invent a fifth.

### Wordmark

A 36px Muted Teal tile with 1rem corners, a droplet in Teal Ink, and the name in Fraunces at 1.25rem, Warm Brown, tracking tight. The tile carries the only glow in the system.

## Do's and Don'ts

### Do

- **Do** keep every screen a single 32rem column with 16px of side padding.
- **Do** set the glucose value in Fraunces at 3.75rem, and page titles in Fraunces at 1.875rem.
- **Do** use Muted Teal for what can be tapped, and the four bands only for glucose status.
- **Do** separate cards from the page by a lighter cream and a hairline ring of Warm Brown at 10%.
- **Do** keep archive and invalid fields on Destructive Red, distinct from Alert Coral.

### Don't

- **Don't** add a drop shadow to a card, a button, or a sheet. The logo tile is the only glow.
- **Don't** use clinic-dashboard chrome, neon continuous-glucose styling, or a purple wellness gradient.
- **Don't** let a control, a chip, or a badge outrank the glucose number.
- **Don't** design against the unused dark tokens. The app forces light.
- **Don't** reach for the unused chart or sidebar tokens in the stylesheet. The graph draws with In-range Green and High Amber.
