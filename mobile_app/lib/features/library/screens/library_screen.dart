import 'package:material_ui/material_ui.dart' hide Material;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../data/material.dart';
import '../providers/library_providers.dart';

class LibraryScreen extends ConsumerStatefulWidget {
  const LibraryScreen({super.key});

  @override
  ConsumerState<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends ConsumerState<LibraryScreen> {
  static const _tabs = <(String, String)>[
    ('book', 'books'),
    ('note', 'notes'),
    ('subject_material', 'subjectMaterials'),
    ('video', 'videos'),
    ('past_question', 'previousQuestions'),
  ];

  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _searchController.text = ref.read(libraryFilterProvider).q ?? '';
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
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
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: l10n.searchHint,
                  prefixIcon: const Icon(Icons.search_rounded),
                  suffixIcon: (filter.q ?? '').isNotEmpty
                      ? IconButton(
                          tooltip: l10n.cancel,
                          icon: const Icon(Icons.close_rounded),
                          onPressed: () {
                            _searchController.clear();
                            ref.read(libraryFilterProvider.notifier).setQuery('');
                          },
                        )
                      : null,
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
                    itemCount: p.items.length + (p.items.length < p.total ? 1 : 0),
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, i) {
                      if (i >= p.items.length) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: DbSpacing.sm),
                          child: OutlinedButton.icon(
                            onPressed: page.isLoading
                                ? null
                                : () =>
                                    ref.read(libraryControllerProvider.notifier).loadMore(),
                            icon: page.isLoading
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : const Icon(Icons.expand_more_rounded),
                            label: Text(l10n.loadMore),
                          ),
                        );
                      }
                      return _MaterialCard(
                        material: p.items[i],
                        onOpen: () => context.push('/library/${p.items[i].id}'),
                      );
                    },
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

  Color get _accent => switch (material.type) {
        'book' => DbColors.teal,
        'note' => DbColors.infoLight,
        'video' => DbColors.errorLight,
        'past_question' => DbColors.warningLight,
        _ => DbColors.emerald,
      };

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final meta = <String>[
      material.payload.examYear != null
          ? '${l10n.examYearLabel}: ${material.payload.examYear}'
          : '',
      material.payload.pageCount != null
          ? '${material.payload.pageCount} ${l10n.pagesLabel}'
          : '',
    ].where((m) => m.isNotEmpty).join(' · ');

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(DbRadius.card),
        onTap: onOpen,
        child: Padding(
          padding: const EdgeInsets.all(DbSpacing.md),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: _accent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(DbRadius.input),
                ),
                child: Icon(_icon, color: _accent, size: 26),
              ),
              const SizedBox(width: DbSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      material.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      meta.isNotEmpty ? meta : material.type,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(context).colorScheme.outline,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded),
            ],
          ),
        ),
      ),
    );
  }
}
