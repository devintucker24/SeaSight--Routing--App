# Intercept — User Documentation

## Overview
- Purpose: Fast, reliable Gyro Error checks using Sun/Star azimuths and Sun amplitudes, with copy‑ready output for Compass Log books.
- Offline: All calculations run on‑device; Variation can be auto‑computed offline.
- Platforms: iOS (primary), Android supported.

## Quick Start
- Open the app and choose a method: Sun Azimuth, Sun Amplitude, or Star Azimuth.
- Enter position, time, and bearings.
- Tap Compute to see Gyro Error and a log‑ready summary.
- Tap Copy Row to copy the formatted results into your Compass Log.

## Gyro Error Workflows
- Sun/Star Azimuth
  - Select body (Sun or a major star).
  - Enter Latitude/Longitude (deg + minutes with N/S and E/W).
  - Set Time (UTC) via pickers or Use now (UTC).
  - Enter Observed Gyro Bearing to the body.
  - Optional: Enter PGC (vessel gyro heading) and PSC (standard compass heading) to complete the chain.
  - Variation: Leave Auto Variation (WMM) ON for automatic declination; toggle OFF to enter manually.
- Sun Amplitude
  - Same as above, but use Sun near the horizon at sunrise/sunset.
  - The app computes the true bearing from amplitude (with correct quadrant) and then GE.

## Inputs
- Latitude/Longitude: Enter Deg and Min, then pick N/S or E/W.
- Time (UTC): Date and Time pickers in UTC, or Use now (UTC).
- Observed Gyro Bearing to body (G_body): Bearing on the gyro repeater to the observed body.
- PGC (vessel gyro heading): Optional; used to compute True Gyro and onward.
- PSC (standard compass heading): Optional; used to compute Deviation.
- Variation: Auto (recommended) or Manual (East positive numerically; shows E/W label in output).
- Optional metadata: Body, Location of Repeater (free text), Initials, Remarks, Signature.

## Calculations
- True Celestial Azimuth (T_az)
  - Sun: Meeus‑based ephemerides → RA/Dec → local sidereal time → hour angle → true azimuth (from true north, 0–360°).
  - Stars: Major stars list (phase‑in) uses fixed RA/Dec with proper motion applied.
- Sun Amplitude
  - Formula: sin A = sin(dec) / cos(lat); convert amplitude to true bearing near the horizon with correct sunrise/sunset quadrant.
- Gyro Error (GE)
  - Definition: GE = G_body − T_az, West positive. If GE > 0 → “W”, GE < 0 → “E”.
- Heading Chain
  - True Gyro: True_gyro = PGC − GE (W positive).
  - Magnetic: M = True_gyro − Variation (East positive numerically).
  - Deviation: Dev = M − PSC (East positive numerically).
- Angle Handling
  - Bearings normalized to 0–359.9°; differences wrapped to −180…+180°.
  - Display precision 0.1°; full precision retained internally.

## Output (copy‑ready)
- Order matches typical Compass Log columns:
  - Date
  - Time (UTC)
  - Observed Bearing
  - GE
  - True Celestial Azimuth
  - Per Gyro Compass (P.G.C)
  - True Gyro
  - Variation
  - Magnetic Compass
  - Deviation
  - Per Standard Compass (P.S.C)
  - Body
  - Location of Repeater
  - Initials
  - Remarks
  - Signature
- Copy: One‑tap Copy Row produces plain text suitable for pasting into your log. CSV export can be added later if needed.

## Variation (WMM)
- Auto Variation (recommended): Computes magnetic declination from Latitude, Longitude, and Date using the World Magnetic Model (WMM) if present; otherwise, a coarse fallback (dipole) is used.
- Manual override: Toggle Auto Variation OFF to enter Variation yourself. Enter East positive numbers; the app labels E/W for clarity.

### What Is WMM?
- The World Magnetic Model is a spherical-harmonic model of Earth’s magnetic field, maintained by NOAA/NCEI and the UK Defence Geographic Centre for navigation use.
- It provides Gauss coefficients up to degree and order N=12 for a five‑year “epoch” (e.g., 2025.0 → valid until ~2030.0), plus annual secular‑variation rates to propagate within the epoch.
- From these coefficients, you can compute magnetic declination (variation), inclination, and field strength at a given latitude, longitude, date, and altitude.

### Data Source and File Format
- The model is distributed as a plain‑text coefficient file (.COF). Intercept looks for `assets/wmm/WMM.COF` in the app bundle.
- File contents include:
  - Header line(s) with the model epoch (e.g., `2025.0`) and end of validity (e.g., `2030.0`).
  - Rows of six numbers: `n  m  gnm  hnm  ġnm  ḣnm`, where n,m are degree/order, `gnm/hnm` are Gauss coefficients (nanoTesla), and `ġnm/ḣnm` their annual change.

### How Intercept Computes Variation
1. Load coefficients: The app parses WMM.COF on startup (if present). If missing/invalid, it falls back to a dipole‑only approximation.
2. Time update: For the requested date, it linearly updates coefficients: `g(t) = g0 + ġ*(t − epoch)` and same for `h`.
3. Position handling: Converts geodetic latitude to geocentric colatitude (uses WGS‑84 ellipsoid) for field evaluation near sea level.
4. Field evaluation: Computes Schmidt quasi‑normalized associated Legendre polynomials Pn,m(θ) and their derivatives; evaluates spherical‑harmonic sums to obtain field components in spherical coords: `Br, Bθ, Bφ`.
5. Local components: Transforms to local North/East/Down components: `X (north) = −Bθ`, `Y (east) = Bφ`.
6. Declination (Variation): `D = atan2(Y, X)` in radians → degrees; East positive numerically. Display includes “E/W”.

Notes
- Sea‑level assumption: For mariners, altitude ≈ 0 m; declination is largely insensitive to small altitude changes at sea level. (Altitude support can be added later.)
- Validity window: Accuracy is best within the model’s five‑year epoch. Outside the window, errors can grow as secular variation diverges.
- Fallback behavior: If no WMM.COF is found, Intercept uses a first‑degree (dipole) approximation (IGRF‑13, 2020). Expect errors of a few degrees; it’s intended as a temporary fallback only.

### Expected Accuracy
- With WMM.COF: Typical declination uncertainty is ≲0.2° near the epoch, increasing over years and in magnetically complex regions (e.g., high latitudes, South Atlantic Anomaly).
- With fallback dipole: Often within 2–5° of true declination; do not rely on for precise work.

### Verifying Accuracy
To confirm Intercept’s variation values:
1. Ensure WMM is installed: Place the official WMM .COF file at `assets/wmm/WMM.COF`, then rebuild/run the app. (Developers: `flutter clean && flutter pub get`.)
2. Pick test points (examples):
   - 51.5°N, 0.0° (London);
   - 40.7°N, 74.0°W (New York);
   - 34.0°S, 18.5°E (Cape Town);
   - 0°, 0° (Gulf of Guinea);
   - 60°N, 150°W (Alaska); 60°S, 60°W (South Atlantic).
3. Use a trusted calculator (NOAA/NCEI or BGS WMM) with the same date and altitude (sea level) and compare declination.
4. Intercept should match within the published WMM uncertainty (typically a few tenths of a degree near epoch). If not, verify:
   - Correct hemispheres and coordinates; 
   - Date/time; 
   - That WMM.COF is recognized (planned: Settings will display model epoch/valid‑to).

### Updating the Model
- WMM updates every five years. To update Intercept:
  - Replace `assets/wmm/WMM.COF` with the new official file (e.g., WMM‑2030 when released).
  - Rebuild the app; the loader auto‑detects the new epoch and coefficients.

## Coordinate Entry
- Enter degrees and minutes, then pick hemisphere:
  - Latitude: 0–90° Deg, 0–59.9′ Min, N/S selector.
  - Longitude: 0–180° Deg, 0–59.9′ Min, E/W selector.
- The app converts to decimal degrees internally with the correct sign.

## Best Practices
- Sun Amplitude: Use within a few degrees of the horizon; a clean horizon improves accuracy.
- Time: Confirm UTC when entering manually; consider using Use now (UTC) when appropriate.
- Averaging: Take multiple bearings and average for stability; note conditions in Remarks.
- Sanity check: Large GE magnitudes prompt a gentle warning; verify inputs and horizon quality.

## Troubleshooting
- No Variation shown: Ensure Auto Variation is ON and Latitude/Longitude are entered. For maximum accuracy, install the WMM file in the app bundle (developers).
- Results look off:
  - Confirm body selection and time (UTC).
  - Verify hemispheres (N/S, E/W) and Deg/Min.
  - For amplitude, ensure the Sun is near the horizon and the correct sunrise/sunset quadrant is implied by time.
- Simulator only: Gyro/PSC entries can be any numbers for testing; real use requires shipboard readings.

## Privacy & Safety
- Offline by default: No network required for core use; data stays on the device unless copied.
- Optional location: Can be used to prefill DR; not required for calculations.
- Disclaimer: Not a sole means of navigation. Verify results and maintain conventional navigation practices.

## Roadmap (position fixing)
- Polaris latitude; Noon Sun (LAN) and Latitude by LAN; Sun‑run‑Sun (running fix); two‑ and three‑body fixes; ex‑meridian.
- Star Finder (best stars at current time and location).
- Plotting of LOPs and least‑squares fixes with residuals.
- Enhanced ephemerides for Moon and planets (with parallax/SD/HP).

## Version & Model Info
- App name: Intercept — Celestial Gyro & Fix
- GE convention: West positive (GE = G − T_az)
- Variation convention: East positive numerically
- WMM: Model and epoch displayed in Settings (planned)
