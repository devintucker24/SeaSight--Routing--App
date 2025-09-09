import 'package:flutter/material.dart';

class AppTheme {
  static const _nightBg = Color(0xFF0B0C10);
  static const _nightCard = Color(0xFF15171C);
  static const _nightText = Color(0xFFEAECEF);
  static const _nightDim = Color(0xFF9AA3AE);
  static const _red = Color(0xFFFF453A);

  static ThemeData get night => ThemeData(
        brightness: Brightness.dark,
        colorScheme: const ColorScheme.dark(
          primary: _red,
          secondary: _red,
          surface: _nightCard,
          background: _nightBg,
        ),
        scaffoldBackgroundColor: _nightBg,
        cardColor: _nightCard,
        textTheme: const TextTheme(
          displayLarge: TextStyle(fontSize: 48, fontWeight: FontWeight.w700, color: _nightText),
          displayMedium: TextStyle(fontSize: 36, fontWeight: FontWeight.w700, color: _nightText),
          headlineSmall: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: _nightText),
          bodyMedium: TextStyle(fontSize: 16, color: _nightText),
          bodySmall: TextStyle(fontSize: 14, color: _nightDim),
        ),
        useMaterial3: true,
      );

  static ThemeData get light => ThemeData(
        brightness: Brightness.light,
        colorScheme: ColorScheme.fromSeed(seedColor: _red),
        useMaterial3: true,
      );
}

