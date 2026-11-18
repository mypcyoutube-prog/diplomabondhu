import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../providers/subject_providers.dart';

class SubjectCatalogScreen extends ConsumerStatefulWidget {
  const SubjectCatalogScreen({super.key});

  @override
  ConsumerState<SubjectCatalogScreen> createState() =>
      _SubjectCatalogScreenState();
}

class _SubjectCatalogScreenState extends ConsumerState<SubjectCatalogScreen> {
  int _regulation = 2022;
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final asyncTechs = ref.watch(catalogTechnologiesProvider(_regulation));

    return Scaffold(
      appBar: AppBar(title: Text(l10n.subjectCatalog)),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(DbSpacing.md, DbSpacing.sm + 4, DbSpacing.md, 0),
            child: Text(l10n.subjectCatalogSubtitle,
                style: theme.textTheme.bodyMedium),
          ),
          const SizedBox(height: DbSpacing.sm + 4),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: DbSpacing.md),
            child: Row(
              children: [
                for (final reg in const [2022, 2016])
                  Padding(
                    padding: const EdgeInsets.only(right: DbSpacing.sm),
                    child: _RegulationChip(
                      label: '${l10n.regulationLabel} $reg',
                      selected: _regulation == reg,
                      onTap: () => setState(() => _regulation = reg),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: DbSpacing.sm + 4),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: DbSpacing.md),
            child: TextField(
              onChanged: (v) => setState(() => _query = v.trim().toLowerCase()),
              decoration: InputDecoration(
                hintText: l10n.searchSubjects,
                prefixIcon: const Icon(Icons.search_rounded),
              ),
            ),
          ),
          const SizedBox(height: DbSpacing.sm + 4),
          Expanded(
            child: asyncTechs.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: DbSpacing.lg),
                      child: Text(l10n.errorGeneric, textAlign: TextAlign.center),
                    ),
                    const SizedBox(height: DbSpacing.sm),
                    FilledButton.tonal(
                      onPressed: () =>
                          ref.invalidate(catalogTechnologiesProvider(_regulation)),
                      child: Text(l10n.retry),
                    ),
                  ],
                ),
              ),
              data: (techs) {
                final filtered = _query.isEmpty
                    ? techs
                    : techs
                        .where((t) =>
                            t.technology.toLowerCase().contains(_query) ||
                            t.technologySlug.contains(_query))
                        .toList();
                if (filtered.isEmpty) {
                  return Center(child: Text(l10n.noSubjectsFound));
                }
                return RefreshIndicator(
                  onRefresh: () async =>
                      ref.refresh(catalogTechnologiesProvider(_regulation).future),
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(
                        DbSpacing.md, DbSpacing.xs, DbSpacing.md, DbSpacing.xl),
                    itemCount: filtered.length,
                    itemBuilder: (context, i) {
                      final t = filtered[i];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: DbSpacing.sm),
                        child: _FadeInUp(
                          index: i.clamp(0, 8),
                          child: _TechCard(
                            technology: t.technology,
                            subjectsLabel:
                                l10n.subjectsCount(t.subjectCount),
                            onTap: () => context.push(
                                '/subjects/${t.technologySlug}?reg=${t.regulation}'
                                '&name=${Uri.encodeComponent(t.technology)}'),
                          ),
                        ),
                      );
                    },
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

class _RegulationChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _RegulationChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      child: InkWell(
        borderRadius: BorderRadius.circular(DbRadius.chip),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: selected
                ? DbColors.navy
                : Theme.of(context)
                    .colorScheme
                    .surfaceContainerHighest
                    .withValues(alpha: 0.6),
            borderRadius: BorderRadius.circular(DbRadius.chip),
            border: Border.all(
                color: selected
                    ? DbColors.navy
                    : DbColors.navy.withValues(alpha: 0.25)),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: selected ? Colors.white : DbColors.navy,
            ),
          ),
        ),
      ),
    );
  }
}

class _TechCard extends StatelessWidget {
  final String technology;
  final String subjectsLabel;
  final VoidCallback onTap;

  const _TechCard({
    required this.technology,
    required this.subjectsLabel,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: theme.colorScheme.surface,
      borderRadius: BorderRadius.circular(DbRadius.card),
      child: InkWell(
        borderRadius: BorderRadius.circular(DbRadius.card),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(DbSpacing.md),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(DbRadius.card),
            border: Border.all(color: theme.dividerColor.withValues(alpha: 0.4)),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                      colors: [DbColors.navy, DbColors.teal]),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.school_rounded,
                    color: Colors.white, size: 22),
              ),
              const SizedBox(width: DbSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(technology,
                        style: theme.textTheme.titleSmall
                            ?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text(subjectsLabel, style: theme.textTheme.bodySmall),
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

class _FadeInUp extends StatefulWidget {
  final int index;
  final Widget child;

  const _FadeInUp({required this.index, required this.child});

  @override
  State<_FadeInUp> createState() => _FadeInUpState();
}

class _FadeInUpState extends State<_FadeInUp>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
      vsync: this, duration: const Duration(milliseconds: 350));
  late final Animation<double> _fade =
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic);

  @override
  void initState() {
    super.initState();
    Future<void>.delayed(Duration(milliseconds: 28 * widget.index), () {
      if (mounted) _controller.forward();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fade,
      child: SlideTransition(
        position: Tween<Offset>(begin: const Offset(0, 0.06), end: Offset.zero)
            .animate(_fade),
        child: widget.child,
      ),
    );
  }
}
