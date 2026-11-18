import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../shared/widgets/states.dart';
import '../providers/gpa_providers.dart';

class TargetScreen extends ConsumerStatefulWidget {
  const TargetScreen({super.key});

  @override
  ConsumerState<TargetScreen> createState() => _TargetScreenState();
}

class _TargetScreenState extends ConsumerState<TargetScreen> {
  String? _profileId;
  final TextEditingController _target = TextEditingController();
  final Map<int, TextEditingController> _completed = {};
  final TextEditingController _remaining = TextEditingController(text: '1');
  Map<String, dynamic>? _result;
  bool _calculating = false;
  String? _error;

  @override
  void dispose() {
    _target.dispose();
    _remaining.dispose();
    for (final c in _completed.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _estimate() async {
    final l10n = AppLocalizations.of(context)!;
    if (_profileId == null) return;
    setState(() {
      _calculating = true;
      _error = null;
    });
    try {
      final completed = <({int semesterNumber, double gpa})>[];
      _completed.forEach((sem, c) {
        final gpa = double.tryParse(c.text.trim());
        if (gpa != null) completed.add((semesterNumber: sem, gpa: gpa));
      });
      final remainingCount = int.tryParse(_remaining.text.trim()) ?? 1;
      final result = await ref.read(gpaRepositoryProvider).target(
            profileId: _profileId!,
            targetCgpa: double.tryParse(_target.text.trim()) ?? 0,
            completed: completed,
            remainingSemesters: List.generate(remainingCount, (i) => i + 1),
          );
      setState(() => _result = {
            'requiredGpa': result.requiredGpa,
            'feasible': result.feasible,
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
      appBar: AppBar(title: Text(l10n.targetPlanner)),
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
            data: (structure) => ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: DbColors.warningLight.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(l10n.estimateDisclaimer),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _target,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(labelText: l10n.cgpa),
                ),
                const SizedBox(height: 8),
                for (final w in structure.semesterWeights)
                  TextField(
                    controller: _completed.putIfAbsent(
                      w.semesterNumber,
                      () => TextEditingController(),
                    ),
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: 'Sem ${w.semesterNumber} GPA (completed)',
                    ),
                  ),
                const SizedBox(height: 8),
                TextField(
                  controller: _remaining,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Remaining semesters'),
                ),
                if (_error != null)
                  Text(_error!, style: const TextStyle(color: DbColors.errorLight)),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: _calculating ? null : _estimate,
                  icon: const Icon(Icons.track_changes_rounded),
                  label: Text(l10n.calculate),
                ),
                if (_result != null) ...[
                  const SizedBox(height: 16),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          Text(
                            '${l10n.cgpa}: ${((_result!['requiredGpa'] as num?) ?? 0).toStringAsFixed(2)}',
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.w800,
                                ),
                          ),
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
            ),
          );
        },
      ),
    );
  }
}
