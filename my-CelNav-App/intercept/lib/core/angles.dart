double wrap360(double x) {
  final v = x % 360.0;
  return v < 0 ? v + 360.0 : v;
}

double wrap180(double x) {
  var v = x % 360.0;
  if (v <= -180) v += 360;
  if (v > 180) v -= 360;
  return v;
}

double roundTenth(double x) => (x * 10).round() / 10.0;

