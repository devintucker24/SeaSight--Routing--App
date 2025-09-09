import 'angles.dart';

class GyroErrorResult {
  final double value; // signed, W positive
  GyroErrorResult(this.value);
  double get magnitude => value.abs();
  String get label => value >= 0 ? 'W' : 'E';
}

// GE = G_body − T_az (W positive)
GyroErrorResult computeGyroErrorWestPositive(double gBodyDeg, double tAzDeg) {
  final diff = wrap180(gBodyDeg - tAzDeg);
  return GyroErrorResult(diff);
}

