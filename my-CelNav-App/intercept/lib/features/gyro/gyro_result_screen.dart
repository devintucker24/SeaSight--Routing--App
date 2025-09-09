import 'package:flutter/material.dart';
import 'dart:ui';
import '../../core/angles.dart';
import '../../core/ge.dart';
import '../../core/astro/azimuth.dart';
import '../../core/astro/sun.dart';
import '../../core/astro/amplitude.dart';
import '../../core/wmm/wmm.dart';
import 'gyro_entry_screen.dart';

class GyroResultScreen extends StatelessWidget {
  final GyroParams params;
  const GyroResultScreen({super.key, required this.params});

  @override
  Widget build(BuildContext context) {
    final lat = params.latDeg ?? 0;
    final lon = params.lonDeg ?? 0;
    final when = DateTime.tryParse(params.utcIso)?.toUtc() ?? DateTime.now().toUtc();

    double tAz;
    if (params.method == 'sun_amplitude') {
      final dec = sunDeclinationDeg(when);
      // Heuristic: if time is after local noon, treat as sunset; else sunrise
      final lstGuess = ((lon / 15.0) + when.hour + when.minute / 60.0) % 24.0;
      final isSunset = lstGuess > 12.0; // rough, acceptable for choosing quadrant
      tAz = sunTrueAzimuthFromAmplitude(latDeg: lat, decDeg: dec, isSunset: isSunset);
    } else {
      tAz = computeTrueAzimuth(
        latDeg: lat,
        lonDeg: lon,
        utc: when,
        body: params.body,
      );
    }
    final gBody = params.gBodyDeg ?? 0;
    final ge = computeGyroErrorWestPositive(gBody, tAz);

    final pgc = params.pgcDeg;
    final trueGyro = pgc != null ? wrap360(pgc - ge.value) : null;
    double? variation = params.variationEPos;
    if (variation == null) {
      final v = computeVariationEPositive(latDeg: lat, lonDeg: lon, date: when);
      variation = v;
    }
    final magnetic = (trueGyro != null && variation != null) ? wrap360(trueGyro - variation) : null;
    final psc = params.pscDeg;
    final deviation = (magnetic != null && psc != null) ? wrap180(magnetic - psc) : null; // E positive numerically

    return Scaffold(
      appBar: AppBar(title: const Text('Result')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Gyro Error', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 8),
              _BigMetric(value: '${roundTenth(ge.magnitude)}° ${ge.label}', color: Colors.redAccent),
              const SizedBox(height: 16),
              _RowMetric(label: 'Observed Bearing', value: '${roundTenth(gBody)}°'),
              _RowMetric(label: 'True Celestial Azimuth', value: '${roundTenth(tAz)}°'),
              if (pgc != null) _RowMetric(label: 'Per Gyro Compass (PGC)', value: '${roundTenth(pgc)}°'),
              if (trueGyro != null) _RowMetric(label: 'True Gyro', value: '${roundTenth(trueGyro)}°'),
              if (variation != null)
                _RowMetric(label: 'Variation', value: '${roundTenth(variation.abs())}° ${variation >= 0 ? 'E' : 'W'}'),
              if (magnetic != null) _RowMetric(label: 'Magnetic Compass', value: '${roundTenth(magnetic)}°'),
              if (deviation != null)
                _RowMetric(label: 'Deviation', value: '${roundTenth(deviation.abs())}° ${deviation >= 0 ? 'E' : 'W'}'),
              if (psc != null) _RowMetric(label: 'Per Standard Compass (PSC)', value: '${roundTenth(psc)}°'),
              const Spacer(),
              SizedBox(
                height: 56,
                child: OutlinedButton(
                  onPressed: () {
                    final lines = <String>[
                      'Date: ${params.utcIso.split('T').first}',
                      'Time (UTC): ${params.utcIso.split('T').last}',
                      'Observed Bearing: ${roundTenth(gBody)}°',
                      'GE: ${roundTenth(ge.magnitude)}° ${ge.label}',
                      'True Celestial Azimuth: ${roundTenth(tAz)}°',
                      if (pgc != null) 'Per Gyro Compass (P.G.C): ${roundTenth(pgc)}°',
                      if (trueGyro != null) 'True Gyro: ${roundTenth(trueGyro)}°',
                      if (variation != null)
                        'Variation: ${roundTenth(variation.abs())}° ${variation >= 0 ? 'E' : 'W'}',
                      if (magnetic != null) 'Magnetic Compass: ${roundTenth(magnetic)}°',
                      if (deviation != null)
                        'Deviation: ${roundTenth(deviation.abs())}° ${deviation >= 0 ? 'E' : 'W'}',
                      if (psc != null) 'Per Standard Compass (P.S.C): ${roundTenth(psc)}°',
                      'Body: ${params.body}',
                      'Location of Repeater: ',
                      'Initials: ',
                      'Remarks: ',
                      'Signature: ',
                    ];
                    final text = lines.join('\n');
                    // Clipboard copy would go here (plugin not wired in stub)
                    showSnackBar(context, 'Result formatted. Long-press to copy later.');
                  },
                  child: const Text('Copy Row'),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }

  void showSnackBar(BuildContext context, String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }
}

class _BigMetric extends StatelessWidget {
  final String value;
  final Color color;
  const _BigMetric({required this.value, required this.color});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
      decoration: BoxDecoration(color: Theme.of(context).cardColor, borderRadius: BorderRadius.circular(12)),
      child: Text(value, style: Theme.of(context).textTheme.displayMedium!.copyWith(color: color)),
    );
  }
}

class _RowMetric extends StatelessWidget {
  final String label;
  final String value;
  const _RowMetric({required this.label, required this.value});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodySmall),
          Text(value, style: const TextStyle(fontFeatures: [FontFeature.tabularFigures()])),
        ],
      ),
    );
  }
}
