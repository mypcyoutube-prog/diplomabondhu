import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../../../shared/widgets/states.dart';
import '../../../core/api/api_client.dart';
import '../providers/exam_providers.dart';

class ExamDetailScreen extends ConsumerWidget {
  final String examId;

  const ExamDetailScreen({super.key, required this.examId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final detail = ref.watch(examDetailProvider(examId));
    final attempt = ref.watch(activeAttemptProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.exams)),
      body: AsyncValueView(
        value: detail,
        onRetry: () => ref.invalidate(examDetailProvider(examId)),
        builder: (context, exam) {
          final starting = attempt.isLoading;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Container(
                padding: const EdgeInsets.all(DbSpacing.lg),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [DbColors.navy, DbColors.navyDark],
                  ),
                  borderRadius: BorderRadius.circular(DbRadius.card),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: DbSpacing.sm + 2, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(DbRadius.badge),
                      ),
                      child: Text(
                        exam.type,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(height: DbSpacing.sm),
                    Text(
                      exam.title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 19,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (exam.description != null &&
                        exam.description!.isNotEmpty) ...[
                      const SizedBox(height: DbSpacing.xs),
                      Text(
                        exam.description!,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.85),
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: DbSpacing.md),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(DbSpacing.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(l10n.exams,
                          style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: DbSpacing.sm),
                      DbInfoRow(label: l10n.question, value: '${exam.questionCount}'),
                      DbInfoRow(
                          label: l10n.durationLabel,
                          value:
                              '${Duration(seconds: exam.durationSec).inMinutes} ${l10n.minutesLabel}'),
                      DbInfoRow(
                        label: l10n.marksMode,
                        value: '${exam.marksPerQuestion}'
                            '${exam.negativeMarkPercent > 0 ? ' (-${exam.negativeMarkPercent}%)' : ''}',
                      ),
                      if (exam.negativeMarkPercent > 0) ...[
                        const SizedBox(height: DbSpacing.xs),
                        Row(
                          children: [
                            const Icon(Icons.info_outline_rounded,
                                size: 16, color: DbColors.warningLight),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                l10n.negativeMarking,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(color: DbColors.warningLight),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: DbSpacing.lg),
              FilledButton.icon(
                onPressed: starting
                    ? null
                    : () async {
                        try {
                          await ref
                              .read(activeAttemptProvider.notifier)
                              .start(examId);
                          if (context.mounted) {
                            context.push('/exams/$examId/run');
                          }
                        } on ApiException catch (e) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(e.message),
                                backgroundColor: DbColors.errorLight,
                              ),
                            );
                          }
                        } catch (_) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(l10n.errorGeneric),
                                backgroundColor: DbColors.errorLight,
                              ),
                            );
                          }
                        }
                      },
                icon: starting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.play_arrow_rounded),
                label: Text(starting ? l10n.loading : l10n.startExam),
              ),
            ],
          );
        },
      ),
    );
  }
}
