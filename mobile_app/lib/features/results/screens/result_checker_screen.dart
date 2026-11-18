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
      appBar: AppBar(title: Text(l10n.resultChecker)),
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

    final tiles = record.sortedSemesterGpas;

    return Card(
      margin: const EdgeInsets.only(bottom: DbSpacing.md),
      clipBehavior: Clip.antiAlias,
      elevation: 1.5,
      shadowColor: Colors.black26,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(DbRadius.card)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Navy gradient header ────────────────────────────────────────
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
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.badge_rounded,
                      color: Colors.white, size: 24),
                ),
                const SizedBox(width: DbSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('#${record.roll}',
                          style: theme.textTheme.titleLarge?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5)),
                      if (record.title != null && record.title!.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(record.title!,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodySmall
                                ?.copyWith(color: Colors.white.withValues(alpha: 0.9))),
                      ],
                      if (record.institute != null && record.institute!.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(record.institute!,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodySmall?.copyWith(
                                color: Colors.white
                                    .withValues(alpha: 0.75))),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(DbSpacing.md),
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
                  const SizedBox(height: DbSpacing.sm + 4),
                  _CgpaHighlight(cgpa: record.cgpa!, label: l10n.cgpa),
                ],
                const SizedBox(height: DbSpacing.sm + 4),
                _StatusBanner(text: statusText, color: statusColor),
                if (record.subjects.isNotEmpty) ...[
                  const SizedBox(height: DbSpacing.sm + 4),
                  Text(l10n.resultSubjectsList,
                      style: theme.textTheme.titleSmall
                          ?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: DbSpacing.sm),
                  Wrap(
                    spacing: DbSpacing.sm,
                    runSpacing: DbSpacing.sm,
                    children: [
                      for (final subject in record.subjects)
                        _ReferredSubjectChip(
                          text: '${subject.code ?? '—'}${subject.titleSuffix}',
                        ),
                    ],
                  ),
                ],
                if (tiles.isNotEmpty) ...[
                  const SizedBox(height: DbSpacing.md),
                  Text(l10n.resultGpa,
                      style: theme.textTheme.titleSmall
                          ?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: DbSpacing.sm),
                  for (var i = 0; i < tiles.length; i++)
                    _FadeInUp(
                      key: ValueKey('${record.examId}-${tiles[i].key}'),
                      index: (i + 1).clamp(0, 8),
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: DbSpacing.sm),
                        child: _SemesterGpaTile(
                          semester: _semesterIndex(tiles[i].key),
                          semesterName: _semesterLabel(
                              context, _semesterIndex(tiles[i].key)),
                          gpa: tiles[i].value,
                          isExamSemester: record.examSemester != null &&
                              record.examSemester == _semesterIndex(tiles[i].key),
                          examLabel: l10n.resultThisExam,
                        ),
                      ),
                    ),
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

class _ReferredSubjectChip extends StatelessWidget {
  final String text;

  const _ReferredSubjectChip({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: _statusRed.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(DbRadius.chip),
        border: Border.all(color: _statusRed.withValues(alpha: 0.35)),
      ),
      child: Text(
        text,
        style: const TextStyle(
            color: _statusRed,
            fontWeight: FontWeight.w600,
            fontFeatures: [FontFeature.tabularFigures()]),
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
    final letter = missing ? null : _letterFromGpa(gpa);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: isExamSemester
            ? theme.colorScheme.primary.withValues(alpha: 0.06)
            : theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color: isExamSemester
                ? theme.colorScheme.primary.withValues(alpha: 0.35)
                : Colors.transparent),
      ),
      child: Row(
        children: [
          // Semester index avatar
          Container(
            width: 34,
            height: 34,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: isExamSemester
                  ? theme.colorScheme.primary.withValues(alpha: 0.14)
                  : theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.8),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              semester > 0 ? '$semester' : '?',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w800,
                color: isExamSemester
                    ? theme.colorScheme.primary
                    : theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(semesterName,
                    style: theme.textTheme.bodyMedium
                        ?.copyWith(fontWeight: FontWeight.w600)),
                if (isExamSemester) ...[
                  const SizedBox(height: 2),
                  Text(examLabel,
                      style: theme.textTheme.labelSmall?.copyWith(
                          color: theme.colorScheme.primary,
                          fontWeight: FontWeight.w700)),
                ],
              ],
            ),
          ),
          if (missing)
            Text('—', style: TextStyle(color: valueColor, fontWeight: FontWeight.w800, fontSize: 16))
          else ...[
            Text(
              gpa!.toStringAsFixed(2),
              style: TextStyle(
                  color: valueColor,
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                  fontFeatures: const [FontFeature.tabularFigures()]),
            ),
            if (letter != null)
              Container(
                margin: const EdgeInsets.only(left: 8),
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
        ],
      ),
    );
  }
}
