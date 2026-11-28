import 'package:diplomabondhu/app/l10n/generated/app_localizations.dart';
import 'package:diplomabondhu/features/export/data/export_repository.dart';
import 'package:diplomabondhu/features/export/providers/export_providers.dart';
import 'package:diplomabondhu/features/export/screens/export_screen.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeExportRepository implements ExportRepository {
  _FakeExportRepository({this.jobs = const []});

  final List<ExportJobModel> jobs;

  @override
  Future<ExportJobModel> createJob(
      List<String> datasets, String format) async {
    return ExportJobModel(
      id: 'j1',
      datasets: datasets,
      format: format,
      status: 'ready',
      fileName: 'export.$format',
    );
  }

  @override
  Future<List<ExportJobModel>> listJobs() async => jobs;

  @override
  Future<String> download(String jobId) async => '{"ok":true}';
}

Future<void> pumpExport(WidgetTester tester,
    {required ExportRepository repository}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        exportRepositoryProvider.overrideWithValue(repository),
      ],
      child: MaterialApp(
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: [
          AppLocalizations.delegate,
          ...GlobalMaterialLocalizations.delegates,
        ],
        locale: const Locale('en'),
        home: const ExportScreen(),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('renders dataset checkboxes and create button', (tester) async {
    await pumpExport(tester, repository: _FakeExportRepository());
    expect(find.text('My Notes'), findsOneWidget);
    expect(find.text('Bookmarks'), findsOneWidget);
    expect(find.text('Create export'), findsOneWidget);
  });

  testWidgets('renders export history with status', (tester) async {
    await pumpExport(
      tester,
      repository: _FakeExportRepository(jobs: [
        ExportJobModel(
          id: 'j1',
          datasets: ['notes'],
          format: 'json',
          status: 'ready',
          fileName: 'diplomabondhu-export-1.json',
        ),
      ]),
    );
    expect(find.text('diplomabondhu-export-1.json'), findsOneWidget);
    expect(find.textContaining('Ready'), findsWidgets);
  });
}
