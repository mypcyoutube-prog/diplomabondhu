import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart';

import '../features/settings/providers/app_preferences.dart';
import 'l10n/generated/app_localizations.dart';
import 'router/router.dart';
import 'theme/theme.dart';

class DiplomaBondhuApp extends ConsumerWidget {
  const DiplomaBondhuApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(rootRouterProvider);
    final prefs = ref.watch(appPreferencesProvider);

    return MaterialApp.router(
      title: 'DiplomaBondhu',
      debugShowCheckedModeBanner: false,
      theme: buildLightTheme(),
      darkTheme: buildDarkTheme(),
      themeMode: switch (prefs.themeMode) {
        AppThemeMode.light => ThemeMode.light,
        AppThemeMode.dark => ThemeMode.dark,
        AppThemeMode.system => ThemeMode.system,
      },
      locale: Locale(prefs.language),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: [
        AppLocalizations.delegate,
        ...GlobalMaterialLocalizations.delegates,
      ],
      routerConfig: router,
    );
  }
}
