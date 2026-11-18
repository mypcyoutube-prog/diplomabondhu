import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
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
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.resultChecker),
        actions: [
          IconButton(
            tooltip: l10n.subjectCatalog,
            icon: const Icon(Icons.menu_book_rounded),
            onPressed: () => context.push('/subjects'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
            DbSpacing.md, DbSpacing.md, DbSpacing.md, DbSpacing.xl),
        children: [
          Text(l10n.resultCheckerSubtitle, style: theme.textTheme.bodyMedium),
          const SizedBox(height: DbSpacing.md),
          _RollSearchField(
            controller: _rollController,
            label: l10n.rollNumber,
            checking: _checking,
            onCheck: _check,
          ),
          const SizedBox(height: DbSpacing.md),
          FilledButton.icon(
            onPressed: _checking ? null : _check,
            icon: _checking
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.manage_search_rounded, size: 22),
            label: Text(l10n.checkResult),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(DbRadius.input)),
            ),
          ),
          const SizedBox(height: DbSpacing.lg),
          if (_error != null)
            DbErrorView(message: _error!, onRetry: _check)
          else if (_notFound)
            DbEmptyView(message: l10n.noResultFound, icon: Icons.search_off_rounded)
          else if (_records.isNotEmpty) ...[
            if (_records.length > 1)
              Padding(
                padding: const EdgeInsets.only(bottom: DbSpacing.sm),
                child: Text(
                  AppLocalizations.of(context)!.resultExamCount(_records.length),
                  style: theme.textTheme.bodySmall,
                ),
              ),
            for (var i = 0; i < _records.length; i++)
              _FadeInUp(
                key: ValueKey(_records[i].examId + _records[i].roll),
                index: i.clamp(0, 6),
                child: _ResultRecordCard(record: _records[i]),
              ),
          ],
        ],
      ),
    );
  }
}

class _RollSearchField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final bool checking;
  final VoidCallback onCheck;

  const _RollSearchField({
    required this.controller,
    required this.label,
    required this.checking,
    required this.onCheck,
  });

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<TextEditingValue>(
      valueListenable: controller,
      builder: (context, value, _) => TextField(
        controller: controller,
        keyboardType: TextInputType.number,
        textInputAction: TextInputAction.search,
        onSubmitted: (_) => onCheck(),
        enabled: !checking,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: const Icon(Icons.tag_rounded),
          suffixIcon: value.text.isEmpty
              ? null
              : IconButton(
                  tooltip:
                      MaterialLocalizations.of(context).clearButtonTooltip,
                  icon: const Icon(Icons.close_rounded, size: 20),
                  onPressed: checking ? null : controller.clear,
                ),
          helperText: '6–10 digits',
        ),
      ),
    );
  }
}

/// Staggered fade-in-up entrance (pure Flutter, no extra packages).
class _FadeInUp extends StatelessWidget {
  final Widget child;
  final int index;

  const _FadeInUp({super.key, required this.child, this.index = 0});

  @override
  Widget build(BuildContext context) {
    final start = (index * 0.06).clamp(0.0, 0.6);
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: 420),
      curve: Interval(start, 1, curve: Curves.easeOutCubic),
      builder: (context, t, child) => Opacity(
        opacity: t.clamp(0, 1),
        child: Transform.translate(
          offset: Offset(0, 14 * (1 - t)),
          child: child,
        ),
      ),
      child: child,
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

    final showBacklog = record.subjects.isNotEmpty &&
        (status == _ResultStatus.referred || status == _ResultStatus.pass);
    final statusText = switch (status) {
      _ResultStatus.pass when showBacklog =>
        l10n.resultSubjectsYetToPass(record.subjects.length),
      _ResultStatus.pass => l10n.resultPassed,
      _ResultStatus.referred when record.subjects.isNotEmpty =>
        l10n.resultSubjectsYetToPass(record.subjects.length),
      _ResultStatus.referred => l10n.resultReferred,
      _ResultStatus.dropped => l10n.resultDropped,
      _ResultStatus.expelled => l10n.resultExpelled,
      _ResultStatus.fail => l10n.resultFail,
      _ResultStatus.unknown => record.status ?? '',
    };
    final showBanner = !(status == _ResultStatus.pass && record.subjects.isEmpty);

    final failed = _subjectsBySemester(record);
    final cards = _semesterCards(record, failed);

    return Card(
      margin: const EdgeInsets.only(bottom: DbSpacing.md),
      clipBehavior: Clip.antiAlias,
      elevation: 1.5,
      shadowColor: Colors.black26,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(DbRadius.card)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(DbSpacing.md),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [DbColors.navy, DbColors.navyDark],
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Text('#${record.roll}',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.headlineSmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5)),
                if (record.title != null && record.title!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(record.title!,
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodyMedium?.copyWith(
                          color: Colors.white.withValues(alpha: 0.92),
                          fontWeight: FontWeight.w600)),
                ],
                if (record.institute != null && record.institute!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(record.institute!,
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.white.withValues(alpha: 0.75))),
                ],
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(DbSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (showBanner) ...[
                  _StatusBanner(text: statusText, color: _statusColorOf(status, showBacklog)),
                  const SizedBox(height: DbSpacing.sm + 4),
                ],
                for (var i = 0; i < cards.length; i++)
                  _FadeInUp(
                    key: ValueKey('${record.examId}-sem-${cards[i].semester}-$i'),
                    index: (i + 1).clamp(0, 8),
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: DbSpacing.sm),
                      child: _SemesterCard(
                        semester: cards[i].semester,
                        semesterName: _semesterLabel(context, cards[i].semester),
                        gpa: cards[i].gpa,
                        failedSubjects: cards[i].failed,
                        isExamSemester: record.examSemester != null &&
                            record.examSemester == cards[i].semester,
                        examLabel: l10n.resultThisExam,
                        publishedAt: record.publishedAt,
                      ),
                    ),
                  ),
                if (record.cgpa != null) ...[
                  const SizedBox(height: DbSpacing.sm),
                  _CgpaHighlight(cgpa: record.cgpa!, label: l10n.cgpa),
                ],
                if (record.name != null || record.registrationNo != null) ...[
                  const SizedBox(height: DbSpacing.sm),
                  if (record.name != null)
                    DbInfoRow(label: 'Name', value: record.name!),
                  if (record.registrationNo != null) ...[
                    if (record.name != null) const SizedBox(height: 4),
                    DbInfoRow(label: 'Registration', value: record.registrationNo!),
                  ],
                ],
                const SizedBox(height: DbSpacing.sm),
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

class _CgpaHighlight extends StatelessWidget {
  final double cgpa;
  final String label;

  const _CgpaHighlight({required this.cgpa, required this.label});

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 350),
      curve: Curves.easeOutCubic,
      builder: (context, t, child) => Transform.scale(
        scale: 0.97 + 0.03 * t,
        child: Opacity(opacity: t.clamp(0, 1), child: child),
      ),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [_gpaGreen.withValues(alpha: 0.10), _gpaGreen.withValues(alpha: 0.05)],
          ),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _gpaGreen.withValues(alpha: 0.35)),
        ),
        child: Row(
          children: [
            const Icon(Icons.verified_rounded, color: _gpaGreen, size: 22),
            const SizedBox(width: 8),
            Text(label,
                style: const TextStyle(
                    color: _gpaGreen,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.3)),
            const Spacer(),
            Text(cgpa.toStringAsFixed(2),
                style: const TextStyle(
                    color: _gpaGreen,
                    fontWeight: FontWeight.w800,
                    fontSize: 18)),
          ],
        ),
      ),
    );
  }
}

class _StatusBanner extends StatelessWidget {
  final String text;
  final Color color;

  const _StatusBanner({required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          Icon(
            color == _gpaGreen
                ? Icons.check_circle_rounded
                : Icons.error_rounded,
            color: color,
            size: 22,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                  color: color, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}



Color _statusColorOf(_ResultStatus status, bool showBacklog) {
  return switch (status) {
    _ResultStatus.pass when !showBacklog => _gpaGreen,
    _ResultStatus.referred ||
    _ResultStatus.expelled ||
    _ResultStatus.fail ||
    _ResultStatus.pass => _statusRed,
    _ResultStatus.dropped => _statusAmber,
    _ResultStatus.unknown => Colors.grey,
  };
}

class _SemesterCard extends StatelessWidget {
  final int semester;
  final String semesterName;
  final double? gpa;
  final List<ResultSubject> failedSubjects;
  final bool isExamSemester;
  final String examLabel;
  final String? publishedAt;

  const _SemesterCard({
    required this.semester,
    required this.semesterName,
    required this.gpa,
    required this.failedSubjects,
    required this.isExamSemester,
    required this.examLabel,
    required this.publishedAt,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final missing = gpa == null;
    final valueColor = missing ? _statusRed : _gpaGreen;
    final letter = missing ? null : _letterFromGpa(gpa);
    final hasBacklog = failedSubjects.isNotEmpty;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: _gpaGreen.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _gpaGreen.withValues(alpha: 0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 30,
                height: 30,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: DbColors.navy.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.menu_book_rounded,
                    size: 16, color: DbColors.navy),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(semesterName,
                    style: theme.textTheme.bodyMedium
                        ?.copyWith(fontWeight: FontWeight.w700)),
              ),
              if (hasBacklog)
                Text(
                  l10n.resultSubjectsYetToPass(failedSubjects.length),
                  style: const TextStyle(
                      color: _statusRed,
                      fontWeight: FontWeight.w700,
                      fontSize: 12),
                )
              else if (!missing) ...[
                const Icon(Icons.check_circle_rounded,
                    size: 16, color: _gpaGreen),
                const SizedBox(width: 4),
                Text(l10n.resultPassed,
                    style: const TextStyle(
                        color: _gpaGreen,
                        fontWeight: FontWeight.w700,
                        fontSize: 12)),
              ],
            ],
          ),
          if (isExamSemester) ...[
            const SizedBox(height: 2),
            Padding(
              padding: const EdgeInsets.only(left: 38),
              child: Text(examLabel,
                  style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.w700)),
            ),
          ],
          if (publishedAt != null && publishedAt!.trim().isNotEmpty) ...[
            const SizedBox(height: 4),
            Padding(
              padding: const EdgeInsets.only(left: 38),
              child: Row(
                children: [
                  Icon(Icons.event_rounded,
                      size: 12, color: theme.colorScheme.onSurfaceVariant),
                  const SizedBox(width: 4),
                  Text(_formatDateLine(context, publishedAt!),
                      style: theme.textTheme.bodySmall),
                  const Spacer(),
                  Text(_timeAgo(l10n, publishedAt!),
                      style: theme.textTheme.bodySmall),
                ],
              ),
            ),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest
                      .withValues(alpha: 0.7),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text('GPA',
                    style: theme.textTheme.labelSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: theme.colorScheme.onSurfaceVariant)),
              ),
              const SizedBox(width: 8),
              if (missing)
                Text('—',
                    style: TextStyle(
                        color: valueColor,
                        fontWeight: FontWeight.w800,
                        fontSize: 16))
              else
                Text(
                  gpa!.toStringAsFixed(2),
                  style: TextStyle(
                      color: valueColor,
                      fontWeight: FontWeight.w800,
                      fontSize: 18,
                      fontFeatures: const [FontFeature.tabularFigures()]),
                ),
              const Spacer(),
              if (letter != null)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: valueColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(DbRadius.chip),
                  ),
                  child: Text(
                    letter,
                    style: TextStyle(
                        color: valueColor.withValues(alpha: 0.9),
                        fontWeight: FontWeight.w800,
                        fontSize: 12,
                        letterSpacing: 0.4),
                  ),
                ),
            ],
          ),
          for (final s in failedSubjects) ...[
            const SizedBox(height: 6),
            _FailedSubjectRow(subject: s),
          ],
        ],
      ),
    );
  }
}

class _FailedSubjectRow extends StatelessWidget {
  final ResultSubject subject;

  const _FailedSubjectRow({required this.subject});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final label = switch (subject.type) {
      'T' => l10n.subjectTypeTheory,
      'P' => l10n.subjectTypePractical,
      'T+P' => l10n.subjectTypeTheoryPractical,
      _ => null,
    };
    final code =
        '${subject.code ?? '—'}${subject.titleSuffix}';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: _statusRed.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(code,
                  style: const TextStyle(
                      color: _statusRed,
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                      fontFeatures: [FontFeature.tabularFigures()])),
              const Spacer(),
              if (label != null)
                Text(label,
                    style: theme.textTheme.labelSmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                        fontWeight: FontWeight.w600)),
            ],
          ),
          if (subject.name != null && subject.name!.trim().isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(subject.name!,
                style: theme.textTheme.bodySmall?.copyWith(
                    color: _statusRed.withValues(alpha: 0.9),
                    fontWeight: FontWeight.w600,
                    height: 1.25)),
          ],
        ],
      ),
    );
  }
}

class _SubjectsForSemester {
  final int semester;
  final double? gpa;
  final List<ResultSubject> failed;

  const _SubjectsForSemester(this.semester, this.gpa, this.failed);
}

Map<int, List<ResultSubject>> _subjectsBySemester(ResultRecord record) {
  final map = <int, List<ResultSubject>>{};
  for (final s in record.subjects) {
    final sem = (s.semester != null && s.semester! >= 1)
        ? s.semester!
        : (record.examSemester ?? 0);
    if (sem <= 0) continue;
    map.putIfAbsent(sem, () => []).add(s);
  }
  return map;
}

List<_SubjectsForSemester> _semesterCards(
  ResultRecord record,
  Map<int, List<ResultSubject>> failed,
) {
  final semesters = <int>{
    for (final e in record.semesterGpas.keys) _semesterIndex(e),
    ...failed.keys,
  }.where((s) => s > 0).toList()
    ..sort((a, b) => b.compareTo(a));
  return [
    for (final sem in semesters)
      _SubjectsForSemester(
        sem,
        record.semesterGpas['gpa$sem'] ?? record.semesterGpas['GPA$sem'],
        failed[sem] ?? const [],
      ),
  ];
}

String _formatDateLine(BuildContext context, String iso) {
  final isBn = Localizations.localeOf(context).languageCode == 'bn';
  final dt = DateTime.tryParse(iso);
  if (dt == null) return iso;
  return DateFormat('d MMMM, y', isBn ? 'bn' : 'en').format(dt);
}

String _timeAgo(AppLocalizations l10n, String iso) {
  final dt = DateTime.tryParse(iso);
  if (dt == null) return '';
  final diff = DateTime.now().difference(dt);
  if (diff.inMinutes < 60) return l10n.resultTimeAgoHours(diff.inHours.clamp(1, 24));
  final days = diff.inDays;
  if (days < 45) return l10n.resultTimeAgoDays(days);
  if (days < 365) return l10n.resultTimeAgoMonths((days / 30.44).round().clamp(1, 12));
  return l10n.resultTimeAgoYears((days / 365.25).round().clamp(1, 10));
}

