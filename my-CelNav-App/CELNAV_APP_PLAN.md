# Intercept — App Idea & Plan

## Vision
- Fast, reliable Gyro Error checks using celestial azimuths and Sun amplitudes.
- Offline-first; iOS primary, Android parity; night-friendly UI.
- Copy-ready outputs that match a Compass Log format (no PDFs).

## Branding
- App Name: Intercept
- Subtitle: Celestial Gyro & Fix
- Bundle IDs (proposed): iOS `com.yourorg.intercept`, Android `com.yourorg.intercept`
- Icon: minimal pelorus/LOP motif; night-friendly palette

## Target Users
- Offshore cruisers, racers, students, and professional mariners needing quick GE verification.

## Core Conventions
- Gyro Error (GE): GE = G_body − T_az; West positive. If GE > 0 → “W”; GE < 0 → “E”.
- Variation and Deviation: East positive numerically; displayed with E/W.
- Precision: 0.1° displayed; compute with full precision; normalize angles (0–359.9) and differences (−180…+180).

## MVP Scope
- Methods: Sun/Star Azimuth, Sun Amplitude (rise/set). No star finder yet.
- Bodies: Sun + curated major stars (Sirius, Canopus, Arcturus, Vega, Capella, Rigel, Procyon, Altair, Betelgeuse, Aldebaran, Antares, Fomalhaut, Acrux, Spica, Regulus, Deneb).
- Offline Ephemerides: On-device Sun and star data; ΔT model; no network.
- Variation: Auto-compute offline via bundled WMM; editable with an “Auto Variation” toggle.

### Inputs (per sight)
- Latitude, Longitude (DR).
- Date and Time (UTC).
- Observed Gyro Bearing to body (G_body).
- PGC (vessel gyro heading) — logged.
- PSC (vessel standard compass heading) — logged.
- Variation (auto via WMM by default; user can override).
- Optional: Body (Sun or star), Location of Repeater (free text), Initials, Remarks, Signature.

### Outputs (copy-ready, in exact order)
- Date
- Time (UTC)
- Observed Bearing (G_body)
- GE (e.g., "1.2° W")
- True Celestial Azimuth (T_az)
- Per Gyro Compass (P.G.C) — vessel heading at time
- True Gyro — computed from PGC and GE
- Variation
- Magnetic Compass — derived
- Deviation — derived if PSC provided
- Per Standard Compass (P.S.C) — vessel heading at time
- Body
- Location of Repeater
- Initials
- Remarks
- Signature

## Position Fixing Expansion (Phase 2+)
- Sight Types: Polaris latitude; Sun LAN (Noon Sun) and Latitude by LAN; Sun‑run‑Sun (running fix); Two‑body fixes (Sun+star, star+star); Three‑star fix; Ex‑meridian; Planets and Moon sights (with parallax/SD/HP); continue supporting Azimuth and Amplitude.
- Reduction Engine: Full Marcq Saint‑Hilaire sight reduction: compute Hc and Zn from assumed/DR position; derive intercept a = Ho − Hc (Toward/Away); handle all corrections from Hs → Ho (index error, dip, refraction, semi‑diameter, parallax, temperature/pressure, limb selection, Moon HP and SD).
- LAN Tools: Compute time of meridian passage (LAN) using equation of time and longitude; provide countdown/alarm, “capture max Hs” flow; Latitude by LAN: φ ≈ 90° − Ho + δ (sign‑aware) with ex‑meridian correction if off‑transit; show quality indicator based on altitude/time offset.
- Polaris Latitude: Standard Polaris method using Polaris offset and LHA Aries (Meeus/HO‑249 approximation) to get φ within ~0.2°; guide to take bearing/altitude; minimal inputs.
- Running/Two/Three‑Body Fixes: DR propagation between sights (course/speed/time); advance/retard LOPs; solve intersection(s) for fixes; allow weighting.
- Star Finder: Best 3–7 stars at time/location with alt 15–70°, good azimuth spread; identification aid later (AR optional).
- Plotting: Local tangent‑plane grid; draw LOPs with labels (Zn, intercept); draggable to inspect; zoom; show fix, DR, estimated uncertainty.
- Solver: Weighted least‑squares for multiple LOPs; show residuals per sight; allow include/exclude; compute error ellipse and 95% radius.
- Logs/Export: Sight library and Fix records; copy‑friendly summaries; CSV export of sights/fixes (no PDF).

### Additional Inputs (position‑fixing)
- Hs (sextant altitude), limb, IE, HE (height of eye), pressure, temperature, body/limb selection; optional: estimated visibility quality.

### Derived Fields
- Ho, Hc, Zn, Intercept (NM, T/A), LOP timestamp; Fix: lat/lon, method, included sights, residuals, uncertainty.

## Calculations
- True Azimuth (T_az): From lat, lon, UTC, body (Sun/stars) via standard spherical astro; Meeus-based algorithms.
- Sun Amplitude: sin A = sin(dec) / cos(lat), with refraction/SD tweak near horizon; convert to true bearing by quadrant.
- Gyro Error: GE = wrap180(G_body − T_az); present magnitude with W/E sign (W positive).
- True Gyro (vessel): True_gyro = PGC − GE (respecting sign convention).
- Magnetic (vessel): M = True_gyro − Var (Var east positive).
- Deviation: Dev = M − PSC (east positive). If PSC omitted, Dev not computed.
- Utilities: wrap360(angle), wrap180(diff); roundToTenth for display.

### Position‑Fixing Algorithms
- Greenwich/Sidereal Time: Compute GST, LST; GHA and Dec for Sun, Moon, planets, and stars; ΔT model onboard.
- Sight Reduction: Given DR/assumed lat/lon, compute Hc and Zn; Intercept a = Ho − Hc; plot perpendicular to Zn through AP.
- Corrections: Bennett/Saubert refraction; dip from HE; SD and HP from ephemerides; parallax (lunar horizontal parallax), limb selection; temperature/pressure corrections with defaults.
- LAN: Meridian passage time from EOT and longitude; φ from meridian altitude with declination sign; ex‑meridian correction for timing offset.
- Polaris: Standard NAV approximation using Polaris RA/Dec and LHA Aries to correct for offset from true pole.
- Fix Solver: Intersection of two LOPs; weighted least‑squares for 3+; propagate DR between sights for running fix.

## UX & Screens
- Home: “Sun Azimuth”, “Sun Amplitude”, “Star Azimuth”. Night mode toggle/brightness shortcut.
- Entry: Lat, Lon, UTC (auto with manual confirm), Body, Observed Gyro Bearing, PGC, PSC, Variation with “Auto (WMM)” checkbox, optional free-text fields.
- Result Card: Large T_az, G_body, GE; then heading chain (PGC → True Gyro → Magnetic → PSC/Deviation). One-tap “Copy Row” that matches the template order.
- Log List: Chronological list of saved results with filters (date/body/method); tap any to copy again; no PDF export.
- Settings: Auto Variation default (on), units/precision, sign convention display (fixed), manage star list visibility, red night theme intensity.

## Design Principles & Visual Style
- Minimal taps, maximal clarity: primary flows complete in 3–4 inputs.
- Typographic hierarchy first: big numeric readouts, clear labels, subtle chrome.
- Night-first aesthetic: high-contrast red-on-dark theme with quick brightness slider.
- Color system: subdued neutrals for UI, semantic accents only for status.
  - Light: background #0B0C10, cards #15171C, text #EAECEF, dim text #9AA3AE.
  - Night Red: primary #FF3B30 (iOS red) or #FF453A; warn #FF8A80; success #34C759.
  - Daylight variant (optional): background #FFFFFF, text #0B0C10; still low-chrome.
- Typography: San-serif with tabular figures for numbers (SF Pro Text/Inter with `fontFeatures: ['tnum']`).
- Iconography: Thin, simple outline icons; limited set (home, sun, star, log, settings).
- Haptics: Light tap on compute/save; warning haptics for outliers (non-blocking).

## Navigation & Layout
- Bottom tab bar: Home, Log, Settings. Home contains the three primary actions.
- Single-screen wizards: Entry collapses into sections; compute result anchors at bottom.
- Sticky action bar: “Compute” button docked; shows live validity as inputs change.
- Result-first: After compute, show large GE, G, T, with color-coded W/E tag; secondary chain (PGC→True→Mag→PSC) below.
- Copy affordance: Persistent “Copy Row” button; toast confirms copied.
- Large touch targets: 48–56 px minimum; one-handed reach zones prioritized.

## Components & Patterns
- Keypad input sheets for bearings and headings (deg/decimals); quick +/- buttons for 0.1° steps.
- Lat/Lon picker: decimal degrees with hemisphere toggle; optional “use current GPS” chip.
- Date/Time: UTC-only picker; “Use device UTC” one-tap chip with confirmation.
- Body selector: big chips (Sun, key stars) with search when expanded.
- Variation field: pill with “Auto (WMM)” toggle inline; expands to manual entry on disable.
- Warning banners: inline, quiet; never block; tap to learn more.
- Cards: elevation 0–1; rounded 12–16; separators via subtle alpha lines, not heavy borders.

## Accessibility & Motion
- Contrast: meet WCAG AA in both day and night modes; numeric readouts 7:1 target.
- Dynamic Type: scale typography up to 120% gracefully; wrap numeric blocks.
- Motion: fast, subtle (150–200ms); respect “Reduce Motion” and “Reduce Transparency”.
- VoiceOver: labels with units (e.g., “Gyro Error, one point two degrees West”).
- Localization-ready: fixed decimal point in inputs; explicit degree symbols.

## Usability & UI Milestones
- UI Sprint A: Design tokens (color/typography/spacing), base components (buttons, inputs, cards), dark/night variants.
- UI Sprint B: Entry flow polish (keypad sheets, body selector, variation toggle), compute/result transitions, haptics.
- UI Sprint C: Log list UX (filters, copy states), empty states, error/warning language.
- Design QA: Tap target audit, contrast audit, VoiceOver pass, nighttime brightness ergonomics.

## Data Model (core)
- Sight: id, utc, lat, lon, method(azimuth|amplitude), body, G_body, T_az, GE, PGC, TrueGyro, Var, Magnetic, PSC, Dev,
  repeaterLocation, initials, remarks, signature, flags (e.g., low-altitude warning), algoVersion.
- App Settings: autoVariation(bool), precision(0.1°), theme(night), lastDR, lastBody.

## Architecture & Tech
- Stack: Flutter (Dart) single codebase; iOS and Android.
- Storage: `sqflite` for sights/log; shared prefs for settings.
- Packages: `vector_math` (math), `clipboard`/`flutter_clipboard_manager` (copy), `timezone`/`intl` (UTC handling),
  custom WMM module (bundled coefficients), and custom ephemeris module for Sun/stars.
- State: Provider/Riverpod for lightweight state; pure functions for all calculations with tests.
- Permissions: Optional location (to prefill DR); otherwise manual. No analytics.

## Accuracy Targets
- GE workflow (Sun/Star azimuths): ≤0.5° end-to-end with typical inputs.
- Sun amplitudes near horizon: ≤0.5–0.7° with refraction/SD tweak.
- Variation (WMM): as per WMM spec for given epoch; display model year.

## Validation & Tests
- Deterministic unit tests for: azimuths at varied lat/dec; sunrise/sunset amplitudes; sign logic (G_body vs T_az);
  Var/Dev chain; angle normalization; rounding to 0.1°.
- Golden datasets: Cross-check against Nautical Almanac examples and independent calculators.
- Device QA: Older iPhones + rugged Androids; locale/decimal; time source confirmation.

## Milestones
- Sprint 0: Project skeleton, settings, data models, base UI theme (including night mode).
- Sprint 1: Sun azimuth + amplitude modules, WMM auto variation (with override), GE logic, Result Card, Log save, Copy Row.
- Sprint 2: Star azimuths (major stars), Log list filters, Settings polish, warnings (non-blocking), input validations.
- Sprint 3: Performance/cache (ephemerides), accessibility, haptics, beta build and sea trials feedback.
- Sprint 4: Sight reduction core (Hs→Ho corrections; Hc/Zn; intercept), Polaris latitude, LAN time tool and Latitude by LAN.
- Sprint 5: Two‑body and three‑star fixes, DR propagation and running fix, plotter with LOP drawing and basic intersection solver.
- Sprint 6: Star finder, Moon/planet sights with full parallax/SD, weighted least‑squares solver with residuals/uncertainty, fix logs and copy export.

## Risks & Mitigations
- Time accuracy: Prompt UTC confirmation; show device UTC; allow manual edit.
- Low-altitude angles: Warn when amplitude used outside sensible altitudes; allow override.
- WMM drift/epoch: Bundle current model; note epoch; allow manual Var override.
- Sign confusion: Always show both numeric and E/W text; tests lock behavior.
- Localization/formatting: Force decimal point in UI; explicit degree symbols; leading zeros.

## Privacy & Safety
- Offline by default; no analytics. Data stays on device unless the user copies/exports.
- Optional GPS strictly for DR prefill; app works fully without it.
- Clear disclaimer: Not a sole means of navigation.

## Copy Example (formatted)
- Date: 2025-03-15
- Time (UTC): 12:34:50
- Observed Bearing: 123.4°
- GE: 1.2° W
- True Celestial Azimuth: 122.2°
- Per Gyro Compass (P.G.C): 090.0°
- True Gyro: 088.8°
- Variation: 7.5° W
- Magnetic Compass: 096.3°
- Deviation: 1.0° E
- Per Standard Compass (P.S.C): 095.3°
- Body: Sun
- Location of Repeater: Wheelhouse
- Initials: AB
- Remarks: Clear horizon, 3-shot avg
- Signature: [initials/sign]

Notes: With Var East positive, Var(7.5 W) = −7.5. GE West is positive; True Gyro = PGC − GE.

## Open Questions
- Confirm final major stars list (above OK?).
- Amplitude guardrails: show advisory when Sun altitude > ~5°? (still allow).
- Default for Auto Variation: ON at first launch (current plan); confirm.
- Deviation table import (per heading) planned for a later milestone?
- Any preferred wording tweaks for the copy template fields?
