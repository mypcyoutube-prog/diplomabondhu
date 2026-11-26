import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../core/api/api_client.dart';
import '../../../shared/widgets/states.dart';
import '../data/studyplan_models.dart';
import '../providers/studyplan_providers.dart';

class StudyPlanScreen extends ConsumerStatefulWidget {
  const StudyPlanScreen({super.key});

  @override
  ConsumerState<StudyPlanScreen> createState() => _StudyPlanScreenState();
}

class _StudyPlanScreenState extends ConsumerState<StudyPlanScreen> {
  final _subjectsController = TextEditingController();
  final _goalController = TextEditingController();
  double _hours = 2;
  int _days = 7;
  bool _generating = false;
  bool _notConfigured = false;

  @override
  void dispose() {
    _subjectsController.dispose();
    _goalController.dispose();
    super.dispose();
  }

  bool get _isBn =>
      AppLocalizations.of(context)?.localeName == 'bn';

  Future<void> _generate(AppLocalizations l10n) async {
    final subjects = _subjectsController.text
        .split(',')
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();
    if (subjects.isEmpty) return;
    setState(() {
      _generating = true;
      _notConfigured = false;
    });
    try {
      await ref.read(studyPlanRepositoryProvider).generate(
            subjects: subjects,
            availableHoursPerDay: _hours,
            goal: _goalController.text.trim(),
            days: _days,
          );
      ref.invalidate(studyPlanListProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.studyPlanGenerated)),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _notConfigured = e.statusCode == 503);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.statusCode == 503
              ? l10n.studyPlanNotConfigured
              : e.statusCode == 429
                  ? l10n.studyPlanLimitReached
                  : l10n.errorGeneric),
          backgroundColor: DbColors.errorLight,
        ),
      );
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  Future<void> _apply(AppLocalizations l10n, StudyPlanModel plan) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.studyPlanApply),
        content: Text(l10n.studyPlanApplyConfirm),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(l10n.cancel),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(l10n.studyPlanApply),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      final created = await ref.read(studyPlanRepositoryProvider).apply(plan.id);
      ref.invalidate(studyPlanListProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$created ${l10n.studyPlanTasksAdded}')),
      );
    } on ApiException {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.errorGeneric), backgroundColor: DbColors.errorLight),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final plans = ref.watch(studyPlanListProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.studyPlanTitle)),
      body: ListView(
        padding: const EdgeInsets.all(DbSpacing.md),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(DbSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.auto_awesome_rounded,
                          size: 18, color: DbColors.teal),
                      const SizedBox(width: DbSpacing.xs),
                      Expanded(
                        child: Text(l10n.studyPlanGenerate,
                            style: Theme.of(context).textTheme.titleMedium),
                      ),
                    ],
                  ),
                  const SizedBox(height: DbSpacing.xs),
                  Align(
                    alignment: AlignmentDirectional.centerEnd,
                    child: Chip(
                      avatar: const Icon(Icons.info_outline_rounded, size: 14),
                      label: Text(l10n.studyPlanEstimated,
                          style: const TextStyle(fontSize: 11)),
                      visualDensity: VisualDensity.compact,
                    ),
                  ),
                  TextField(
                    controller: _subjectsController,
                    decoration: InputDecoration(
                      labelText: l10n.studyPlanSubjectsHint,
                      hintText: _isBn
                          ? 'Math-1, Physics-1, English'
                          : 'Math-1, Physics-1, English',
                    ),
                  ),
                  const SizedBox(height: DbSpacing.sm),
                  TextField(
                    controller: _goalController,
                    decoration:
                        InputDecoration(labelText: l10n.studyPlanGoalHint),
                  ),
                  const SizedBox(height: DbSpacing.sm),
                  Text('${l10n.studyPlanHoursHint}: ${_hours.toStringAsFixed(1)}'),
                  Slider(
                    value: _hours,
                    min: 0.5,
                    max: 12,
                    divisions: 23,
                    onChanged: (v) => setState(() => _hours = v),
                  ),
                  Text('${l10n.studyPlanDays}: $_days'),
                  Slider(
                    value: _days.toDouble(),
                    min: 1,
                    max: 30,
                    divisions: 29,
                    onChanged: (v) => setState(() => _days = v.toInt()),
                  ),
                  const SizedBox(height: DbSpacing.xs),
                  FilledButton.icon(
                    onPressed: _generating ? null : () => _generate(l10n),
                    icon: _generating
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.auto_awesome_rounded),
                    label: Text(l10n.studyPlanGenerate),
                  ),
                  if (_notConfigured) ...[
                    const SizedBox(height: DbSpacing.xs),
                    Text(
                      l10n.studyPlanNotConfigured,
                      style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                          fontSize: 12),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: DbSpacing.sm),
          plans.when(
            loading: () => const DbLoadingView(),
            error: (e, _) => DbErrorView(
              message: l10n.errorGeneric,
              onRetry: () => ref.invalidate(studyPlanListProvider),
            ),
            data: (items) {
              if (items.isEmpty) {
                return DbEmptyView(
                  message: l10n.emptyGeneric,
                  icon: Icons.auto_awesome_rounded,
                );
              }
              return Column(
                children: items.map((plan) {
                  return Card(
                    margin: const EdgeInsets.only(bottom: DbSpacing.sm),
                    child: Padding(
                      padding: const EdgeInsets.all(DbSpacing.md),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  plan.subjects.join(', '),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style:
                                      Theme.of(context).textTheme.titleMedium,
                                ),
                              ),
                              Chip(
                                label: Text(l10n.studyPlanEstimated,
                                    style: const TextStyle(fontSize: 11)),
                                visualDensity: VisualDensity.compact,
                              ),
                            ],
                          ),
                          const SizedBox(height: DbSpacing.xs),
                          ...plan.plan.take(7).map(
                                (day) => Padding(
                                  padding: const EdgeInsets.only(
                                      bottom: DbSpacing.xs),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text('${day.label}: ${day.focus}',
                                          style: const TextStyle(
                                              fontWeight: FontWeight.w600)),
                                      ...day.tasks.map(
                                        (task) => Padding(
                                          padding: const EdgeInsetsDirectional
                                              .only(start: DbSpacing.md),
                                          child: Text(
                                              '\u2022 ${task.title} (${task.minutes} min)'),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              TextButton.icon(
                                onPressed: () => _apply(l10n, plan),
                                icon: const Icon(Icons.playlist_add_check_rounded,
                                    size: 18),
                                label: Text(l10n.studyPlanApply),
                              ),
                              IconButton(
                                tooltip: l10n.delete,
                                icon: const Icon(Icons.delete_outline_rounded),
                                onPressed: () async {
                                  await ref
                                      .read(studyPlanRepositoryProvider)
                                      .delete(plan.id);
                                  ref.invalidate(studyPlanListProvider);
                                },
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}
