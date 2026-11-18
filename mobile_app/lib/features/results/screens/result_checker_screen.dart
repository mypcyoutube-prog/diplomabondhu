import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../core/api/api_exception.dart';
import '../../../shared/widgets/states.dart';
import '../data/result.dart';
import '../providers/result_providers.dart';

enum _ResultStatus { pass, referred, dropped, expelled, fail, unknown }

_ResultStatus _statusOf(String? status) {
  switch (status) {
    case 'pass':
      return _ResultStatus.pass;
    case 'referred':
      return _ResultStatus.referred;
    case 'dropped':
      return _ResultStatus.dropped;
    case 'expelled':
      return _ResultStatus.expelled;
    case 'fail':
      return _ResultStatus.fail;
    default:
      return _ResultStatus.unknown;
  }
}

const _gpaGreen = Color(0xFF059669);
const _statusRed = Color(0xFFDC2626);
const _statusAmber = Color(0xFFD97706);

class ResultCheckerScreen extends ConsumerStatefulWidget {
  const ResultCheckerScreen({super.key});

  @override
  ConsumerState<ResultCheckerScreen> createState() => _ResultCheckerScreenState();
}

class _ResultCheckerScreenState extends ConsumerState<ResultCheckerScreen> {
  final _rollController = TextEditingController();
  List<ResultRecord> _records = const [];
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
    final roll = _rollController.text.trim();
    if (!RegExp(r'^\d{6,10}$').hasMatch(roll)) {
      setState(() {
        _error = l10n.rollInvalid;
        _records = const [];
        _notFound = false;
      });
      return;
    }
    setState(() {
      _checking = true;
      _error = null;
      _notFound = false;
      _records = const [];
    });
    try {
      final records = await ref
          .read(resultRepositoryProvider)
          .history(roll: roll);
      setState(() => _records = records);
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

    return Scaffold(
      appBar: AppBar(title: Text(l10n.resultChecker)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(l10n.resultCheckerSubtitle,
              style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 16),
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
          else if (_records.isNotEmpty) ...[
            if (_records.length > 1)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  AppLocalizations.of(context)!.resultExamCount(_records.length),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            for (final record in _records)
              _ResultRecordCard(record: record),
          ],
        ],
      ),
    );
  }
}

String _semesterLabel(BuildContext context, int semester) {
  final isBn = Localizations.localeOf(context).languageCode == 'bn';
  final en = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
  final bn = ['১ম', '২য়', '৩য়', '৪র্থ', '৫ম', '৬ষ্ঠ', '৭ম', '৮ম', '৯ম', '১০ম'];
  if (semester >= 1 && semester <= 10) {
    return isBn ? '${bn[semester - 1]} সেমিস্টার' : '${en[semester - 1]} Semester';
  }
  return isBn ? '$semester সেমিস্টার' : 'Semester $semester';
}

int _semesterIndex(String key) =>
    int.tryParse(key.replaceAll(RegExp(r'[^0-9]'), '')) ?? 0;

/// Letter grade derived from the BTEB grade scale by picking the highest
/// grade point not exceeding the GPA (matches the reference board PDFs:
/// GPA printed only, e.g. 3.73 -> A-, 3.45 -> B+).
const _gradePoints = [
  (letter: 'A+', point: 4.00),
  (letter: 'A', point: 3.75),
  (letter: 'A-', point: 3.50),
  (letter: 'B+', point: 3.25),
  (letter: 'B', point: 3.00),
  (letter: 'B-', point: 2.75),
  (letter: 'C+', point: 2.50),
  (letter: 'C', point: 2.25),
  (letter: 'D', point: 2.00),
];

String? _letterFromGpa(double? gpa) {
  if (gpa == null) return null;
  if (gpa < 2.00) return 'F';
  for (final entry in _gradePoints) {
    if (gpa >= entry.point) return entry.letter;
  }
  return null;
}

class _ResultRecordCard extends StatelessWidget {
  final ResultRecord record;

  const _ResultRecordCard({required this.record});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = _statusOf(record.status);

    final hasBacklog = record.subjects.isNotEmpty;
    final showBacklog = hasBacklog &&
        (status == _ResultStatus.referred || status == _ResultStatus.pass);
    final statusText = switch (status) {
      _ResultStatus.pass when showBacklog =>
        l10n.resultSubjectsYetToPass(record.subjects.length),
      _ResultStatus.pass => l10n.resultPassed,
      _ResultStatus.referred when hasBacklog =>
        l10n.resultSubjectsYetToPass(record.subjects.length),
      _ResultStatus.referred => l10n.resultReferred,
      _ResultStatus.dropped => l10n.resultDropped,
      _ResultStatus.expelled => l10n.resultExpelled,
      _ResultStatus.fail => l10n.resultFail,
      _ResultStatus.unknown => record.status ?? '',
    };
    final statusColor = switch (status) {
      _ResultStatus.pass when !showBacklog => _gpaGreen,
      _ResultStatus.referred ||
      _ResultStatus.expelled ||
      _ResultStatus.fail ||
      _ResultStatus.pass =>
        _statusRed,
      _ResultStatus.dropped => _statusAmber,
      _ResultStatus.unknown => Colors.grey,
    };

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            color: theme.colorScheme.primaryContainer,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('#${record.roll}',
                    style: theme.textTheme.titleLarge
                        ?.copyWith(fontWeight: FontWeight.w800)),
                if (record.title != null && record.title!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(record.title!, style: theme.textTheme.bodyMedium),
                ],
                if (record.institute != null && record.institute!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(record.institute!,
                      style: theme.textTheme.bodySmall
                          ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                ],
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (record.name != null && record.name!.isNotEmpty) ...[
                  Text(record.name!,
                      style: theme.textTheme.titleMedium
                          ?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                ],
                if (record.registrationNo != null)
                  DbInfoRow(label: 'Registration', value: record.registrationNo!),
                if (record.cgpa != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: _gpaGreen.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: _gpaGreen.withValues(alpha: 0.35)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.stars_rounded, color: _gpaGreen, size: 22),
                        const SizedBox(width: 8),
                        Text(l10n.cgpa,
                            style: const TextStyle(
                                color: _gpaGreen, fontWeight: FontWeight.w700)),
                        const Spacer(),
                        Text(record.cgpa!.toStringAsFixed(2),
                            style: const TextStyle(
                                color: _gpaGreen,
                                fontWeight: FontWeight.w800,
                                fontSize: 18)),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: statusColor.withValues(alpha: 0.4)),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        statusColor == _gpaGreen
                            ? Icons.check_circle_rounded
                            : Icons.error_rounded,
                        color: statusColor,
                        size: 22,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          statusText,
                          style: TextStyle(
                              color: statusColor,
                              fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                ),
                if (record.subjects.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(l10n.resultSubjectsList,
                      style: theme.textTheme.titleSmall
                          ?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final subject in record.subjects)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: _statusRed.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                                color: _statusRed.withValues(alpha: 0.35)),
                          ),
                          child: Text(
                            '${subject.code ?? '—'}${subject.titleSuffix}',
                            style: const TextStyle(
                                color: _statusRed,
                                fontWeight: FontWeight.w600),
                          ),
                        ),
                    ],
                  ),
                ],
                if (record.sortedSemesterGpas.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Text(l10n.resultGpa,
                      style: theme.textTheme.titleSmall
                          ?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  for (final entry in record.sortedSemesterGpas)
                    _SemesterGpaTile(
                      semester: _semesterIndex(entry.key),
                      semesterName: _semesterLabel(context, _semesterIndex(entry.key)),
                      gpa: entry.value,
                      isExamSemester:
                          record.examSemester != null && record.examSemester == _semesterIndex(entry.key),
                      examLabel: l10n.resultThisExam,
                    ),
                ],
                const SizedBox(height: 12),
                Text(record.disclaimer,
                    style: theme.textTheme.bodySmall
                        ?.copyWith(fontStyle: FontStyle.italic)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SemesterGpaTile extends StatelessWidget {
  final int semester;
  final String semesterName;
  final double? gpa;
  final bool isExamSemester;
  final String examLabel;

  const _SemesterGpaTile({
    required this.semester,
    required this.semesterName,
    required this.gpa,
    required this.isExamSemester,
    required this.examLabel,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final missing = gpa == null;
    final valueColor = missing ? _statusRed : _gpaGreen;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: isExamSemester
            ? theme.colorScheme.primary.withValues(alpha: 0.06)
            : theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
            color: isExamSemester
                ? theme.colorScheme.primary.withValues(alpha: 0.35)
                : Colors.transparent),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(semesterName,
                style: theme.textTheme.bodyMedium
                    ?.copyWith(fontWeight: FontWeight.w600)),
          ),
          if (isExamSemester)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Tooltip(
                message: examLabel,
                child: Badge(
                  label: Text(examLabel),
                  backgroundColor: theme.colorScheme.primary,
                ),
              ),
            ),
          Text(
            missing ? '—' : gpa!.toStringAsFixed(2),
            style: TextStyle(
                color: valueColor,
                fontWeight: FontWeight.w800,
                fontSize: 16),
          ),
          if (!missing)
            Padding(
              padding: const EdgeInsets.only(left: 6),
              child: Text(_letterFromGpa(gpa) ?? '',
                  style: TextStyle(
                      color: valueColor.withValues(alpha: 0.85),
                      fontWeight: FontWeight.w600,
                      fontSize: 12)),
            ),
        ],
      ),
    );
  }
}
