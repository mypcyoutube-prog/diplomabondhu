import 'package:material_ui/material_ui.dart' hide Material;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../../home/providers/home_providers.dart';
import '../data/material.dart';
import '../providers/library_providers.dart';

class LibraryScreen extends ConsumerStatefulWidget {
  const LibraryScreen({super.key});

  @override
  ConsumerState<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends ConsumerState<LibraryScreen> {
  static const _tabs = <(String, String, String)>[
    ('book', 'books', 'book'),
    ('note', 'notes', 'note'),
    ('subject_material', 'subjectMaterials', 'subjectMaterial'),
    ('video', 'videos', 'video'),
    ('past_question', 'previousQuestions', 'pastQuestion'),
  ];

  final _searchController = TextEditingController();
  final _techNames = <String, String>{};
  final _semNames = <String, String>{};
  final _subNames = <String, String>{};

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

  List<(String, String, String)> _visibleTabs(
      ({bool book, bool note, bool video, bool subjectMaterial, bool pastQuestion}) cats) {
    return _tabs.where((t) => switch (t.$3) {
          'book' => cats.book,
          'note' => cats.note,
          'subjectMaterial' => cats.subjectMaterial,
          'video' => cats.video,
          'pastQuestion' => cats.pastQuestion,
          _ => true,
        }).toList();
  }

  Future<void> _pickOption(
    BuildContext context, {
    required String title,
    required List<RefOption> options,
    required String? selectedId,
    required ValueChanged<String?> onSelected,
  }) async {
    final l10n = AppLocalizations.of(context)!;
    final picked = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Text(title,
                  style: Theme.of(ctx).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            ),
            ListTile(
              leading: Icon(
                selectedId == null ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                color: selectedId == null ? DbColors.teal : null,
              ),
              title: Text(l10n.all),
              onTap: () => Navigator.pop(ctx, ''),
            ),
            for (final option in options)
              ListTile(
                leading: Icon(
                  selectedId == option.id
                      ? Icons.check_circle_rounded
                      : Icons.radio_button_unchecked_rounded,
                  color: selectedId == option.id ? DbColors.teal : null,
                ),
                title: Text(option.name),
                onTap: () => Navigator.pop(ctx, option.id),
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (picked != null) onSelected(picked.isEmpty ? null : picked);
  }

  Future<void> _pickSort(BuildContext context, String current) async {
    final l10n = AppLocalizations.of(context)!;
    final options = <(String, String)>[
      ('recent', l10n.sortLatest),
      ('oldest', l10n.sortOldest),
      ('popular', l10n.sortPopular),
      ('title', l10n.sortTitleAZ),
    ];
    final picked = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Text(l10n.sortBy,
                  style: Theme.of(ctx).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            ),
            for (final (value, label) in options)
              ListTile(
                leading: Icon(
                  current == value ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                  color: current == value ? DbColors.teal : null,
                ),
                title: Text(label),
                onTap: () => Navigator.pop(ctx, value),
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (picked != null && picked != current) {
      ref.read(libraryFilterProvider.notifier).setSort(picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final page = ref.watch(libraryControllerProvider);
    final filter = ref.watch(libraryFilterProvider);
    final settings = ref.watch(appSettingsProvider).valueOrNull;
    final tabs = _visibleTabs(settings?.libraryCategories ??
        (book: true, note: true, video: true, subjectMaterial: true, pastQuestion: true));
    final counts = page.valueOrNull?.counts ?? const <String, int>{};
    final sortLabel = switch (filter.sort) {
      'oldest' => l10n.sortOldest,
      'popular' => l10n.sortPopular,
      'title' => l10n.sortTitleAZ,
      _ => l10n.sortLatest,
    };

    return DefaultTabController(
      length: tabs.length,
      initialIndex: tabs.indexWhere((t) => t.$1 == filter.type).clamp(0, tabs.length - 1),
      child: Scaffold(
        appBar: AppBar(
          title: Text(l10n.library),
          actions: [
            IconButton(
              tooltip: l10n.myBookmarks,
              icon: const Icon(Icons.bookmarks_rounded),
              onPressed: () => context.push('/bookmarks'),
            ),
          ],
          bottom: TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            onTap: (i) => ref.read(libraryFilterProvider.notifier).setType(tabs[i].$1),
            tabs: [
              for (final t in tabs)
                Tab(text: _tabLabel(l10n, t, counts[t.$1])),
            ],
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
            SizedBox(
              height: 44,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  _FilterChipButton(
                    label: filter.technologyId == null
                        ? l10n.filterTechnology
                        : (_techNames[filter.technologyId!] ?? l10n.filterTechnology),
                    icon: Icons.memory_rounded,
                    active: filter.technologyId != null,
                    onTap: () async {
                      final options = await ref.read(libraryTechnologiesProvider.future);
                      for (final o in options) {
                        _techNames[o.id] = o.name;
                      }
                      if (!context.mounted) return;
                      await _pickOption(
                        context,
                        title: l10n.filterTechnology,
                        options: options,
                        selectedId: filter.technologyId,
                        onSelected: (id) {
                          setState(() {
                            if (id != filter.technologyId) _subNames.clear();
                          });
                          ref.read(libraryFilterProvider.notifier).setTechnology(id);
                        },
                      );
                    },
                  ),
                  const SizedBox(width: 8),
                  _FilterChipButton(
                    label: filter.semesterId == null
                        ? l10n.filterSemester
                        : (_semNames[filter.semesterId!] ?? l10n.filterSemester),
                    icon: Icons.layers_rounded,
                    active: filter.semesterId != null,
                    onTap: () async {
                      final options = await ref.read(librarySemestersProvider.future);
                      for (final o in options) {
                        _semNames[o.id] = o.name;
                      }
                      if (!context.mounted) return;
                      await _pickOption(
                        context,
                        title: l10n.filterSemester,
                        options: options,
                        selectedId: filter.semesterId,
                        onSelected: (id) {
                          setState(() {
                            if (id != filter.semesterId) _subNames.clear();
                          });
                          ref.read(libraryFilterProvider.notifier).setSemester(id);
                        },
                      );
                    },
                  ),
                  const SizedBox(width: 8),
                  _FilterChipButton(
                    label: filter.subjectId == null
                        ? l10n.filterSubject
                        : (_subNames[filter.subjectId!] ?? l10n.filterSubject),
                    icon: Icons.menu_book_rounded,
                    active: filter.subjectId != null,
                    onTap: () async {
                      final options =
                          await ref.read(librarySubjectsProvider(filter).future);
                      for (final o in options) {
                        _subNames[o.id] = o.name;
                      }
                      if (!context.mounted) return;
                      await _pickOption(
                        context,
                        title: l10n.filterSubject,
                        options: options,
                        selectedId: filter.subjectId,
                        onSelected: (id) =>
                            ref.read(libraryFilterProvider.notifier).setSubject(id),
                      );
                    },
                  ),
                  if (filter.type == 'past_question') ...[
                    const SizedBox(width: 8),
                    _FilterChipButton(
                      label: filter.examYear == null
                          ? l10n.filterYear
                          : filter.examYear.toString(),
                      icon: Icons.calendar_today_rounded,
                      active: filter.examYear != null,
                      onTap: () => _pickYear(context, filter.examYear),
                    ),
                  ],
                  const SizedBox(width: 8),
                  _FilterChipButton(
                    label: '${l10n.sortBy}: $sortLabel',
                    icon: Icons.sort_rounded,
                    active: filter.sort != 'recent',
                    onTap: () => _pickSort(context, filter.sort),
                  ),
                  if (filter.hasActiveFilters) ...[
                    const SizedBox(width: 8),
                    _FilterChipButton(
                      label: l10n.clearFilters,
                      icon: Icons.close_rounded,
                      active: true,
                      onTap: () {
                        setState(() => _subNames.clear());
                        ref.read(libraryFilterProvider.notifier).clearAll();
                      },
                    ),
                  ],
                ],
              ),
            ),
            Expanded(
              child: AsyncValueView(
                value: page,
                onRetry: () => ref.invalidate(libraryControllerProvider),
                isEmpty: (p) => p.items.isEmpty,
                builder: (context, p) {
                  final hasMore = p.items.length < p.total;
                  return ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: p.items.length + (hasMore ? 1 : 1),
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (context, i) {
                      if (i >= p.items.length) {
                        if (hasMore) {
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: DbSpacing.sm),
                            child: OutlinedButton.icon(
                              onPressed: page.isLoading
                                  ? null
                                  : () => ref
                                      .read(libraryControllerProvider.notifier)
                                      .loadMore(),
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
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: DbSpacing.md),
                          child: Row(
                            children: [
                              const Expanded(child: Divider()),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 12),
                                child: Text(
                                  l10n.endOfList,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Theme.of(context).colorScheme.outline,
                                  ),
                                ),
                              ),
                              const Expanded(child: Divider()),
                            ],
                          ),
                        );
                      }
                      return _MaterialCard(
                        material: p.items[i],
                        onOpen: () => context.push('/library/${p.items[i].id}'),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickYear(BuildContext context, int? current) async {
    final l10n = AppLocalizations.of(context)!;
    final now = DateTime.now().year;
    final years = [for (var y = now; y >= now - 15; y--) y];
    final picked = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Text(l10n.filterYear,
                  style: Theme.of(ctx).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            ),
            ListTile(
              leading: Icon(
                current == null ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                color: current == null ? DbColors.teal : null,
              ),
              title: Text(l10n.all),
              onTap: () => Navigator.pop(ctx, ''),
            ),
            for (final year in years)
              ListTile(
                leading: Icon(
                  current == year ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                  color: current == year ? DbColors.teal : null,
                ),
                title: Text('$year'),
                onTap: () => Navigator.pop(ctx, '$year'),
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (picked != null) {
      ref.read(libraryFilterProvider.notifier).setExamYear(picked.isEmpty ? null : int.parse(picked));
    }
  }

  String _tabLabel(AppLocalizations l10n, (String, String, String) tab, int? count) {
    final base = switch (tab.$2) {
      'books' => l10n.books,
      'notes' => l10n.notes,
      'videos' => l10n.videos,
      'subjectMaterials' => l10n.subjectMaterials,
      'previousQuestions' => l10n.previousQuestions,
      _ => tab.$2,
    };
    return count != null && count > 0 ? '$base ($count)' : base;
  }
}

class _FilterChipButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool active;
  final VoidCallback onTap;

  const _FilterChipButton({
    required this.label,
    required this.icon,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      onPressed: onTap,
      avatar: Icon(icon,
          size: 17,
          color: active ? Colors.white : Theme.of(context).colorScheme.outline),
      label: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: active ? Colors.white : null,
        ),
      ),
      backgroundColor: active ? DbColors.teal : null,
      side: BorderSide(
        color: active ? DbColors.teal : Theme.of(context).dividerColor,
      ),
    );
  }
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

  String _durationLabel() {
    final sec = material.payload.durationSec;
    if (sec == null || sec <= 0) return '';
    final m = sec ~/ 60;
    final s = sec % 60;
    return m >= 60 ? '${m ~/ 60}:${(m % 60).toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}' : '$m:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final thumbnail = material.payload.thumbnailUrl;
    final duration = _durationLabel();

    final meta = <String>[
      if (material.payload.author?.isNotEmpty == true)
        '${l10n.authorLabel}: ${material.payload.author}',
      if (material.payload.edition?.isNotEmpty == true)
        '${l10n.editionLabel}: ${material.payload.edition}',
      material.payload.examYear != null
          ? '${l10n.examYearLabel}: ${material.payload.examYear}'
          : '',
      material.payload.pageCount != null
          ? '${material.payload.pageCount} ${l10n.pagesLabel}'
          : '',
      material.viewCount > 0 ? '${material.viewCount} ${l10n.viewsLabel}' : '',
    ].where((m) => m.isNotEmpty).join(' · ');

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        borderRadius: BorderRadius.circular(DbRadius.card),
        onTap: onOpen,
        child: Padding(
          padding: const EdgeInsets.all(DbSpacing.md),
          child: Row(
            children: [
              Stack(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      gradient: thumbnail == null
                          ? LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [_accent, _accent.withValues(alpha: 0.75)],
                            )
                          : null,
                      borderRadius: BorderRadius.circular(DbRadius.input),
                    ),
                    child: thumbnail != null
                        ? Image.network(
                            thumbnail,
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) => Icon(_icon, color: Colors.white, size: 26),
                          )
                        : Icon(_icon, color: Colors.white, size: 26),
                  ),
                  if (duration.isNotEmpty)
                    Positioned(
                      bottom: 2,
                      right: 2,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.7),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          duration,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                ],
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
                    if (meta.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        meta,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12,
                          color: Theme.of(context).colorScheme.outline,
                        ),
                      ),
                    ],
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
