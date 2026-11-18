import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../core/api/api_exception.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../../../shared/widgets/states.dart';
import '../data/result.dart';
import '../providers/result_providers.dart';

class ResultCheckerScreen extends ConsumerStatefulWidget {
  const ResultCheckerScreen({super.key});

  @override
  ConsumerState<ResultCheckerScreen> createState() => _ResultCheckerScreenState();
}

class _ResultCheckerScreenState extends ConsumerState<ResultCheckerScreen> {
  final _rollController = TextEditingController();
  String? _selectedExamId;
  ResultRecord? _result;
  bool _checking = false;
  bool _notFound = false;
  String? _error;

  @override
  void dispose() {
    _rollController.dispose();
    super.dispose();
  }

  Future<void> _check() async {
    final l10n = AppLocalizations.of(context)!;
    final examId = _selectedExamId;
    final roll = _rollController.text.trim();
    if (examId == null) return;
    if (!RegExp(r'^\d{6,10}$').hasMatch(roll)) {
      setState(() {
        _error = l10n.rollInvalid;
        _result = null;
        _notFound = false;
      });
      return;
    }
    setState(() {
      _checking = true;
      _error = null;
      _notFound = false;
      _result = null;
    });
    try {
      final record = await ref
          .read(resultRepositoryProvider)
          .check(examId: examId, roll: roll);
      setState(() => _result = record);
    } on ApiException catch (e) {
      setState(() {
        if (e.code == 'NOT_FOUND') {
          _notFound = true;
        } else {
          _error = e.message;
        }
      });
    } catch (_) {
      setState(() => _error = AppLocalizations.of(context)!.errorGeneric);
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final exams = ref.watch(resultExamsProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.resultChecker)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(l10n.resultCheckerSubtitle,
              style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 16),
          exams.maybeWhen(
            data: (items) => items.isEmpty,
            orElse: () => false,
          )
              ? DbEmptyView(
                  message: l10n.noExamsAvailable,
                  icon: Icons.verified_rounded,
                )
              : AsyncValueView(
            value: exams,
            onRetry: () => ref.invalidate(resultExamsProvider),
            builder: (context, items) {
              if (_selectedExamId == null ||
                  !items.any((e) => e.examId == _selectedExamId)) {
                _selectedExamId = items.first.examId;
              }
              return DropdownButtonFormField<String>(
                initialValue: _selectedExamId,
                decoration: InputDecoration(labelText: l10n.selectExam),
                items: items
                    .map((e) => DropdownMenuItem(
                          value: e.examId,
                          child: Text(e.displayLabel),
                        ))
                    .toList(),
                onChanged: (v) => setState(() => _selectedExamId = v),
              );
            },
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _rollController,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(labelText: l10n.rollNumber),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _checking ? null : _check,
            child: _checking
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(l10n.checkResult),
          ),
          const SizedBox(height: 16),
          if (_error != null)
            DbErrorView(message: _error!, onRetry: _check)
          else if (_notFound)
            DbEmptyView(message: l10n.noResultFound, icon: Icons.search_off_rounded)
          else if (_result != null)
            _ResultCard(record: _result!),
        ],
      ),
    );
  }
}

class _ResultCard extends StatelessWidget {
  final ResultRecord record;

  const _ResultCard({required this.record});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final passed = record.status == 'pass';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(record.name ?? record.roll,
                      style: theme.textTheme.titleMedium
                          ?.copyWith(fontWeight: FontWeight.w700)),
                ),
                if (record.status != null)
                  Chip(
                    label: Text(record.status!.toUpperCase()),
                    backgroundColor: passed
                        ? const Color(0xFFDCFCE7)
                        : const Color(0xFFFEE2E2),
                  ),
              ],
            ),
            if (record.registrationNo != null) ...[
              const SizedBox(height: 4),
              Text(record.registrationNo!, style: theme.textTheme.bodySmall),
            ],
            const Divider(height: 24),
            DbInfoRow(label: l10n.rollNumber, value: record.roll),
            DbInfoRow(label: 'GPA', value: record.gpa?.toString() ?? '—'),
            const Divider(height: 24),
            Text(record.disclaimer,
                style: theme.textTheme.bodySmall
                    ?.copyWith(fontStyle: FontStyle.italic)),
          ],
        ),
      ),
    );
  }
}
