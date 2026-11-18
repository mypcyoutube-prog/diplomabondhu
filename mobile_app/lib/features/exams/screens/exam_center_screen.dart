import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../../../shared/widgets/states.dart';
import '../data/exam.dart';
import '../providers/exam_providers.dart';

class ExamCenterScreen extends ConsumerWidget {
  const ExamCenterScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final exams = ref.watch(examListProvider(null));
    final stats = ref.watch(examStatsProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.exams)),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(examListProvider(null));
          ref.invalidate(examStatsProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            stats.maybeWhen(
              data: (s) => Row(
                children: [
                  Expanded(
                    child: DbStatCard(
                      label: l10n.exams,
                      value: '${s['attempts'] ?? 0}',
                      icon: Icons.assignment_turned_in_rounded,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: DbStatCard(
                      label: '%',
                      value: '${s['avgPercent'] ?? 0}',
                      icon: Icons.percent_rounded,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: DbStatCard(
                      label: l10n.examResult,
                      value: '${s['bestPercent'] ?? 0}',
                      icon: Icons.emoji_events_rounded,
                    ),
                  ),
                ],
              ),
              orElse: () => const SizedBox.shrink(),
            ),
            const SizedBox(height: 16),
            DbSectionHeader(title: l10n.exams),
            AsyncValueView(
              value: exams,
              onRetry: () => ref.invalidate(examListProvider(null)),
              isEmpty: (items) => items.isEmpty,
              emptyIcon: Icons.quiz_rounded,
              builder: (context, items) => Column(
                children: items
                    .map((e) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: _ExamCard(exam: e),
                        ))
                    .toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ExamCard extends ConsumerWidget {
  final Exam exam;

  const _ExamCard({required this.exam});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    return Card(
      child: ListTile(
        title: Text(exam.title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(
          '${exam.type} · ${exam.questionCount} ${l10n.question} · ${Duration(seconds: exam.durationSec).inMinutes} min',
        ),
        trailing: const Icon(Icons.chevron_right_rounded),
        onTap: () => context.push('/exams/${exam.id}'),
      ),
    );
  }
}
