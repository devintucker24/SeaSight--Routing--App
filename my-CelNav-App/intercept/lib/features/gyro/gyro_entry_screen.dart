import 'package:flutter/material.dart';
import 'gyro_result_screen.dart';
import 'package:intl/intl.dart';

class GyroEntryScreen extends StatefulWidget {
  final String method; // sun_azimuth | sun_amplitude | star_azimuth
  const GyroEntryScreen({super.key, required this.method});

  @override
  State<GyroEntryScreen> createState() => _GyroEntryScreenState();
}

class _GyroEntryScreenState extends State<GyroEntryScreen> {
  // Latitude/Longitude as degrees + minutes with hemisphere
  int? _latDeg;
  double? _latMin;
  String _latHem = 'N'; // N or S
  int? _lonDeg;
  double? _lonMin;
  String _lonHem = 'E'; // E or W
  DateTime _utc = DateTime.now().toUtc();
  final _gBody = TextEditingController();
  final _pgc = TextEditingController();
  final _psc = TextEditingController();
  final _var = TextEditingController();
  bool _autoVar = true;
  String _body = 'Sun';

  @override
  void dispose() {
    _gBody.dispose();
    _pgc.dispose();
    _psc.dispose();
    _var.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_titleFor(widget.method))),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              _coordPicker(
                context,
                label: 'Latitude',
                hemispheres: const ['N', 'S'],
                degreesMax: 90,
                hemValue: _latHem,
                onHemChange: (v) => setState(() => _latHem = v),
                onDegChange: (v) => setState(() => _latDeg = v),
                onMinChange: (v) => setState(() => _latMin = v),
              ),
              _coordPicker(
                context,
                label: 'Longitude',
                hemispheres: const ['E', 'W'],
                degreesMax: 180,
                hemValue: _lonHem,
                onHemChange: (v) => setState(() => _lonHem = v),
                onDegChange: (v) => setState(() => _lonDeg = v),
                onMinChange: (v) => setState(() => _lonMin = v),
              ),
              _utcPicker(context),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: _field('Observed Gyro Bearing to body (°)', _gBody, hint: '123.4')),
                ],
              ),
              const SizedBox(height: 12),
              _field('PGC (vessel gyro heading, °)', _pgc, hint: '090.0'),
              _field('PSC (vessel standard compass heading, °)', _psc, hint: '095.3'),
              const SizedBox(height: 12),
              SwitchListTile(
                value: _autoVar,
                onChanged: (v) => setState(() => _autoVar = v),
                title: const Text('Auto Variation (WMM)'),
                subtitle: const Text('Override to enter manually'),
              ),
              if (!_autoVar) _field('Variation (E+; use E/W in remarks)', _var, hint: 'e.g., -7.5 for 7.5°W'),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: FilledButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => GyroResultScreen(
                          params: GyroParams(
                            method: widget.method,
                            latDeg: _latDecimal(),
                            lonDeg: _lonDecimal(),
                            utcIso: _formatUtcIso(_utc),
                            body: _body,
                            gBodyDeg: double.tryParse(_gBody.text),
                            pgcDeg: double.tryParse(_pgc.text),
                            pscDeg: double.tryParse(_psc.text),
                            variationEPos: _autoVar ? null : double.tryParse(_var.text ?? ''),
                          ),
                        ),
                      ),
                    );
                  },
                  child: const Text('Compute'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _field(String label, TextEditingController c, {String? hint}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: TextField(
        controller: c,
        decoration: InputDecoration(labelText: label, hintText: hint),
        keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
      ),
    );
  }

  String _titleFor(String m) {
    switch (m) {
      case 'sun_amplitude':
        return 'Sun Amplitude';
      case 'star_azimuth':
        return 'Star Azimuth';
      default:
        return 'Sun Azimuth';
    }
  }

  Widget _utcPicker(BuildContext context) {
    final dateStr = DateFormat('yyyy-MM-dd').format(_utc);
    final timeStr = DateFormat('HH:mm:ss').format(_utc);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: _PickerTile(
                label: 'Date (UTC)',
                value: dateStr,
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: _utc,
                    firstDate: DateTime(2000),
                    lastDate: DateTime(2100),
                    helpText: 'Select UTC date',
                  );
                  if (picked != null) {
                    setState(() {
                      _utc = DateTime.utc(picked.year, picked.month, picked.day, _utc.hour, _utc.minute, _utc.second);
                    });
                  }
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _PickerTile(
                label: 'Time (UTC)',
                value: timeStr,
                onTap: () async {
                  final picked = await showTimePicker(
                    context: context,
                    initialTime: TimeOfDay(hour: _utc.hour, minute: _utc.minute),
                    helpText: 'Select UTC time',
                  );
                  if (picked != null) {
                    setState(() {
                      _utc = DateTime.utc(_utc.year, _utc.month, _utc.day, picked.hour, picked.minute, 0);
                    });
                  }
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: () => setState(() => _utc = DateTime.now().toUtc()),
            icon: const Icon(Icons.schedule),
            label: const Text('Use now (UTC)'),
          ),
        ),
      ],
    );
  }

  String _formatUtcIso(DateTime dt) {
    return DateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'").format(dt.toUtc());
  }

  double? _latDecimal() {
    if (_latDeg == null && _latMin == null) return null;
    final deg = (_latDeg ?? 0).clamp(0, 90);
    final min = (_latMin ?? 0).clamp(0.0, 59.9999);
    final val = deg + min / 60.0;
    return _latHem == 'N' ? val : -val;
  }

  double? _lonDecimal() {
    if (_lonDeg == null && _lonMin == null) return null;
    final deg = (_lonDeg ?? 0).clamp(0, 180);
    final min = (_lonMin ?? 0).clamp(0.0, 59.9999);
    final val = deg + min / 60.0;
    return _lonHem == 'E' ? val : -val;
  }
}

Widget _coordPicker(
  BuildContext context, {
  required String label,
  required List<String> hemispheres,
  required int degreesMax,
  required String hemValue,
  required ValueChanged<String> onHemChange,
  required ValueChanged<int?> onDegChange,
  required ValueChanged<double?> onMinChange,
}) {
  return Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(
      children: [
        Expanded(
          child: TextField(
            decoration: InputDecoration(labelText: '$label Deg (0–$degreesMax) °', hintText: 'e.g., 37'),
            keyboardType: const TextInputType.numberWithOptions(decimal: false, signed: false),
            onChanged: (t) => onDegChange(int.tryParse(t)),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: TextField(
            decoration: const InputDecoration(labelText: 'Min (0–59.9) ′', hintText: 'e.g., 46.5'),
            keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: false),
            onChanged: (t) => onMinChange(double.tryParse(t)),
          ),
        ),
        const SizedBox(width: 12),
        SizedBox(
          width: 84,
          child: DropdownButtonFormField<String>(
            value: hemValue,
            decoration: const InputDecoration(labelText: 'Hem'),
            items: hemispheres.map((h) => DropdownMenuItem(value: h, child: Text(h))).toList(),
            onChanged: (v) {
              if (v != null) onHemChange(v);
            },
          ),
        ),
      ],
    ),
  );
}

class _PickerTile extends StatelessWidget {
  final String label;
  final String value;
  final VoidCallback onTap;
  const _PickerTile({required this.label, required this.value, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 4),
            Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}

class GyroParams {
  final String method;
  final double? latDeg;
  final double? lonDeg;
  final String utcIso;
  final String body;
  final double? gBodyDeg;
  final double? pgcDeg;
  final double? pscDeg;
  final double? variationEPos; // null => auto WMM
  const GyroParams({
    required this.method,
    required this.latDeg,
    required this.lonDeg,
    required this.utcIso,
    required this.body,
    required this.gBodyDeg,
    required this.pgcDeg,
    required this.pscDeg,
    required this.variationEPos,
  });
}
