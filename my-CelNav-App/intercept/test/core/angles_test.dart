import 'package:flutter_test/flutter_test.dart';
import 'package:intercept/core/angles.dart';
import 'package:intercept/core/ge.dart';

void main() {
  test('wrap360', () {
    expect(wrap360(370), 10);
    expect(wrap360(-10), 350);
  });

  test('wrap180', () {
    expect(wrap180(190), -170);
    expect(wrap180(-190), 170);
  });

  test('GE West positive', () {
    // G 123.4, T 122.2 → GE +1.2 W
    final ge = computeGyroErrorWestPositive(123.4, 122.2);
    expect(ge.value, closeTo(1.2, 1e-9));
    expect(ge.label, 'W');

    // G 121.0, T 122.2 → GE -1.2 E
    final ge2 = computeGyroErrorWestPositive(121.0, 122.2);
    expect(ge2.value, closeTo(-1.2, 1e-9));
    expect(ge2.label, 'E');
  });
}

