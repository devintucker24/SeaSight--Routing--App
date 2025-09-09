import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/services.dart' show rootBundle;

// WMM model loader and evaluator. Supports parsing a WMM .COF text file
// bundled as an asset (e.g., assets/wmm/WMM.COF). Falls back to null if not found.

class WmmModel {
  static final WmmModel instance = WmmModel._();
  WmmModel._();

  bool _loaded = false;
  double? _epoch; // e.g., 2025.0
  double? _validTo; // e.g., 2030.0
  int _nmax = 0;
  // Coefficients indexed [n][m]
  late List<List<double>> _g;
  late List<List<double>> _h;
  late List<List<double>> _gDot;
  late List<List<double>> _hDot;

  Future<void> tryLoadFromAsset([String path = 'assets/wmm/WMM.COF']) async {
    if (_loaded) return;
    String text;
    try {
      text = await rootBundle.loadString(path);
    } catch (_) {
      return;
    }
    _parseCof(text);
    if (_nmax >= 1) {
      _loaded = true;
    }
  }

  bool get isLoaded => _loaded;
  double? get epoch => _loaded ? _epoch : null;
  double? get validTo => _loaded ? _validTo : null;

  void _parseCof(String text) {
    final lines = text.split(RegExp(r'\r?\n'));
    // Parse epoch line (common forms):
    // 1) "2025.0 2030.0 ..." (two floats)
    // 2) "2025.0  WMM-2025  11/13/2024" (single float then text/date)
    bool epochFound = false;
    for (final line in lines) {
      final parts = line.trim().split(RegExp(r'\s+'));
      if (parts.isEmpty) continue;
      // Form 1: two leading floats
      if (parts.length >= 2 && parts[0].contains('.') && parts[1].contains('.') &&
          double.tryParse(parts[0]) != null && double.tryParse(parts[1]) != null) {
        _epoch = double.parse(parts[0]);
        _validTo = double.parse(parts[1]);
        epochFound = true;
        break;
      }
      // Form 2: first token is a float, second is not numeric → infer validTo = epoch + 5
      if (!epochFound && double.tryParse(parts[0]) != null && parts[0].contains('.')) {
        // If the second token is not numeric, treat first as epoch
        if (parts.length == 1 || double.tryParse(parts[1]) == null) {
          _epoch = double.parse(parts[0]);
          _validTo = (_epoch ?? 0) + 5.0;
          epochFound = true;
          break;
        }
      }
    }
    // Collect coefficient rows: n m gnm hnm gDot hDot
    final rows = <List<double>>[];
    for (final line in lines) {
      final p = line.trim().split(RegExp(r'\s+'));
      if (p.length >= 6 && p.every(_isNum)) {
        final n = int.parse(p[0]);
        final m = int.parse(p[1]);
        final g = double.parse(p[2]);
        final h = double.parse(p[3]);
        final gDot = double.parse(p[4]);
        final hDot = double.parse(p[5]);
        rows.add([n.toDouble(), m.toDouble(), g, h, gDot, hDot]);
        if (n > _nmax) _nmax = n;
      }
    }
    _g = List.generate(_nmax + 1, (_) => List.filled(_nmax + 1, 0.0));
    _h = List.generate(_nmax + 1, (_) => List.filled(_nmax + 1, 0.0));
    _gDot = List.generate(_nmax + 1, (_) => List.filled(_nmax + 1, 0.0));
    _hDot = List.generate(_nmax + 1, (_) => List.filled(_nmax + 1, 0.0));
    for (final r in rows) {
      final n = r[0].toInt();
      final m = r[1].toInt();
      _g[n][m] = r[2];
      _h[n][m] = r[3];
      _gDot[n][m] = r[4];
      _hDot[n][m] = r[5];
    }
  }

  // Compute declination (variation) in degrees East-positive at sea level.
  // Based on WMM spherical harmonic evaluation (no altitude, sea-level approximation).
  double? declination({required double latDeg, required double lonDeg, required DateTime date}) {
    if (!_loaded) return null;
    final epochVal = _epoch ?? date.toUtc().year.toDouble();
    final tYears = (date.toUtc().year + date.toUtc().month / 12.0 + date.toUtc().day / 365.25) - epochVal;
    final phi = latDeg * math.pi / 180.0;
    final lambda = lonDeg * math.pi / 180.0;

    // Geocentric colatitude (approx) from geodetic lat
    const a = 6378.137; // km
    const b = 6356.7523142; // km
    final u = math.atan((b * b) / (a * a) * math.tan(phi));
    final theta = math.pi / 2 - u; // colatitude

    final cosTheta = math.cos(theta);
    final sinTheta = math.sin(theta);

    // Precompute cos(m*lambda), sin(m*lambda)
    final cosML = List<double>.filled(_nmax + 1, 0.0);
    final sinML = List<double>.filled(_nmax + 1, 0.0);
    cosML[0] = 1.0;
    sinML[0] = 0.0;
    cosML[1] = math.cos(lambda);
    sinML[1] = math.sin(lambda);
    for (int m = 2; m <= _nmax; m++) {
      cosML[m] = cosML[m - 1] * cosML[1] - sinML[m - 1] * sinML[1];
      sinML[m] = sinML[m - 1] * cosML[1] + cosML[m - 1] * sinML[1];
    }

    // Schmidt quasi-normalized associated Legendre polynomials P and dP/dtheta
    final P = List.generate(_nmax + 1, (_) => List<double>.filled(_nmax + 1, 0.0));
    final dP = List.generate(_nmax + 1, (_) => List<double>.filled(_nmax + 1, 0.0));

    P[0][0] = 1.0;
    dP[0][0] = 0.0;
    for (int n = 1; n <= _nmax; n++) {
      P[n][0] = ((2 * n - 1) * cosTheta * P[n - 1][0] - (n - 1) * P[n - 2 < 0 ? 0 : n - 2][0]) / n;
    }
    for (int n = 1; n <= _nmax; n++) {
      for (int m = 1; m <= n; m++) {
        if (n == m) {
          P[n][m] = sinTheta * P[n - 1][m - 1] * math.sqrt(1.0 + 1.0 / (2 * m));
        } else if (n > 1 && m == n - 1) {
          P[n][m] = cosTheta * (2 * n - 1) / math.sqrt(n * n - m * m) * P[n - 1][m];
        } else if (n > 1 && m < n - 1) {
          P[n][m] = ((2 * n - 1) * cosTheta / math.sqrt(n * n - m * m)) * P[n - 1][m] -
              (math.sqrt(((n - 1) * (n - 1) - m * m) / (n * n - m * m))) * P[n - 2][m];
        }
      }
    }
    // dP/dtheta via recurrence (approx):
    for (int n = 1; n <= _nmax; n++) {
      dP[n][0] = (n * (cosTheta * P[n][0] - P[n - 1][0])) / sinTheta;
      for (int m = 1; m <= n; m++) {
        dP[n][m] = (n * cosTheta * P[n][m] - math.sqrt((n - m) * (n + m).toDouble()) * P[n - 1][m]) / sinTheta;
      }
    }

    // Time-update coefficients
    double Br = 0.0, Btheta = 0.0, Bphi = 0.0;
    for (int n = 1; n <= _nmax; n++) {
      final fn = math.pow(1.0 / 6371.2, n + 2).toDouble(); // simple radius scaling at sea level
      for (int m = 0; m <= n; m++) {
        final gnm = _g[n][m] + _gDot[n][m] * tYears;
        final hnm = _h[n][m] + _hDot[n][m] * tYears;
        final cosml = cosML[m];
        final sinml = sinML[m];
        final tmp = gnm * cosml + hnm * sinml;
        Br += fn * (n + 1) * tmp * P[n][m];
        Btheta -= fn * tmp * dP[n][m];
        if (m > 0) {
          final tmps = (gnm * sinml - hnm * cosml) * P[n][m] * m;
          Bphi += fn * tmps / sinTheta;
        }
      }
    }

    // Local components: X (north), Y (east)
    final X = -Btheta;
    final Y = Bphi;
    final D = math.atan2(Y, X); // radians, East positive
    return D * 180.0 / math.pi;
  }

  bool _isNum(String s) {
    return double.tryParse(s) != null || (s.startsWith('-') && double.tryParse(s.substring(1)) != null);
  }
}
