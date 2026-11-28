import 'package:material_ui/material_ui.dart';

/// DiplomaBondhu design system — the single source of truth for colours,
/// spacing, radii, shadows, motion and component themes. Every screen imports
/// this file and uses these constants; never hard-code values in screens.

class DbColors {
  // Brand
  static const navy = Color(0xFF0F2A4A);
  static const navyDark = Color(0xFF0B1F36);
  static const emerald = Color(0xFF10B981);
  static const emeraldDark = Color(0xFF34D399);
  static const teal = Color(0xFF14B8A6);
  static const tealDark = Color(0xFF2DD4BF);

  // Surfaces
  static const surfaceLight = Color(0xFFFAFAF8);
  static const surfaceDark = Color(0xFF121A24);
  static const backgroundLight = Color(0xFFF4F6F8);
  static const backgroundDark = Color(0xFF0D141C);

  // Text
  static const textPrimaryLight = Color(0xFF1A2233);
  static const textPrimaryDark = Color(0xFFF1F5F9);
  static const textSecondaryLight = Color(0xFF64748B);
  static const textSecondaryDark = Color(0xFF94A3B8);

  // Status
  static const errorLight = Color(0xFFDC2626);
  static const errorDark = Color(0xFFF87171);
  static const warningLight = Color(0xFFF59E0B);
  static const warningDark = Color(0xFFFBBF24);
  static const successLight = Color(0xFF10B981);
  static const successDark = Color(0xFF34D399);
  static const infoLight = Color(0xFF0284C7);
  static const infoDark = Color(0xFF38BDF8);

  // Lines, fills and overlays
  static const borderLight = Color(0xFFE2E8F0);
  static const borderDark = Color(0xFF24303F);
  static const borderStrongLight = Color(0xFFCBD5E1);
  static const borderStrongDark = Color(0xFF334155);
  static const fillLight = Color(0xFFF1F5F9);
  static const fillDark = Color(0xFF1A2531);
  static const overlay = Color(0x660F2A4A);
}

class DbRadius {
  static const card = 16.0;
  static const input = 12.0;
  static const chip = 20.0;
  static const sheet = 24.0;
  static const dialog = 20.0;
  static const badge = 8.0;
  static const full = 999.0;
}

class DbSpacing {
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 16.0;
  static const lg = 24.0;
  static const xl = 32.0;
}

class DbShadows {
  static const card = [
    BoxShadow(
      color: Color(0x140F2A4A),
      blurRadius: 12,
      offset: Offset(0, 4),
    ),
  ];
  static const floating = [
    BoxShadow(
      color: Color(0x260F2A4A),
      blurRadius: 24,
      offset: Offset(0, 8),
    ),
  ];
  static const darkCard = [
    BoxShadow(
      color: Color(0x66000000),
      blurRadius: 12,
      offset: Offset(0, 4),
    ),
  ];
}

class DbDurations {
  static const fast = Duration(milliseconds: 150);
  static const normal = Duration(milliseconds: 250);
  static const slow = Duration(milliseconds: 400);
}

class DbCurves {
  static const emphasized = Curves.easeOutCubic;
  static const standard = Curves.easeInOut;
}

TextTheme _dbTextTheme(Brightness brightness) {
  final primary = brightness == Brightness.light
      ? DbColors.textPrimaryLight
      : DbColors.textPrimaryDark;
  final secondary = brightness == Brightness.light
      ? DbColors.textSecondaryLight
      : DbColors.textSecondaryDark;
  return TextTheme(
    displaySmall: TextStyle(
        fontSize: 32, fontWeight: FontWeight.w700, color: primary, height: 1.2),
    headlineMedium: TextStyle(
        fontSize: 24, fontWeight: FontWeight.w700, color: primary, height: 1.25),
    headlineSmall: TextStyle(
        fontSize: 20, fontWeight: FontWeight.w700, color: primary, height: 1.3),
    titleLarge: TextStyle(
        fontSize: 18, fontWeight: FontWeight.w600, color: primary, height: 1.3),
    titleMedium: TextStyle(
        fontSize: 16, fontWeight: FontWeight.w600, color: primary, height: 1.35),
    titleSmall: TextStyle(
        fontSize: 14, fontWeight: FontWeight.w600, color: primary, height: 1.35),
    bodyLarge: TextStyle(
        fontSize: 15, fontWeight: FontWeight.w400, color: primary, height: 1.5),
    bodyMedium: TextStyle(
        fontSize: 14, fontWeight: FontWeight.w400, color: primary, height: 1.5),
    bodySmall: TextStyle(
        fontSize: 12.5,
        fontWeight: FontWeight.w400,
        color: secondary,
        height: 1.4),
    labelLarge: TextStyle(
        fontSize: 14, fontWeight: FontWeight.w600, color: primary, height: 1.2),
    labelMedium: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: secondary,
        height: 1.2),
    labelSmall: TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w500,
        color: secondary,
        height: 1.2),
  );
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
    textTheme: _dbTextTheme(Brightness.light),
  );
  return base.copyWith(
    appBarTheme: const AppBarTheme(
      backgroundColor: DbColors.navy,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: Colors.white,
      ),
    ),
    cardTheme: CardThemeData(
      color: DbColors.surfaceLight,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(DbRadius.card),
        side: const BorderSide(color: DbColors.borderLight),
      ),
      margin: EdgeInsets.zero,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      hintStyle: const TextStyle(
        color: DbColors.textSecondaryLight,
        fontSize: 14,
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(DbRadius.input),
        borderSide: const BorderSide(color: DbColors.borderStrongLight),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(DbRadius.input),
        borderSide: const BorderSide(color: DbColors.borderStrongLight),
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
        disabledBackgroundColor: DbColors.borderStrongLight,
        minimumSize: const Size(48, 48),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(DbRadius.input),
        ),
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: DbColors.navy,
        foregroundColor: Colors.white,
        disabledBackgroundColor: DbColors.borderStrongLight,
        minimumSize: const Size(48, 48),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(DbRadius.input),
        ),
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: DbColors.teal,
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
      ),
    ),
    chipTheme: base.chipTheme.copyWith(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(DbRadius.chip),
        side: const BorderSide(color: DbColors.borderStrongLight),
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
    listTileTheme: ListTileThemeData(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(DbRadius.input),
      ),
      iconColor: DbColors.textSecondaryLight,
    ),
    snackBarTheme: const SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: DbColors.navy,
      contentTextStyle: TextStyle(color: Colors.white, fontSize: 14),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(DbRadius.input)),
      ),
    ),
    dialogTheme: const DialogThemeData(
      backgroundColor: DbColors.surfaceLight,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(DbRadius.dialog)),
      ),
      titleTextStyle: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: DbColors.textPrimaryLight,
      ),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: DbColors.surfaceLight,
      modalBackgroundColor: DbColors.surfaceLight,
      shape: RoundedRectangleBorder(
        borderRadius:
            BorderRadius.vertical(top: Radius.circular(DbRadius.sheet)),
      ),
      showDragHandle: true,
    ),
    tabBarTheme: const TabBarThemeData(
      labelColor: DbColors.navy,
      unselectedLabelColor: DbColors.textSecondaryLight,
      indicatorColor: DbColors.teal,
      dividerColor: DbColors.borderLight,
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: DbColors.teal,
      linearTrackColor: DbColors.borderLight,
      circularTrackColor: DbColors.borderLight,
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected)
            ? Colors.white
            : DbColors.borderStrongLight,
      ),
      trackColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected)
            ? DbColors.teal
            : DbColors.borderLight,
      ),
    ),
    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected)
            ? DbColors.teal
            : Colors.transparent,
      ),
      side: const BorderSide(color: DbColors.borderStrongLight, width: 1.5),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
    ),
    radioTheme: RadioThemeData(
      fillColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected)
            ? DbColors.teal
            : DbColors.borderStrongLight,
      ),
    ),
    popupMenuTheme: PopupMenuThemeData(
      color: DbColors.surfaceLight,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(DbRadius.input),
      ),
    ),
    tooltipTheme: const TooltipThemeData(
      decoration: BoxDecoration(
        color: DbColors.navy,
        borderRadius: BorderRadius.all(Radius.circular(DbRadius.badge)),
      ),
      textStyle: TextStyle(color: Colors.white, fontSize: 12),
    ),
    iconTheme: const IconThemeData(size: 24, color: DbColors.textPrimaryLight),
    dividerTheme: const DividerThemeData(color: DbColors.borderLight),
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
    textTheme: _dbTextTheme(Brightness.dark),
  );
  return base.copyWith(
    appBarTheme: const AppBarTheme(
      backgroundColor: DbColors.navyDark,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: Colors.white,
      ),
    ),
    cardTheme: CardThemeData(
      color: DbColors.surfaceDark,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(DbRadius.card),
        side: const BorderSide(color: DbColors.borderDark),
      ),
      margin: EdgeInsets.zero,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: DbColors.fillDark,
      hintStyle: const TextStyle(
        color: DbColors.textSecondaryDark,
        fontSize: 14,
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(DbRadius.input),
        borderSide: const BorderSide(color: DbColors.borderStrongDark),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(DbRadius.input),
        borderSide: const BorderSide(color: DbColors.borderStrongDark),
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
        disabledBackgroundColor: DbColors.borderStrongDark,
        minimumSize: const Size(48, 48),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(DbRadius.input),
        ),
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: DbColors.emeraldDark,
        foregroundColor: DbColors.navyDark,
        disabledBackgroundColor: DbColors.borderStrongDark,
        minimumSize: const Size(48, 48),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(DbRadius.input),
        ),
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: DbColors.tealDark,
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
      ),
    ),
    chipTheme: base.chipTheme.copyWith(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(DbRadius.chip),
        side: const BorderSide(color: DbColors.borderStrongDark),
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
    listTileTheme: ListTileThemeData(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(DbRadius.input),
      ),
      iconColor: DbColors.textSecondaryDark,
    ),
    snackBarTheme: const SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: DbColors.navyDark,
      contentTextStyle: TextStyle(color: Colors.white, fontSize: 14),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(DbRadius.input)),
      ),
    ),
    dialogTheme: const DialogThemeData(
      backgroundColor: DbColors.surfaceDark,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(DbRadius.dialog)),
      ),
      titleTextStyle: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: DbColors.textPrimaryDark,
      ),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: DbColors.surfaceDark,
      modalBackgroundColor: DbColors.surfaceDark,
      shape: RoundedRectangleBorder(
        borderRadius:
            BorderRadius.vertical(top: Radius.circular(DbRadius.sheet)),
      ),
      showDragHandle: true,
    ),
    tabBarTheme: const TabBarThemeData(
      labelColor: DbColors.tealDark,
      unselectedLabelColor: DbColors.textSecondaryDark,
      indicatorColor: DbColors.tealDark,
      dividerColor: DbColors.borderDark,
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: DbColors.tealDark,
      linearTrackColor: DbColors.borderDark,
      circularTrackColor: DbColors.borderDark,
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected)
            ? DbColors.navyDark
            : DbColors.borderStrongDark,
      ),
      trackColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected)
            ? DbColors.tealDark
            : DbColors.borderDark,
      ),
    ),
    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected)
            ? DbColors.tealDark
            : Colors.transparent,
      ),
      side: const BorderSide(color: DbColors.borderStrongDark, width: 1.5),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
    ),
    radioTheme: RadioThemeData(
      fillColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected)
            ? DbColors.tealDark
            : DbColors.borderStrongDark,
      ),
    ),
    popupMenuTheme: PopupMenuThemeData(
      color: DbColors.surfaceDark,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(DbRadius.input),
      ),
    ),
    tooltipTheme: const TooltipThemeData(
      decoration: BoxDecoration(
        color: DbColors.navyDark,
        borderRadius: BorderRadius.all(Radius.circular(DbRadius.badge)),
      ),
      textStyle: TextStyle(color: Colors.white, fontSize: 12),
    ),
    iconTheme: const IconThemeData(size: 24, color: DbColors.textPrimaryDark),
    dividerTheme: const DividerThemeData(color: DbColors.borderDark),
  );
}
