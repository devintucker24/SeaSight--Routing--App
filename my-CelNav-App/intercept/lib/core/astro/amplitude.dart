import 'dart:math' as math;
import '../angles.dart';

double _deg2rad(double d) => d * math.pi / 180.0;
double _rad2deg(double r) => r * 180.0 / math.pi;

// Compute true bearing from Sun amplitude near the horizon.
// Inputs:
// - latDeg: observer latitude
// - decDeg: Sun declination at sight time
// - isSunset: true if on western horizon, false if sunrise (east)
// Returns: true bearing (0..360°) from north, clockwise.
double sunTrueAzimuthFromAmplitude({
  required double latDeg,
  required double decDeg,
  required bool isSunset,
}) {
  final phi = _deg2rad(latDeg);
  final dec = _deg2rad(decDeg);

  // Amplitude A satisfies: sin A = sin(dec) / cos(phi)
  double s = math.sin(dec) / math.cos(phi);
  if (s > 1) s = 1; // clamp numerical edge
  if (s < -1) s = -1;
  final A = _rad2deg(math.asin(s)); // degrees, positive toward North, negative toward South
  final northOfHorizon = A >= 0; // north side vs south side

  double bearing;
  if (!isSunset) {
    // Sunrise near East (90°)
    bearing = northOfHorizon ? (90.0 - A.abs()) : (90.0 + A.abs());
  } else {
    // Sunset near West (270°)
    bearing = northOfHorizon ? (270.0 - A.abs()) : (270.0 + A.abs());
  }
  return wrap360(bearing);
}

