import 'package:diplomabondhu/app/l10n/generated/app_localizations.dart';
import 'package:diplomabondhu/features/dashboard_customize/data/dashboard_prefs_repository.dart';
import 'package:diplomabondhu/features/dashboard_customize/providers/dashboard_prefs_providers.dart';
import 'package:diplomabondhu/features/dashboard_customize/screens/dashboard_customize_screen.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeDashboardPrefsRepository implements DashboardPrefsRepository {
  _FakeDashboardPrefsRepository({this.customized = false});

  final bool customized;

  @override
  Future<DashboardPrefsBundle> get() async => DashboardPrefsBundle(
        customized: customized,
        sections: const [
          DashboardSectionPref(key: 'quick_access', visible: true, order: 20),
          DashboardSectionPref(key: 'materials', visible: true, order: 30),
          DashboardSectionPref(
              key: 'academic_info', visible: true, order: 5, customizable: false),
        ],
      );

  @override
  Future<DashboardPrefsBundle> save(List<DashboardSectionPref> sections) async {
    return DashboardPrefsBundle(customized: true, sections: sections);
  }

  @override
  Future<DashboardPrefsBundle> reset() async => get();
}

Future<void> pumpCustomize(WidgetTester tester,
    {required DashboardPrefsRepository repository}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        dashboardPrefsRepositoryProvider.overrideWithValue(repository),
      ],
      child: MaterialApp(
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: [
          AppLocalizations.delegate,
          ...GlobalMaterialLocalizations.delegates,
        ],
        locale: const Locale('en'),
        home: const DashboardCustomizeScreen(),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('renders sections with reorder and save controls',
      (tester) async {
    await pumpCustomize(
        tester, repository: _FakeDashboardPrefsRepository());
    expect(find.text('Quick Access'), findsOneWidget);
    expect(find.text('Locked by admin'), findsOneWidget);
    expect(find.text('Save layout'), findsOneWidget);
    expect(find.byIcon(Icons.arrow_upward_rounded), findsWidgets);
  });
}
