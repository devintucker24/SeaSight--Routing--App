import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'theme/app_theme.dart';
import 'features/home/home_screen.dart';
import 'features/log/log_screen.dart';
import 'features/settings/settings_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Try to pre-load WMM coefficients if present; ignore errors silently.
  try {
    await rootBundle.loadString('assets/wmm/WMM.COF');
    // If load succeeds, nothing else to do here; compute function will re-load as needed.
  } catch (_) {}
  runApp(const InterceptApp());
}

class InterceptApp extends StatelessWidget {
  const InterceptApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Intercept',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.night,
      themeMode: ThemeMode.dark,
      home: const _RootNav(),
    );
  }
}

class _RootNav extends StatefulWidget {
  const _RootNav();
  @override
  State<_RootNav> createState() => _RootNavState();
}

class _RootNavState extends State<_RootNav> {
  int _idx = 0;
  final _pages = const [HomeScreen(), LogScreen(), SettingsScreen()];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _pages[_idx],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _idx,
        onDestinationSelected: (i) => setState(() => _idx = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.explore_outlined), selectedIcon: Icon(Icons.explore), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.list_alt_outlined), selectedIcon: Icon(Icons.list_alt), label: 'Log'),
          NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: 'Settings'),
        ],
      ),
    );
  }
}
