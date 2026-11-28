import 'package:diplomabondhu/app/l10n/generated/app_localizations.dart';
import 'package:diplomabondhu/features/workspace/data/workspace_models.dart';
import 'package:diplomabondhu/features/workspace/data/workspace_repository.dart';
import 'package:diplomabondhu/features/workspace/providers/workspace_providers.dart';
import 'package:diplomabondhu/features/workspace/screens/workspace_screen.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeWorkspaceRepository implements WorkspaceRepository {
  _FakeWorkspaceRepository({this.storedNotes = const [], this.fail = false});

  final List<WorkspaceNote> storedNotes;
  final bool fail;

  @override
  Future<List<WorkspaceNote>> notes(
      {String? q, bool archived = false, String? collectionId}) async {
    if (fail) throw StateError('boom');
    return storedNotes;
  }

  @override
  Future<WorkspaceNote> createNote(
      {required String title, required String body, String? collectionId}) async {
    return WorkspaceNote(id: 'n1', title: title, body: body);
  }

  @override
  Future<void> updateNote(String id, {bool? pinned, bool? archived}) async {}

  @override
  Future<void> deleteNote(String id) async {}

  @override
  Future<List<WorkspaceCollection>> collections() async => const [];

  @override
  Future<WorkspaceCollection> createCollection(String name) async =>
      WorkspaceCollection(id: 'c1', name: name);

  @override
  Future<void> deleteCollection(String id) async {}

  @override
  Future<void> addToCollection(String id,
      {required String refType, required String refId}) async {}

  @override
  Future<List<WorkspaceRecentItem>> recent() async => const [];
}

Future<void> pumpWorkspace(WidgetTester tester,
    {required WorkspaceRepository repository}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        workspaceRepositoryProvider.overrideWithValue(repository),
      ],
      child: MaterialApp(
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: [
          AppLocalizations.delegate,
          ...GlobalMaterialLocalizations.delegates,
        ],
        locale: const Locale('en'),
        home: const WorkspaceScreen(),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('renders notes list', (tester) async {
    await pumpWorkspace(
      tester,
      repository: _FakeWorkspaceRepository(
        storedNotes: [WorkspaceNote(id: 'n1', title: 'Circuit basics', body: 'Ohm law')],
      ),
    );
    expect(find.text('Circuit basics'), findsOneWidget);
  });

  testWidgets('shows empty state when no notes', (tester) async {
    await pumpWorkspace(tester, repository: _FakeWorkspaceRepository());
    expect(find.text('Nothing here yet'), findsOneWidget);
  });
}
