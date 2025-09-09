import 'dart:math' as math;

import '../angles.dart';

// Utilities
double _deg2rad(double d) => d * math.pi / 180.0;
double _rad2deg(double r) => r * 180.0 / math.pi;

// Julian Day (UTC)
double _julianDay(DateTime utc) {
  // Ensure UTC
  final d = utc.toUtc();
  final year = d.year;
  final month = d.month;
  final day = d.day;
  final hour = d.hour + d.minute / 60 + d.second / 3600 + d.millisecond / 3.6e6 + d.microsecond / 3.6e9;

  int Y = year;
  int M = month;
  if (M <= 2) {
    Y -= 1;
    M += 12;
  }
  final A = (Y / 100).floor();
  final B = 2 - A + (A / 4).floor();
  final jd0 = (365.25 * (Y + 4716)).floor() + (30.6001 * (M + 1)).floor() + day + B - 1524.5;
  return jd0 + hour / 24.0;
}

// Greenwich Mean Sidereal Time in degrees
double _gmstDeg(double jd) {
  final T = (jd - 2451545.0) / 36525.0;
  final gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000.0;
  return wrap360(gmst);
}

// Mean obliquity of the ecliptic in degrees (IAU 2006 approximation)
double _meanObliquityDeg(double T) {
  // seconds of arc
  final seconds = 21.448 - T * (46.8150 + T * (0.00059 - T * 0.001813));
  return 23.0 + 26.0 / 60.0 + seconds / 3600.0;
}

class _SunEq {
  final double raRad; // right ascension (radians)
  final double decRad; // declination (radians)
  _SunEq(this.raRad, this.decRad);
}

// Compute apparent Sun RA/Dec (Meeus simplified), good to <0.01° for our needs
_SunEq _sunEquatorial(DateTime utc) {
  final jd = _julianDay(utc);
  final T = (jd - 2451545.0) / 36525.0;

  // Geometric mean longitude (deg) and anomaly (deg)
  final L0 = wrap360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  final M = wrap360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  final Mrad = _deg2rad(M);

  // Eccentricity
  final e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;

  // Equation of center
  final C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * math.sin(Mrad) +
      (0.019993 - 0.000101 * T) * math.sin(2 * Mrad) + 0.000289 * math.sin(3 * Mrad);

  // True longitude and apparent longitude
  final trueLon = L0 + C; // deg
  final Omega = 125.04 - 1934.136 * T; // deg
  final lambda = trueLon - 0.00569 - 0.00478 * math.sin(_deg2rad(Omega)); // deg, apparent

  // Obliquity
  final eps0 = _meanObliquityDeg(T);
  final eps = eps0 + 0.00256 * math.cos(_deg2rad(Omega)); // deg

  final lam = _deg2rad(lambda);
  final epsRad = _deg2rad(eps);

  // RA/Dec
  final sinLam = math.sin(lam);
  final cosLam = math.cos(lam);
  final tanRAy = math.cos(epsRad) * sinLam;
  final tanRAx = cosLam;
  final ra = math.atan2(tanRAy, tanRAx); // rad, range -pi..pi
  final dec = math.asin(math.sin(epsRad) * sinLam); // rad

  return _SunEq(ra, dec);
}

double sunDeclinationDeg(DateTime utc) => _rad2deg(_sunEquatorial(utc).decRad);

// Compute true azimuth of the Sun at observer position/time. Bearing from true north, 0..360°.
double sunAzimuthDeg({
  required DateTime utc,
  required double latDeg,
  required double lonDeg,
}) {
  final jd = _julianDay(utc);
  final eq = _sunEquatorial(utc);

  final gmst = _gmstDeg(jd);
  final lstDeg = wrap360(gmst + lonDeg);
  final raDeg = _rad2deg(eq.raRad);

  // Hour angle H (deg), convert to radians
  double Hdeg = wrap180(lstDeg - raDeg);
  final H = _deg2rad(Hdeg);

  final phi = _deg2rad(latDeg);
  final dec = eq.decRad;

  // Altitude
  final sinAlt = math.sin(phi) * math.sin(dec) + math.cos(phi) * math.cos(dec) * math.cos(H);
  final alt = math.asin(sinAlt);

  // Azimuth from north (0..360). Use NOAA formula with quadrant via sin(H).
  double cosAz = (math.sin(dec) - math.sin(phi) * math.sin(alt)) / (math.cos(phi) * math.cos(alt));
  // Clamp numerical noise
  if (cosAz > 1) cosAz = 1;
  if (cosAz < -1) cosAz = -1;
  double Az = _rad2deg(math.acos(cosAz));
  if (math.sin(H) > 0) Az = 360.0 - Az;
  return wrap360(Az);
}

