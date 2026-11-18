import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../../../shared/widgets/states.dart';
import '../data/gpa_models.dart';
import '../providers/gpa_providers.dart';

class SemesterGpaScreen extends ConsumerStatefulWidget {
  const SemesterGpaScreen({super.key});

  @override
  ConsumerState<SemesterGpaScreen> createState() => _SemesterGpaScreenState();
}

class _SubjectRow {
  final TextEditingController code = TextEditingController();
  final TextEditingController name = TextEditingController();
  final TextEditingController credit = TextEditingController(text: '3.0');
  String subjectType = 'theory';
  String? grade;
  final Map<String, TextEditingController> marks = {};

  SubjectInput toInput(String inputMode) => SubjectInput(
        subjectId: code.text.trim(),
        code: code.text.trim(),
        name: name.text.trim().isEmpty ? code.text.trim() : name.text.trim(),
        credits: double.tryParse(credit.text.trim()) ?? 0,
        subjectType: subjectType,
        marks: inputMode == 'marks'
            ? marks.map((k, v) => MapEntry(k, double.tryParse(v.text) ?? 0))
            : {},
        grade: inputMode == 'grades' ? grade : null,
      );
}

class _SemesterGpaScreenState extends ConsumerState<SemesterGpaScreen> {
  String _inputMode = 'marks';
  String? _profileId;
  final List<_SubjectRow> _rows = [];
  SemesterGpaResult? _result;
  bool _calculating = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _addRow();
  }

  @override
  void dispose() {
    for (final row in _rows) {
      row.code.dispose();
      row.name.dispose();
      row.credit.dispose();
      for (final c in row.marks.values) {
        c.dispose();
      }
    }
    super.dispose();
  }

  void _addRow() {
    setState(() => _rows.add(_SubjectRow()));
  }

  Future<void> _calculate() async {
    final l10n = AppLocalizations.of(context)!;
    if (_profileId == null) return;
    setState(() {
      _calculating = true;
      _error = null;
    });
    try {
      final result = await ref.read(gpaRepositoryProvider).calculateSemester(
            profileId: _profileId!,
            inputMode: _inputMode,
            subjects: _rows.map((r) => r.toInput(_inputMode)).toList(),
          );
      setState(() => _result = result);
    } catch (e) {
      setState(() => _error = l10n.errorGeneric);
    } finally {
      if (mounted) setState(() => _calculating = false);
    }
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context)!;
    final result = _result;
    if (result == null || _profileId == null) return;
    try {
      await ref.read(gpaRepositoryProvider).saveResult(
            kind: 'semester',
            profileId: _profileId!,
            inputs: {
              'inputMode': _inputMode,
              'subjects': _rows.map((r) => r.toInput(_inputMode)).toList(),
            },
            output: {
              'gpa': result.gpa,
              'status': result.status,
              'subjects': result.subjects.map((s) => s.code).toList(),
            },
            label: l10n.semesterGpa,
          );
      ref.invalidate(gpaHistoryProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.save)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(l10n.errorGeneric)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final profiles = ref.watch(gpaProfilesProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.semesterGpa)),
      body: profiles.when(
        loading: () => const DbLoadingView(),
        error: (e, _) => DbErrorView(
          message: l10n.errorGeneric,
          onRetry: () => ref.invalidate(gpaProfilesProvider),
        ),
        data: (list) {
          if (list.isEmpty) {
            return DbEmptyView(
              message: l10n.comingSoon,
              icon: Icons.lock_rounded,
            );
          }
          _profileId ??= list.first.id;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              SegmentedButton<String>(
                segments: [
                  ButtonSegment(value: 'marks', label: Text(l10n.marksMode)),
                  ButtonSegment(value: 'grades', label: Text(l10n.gradeMode)),
                ],
                selected: {_inputMode},
                onSelectionChanged: (s) => setState(() => _inputMode = s.first),
              ),
              const SizedBox(height: 12),
              AsyncValueView(
                value: ref.watch(profileStructureProvider(_profileId!)),
                onRetry: () => ref.invalidate(profileStructureProvider(_profileId!)),
                builder: (context, structure) => _buildForm(context, l10n, structure),
              ),
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!, style: const TextStyle(color: DbColors.errorLight)),
              ],
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: _calculating ? null : _calculate,
                icon: const Icon(Icons.calculate_rounded),
                label: Text(l10n.calculate),
              ),
              if (_result != null) ...[
                const SizedBox(height: 16),
                _ResultCard(
                  result: _result!,
                  onSave: _save,
                ),
              ],
            ],
          );
        },
      ),
    );
  }

  Widget _buildForm(BuildContext context, AppLocalizations l10n, ProfileStructure structure) {
    return Column(
      children: [
        for (var i = 0; i < _rows.length; i++) _subjectCard(l10n, structure, i),
        TextButton.icon(
          onPressed: _addRow,
          icon: const Icon(Icons.add_rounded),
          label: const Text('+'),
        ),
      ],
    );
  }

  Widget _subjectCard(AppLocalizations l10n, ProfileStructure structure, int i) {
    final row = _rows[i];
    final components = structure.assessments[row.subjectType] ?? [];
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: row.code,
                    decoration: const InputDecoration(labelText: 'Code'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: row.credit,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Credit'),
                  ),
                ),
                IconButton(
                  onPressed: () => setState(() => _rows.removeAt(i)),
                  icon: const Icon(Icons.delete_outline_rounded),
                ),
              ],
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: row.subjectType,
              decoration: const InputDecoration(labelText: 'Type'),
              items: structure.assessments.keys
                  .map((k) => DropdownMenuItem(value: k, child: Text(k)))
                  .toList(),
              onChanged: (v) => setState(() => row.subjectType = v ?? 'theory'),
            ),
            const SizedBox(height: 8),
            if (_inputMode == 'grades')
              DropdownButtonFormField<String>(
                initialValue: row.grade,
                decoration: InputDecoration(labelText: l10n.gradeMode),
                items: structure.gradingTable
                    .map((g) => DropdownMenuItem(
                          value: g.grade,
                          child: Text('${g.grade} (${g.point})'),
                        ))
                    .toList(),
                onChanged: (v) => setState(() => row.grade = v),
              )
            else
              ...components.map((c) {
                final controller = row.marks.putIfAbsent(
                  c.key,
                  () => TextEditingController(),
                );
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: TextField(
                    controller: controller,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: '${c.label} (max ${c.maxMarks})',
                    ),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}

class _ResultCard extends StatelessWidget {
  final SemesterGpaResult result;
  final VoidCallback onSave;

  const _ResultCard({required this.result, required this.onSave});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Card(
      color: DbColors.teal.withValues(alpha: 0.08),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text(
              result.gpa.toStringAsFixed(2),
              style: Theme.of(context).textTheme.displaySmall?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: DbColors.navy,
                  ),
            ),
            Text(l10n.semesterGpa),
            const SizedBox(height: 12),
            ...result.subjects.map(
              (s) => DbInfoRow(
                label: s.code,
                value: '${s.grade ?? '-'} · ${s.point?.toStringAsFixed(2) ?? '-'} · ${s.status}',
              ),
            ),
            for (final n in result.notes)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(n, style: Theme.of(context).textTheme.bodySmall),
              ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: onSave,
              icon: const Icon(Icons.save_rounded),
              label: Text(l10n.saveToHistory),
            ),
          ],
        ),
      ),
    );
  }
}
