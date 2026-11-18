import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/providers.dart';

enum AppThemeMode { system, light, dark }

class AppPreferences {
  final bool onboardingComplete;
  final String language;
  final AppThemeMode themeMode;

  const AppPreferences({
    required this.onboardingComplete,
    required this.language,
    required this.themeMode,
  });

  AppPreferences copyWith({
    bool? onboardingComplete,
    String? language,
    AppThemeMode? themeMode,
  }) =>
      AppPreferences(
        onboardingComplete: onboardingComplete ?? this.onboardingComplete,
        language: language ?? this.language,
        themeMode: themeMode ?? this.themeMode,
      );
}

class AppPreferencesController extends Notifier<AppPreferences> {
  static const _onboardingKey = 'db_onboarding_complete';
  static const _languageKey = 'db_language';
  static const _themeKey = 'db_theme_mode';

  @override
  AppPreferences build() {
    final prefsAsync = ref.watch(sharedPreferencesProvider);
    return prefsAsync.maybeWhen(
      data: (prefs) => AppPreferences(
        onboardingComplete: prefs.getBool(_onboardingKey) ?? false,
        language: prefs.getString(_languageKey) ?? 'bn',
        themeMode: _themeFrom(prefs.getString(_themeKey)),
      ),
      orElse: () => const AppPreferences(
        onboardingComplete: false,
        language: 'bn',
        themeMode: AppThemeMode.system,
      ),
    );
  }

  static AppThemeMode _themeFrom(String? raw) => switch (raw) {
        'light' => AppThemeMode.light,
        'dark' => AppThemeMode.dark,
        _ => AppThemeMode.system,
      };

  Future<void> _update(Future<void> Function(SharedPreferences prefs) apply) async {
    final prefs = await ref.read(sharedPreferencesProvider.future);
    await apply(prefs);
    ref.invalidateSelf();
  }

  Future<void> completeOnboarding() => _update((prefs) async {
        await prefs.setBool(_onboardingKey, true);
      });

  Future<void> setLanguage(String code) => _update((prefs) async {
        await prefs.setString(_languageKey, code);
      });

  Future<void> setThemeMode(AppThemeMode mode) => _update((prefs) async {
        await prefs.setString(_themeKey, mode.name);
      });
}

final appPreferencesProvider =
    NotifierProvider<AppPreferencesController, AppPreferences>(
  AppPreferencesController.new,
);
