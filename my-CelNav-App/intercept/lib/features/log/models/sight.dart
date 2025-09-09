class SightRecord {
  final String id;
  final DateTime utc;
  final double lat;
  final double lon;
  final String method; // azimuth|amplitude
  final String body;
  final double gBody;
  final double tAz;
  final double ge; // W positive
  final double? pgc;
  final double? trueGyro;
  final double? variation;
  final double? magnetic;
  final double? psc;
  final double? deviation;
  final String? repeaterLocation;
  final String? initials;
  final String? remarks;

  SightRecord({
    required this.id,
    required this.utc,
    required this.lat,
    required this.lon,
    required this.method,
    required this.body,
    required this.gBody,
    required this.tAz,
    required this.ge,
    this.pgc,
    this.trueGyro,
    this.variation,
    this.magnetic,
    this.psc,
    this.deviation,
    this.repeaterLocation,
    this.initials,
    this.remarks,
  });
}

