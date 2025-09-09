import 'sun.dart';

// Compute true azimuth of a body (Sun/major stars) from observer location and UTC.
// Currently implements Sun; stars remain to be added.
double computeTrueAzimuth({
  required double latDeg,
  required double lonDeg,
  required DateTime utc,
  required String body,
}) {
  if (body.toLowerCase() == 'sun') {
    return sunAzimuthDeg(utc: utc, latDeg: latDeg, lonDeg: lonDeg);
  }
  // TODO: implement major stars
  return 122.2; // placeholder for stars for now
}
