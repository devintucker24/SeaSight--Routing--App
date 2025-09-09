import 'package:flutter/material.dart';
import '../gyro/gyro_entry_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Intercept', style: Theme.of(context).textTheme.displayMedium),
            const SizedBox(height: 4),
            Text('Celestial Gyro & Fix', style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 24),
            _PrimaryButton(
              icon: Icons.wb_sunny_outlined,
              label: 'Sun Azimuth',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const GyroEntryScreen(method: 'sun_azimuth')),
              ),
            ),
            const SizedBox(height: 12),
            _PrimaryButton(
              icon: Icons.tonality_outlined,
              label: 'Sun Amplitude',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const GyroEntryScreen(method: 'sun_amplitude')),
              ),
            ),
            const SizedBox(height: 12),
            _PrimaryButton(
              icon: Icons.stars_outlined,
              label: 'Star Azimuth',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const GyroEntryScreen(method: 'star_azimuth')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PrimaryButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _PrimaryButton({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 64,
      child: ElevatedButton.icon(
        icon: Icon(icon),
        label: Text(label, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
        onPressed: onTap,
      ),
    );
  }
}

