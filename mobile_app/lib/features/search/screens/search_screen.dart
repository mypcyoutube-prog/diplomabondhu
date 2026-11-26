import 'dart:async';

import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../shared/widgets/states.dart';
import '../data/search_models.dart';
import '../providers/search_providers.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key, this.initialQuery = ''});

  final String initialQuery;

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  late final TextEditingController _controller =
      TextEditingController(text: widget.initialQuery);
  String _submitted = '';
  String? _type;
  Timer? _debounce;

  static const _types = <(String?, IconData)>[
    (null, Icons.search_rounded),
    ('material', Icons.menu_book_rounded),
    ('exam', Icons.quiz_rounded),
    ('post', Icons.forum_rounded),
    ('subject', Icons.category_rounded),
  ];

  @override
  void initState() {
    super.initState();
    if (widget.initialQuery.trim().length >= 2) {
      _submitted = widget.initialQuery.trim();
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      if (!mounted) return;
      setState(() => _submitted = value.trim());
    });
  }

  String _typeLabel(AppLocalizations l10n, String type) {
    switch (type) {
      case 'material':
        return l10n.searchMaterials;
      case 'exam':
        return l10n.exams;
      case 'post':
        return l10n.searchPosts;
      case 'subject':
        return l10n.searchSubjects;
    }
    return type;
  }

  void _openHit(SearchHit hit) {
    if (hit.id.isEmpty) return;
    switch (hit.type) {
      case 'material':
        context.push('/library/${hit.id}');
      case 'exam':
        context.push('/exams/${hit.id}');
      case 'post':
        context.push('/community/${hit.id}');
      case 'subject':
        context.push('/search?q=${Uri.encodeComponent(hit.title)}');
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final canSearch = _submitted.length >= 2;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.searchTitle)),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
                DbSpacing.md, DbSpacing.sm + 4, DbSpacing.md, 0),
            child: TextField(
              controller: _controller,
              autofocus: _submitted.isEmpty,
              onChanged: _onChanged,
              decoration: InputDecoration(hintText: l10n.searchHint),
            ),
          ),
          const SizedBox(height: DbSpacing.sm + 4),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: DbSpacing.md),
            child: Row(
              children: [
                for (final (type, icon) in _types)
                  Padding(
                    padding: const EdgeInsets.only(right: DbSpacing.sm),
                    child: _TypeChip(
                      label: type == null
                          ? l10n.searchAll
                          : _typeLabel(l10n, type),
                      icon: icon,
                      selected: _type == type,
                      onTap: () => setState(() => _type = type),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: DbSpacing.sm + 4),
          Expanded(
            child: !canSearch
                ? _RecentSearches(
                    onSelected: (q) {
                      _controller.text = q;
                      setState(() => _submitted = q);
                    },
                  )
                : ref.watch(searchBundleProvider((_submitted, _type))).when(
                      loading: () => const DbLoadingView(),
                      error: (e, _) => DbErrorView(
                        message: l10n.errorGeneric,
                        onRetry: () => ref.invalidate(
                            searchBundleProvider((_submitted, _type))),
                      ),
                      data: (bundle) {
                        if (bundle.hits.isEmpty) {
                          return DbEmptyView(message: l10n.emptyGeneric);
                        }
                        if (_type == null) {
                          return ListView(
                            padding:
                                const EdgeInsets.fromLTRB(DbSpacing.md, 0, DbSpacing.md, DbSpacing.md),
                            children: [
                              for (final entry in bundle.counts.entries)
                                ...[
                                  if (entry.value > 0)
                                    Padding(
                                      padding: const EdgeInsets.only(bottom: DbSpacing.sm),
                                      child: DbSectionHeader(
                                        title: '${_typeLabel(l10n, entry.key)} (${entry.value})',
                                      ),
                                    ),
                                  for (final hit in bundle.hits)
                                    if (hit.type == entry.key)
                                      _ResultCard(
                                        hit: hit,
                                        typeLabel: _typeLabel(l10n, hit.type),
                                        onTap: () => _openHit(hit),
                                      ),
                                ],
                            ],
                          );
                        }
                        return ListView.builder(
                          padding: const EdgeInsets.fromLTRB(DbSpacing.md, 0, DbSpacing.md, DbSpacing.md),
                          itemCount: bundle.hits.length,
                          itemBuilder: (context, index) => _ResultCard(
                            hit: bundle.hits[index],
                            typeLabel: _typeLabel(l10n, _type!),
                            onTap: () => _openHit(bundle.hits[index]),
                          ),
                        );
                      },
                    ),
          ),
        ],
      ),
    );
  }
}

class _RecentSearches extends ConsumerWidget {
  final ValueChanged<String> onSelected;

  const _RecentSearches({required this.onSelected});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final history = ref.watch(searchHistoryProvider);
    return history.when(
      loading: () => DbEmptyView(
          message: l10n.searchStartTyping, icon: Icons.search_rounded),
      error: (e, _) => DbEmptyView(
          message: l10n.searchStartTyping, icon: Icons.search_rounded),
      data: (items) {
        if (items.isEmpty) {
          return DbEmptyView(
              message: l10n.searchStartTyping, icon: Icons.search_rounded);
        }
        return ListView(
          padding: const EdgeInsets.all(DbSpacing.md),
          children: [
            DbSectionHeader(title: l10n.searchRecent),
            const SizedBox(height: DbSpacing.sm),
            Wrap(
              spacing: DbSpacing.sm,
              runSpacing: DbSpacing.sm,
              children: items
                  .map((q) => ActionChip(
                        label: Text(q),
                        onPressed: () => onSelected(q),
                      ))
                  .toList(),
            ),
          ],
        );
      },
    );
  }
}

class _TypeChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  const _TypeChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return FilterChip(
      selected: selected,
      onSelected: (_) => onTap(),
      avatar: Icon(icon, size: 18, color: selected ? null : DbColors.teal),
      label: Text(label, style: theme.textTheme.labelMedium),
    );
  }
}

class _ResultCard extends StatelessWidget {
  final SearchHit hit;
  final String typeLabel;
  final VoidCallback onTap;

  const _ResultCard({
    required this.hit,
    required this.typeLabel,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final icon = switch (hit.type) {
      'material' => Icons.menu_book_rounded,
      'exam' => Icons.quiz_rounded,
      'post' => Icons.forum_rounded,
      'subject' => Icons.category_rounded,
      _ => Icons.search_rounded,
    };
    return Card(
      child: ListTile(
        onTap: onTap,
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: DbColors.teal.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(DbRadius.input),
          ),
          child: Icon(icon, size: 20, color: DbColors.teal),
        ),
        title: Text(hit.title, maxLines: 2, overflow: TextOverflow.ellipsis),
        subtitle: Text(typeLabel, style: theme.textTheme.labelSmall),
      ),
    );
  }
}
