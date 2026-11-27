import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../../../shared/widgets/pressable_scale.dart';
import '../../../shared/widgets/states.dart';
import '../data/exam.dart';
import '../providers/exam_providers.dart';

class ExamCenterScreen extends ConsumerWidget {
  const ExamCenterScreen({super.key});

  static const _types = <(String?, String)>[
    (null, 'filterAll'),
    ('model', 'examTypeModel'),
    ('previous', 'examTypePrevious'),
    ('chapter', 'examTypeChapter'),
    ('subject', 'examTypeSubject'),
    ('semester', 'examTypeSemester'),
  ];

  String _typeLabel(AppLocalizations l10n, String key) => switch (key) {
        'filterAll' => l10n.filterAll,
        'examTypeModel' => l10n.examTypeModel,
        'examTypePrevious' => l10n.examTypePrevious,
        'examTypeChapter' => l10n.examTypeChapter,
        'examTypeSubject' => l10n.examTypeSubject,
        'examTypeSemester' => l10n.examTypeSemester,
        _ => key,
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final exams = ref.watch(examListControllerProvider);
    final stats = ref.watch(examStatsProvider);
    final selectedType = ref.watch(examTypeFilterProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.exams)),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(examListControllerProvider);
          ref.invalidate(examStatsProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            stats.maybeWhen(
              data: (s) => Container(
                padding: const EdgeInsets.all(DbSpacing.md),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [DbColors.navy, DbColors.navyDark],
                  ),
                  borderRadius: BorderRadius.circular(DbRadius.card),
                  boxShadow: DbShadows.card,
                ),
                child: Row(
                  children: [
                    _HeroStat(
                      value: '${s['attempts'] ?? 0}',
                      label: l10n.exams,
                      icon: Icons.assignment_turned_in_rounded,
                    ),
                    _divider(),
                    _HeroStat(
                      value: '${s['avgPercent'] ?? 0}%',
                      label: l10n.avgScore,
                      icon: Icons.percent_rounded,
                    ),
                    _divider(),
                    _HeroStat(
                      value: '${s['bestPercent'] ?? 0}%',
                      label: l10n.examResult,
                      icon: Icons.emoji_events_rounded,
                    ),
                  ],
                ),
              ),
              orElse: () => const SizedBox.shrink(),
            ),
            const SizedBox(height: DbSpacing.md),
            SizedBox(
              height: 40,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _types.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (context, i) {
                  final type = _types[i].$1;
                  final selected = selectedType == type;
                  return ChoiceChip(
                    label: Text(_typeLabel(l10n, _types[i].$2)),
                    selected: selected,
                    onSelected: (_) =>
                        ref.read(examTypeFilterProvider.notifier).setType(type),
                  );
                },
              ),
            ),
            const SizedBox(height: DbSpacing.md),
            AsyncValueView(
              value: exams,
              onRetry: () => ref.invalidate(examListControllerProvider),
              isEmpty: (p) => p.items.isEmpty,
              emptyIcon: Icons.quiz_rounded,
              builder: (context, p) => Column(
                children: [
                  ...p.items.map((e) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: _ExamCard(exam: e),
                      )),
                  if (p.items.length < p.total)
                    OutlinedButton.icon(
                      onPressed: exams.isLoading
                          ? null
                          : () =>
                              ref.read(examListControllerProvider.notifier).loadMore(),
                      icon: exams.isLoading
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.expand_more_rounded),
                      label: Text(l10n.loadMore),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _divider() => Container(
        width: 1,
        height: 36,
        margin: const EdgeInsets.symmetric(horizontal: DbSpacing.sm),
        color: Colors.white24,
      );
}

class _HeroStat extends StatelessWidget {
  final String value;
  final String label;
  final IconData icon;

  const _HeroStat({required this.value, required this.label, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, color: DbColors.emeraldDark, size: 22),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 11),
          ),
        ],
      ),
    );
  }
}

class _ExamCard extends ConsumerWidget {
  final Exam exam;

  const _ExamCard({required this.exam});

  IconData get _icon => switch (exam.type) {
        'model' => Icons.assignment_rounded,
        'previous' => Icons.history_edu_rounded,
        'chapter' => Icons.menu_book_rounded,
        'subject' => Icons.subject_rounded,
        'semester' => Icons.school_rounded,
        _ => Icons.quiz_rounded,
      };

  Color get _accent => switch (exam.type) {
        'model' => DbColors.teal,
        'previous' => DbColors.warningLight,
        'chapter' => DbColors.infoLight,
        'subject' => DbColors.emerald,
        'semester' => DbColors.navy,
        _ => DbColors.teal,
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final minutes = Duration(seconds: exam.durationSec).inMinutes;

    return PressableScale(
      onTap: () => context.push('/exams/${exam.id}'),
      child: Container(
        padding: const EdgeInsets.all(DbSpacing.md),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(DbRadius.card),
          boxShadow: DbShadows.card,
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    _accent,
                    Color.alphaBlend(
                        _accent.withValues(alpha: 0.75), Colors.black),
                  ],
                ),
                borderRadius: BorderRadius.circular(DbRadius.input),
              ),
              child: Icon(_icon, color: Colors.white, size: 26),
            ),
              const SizedBox(width: DbSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      exam.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 4),
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        '${exam.questionCount} ${l10n.question}',
                        '$minutes ${l10n.minutesLabel}',
                        if (exam.negativeMarkPercent > 0)
                          '${l10n.negativeMarking} -${exam.negativeMarkPercent}%',
                      ].map((chip) => Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: DbColors.fillLight,
                              borderRadius:
                                  BorderRadius.circular(DbRadius.badge),
                            ),
                            child: Text(
                              chip,
                              style: const TextStyle(
                                  fontSize: 11,
                                  color: DbColors.textSecondaryLight),
                            ),
                          )).toList(),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded),
            ],
          ),
        ),
    );
  }
}
