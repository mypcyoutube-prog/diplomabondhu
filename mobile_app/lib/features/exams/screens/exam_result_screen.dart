import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../data/exam.dart';
import '../providers/exam_providers.dart';

class ExamResultScreen extends ConsumerWidget {
  final String attemptId;

  const ExamResultScreen({super.key, required this.attemptId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final result = ref.watch(examResultProvider(attemptId));

    return Scaffold(
      appBar: AppBar(title: Text(l10n.examResult)),
      body: AsyncValueView(
        value: result,
        onRetry: () => ref.invalidate(examResultProvider(attemptId)),
        builder: (context, r) {
          final scoring = r.scoring;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      SizedBox(
                        width: 140,
                        height: 140,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            CircularProgressIndicator(
                              value: (scoring?.percent ?? 0) / 100,
                              strokeWidth: 10,
                              color: DbColors.emerald,
                              backgroundColor:
                                  Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                            ),
                            Center(
                              child: Text(
                                '${scoring?.percent ?? 0}%',
                                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                      fontWeight: FontWeight.w800,
                                    ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(r.examTitle ?? '',
                          style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        children: [
                          Chip(label: Text('${l10n.correct}: ${scoring?.correctCount ?? 0}')),
                          Chip(label: Text('${l10n.wrong}: ${scoring?.wrongCount ?? 0}')),
                          Chip(label: Text('${l10n.skipped}: ${scoring?.unansweredCount ?? 0}')),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              ...r.perQuestion.asMap().entries.map((e) => _QuestionReview(
                    index: e.key + 1,
                    result: e.value,
                  )),
              const SizedBox(height: 16),
              OutlinedButton(
                onPressed: () => context.pop(),
                child: Text(l10n.exams),
              ),
            ],
          );
        },
      ),
    );
  }
}

final examResultProvider = FutureProvider.family((ref, String attemptId) {
  return ref.watch(examRepositoryProvider).result(attemptId);
});

class _QuestionReview extends StatefulWidget {
  final int index;
  final PerQuestionResult result;

  const _QuestionReview({required this.index, required this.result});

  @override
  State<_QuestionReview> createState() => _QuestionReviewState();
}

class _QuestionReviewState extends State<_QuestionReview> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final r = widget.result;
    final color = r.isCorrect ? DbColors.emerald : DbColors.errorLight;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  r.isCorrect ? Icons.check_circle_rounded : Icons.cancel_rounded,
                  color: color,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${l10n.question} ${widget.index} · ${l10n.ofLabel} ${r.correctKey}',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
                Text('${r.marks}'),
              ],
            ),
            if (r.explanation != null && r.explanation!.isNotEmpty) ...[
              const SizedBox(height: 8),
              InkWell(
                onTap: () => setState(() => _expanded = !_expanded),
                child: Row(
                  children: [
                    Text(
                      l10n.seeExplanation,
                      style: const TextStyle(color: DbColors.teal),
                    ),
                    Icon(
                      _expanded
                          ? Icons.expand_less_rounded
                          : Icons.expand_more_rounded,
                      color: DbColors.teal,
                    ),
                  ],
                ),
              ),
              if (_expanded) ...[
                const SizedBox(height: 8),
                Text(r.explanation!),
              ],
            ],
          ],
        ),
      ),
    );
  }
}
