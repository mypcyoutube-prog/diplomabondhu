import 'package:material_ui/material_ui.dart' hide Material;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../data/material.dart';
import '../providers/library_providers.dart';

class LibraryScreen extends ConsumerWidget {
  const LibraryScreen({super.key});

  static const _tabs = <(String, String)>[
    ('book', 'books'),
    ('note', 'notes'),
    ('subject_material', 'subjectMaterials'),
    ('video', 'videos'),
    ('past_question', 'previousQuestions'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final page = ref.watch(libraryControllerProvider);
    final filter = ref.watch(libraryFilterProvider);

    return DefaultTabController(
      length: _tabs.length,
      initialIndex: _tabs.indexWhere((t) => t.$1 == filter.type).clamp(0, _tabs.length - 1),
      child: Scaffold(
        appBar: AppBar(
          title: Text(l10n.library),
          bottom: TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            onTap: (i) => ref.read(libraryFilterProvider.notifier).setType(_tabs[i].$1),
            tabs: _tabs.map((t) => Tab(text: _label(l10n, t.$2))).toList(),
          ),
        ),
        body: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: TextField(
                decoration: InputDecoration(
                  hintText: l10n.searchHint,
                  prefixIcon: const Icon(Icons.search_rounded),
                ),
                textInputAction: TextInputAction.search,
                onSubmitted: (q) => ref.read(libraryFilterProvider.notifier).setQuery(q),
              ),
            ),
            Expanded(
              child: AsyncValueView(
                value: page,
                onRetry: () => ref.invalidate(libraryControllerProvider),
                isEmpty: (p) => p.items.isEmpty,
                builder: (context, p) => RefreshIndicator(
                  onRefresh: () async => ref.invalidate(libraryControllerProvider),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: p.items.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, i) => _MaterialCard(
                      material: p.items[i],
                      onOpen: () => context.push('/library/${p.items[i].id}'),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _label(AppLocalizations l10n, String key) => switch (key) {
        'books' => l10n.books,
        'notes' => l10n.notes,
        'videos' => l10n.videos,
        'subjectMaterials' => l10n.subjectMaterials,
        'previousQuestions' => l10n.previousQuestions,
        _ => key,
      };
}

class _MaterialCard extends StatelessWidget {
  final Material material;
  final VoidCallback onOpen;

  const _MaterialCard({required this.material, required this.onOpen});

  IconData get _icon => switch (material.type) {
        'book' => Icons.menu_book_rounded,
        'note' => Icons.sticky_note_2_rounded,
        'video' => Icons.play_circle_rounded,
        'past_question' => Icons.history_edu_rounded,
        _ => Icons.folder_rounded,
      };

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        onTap: onOpen,
        leading: Icon(_icon, color: DbColors.teal, size: 32),
        title: Text(
          material.title,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          material.payload.examYear != null
              ? '${material.type} · ${material.payload.examYear}'
              : material.type,
          maxLines: 1,
        ),
        trailing: const Icon(Icons.chevron_right_rounded),
      ),
    );
  }
}
