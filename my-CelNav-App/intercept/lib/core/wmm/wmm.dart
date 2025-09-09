// Offline magnetic declination (variation) approximation.
// This is a lightweight degree-1 spherical harmonic (dipole) model using
// IGRF-13 (2020.0) first-degree Gauss coefficients. It yields a coarse
// variation estimate (often within a few degrees). We’ll replace with a full
// WMM bundle later.

import 'dart:math' as math;
import 'wmm_model.dart';

double _deg2rad(double d) => d * math.pi / 180.0;
double _rad2deg(double r) => r * 180.0 / math.pi;

// Returns magnetic declination (variation) in degrees, East positive.
double? computeVariationEPositive({
  required double latDeg,
  required double lonDeg,
  required DateTime date,
}) {
  // Try full WMM if available
  final model = WmmModel.instance;
  // Fire-and-forget load; if not loaded yet, attempt now (sync completion not guaranteed)
  model.tryLoadFromAsset();
  final full = model.declination(latDeg: latDeg, lonDeg: lonDeg, date: date);
  if (full != null) return full;

  // Fallback: IGRF-13 (epoch 2020.0) degree-1 coefficients (nT)
  // Source: IAGA IGRF-13
  const g10 = -29404.8;
  const g11 = -1450.9;
  const h11 = 4652.5;

  // Geodetic → spherical approximation
  final theta = _deg2rad(90.0 - latDeg); // colatitude
  final phi = _deg2rad(lonDeg); // east-positive longitude

  final sinT = math.sin(theta);
  final cosT = math.cos(theta);
  final sinP = math.sin(phi);
  final cosP = math.cos(phi);

  // Spherical harmonic degree-1 field components (up to a scaling factor)
  final Br = -2.0 * (g10 * cosT + g11 * sinT * cosP + h11 * sinT * sinP);
  final Btheta = -(-g10 * sinT + g11 * cosT * cosP + h11 * cosT * sinP);
  final Bphi = (-g11 * sinP + h11 * cosP) * sinT;

  // Local components: X (north), Y (east), Z (down)
  final X = -Btheta;
  final Y = Bphi;
  // final Z = -Br; // unused here

  if (X == 0 && Y == 0) return 0.0;
  final D = math.atan2(Y, X); // radians, East positive
  return _rad2deg(D);
}
