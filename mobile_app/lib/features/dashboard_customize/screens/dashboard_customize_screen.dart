import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../core/api/api_client.dart';
import '../../../shared/widgets/states.dart';
import '../data/dashboard_prefs_repository.dart';
import '../providers/dashboard_prefs_providers.dart';

class DashboardCustomizeScreen extends ConsumerStatefulWidget {
  const DashboardCustomizeScreen({super.key});

  @override
  ConsumerState<DashboardCustomizeScreen> createState() =>
      _DashboardCustomizeScreenState();
}

class _DashboardCustomizeScreenState
    extends ConsumerState<DashboardCustomizeScreen> {
  List<DashboardSectionPref>? _draft;
  bool _saving = false;

  String _sectionLabel(AppLocalizations l10n, String key) {
    switch (key) {
      case 'quick_access':
        return l10n.quickAccess;
      case 'result_checker':
        return l10n.resultChecker;
      case 'materials':
        return l10n.recentMaterials;
      case 'community':
        return l10n.community;
      case 'academic_info':
        return l10n.academicInfo;
      case 'announcements':
        return l10n.notifications;
      case 'exams':
        return l10n.exams;
      case 'gpa_calculator':
        return l10n.gpa;
      case 'planner':
        return l10n.planner;
    }
    return key;
  }

  Future<void> _save(List<DashboardSectionPref> sections) async {
    final l10n = AppLocalizations.of(context)!;
    setState(() => _saving = true);
    try {
      final saved =
          await ref.read(dashboardPrefsRepositoryProvider).save(sections);
      ref.invalidate(dashboardPrefsProvider);
      if (!mounted) return;
      setState(() => _draft = saved.sections);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.dashboardSaved)),
      );
    } on ApiException {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.errorGeneric), backgroundColor: DbColors.errorLight),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _reset() async {
    final l10n = AppLocalizations.of(context)!;
    setState(() => _saving = true);
    try {
      final saved = await ref.read(dashboardPrefsRepositoryProvider).reset();
      ref.invalidate(dashboardPrefsProvider);
      if (!mounted) return;
      setState(() => _draft = saved.sections);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.dashboardResetDone)),
      );
    } on ApiException {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.errorGeneric), backgroundColor: DbColors.errorLight),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _reorder(int index, int delta, List<DashboardSectionPref> sections) {
    final target = index + delta;
    if (target < 0 || target >= sections.length) return;
    setState(() {
      final item = sections.removeAt(index);
      sections.insert(target, item);
      for (var i = 0; i < sections.length; i++) {
        sections[i] = sections[i].copyWith(order: i);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final prefs = ref.watch(dashboardPrefsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.dashboardCustomizeTitle),
        actions: [
          if (_draft != null)
            IconButton(
              tooltip: l10n.dashboardResetLayout,
              icon: const Icon(Icons.restart_alt_rounded),
              onPressed: _saving ? null : _reset,
            ),
        ],
      ),
      body: prefs.when(
        loading: () => const DbLoadingView(),
        error: (e, _) => DbErrorView(
          message: l10n.errorGeneric,
          onRetry: () => ref.invalidate(dashboardPrefsProvider),
        ),
        data: (bundle) {
          final sections = _draft ?? bundle.sections;
          return ListView(
            padding: const EdgeInsets.all(DbSpacing.md),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(DbSpacing.md),
                  child: Text(l10n.dashboardCustomizeHint,
                      style: Theme.of(context).textTheme.bodyMedium),
                ),
              ),
              const SizedBox(height: DbSpacing.sm),
              Card(
                child: Column(
                  children: [
                    for (var i = 0; i < sections.length; i++)
                      ListTile(
                        key: ValueKey(sections[i].key),
                        leading: Icon(
                          sections[i].visible
                              ? Icons.visibility_rounded
                              : Icons.visibility_off_rounded,
                          color: sections[i].visible ? DbColors.teal : DbColors.navy,
                        ),
                        title: Text(_sectionLabel(l10n, sections[i].key)),
                        subtitle: sections[i].customizable
                            ? null
                            : Text(l10n.dashboardLockedSection),
                        trailing: sections[i].customizable
                            ? Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.arrow_upward_rounded, size: 20),
                                    onPressed:
                                        i == 0 ? null : () => _reorder(i, -1, sections),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.arrow_downward_rounded, size: 20),
                                    onPressed: i == sections.length - 1
                                        ? null
                                        : () => _reorder(i, 1, sections),
                                  ),
                                ],
                              )
                            : const Icon(Icons.lock_rounded, size: 18),
                        onTap: sections[i].customizable
                            ? () {
                                setState(() {
                                  sections[i] = sections[i]
                                      .copyWith(visible: !sections[i].visible);
                                });
                              }
                            : null,
                      ),
                  ],
                ),
              ),
              const SizedBox(height: DbSpacing.md),
              FilledButton.icon(
                onPressed: _saving ? null : () => _save(sections),
                icon: _saving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.save_rounded),
                label: Text(l10n.dashboardSave),
              ),
            ],
          );
        },
      ),
    );
  }
}
