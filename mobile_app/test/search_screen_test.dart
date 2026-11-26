import 'package:diplomabondhu/app/l10n/generated/app_localizations.dart';
import 'package:diplomabondhu/features/search/data/search_models.dart';
import 'package:diplomabondhu/features/search/data/search_repository.dart';
import 'package:diplomabondhu/features/search/providers/search_providers.dart';
import 'package:diplomabondhu/features/search/screens/search_screen.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeSearchRepository implements SearchRepository {
  _FakeSearchRepository({this.bundle, this.fail = false});

  final SearchBundle? bundle;
  final bool fail;

  @override
  Future<SearchBundle> search(String q, {String? type, int page = 1}) async {
    if (fail) throw StateError('boom');
    return bundle ?? const SearchBundle(hits: []);
  }

  @override
  Future<List<String>> history() async => const [];

  @override
  Future<void> clearHistory() async {}
}

Future<void> pumpSearch(
  WidgetTester tester, {
  required SearchRepository repository,
  String initialQuery = '',
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        searchRepositoryProvider.overrideWithValue(repository),
      ],
      child: MaterialApp(
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: [
          AppLocalizations.delegate,
          ...GlobalMaterialLocalizations.delegates,
        ],
        locale: const Locale('en'),
        home: SearchScreen(initialQuery: initialQuery),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('asks for at least 2 characters before searching', (tester) async {
    await pumpSearch(tester, repository: _FakeSearchRepository());
    expect(find.text('Type at least 2 characters to search'), findsOneWidget);
  });

  testWidgets('renders grouped results for a query', (tester) async {
    const bundle = SearchBundle(
      hits: [
        SearchHit(type: 'material', raw: {'_id': 'm1', 'title': 'Higher Math Guide'}),
        SearchHit(type: 'exam', raw: {'_id': 'e1', 'title': 'Math Semester Final'}),
      ],
      counts: {'material': 1, 'exam': 1, 'post': 0},
    );
    await pumpSearch(
      tester,
      repository: _FakeSearchRepository(bundle: bundle),
      initialQuery: 'math',
    );

    expect(find.text('Higher Math Guide'), findsOneWidget);
    expect(find.text('Math Semester Final'), findsOneWidget);
    expect(find.text('Materials (1)'), findsOneWidget);
  });

  testWidgets('shows the empty state when nothing matches', (tester) async {
    await pumpSearch(
      tester,
      repository: _FakeSearchRepository(),
      initialQuery: 'zzzz',
    );
    expect(find.text('Nothing here yet'), findsOneWidget);
  });
}
