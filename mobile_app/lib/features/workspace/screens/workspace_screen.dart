import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../shared/widgets/states.dart';
import '../providers/workspace_providers.dart';

class WorkspaceScreen extends ConsumerStatefulWidget {
  const WorkspaceScreen({super.key});

  @override
  ConsumerState<WorkspaceScreen> createState() => _WorkspaceScreenState();
}

class _WorkspaceScreenState extends ConsumerState<WorkspaceScreen> {
  int _tab = 0;
  bool _showCreate = false;
  final _titleController = TextEditingController();
  final _bodyController = TextEditingController();
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _titleController.dispose();
    _bodyController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _createNote() async {
    final title = _titleController.text.trim();
    final body = _bodyController.text.trim();
    if (title.isEmpty || body.isEmpty) return;
    await ref.read(workspaceRepositoryProvider).createNote(title: title, body: body);
    _titleController.clear();
    _bodyController.clear();
    if (mounted) {
      setState(() => _showCreate = false);
      ref.invalidate(workspaceNotesProvider);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final tabs = [l10n.notes, l10n.workspaceCollections, l10n.workspaceRecent];

    return Scaffold(
      appBar: AppBar(title: Text(l10n.workspaceTitle)),
      floatingActionButton: _tab == 0
          ? FloatingActionButton.extended(
              onPressed: () => setState(() => _showCreate = !_showCreate),
              icon: const Icon(Icons.add_rounded),
              label: Text(l10n.workspaceNewNote),
            )
          : null,
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: DbSpacing.md, vertical: DbSpacing.sm),
            child: Row(
              children: [
                for (var i = 0; i < tabs.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(right: DbSpacing.sm),
                    child: ChoiceChip(
                      selected: _tab == i,
                      onSelected: (_) => setState(() => _tab = i),
                      label: Text(tabs[i]),
                    ),
                  ),
              ],
            ),
          ),
          if (_showCreate && _tab == 0)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: DbSpacing.md),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(DbSpacing.md),
                  child: Column(
                    children: [
                      TextField(
                        controller: _titleController,
                        decoration: InputDecoration(hintText: l10n.noteTitleHint),
                      ),
                      const SizedBox(height: DbSpacing.sm),
                      TextField(
                        controller: _bodyController,
                        maxLines: 4,
                        decoration: InputDecoration(hintText: l10n.noteBodyHint),
                      ),
                      const SizedBox(height: DbSpacing.sm),
                      FilledButton(onPressed: _createNote, child: Text(l10n.workspaceNewNote)),
                    ],
                  ),
                ),
              ),
            ),
          Expanded(
            child: _tab == 0
                ? _NotesList(onSearch: (q) => ref.read(workspaceNotesProvider(q).future))
                : _tab == 1
                    ? const _CollectionsList()
                    : const _RecentList(),
          ),
        ],
      ),
    );
  }
}

class _NotesList extends ConsumerStatefulWidget {
  const _NotesList({this.onSearch});

  final void Function(String?)? onSearch;

  @override
  ConsumerState<_NotesList> createState() => _NotesListState();
}

class _NotesListState extends ConsumerState<_NotesList> {
  String? _query;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final notesAsync = ref.watch(workspaceNotesProvider(_query));
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: DbSpacing.md),
          child: TextField(
            decoration: InputDecoration(hintText: l10n.searchHint),
            onSubmitted: (q) => setState(() => _query = q.trim().isEmpty ? null : q.trim()),
          ),
        ),
        Expanded(
          child: notesAsync.when(
            loading: () => const DbLoadingView(),
            error: (e, _) => DbErrorView(
              message: l10n.errorGeneric,
              onRetry: () => ref.invalidate(workspaceNotesProvider(_query)),
            ),
            data: (notes) {
              if (notes.isEmpty) {
                return DbEmptyView(message: l10n.emptyGeneric, icon: Icons.sticky_note_2_rounded);
              }
              return ListView(
                padding: const EdgeInsets.all(DbSpacing.md),
                children: [
                  for (final note in notes)
                    Card(
                      child: ListTile(
                        title: Text(note.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                        subtitle: Text(note.body, maxLines: 2, overflow: TextOverflow.ellipsis),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: Icon(
                                note.pinned ? Icons.push_pin_rounded : Icons.push_pin_outlined,
                                size: 20,
                              ),
                              onPressed: () async {
                                await ref.read(workspaceRepositoryProvider).updateNote(note.id, pinned: !note.pinned);
                                ref.invalidate(workspaceNotesProvider);
                              },
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline_rounded, size: 20),
                              onPressed: () async {
                                await ref.read(workspaceRepositoryProvider).deleteNote(note.id);
                                ref.invalidate(workspaceNotesProvider);
                              },
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
        ),
      ],
    );
  }
}

class _CollectionsList extends ConsumerWidget {
  const _CollectionsList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final collectionsAsync = ref.watch(workspaceCollectionsProvider);
    return collectionsAsync.when(
      loading: () => const DbLoadingView(),
      error: (e, _) => DbErrorView(
        message: l10n.errorGeneric,
        onRetry: () => ref.invalidate(workspaceCollectionsProvider),
      ),
      data: (collections) {
        if (collections.isEmpty) {
          return DbEmptyView(message: l10n.emptyGeneric, icon: Icons.folder_rounded);
        }
        return ListView(
          padding: const EdgeInsets.all(DbSpacing.md),
          children: [
            for (final collection in collections)
              Card(
                child: ListTile(
                  leading: const Icon(Icons.folder_rounded, color: DbColors.teal),
                  title: Text(collection.name),
                  trailing: Text('${collection.itemCount}'),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _RecentList extends ConsumerWidget {
  const _RecentList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final recentAsync = ref.watch(workspaceRecentProvider);
    return recentAsync.when(
      loading: () => const DbLoadingView(),
      error: (e, _) => DbErrorView(
        message: l10n.errorGeneric,
        onRetry: () => ref.invalidate(workspaceRecentProvider),
      ),
      data: (items) {
        if (items.isEmpty) {
          return DbEmptyView(message: l10n.emptyGeneric, icon: Icons.history_rounded);
        }
        return ListView(
          padding: const EdgeInsets.all(DbSpacing.md),
          children: [
            for (final item in items)
              Card(
                child: ListTile(
                  title: Text(item.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                  onTap: item.materialId.isEmpty ? null : () => context.push('/library/${item.materialId}'),
                ),
              ),
          ],
        );
      },
    );
  }
}
