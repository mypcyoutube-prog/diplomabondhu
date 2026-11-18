import 'dart:async';

import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../shared/widgets/states.dart';
import '../providers/exam_providers.dart';

class ExamRunnerScreen extends ConsumerStatefulWidget {
  final String examId;

  const ExamRunnerScreen({super.key, required this.examId});

  @override
  ConsumerState<ExamRunnerScreen> createState() => _ExamRunnerScreenState();
}

class _ExamRunnerScreenState extends ConsumerState<ExamRunnerScreen> {
  Timer? _timer;
  int _index = 0;
  bool _submitting = false;
  int? _totalSec;
  final Set<String> _marked = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _tick());
  }

  void _tick() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      final attempt = ref.read(activeAttemptProvider).value;
      final deadline = attempt?.attempt.deadlineAt;
      if (deadline == null) return;
      _totalSec ??= deadline.difference(DateTime.now()).inSeconds;
      if (DateTime.now().isAfter(deadline)) {
        _timer?.cancel();
        _submit(auto: true);
      } else {
        setState(() {});
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _submit({bool auto = false}) async {
    if (_submitting) return;
    final l10n = AppLocalizations.of(context)!;
    if (!auto) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(l10n.confirmSubmit),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: Text(l10n.cancel),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: Text(l10n.submit),
            ),
          ],
        ),
      );
      if (confirmed != true) return;
    }
    setState(() => _submitting = true);
    try {
      final result = await ref.read(activeAttemptProvider.notifier).submit();
      if (!mounted) return;
      if (result == null) {
        context.pop();
        return;
      }
      context.pushReplacement('/exams/result/${result.attemptId}');
    } catch (_) {
      if (mounted) {
        setState(() => _submitting = false);
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(l10n.errorGeneric)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final active = ref.watch(activeAttemptProvider);

    return active.when(
      loading: () => const Scaffold(body: DbLoadingView()),
      error: (e, _) => Scaffold(
        appBar: AppBar(),
        body: DbErrorView(
          message: l10n.errorGeneric,
          onRetry: () => ref.read(activeAttemptProvider.notifier).start(widget.examId),
        ),
      ),
      data: (attempt) {
        if (attempt == null) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) context.pop();
          });
          return const Scaffold(body: DbLoadingView());
        }
        final questions = attempt.attempt.questions;
        if (questions.isEmpty) {
          return Scaffold(
            appBar: AppBar(),
            body: DbEmptyView(message: l10n.emptyGeneric, icon: Icons.quiz_rounded),
          );
        }
        final q = questions[_index.clamp(0, questions.length - 1)];
        final deadline = attempt.attempt.deadlineAt;
        final remaining = deadline?.difference(DateTime.now());

        return PopScope(
          canPop: false,
          child: Scaffold(
            appBar: AppBar(
              leading: IconButton(
                icon: const Icon(Icons.close_rounded),
                onPressed: () => _confirmExit(l10n),
              ),
              title: Text(
                '${l10n.question} ${_index + 1} ${l10n.ofLabel} ${questions.length}'
                '${remaining != null ? ' · ${_fmt(remaining)}' : ''}',
              ),
            ),
            body: Column(
              children: [
                LinearProgressIndicator(
                  value: remaining == null || _totalSec == null || _totalSec! == 0
                      ? null
                      : (remaining.inSeconds / _totalSec!).clamp(0.0, 1.0),
                  color: _progressColor(remaining),
                  minHeight: 4,
                ),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              q.text,
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.w700,
                                  ),
                            ),
                          ),
                          IconButton(
                            tooltip: l10n.markForReview,
                            onPressed: () => setState(
                              () => _marked.contains(q.id)
                                  ? _marked.remove(q.id)
                                  : _marked.add(q.id),
                            ),
                            icon: Icon(
                              _marked.contains(q.id)
                                  ? Icons.flag_rounded
                                  : Icons.flag_outlined,
                              color: DbColors.warningLight,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      ...q.options.map((o) {
                        final selected = attempt.answers[q.id] == o.key;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Card(
                            color: selected ? DbColors.teal.withValues(alpha: 0.12) : null,
                            child: ListTile(
                              onTap: () => ref
                                  .read(activeAttemptProvider.notifier)
                                  .selectAnswer(q.id, o.key),
                              leading: CircleAvatar(
                                radius: 14,
                                backgroundColor: selected ? DbColors.teal : null,
                                child: Text(
                                  o.key,
                                  style: TextStyle(
                                    color: selected ? Colors.white : null,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              title: Text(o.text),
                            ),
                          ),
                        );
                      }),
                    ],
                  ),
                ),
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        if (_index > 0)
                          OutlinedButton(
                            onPressed: () => setState(() => _index--),
                            child: const Icon(Icons.arrow_back_rounded),
                          ),
                        const Spacer(),
                        if (_index < questions.length - 1)
                          FilledButton(
                            onPressed: () => setState(() => _index++),
                            child: const Icon(Icons.arrow_forward_rounded),
                          )
                        else
                          FilledButton(
                            onPressed: _submitting ? null : () => _submit(),
                            child: Text(l10n.submit),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Color _progressColor(Duration? remaining) {
    if (remaining == null || _totalSec == null || _totalSec! == 0) return DbColors.teal;
    final fraction = remaining.inSeconds / _totalSec!;
    if (fraction < 0.10) return DbColors.errorLight;
    if (fraction < 0.20) return DbColors.warningLight;
    return DbColors.teal;
  }

  String _fmt(Duration d) {
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '${d.inHours > 0 ? '${d.inHours}:' : ''}$m:$s';
  }

  Future<void> _confirmExit(AppLocalizations l10n) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.confirmSubmit),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l10n.cancel)),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(l10n.submit)),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      _timer?.cancel();
      ref.read(activeAttemptProvider.notifier).discard();
      context.pop();
    }
  }
}
