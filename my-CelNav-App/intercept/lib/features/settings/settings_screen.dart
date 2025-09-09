import 'package:flutter/material.dart';
import 'package:intercept/core/wmm/wmm_model.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Settings', style: Theme.of(context).textTheme.displaySmall),
        const SizedBox(height: 12),
        SwitchListTile(
          value: true,
          onChanged: (_) {},
          title: const Text('Night-first (default)'),
          subtitle: const Text('Keeps UI red-on-dark by default'),
        ),
        SwitchListTile(
          value: true,
          onChanged: (_) {},
          title: const Text('Auto Variation (WMM)'),
          subtitle: const Text('Compute variation offline from lat/lon/date'),
        ),
        const SizedBox(height: 12),
        FutureBuilder<void>(
          future: WmmModel.instance.tryLoadFromAsset(),
          builder: (context, snap) {
            final model = WmmModel.instance;
            final loaded = model.isLoaded;
            final epoch = model.epoch;
            final validTo = model.validTo;
            return Card(
              child: ListTile(
                leading: Icon(
                  loaded ? Icons.check_circle : Icons.info_outline,
                  color: loaded ? Colors.greenAccent : Theme.of(context).colorScheme.primary,
                ),
                title: const Text('Magnetic Model'),
                subtitle: Text(
                  loaded
                      ? (epoch != null && validTo != null
                          ? 'WMM epoch ${epoch.toStringAsFixed(1)} (valid to ${validTo.toStringAsFixed(1)})'
                          : 'WMM loaded (epoch unknown)')
                      : 'Fallback dipole model active. Install WMM.COF for best accuracy.',
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}
