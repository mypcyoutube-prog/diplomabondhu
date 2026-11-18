
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../providers/subject_providers.dart';

class TechnologySubjectsScreen extends ConsumerStatefulWidget {
  final String technologySlug;
  final int regulation;
  final String technologyName;

  const TechnologySubjectsScreen({
    super.key,
    required this.technologySlug,
    required this.regulation,
    required this.technologyName,
  });

  @override
  ConsumerState<TechnologySubjectsScreen> createState() =>
      _TechnologySubjectsScreenState();
}

class _TechnologySubjectsScreenState
    extends ConsumerState<TechnologySubjectsScreen> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final asyncSubjects = ref.watch(technologySubjectsProvider(
      CatalogTechRequest(
          technologySlug: widget.technologySlug, regulation: widget.regulation),
    ));

    return Scaffold(
      appBar: AppBar(title: Text(widget.technologyName)),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
                DbSpacing.md, DbSpacing.sm + 4, DbSpacing.md, 0),
            child: TextField(
              onChanged: (v) => setState(() => _query = v.trim().toLowerCase()),
              decoration: InputDecoration(
                hintText: l10n.searchSubjects,
                prefixIcon: const Icon(Icons.search_rounded),
              ),
            ),
          ),
          Expanded(
            child: asyncSubjects.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Padding(
                      padding:
                          const EdgeInsets.symmetric(horizontal: DbSpacing.lg),
                      child:
                          Text(l10n.errorGeneric, textAlign: TextAlign.center),
                    ),
                    const SizedBox(height: DbSpacing.sm),
                    FilledButton.tonal(
                      onPressed: () => ref.invalidate(
                          technologySubjectsProvider(CatalogTechRequest(
                              technologySlug: widget.technologySlug,
                              regulation: widget.regulation))),
                      child: Text(l10n.retry),
                    ),
                  ],
                ),
              ),
              data: (rows) {
                final filtered = _query.isEmpty
                    ? rows
                    : rows
                        .where((r) =>
                            r.name.toLowerCase().contains(_query) ||
                            r.code.contains(_query))
                        .toList();
                if (filtered.isEmpty) {
                  return Center(child: Text(l10n.noSubjectsFound));
                }
                final semesters = filtered.map((r) => r.semester).toSet().toList()
                  ..sort();
                return ListView(
                  padding: const EdgeInsets.fromLTRB(DbSpacing.md,
                      DbSpacing.sm + 4, DbSpacing.md, DbSpacing.xl),
                  children: [
                    for (final sem in semesters) ...[
                      Padding(
                        padding: const EdgeInsets.only(
                            top: DbSpacing.sm, bottom: DbSpacing.sm),
                        child: Text(
                          '${l10n.semester} $sem',
                          style: theme.textTheme.titleSmall
                              ?.copyWith(fontWeight: FontWeight.w800),
                        ),
                      ),
                      for (final r in filtered.where((r) => r.semester == sem))
                        Padding(
                          padding: const EdgeInsets.only(bottom: DbSpacing.sm),
                          child: _SubjectTile(
                            code: r.code,
                            name: r.name,
                            type: r.type,
                            groupLabel: r.groupLabel,
                            credits: r.credits,
                            theoryMarks: r.theoryMaxMarks,
                            practicalMarks: r.practicalMaxMarks,
                          ),
                        ),
                    ],
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _SubjectTile extends StatelessWidget {
  final String code;
  final String name;
  final String? type;
  final String? groupLabel;
  final double? credits;
  final int? theoryMarks;
  final int? practicalMarks;

  const _SubjectTile({
    required this.code,
    required this.name,
    required this.type,
    required this.groupLabel,
    required this.credits,
    required this.theoryMarks,
    required this.practicalMarks,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context)!;
    return Container(
      padding: const EdgeInsets.symmetric(
          horizontal: DbSpacing.md, vertical: DbSpacing.sm + 2),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(DbRadius.input),
        border: Border.all(color: theme.dividerColor.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: DbColors.navy.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(DbRadius.chip),
                ),
                child: Text(
                  code,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: DbColors.navy,
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
              ),
              const SizedBox(width: DbSpacing.sm),
              if (type != null)
                Text(type!,
                    style: theme.textTheme.bodySmall
                        ?.copyWith(fontWeight: FontWeight.w600)),
              const Spacer(),
              if (credits != null)
                Text(
                  '${l10n.credits} ${_formatCredits(credits!)}',
                  style: theme.textTheme.bodySmall
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
            ],
          ),
          const SizedBox(height: 4),
          Text(name,
              style: theme.textTheme.bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w600)),
          if (groupLabel != null && groupLabel!.trim().isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(groupLabel!, style: theme.textTheme.bodySmall),
          ],
          if (theoryMarks != null || practicalMarks != null) ...[
            const SizedBox(height: DbSpacing.xs),
            Row(
              children: [
                if (theoryMarks != null)
                  _MarksPill(label: l10n.marksTheory(theoryMarks!)),
                if (theoryMarks != null && practicalMarks != null)
                  const SizedBox(width: DbSpacing.xs),
                if (practicalMarks != null)
                  _MarksPill(label: l10n.marksPractical(practicalMarks!)),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

String _formatCredits(double credits) =>
    credits == credits.roundToDouble()
        ? credits.toStringAsFixed(0)
        : '$credits';

class _MarksPill extends StatelessWidget {
  final String label;

  const _MarksPill({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: DbColors.teal.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(DbRadius.chip),
      ),
      child: Text(
        label,
        style: const TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w600,
            color: DbColors.teal,
            fontFeatures: [FontFeature.tabularFigures()]),
      ),
    );
  }
}
