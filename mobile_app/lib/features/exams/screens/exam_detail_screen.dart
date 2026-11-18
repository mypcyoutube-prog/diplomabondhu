import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../../../shared/widgets/states.dart';
import '../providers/exam_providers.dart';

class ExamDetailScreen extends ConsumerWidget {
  final String examId;

  const ExamDetailScreen({super.key, required this.examId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final detail = ref.watch(examDetailProvider(examId));

    return Scaffold(
      appBar: AppBar(title: Text(l10n.exams)),
      body: AsyncValueView(
        value: detail,
        onRetry: () => ref.invalidate(examDetailProvider(examId)),
        builder: (context, exam) => Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(exam.title,
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w800,
                              )),
                      if (exam.description != null) ...[
                        const SizedBox(height: 8),
                        Text(exam.description!),
                      ],
                      const SizedBox(height: 12),
                      DbInfoRow(label: l10n.question, value: '${exam.questionCount}'),
                      DbInfoRow(label: l10n.timeLeft, value: '${exam.durationSec ~/ 60} min'),
                      DbInfoRow(
                        label: l10n.marksMode,
                        value: '${exam.marksPerQuestion}'
                            '${exam.negativeMarkPercent > 0 ? ' (-${exam.negativeMarkPercent}%)' : ''}',
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: () async {
                  await ref.read(activeAttemptProvider.notifier).start(examId);
                  if (context.mounted) context.push('/exams/$examId/run');
                },
                icon: const Icon(Icons.play_arrow_rounded),
                label: Text(l10n.startExam),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
