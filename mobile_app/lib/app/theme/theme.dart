import 'package:material_ui/material_ui.dart';

class DbColors {
  static const navy = Color(0xFF0F2A4A);
  static const navyDark = Color(0xFF0B1F36);
  static const emerald = Color(0xFF10B981);
  static const emeraldDark = Color(0xFF34D399);
  static const teal = Color(0xFF14B8A6);
  static const tealDark = Color(0xFF2DD4BF);
  static const surfaceLight = Color(0xFFFAFAF8);
  static const surfaceDark = Color(0xFF121A24);
  static const backgroundLight = Color(0xFFF4F6F8);
  static const backgroundDark = Color(0xFF0D141C);
  static const errorLight = Color(0xFFDC2626);
  static const errorDark = Color(0xFFF87171);
  static const warningLight = Color(0xFFD97706);
  static const warningDark = Color(0xFFFBBF24);
  static const textPrimaryLight = Color(0xFF1A2233);
  static const textPrimaryDark = Color(0xFFF1F5F9);
  static const textSecondaryLight = Color(0xFF64748B);
  static const textSecondaryDark = Color(0xFF94A3B8);
}

class DbRadius {
  static const card = 16.0;
  static const input = 12.0;
  static const chip = 20.0;
}

class DbSpacing {
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 16.0;
  static const lg = 24.0;
  static const xl = 32.0;
}

ThemeData buildLightTheme() {
  final base = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    colorScheme: const ColorScheme.light(
      primary: DbColors.navy,
      onPrimary: Colors.white,
      secondary: DbColors.emerald,
      onSecondary: Colors.white,
      tertiary: DbColors.teal,
      error: DbColors.errorLight,
      surface: DbColors.surfaceLight,
      onSurface: DbColors.textPrimaryLight,
    ),
    scaffoldBackgroundColor: DbColors.backgroundLight,
  );
  return base.copyWith(
    appBarTheme: const AppBarTheme(
      backgroundColor: DbColors.navy,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: false,
    ),
    cardTheme: CardThemeData(
      color: DbColors.surfaceLight,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(DbRadius.card),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      margin: EdgeInsets.zero,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(DbRadius.input),
        borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(DbRadius.input),
        borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(DbRadius.input),
        borderSide: const BorderSide(color: DbColors.teal, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(DbRadius.input),
        borderSide: const BorderSide(color: DbColors.errorLight),
      ),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: DbSpacing.md,
        vertical: DbSpacing.sm + 4,
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: DbColors.navy,
        foregroundColor: Colors.white,
        minimumSize: const Size(48, 48),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(DbRadius.input),
        ),
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: DbColors.navy,
        minimumSize: const Size(48, 48),
        side: const BorderSide(color: DbColors.navy),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(DbRadius.input),
        ),
      ),
    ),
    chipTheme: base.chipTheme.copyWith(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(DbRadius.chip),
        side: const BorderSide(color: Color(0xFFCBD5E1)),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: DbColors.surfaceLight,
      indicatorColor: DbColors.emerald.withValues(alpha: 0.15),
      labelTextStyle: WidgetStateProperty.resolveWith((states) => TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: states.contains(WidgetState.selected)
            ? DbColors.navy
            : DbColors.textSecondaryLight,
      )),
    ),
    dividerTheme: const DividerThemeData(color: Color(0xFFE2E8F0)),
  );
}

ThemeData buildDarkTheme() {
  final base = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: const ColorScheme.dark(
      primary: DbColors.navyDark,
      onPrimary: Colors.white,
      secondary: DbColors.emeraldDark,
      onSecondary: DbColors.navyDark,
      tertiary: DbColors.tealDark,
      error: DbColors.errorDark,
      surface: DbColors.surfaceDark,
      onSurface: DbColors.textPrimaryDark,
    ),
    scaffoldBackgroundColor: DbColors.backgroundDark,
  );
  return base.copyWith(
    appBarTheme: const AppBarTheme(
      backgroundColor: DbColors.navyDark,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: false,
    ),
    cardTheme: CardThemeData(
      color: DbColors.surfaceDark,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(DbRadius.card),
        side: const BorderSide(color: Color(0xFF24303F)),
      ),
      margin: EdgeInsets.zero,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFF1A2531),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(DbRadius.input),
        borderSide: const BorderSide(color: Color(0xFF334155)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(DbRadius.input),
        borderSide: const BorderSide(color: Color(0xFF334155)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(DbRadius.input),
        borderSide: const BorderSide(color: DbColors.tealDark, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(DbRadius.input),
        borderSide: const BorderSide(color: DbColors.errorDark),
      ),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: DbSpacing.md,
        vertical: DbSpacing.sm + 4,
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: DbColors.emeraldDark,
        foregroundColor: DbColors.navyDark,
        minimumSize: const Size(48, 48),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(DbRadius.input),
        ),
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: DbColors.textPrimaryDark,
        minimumSize: const Size(48, 48),
        side: const BorderSide(color: Color(0xFF475569)),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(DbRadius.input),
        ),
      ),
    ),
    chipTheme: base.chipTheme.copyWith(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(DbRadius.chip),
        side: const BorderSide(color: Color(0xFF334155)),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: DbColors.surfaceDark,
      indicatorColor: DbColors.emeraldDark.withValues(alpha: 0.15),
      labelTextStyle: WidgetStateProperty.resolveWith((states) => TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: states.contains(WidgetState.selected)
            ? DbColors.textPrimaryDark
            : DbColors.textSecondaryDark,
      )),
    ),
    dividerTheme: const DividerThemeData(color: Color(0xFF24303F)),
  );
}
