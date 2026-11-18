import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../shared/widgets/states.dart';
import '../providers/gpa_providers.dart';

class CgpaScreen extends ConsumerStatefulWidget {
  const CgpaScreen({super.key});

  @override
  ConsumerState<CgpaScreen> createState() => _CgpaScreenState();
}

class _CgpaScreenState extends ConsumerState<CgpaScreen> {
  String? _profileId;
  final Map<int, TextEditingController> _gpaFields = {};
  final Map<int, TextEditingController> _creditFields = {};
  Map<String, dynamic>? _result;
  bool _calculating = false;
  String? _error;

  @override
  void dispose() {
    for (final c in _gpaFields.values) {
      c.dispose();
    }
    for (final c in _creditFields.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _calculate() async {
    final l10n = AppLocalizations.of(context)!;
    if (_profileId == null) return;
    setState(() {
      _calculating = true;
      _error = null;
    });
    try {
      final entries = <({int semesterNumber, double gpa, double? credits})>[];
      _gpaFields.forEach((sem, c) {
        final gpa = double.tryParse(c.text.trim());
        if (gpa == null) return;
        final credit = double.tryParse(_creditFields[sem]?.text.trim() ?? '');
        entries.add((semesterNumber: sem, gpa: gpa, credits: credit));
      });
      final result = await ref.read(gpaRepositoryProvider).calculateCgpa(
            profileId: _profileId!,
            semesterGpas: entries,
          );
      setState(() => _result = {
            'cgpa': result.cgpa,
            'strategy': result.strategy,
            'classBand': result.classBand,
            'notes': result.notes,
          });
    } catch (_) {
      setState(() => _error = l10n.errorGeneric);
    } finally {
      if (mounted) setState(() => _calculating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final profiles = ref.watch(gpaProfilesProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.cgpa)),
      body: profiles.when(
        loading: () => const DbLoadingView(),
        error: (e, _) => DbErrorView(
          message: l10n.errorGeneric,
          onRetry: () => ref.invalidate(gpaProfilesProvider),
        ),
        data: (list) {
          if (list.isEmpty) {
            return DbEmptyView(message: l10n.comingSoon, icon: Icons.lock_rounded);
          }
          _profileId ??= list.first.id;
          final structureAsync = ref.watch(profileStructureProvider(_profileId!));
          return structureAsync.when(
            loading: () => const DbLoadingView(),
            error: (e, _) => DbErrorView(
              message: l10n.errorGeneric,
              onRetry: () => ref.invalidate(profileStructureProvider(_profileId!)),
            ),
            data: (structure) {
              final weights = structure.semesterWeights;
              return ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  for (final w in weights)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 110,
                            child: Text('Sem ${w.semesterNumber} (${w.percent}%)'),
                          ),
                          Expanded(
                            child: TextField(
                              controller: _gpaFields.putIfAbsent(
                                w.semesterNumber,
                                () => TextEditingController(),
                              ),
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(hintText: 'GPA (0-5)'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          if (structure.cgpaStrategy == 'credit_weighted')
                            SizedBox(
                              width: 110,
                              child: TextField(
                                controller: _creditFields.putIfAbsent(
                                  w.semesterNumber,
                                  () => TextEditingController(),
                                ),
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(hintText: 'Credits'),
                              ),
                            ),
                        ],
                      ),
                    ),
                  if (_error != null)
                    Text(_error!, style: const TextStyle(color: DbColors.errorLight)),
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    onPressed: _calculating ? null : _calculate,
                    icon: const Icon(Icons.functions_rounded),
                    label: Text(l10n.calculate),
                  ),
                  if (_result != null) ...[
                    const SizedBox(height: 16),
                    Card(
                      color: DbColors.teal.withValues(alpha: 0.08),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: [
                            Text(
                              ((_result!['cgpa'] as num?) ?? 0).toStringAsFixed(2),
                              style: Theme.of(context).textTheme.displaySmall?.copyWith(
                                    fontWeight: FontWeight.w800,
                                    color: DbColors.navy,
                                  ),
                            ),
                            Text(l10n.cgpa),
                            if (_result!['classBand'] != null)
                              Text('${_result!['classBand']}'),
                            for (final n in (_result!['notes'] as List? ?? []).cast<String>())
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text(n, style: Theme.of(context).textTheme.bodySmall),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ],
              );
            },
          );
        },
      ),
    );
  }
}
