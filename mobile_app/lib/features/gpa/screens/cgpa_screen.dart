import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../shared/widgets/states.dart';
import '../data/gpa_models.dart';
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
          if (_profileId == null || !list.any((p) => p.id == _profileId)) {
            _profileId = list.first.id;
          }
          final selected = list.firstWhere((p) => p.id == _profileId);
          final structureAsync = ref.watch(profileStructureProvider(_profileId!));
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (list.length > 1)
                DropdownButtonFormField<String>(
                  value: selected.id,
                  decoration: InputDecoration(
                    labelText: l10n.profileLabel,
                    prefixIcon: const Icon(Icons.tune_rounded),
                  ),
                  items: list
                      .map((p) => DropdownMenuItem(
                            value: p.id,
                            child: Text('v${p.version} · ${p.status}'),
                          ))
                      .toList(),
                  onChanged: (id) {
                    if (id == null || id == _profileId) return;
                    setState(() {
                      for (final c in _gpaFields.values) {
                        c.dispose();
                      }
                      for (final c in _creditFields.values) {
                        c.dispose();
                      }
                      _gpaFields.clear();
                      _creditFields.clear();
                      _profileId = id;
                      _result = null;
                      _error = null;
                    });
                  },
                ),
              structureAsync.when(
                loading: () => const Padding(
                  padding: EdgeInsets.all(32),
                  child: DbLoadingView(),
                ),
                error: (e, _) => DbErrorView(
                  message: l10n.errorGeneric,
                  onRetry: () =>
                      ref.invalidate(profileStructureProvider(_profileId!)),
                ),
                data: (structure) => _buildForm(context, l10n, structure),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildForm(
      BuildContext context, AppLocalizations l10n, ProfileStructure structure) {
    final weights = structure.semesterWeights;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: DbSpacing.md),
        Row(
          children: [
            SizedBox(
              width: 96,
              child: Text(
                l10n.semester,
                style: Theme.of(context)
                    .textTheme
                    .labelMedium
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
            ),
            Expanded(
              child: Text(
                l10n.cgpaGpaHint,
                style: Theme.of(context)
                    .textTheme
                    .labelMedium
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
            ),
            if (structure.cgpaStrategy == 'credit_weighted')
              SizedBox(
                width: 110,
                child: Text(
                  l10n.cgpaCreditsHint,
                  style: Theme.of(context)
                      .textTheme
                      .labelMedium
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
          ],
        ),
        const SizedBox(height: DbSpacing.sm),
        for (final w in weights)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                SizedBox(
                  width: 96,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 6),
                    decoration: BoxDecoration(
                      color: DbColors.teal.withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(DbRadius.badge),
                    ),
                    child: Text(
                      '${w.semesterNumber} · ${w.percent}%',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: DbColors.teal,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _gpaFields.putIfAbsent(
                      w.semesterNumber,
                      () => TextEditingController(),
                    ),
                    keyboardType: TextInputType.number,
                    decoration:
                        InputDecoration(hintText: l10n.cgpaGpaHint),
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
                      decoration:
                          InputDecoration(hintText: l10n.cgpaCreditsHint),
                    ),
                  ),
              ],
            ),
          ),
        if (_error != null) ...[
          const SizedBox(height: DbSpacing.xs),
          Text(_error!, style: const TextStyle(color: DbColors.errorLight)),
        ],
        const SizedBox(height: DbSpacing.md),
        FilledButton.icon(
          onPressed: _calculating ? null : _calculate,
          icon: _calculating
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: Colors.white),
                )
              : const Icon(Icons.functions_rounded),
          label: Text(l10n.calculate),
        ),
        if (_result != null) ...[
          const SizedBox(height: DbSpacing.lg),
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
              children: [
                Text(
                  ((_result!['cgpa'] as num?) ?? 0).toStringAsFixed(2),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 44,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  l10n.cgpa,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.8),
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (_result!['classBand'] != null &&
                    (_result!['classBand'] as String).isNotEmpty) ...[
                  const SizedBox(height: DbSpacing.sm),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: DbSpacing.sm + 2, vertical: 4),
                    decoration: BoxDecoration(
                      color: DbColors.emerald.withValues(alpha: 0.25),
                      borderRadius: BorderRadius.circular(DbRadius.badge),
                    ),
                    child: Text(
                      _result!['classBand'] as String,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          for (final n in (_result!['notes'] as List? ?? []).cast<String>())
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(n, style: Theme.of(context).textTheme.bodySmall),
            ),
        ],
      ],
    );
  }
}
