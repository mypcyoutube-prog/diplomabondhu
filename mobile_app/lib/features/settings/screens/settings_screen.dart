import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../core/api/api_client.dart';
import '../../../core/providers.dart';
import '../../notifications/providers/notification_providers.dart';
import '../../settings/providers/app_preferences.dart';
import '../../../shared/widgets/states.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _changingPassword = false;

  Future<void> _changePassword(AppLocalizations l10n) async {
    final current = TextEditingController();
    final next = TextEditingController();
    final formKey = GlobalKey<FormState>();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.changePassword),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: current,
                obscureText: true,
                decoration: InputDecoration(labelText: l10n.currentPassword),
                validator: (v) =>
                    (v == null || v.isEmpty) ? l10n.errorGeneric : null,
              ),
              const SizedBox(height: DbSpacing.sm),
              TextFormField(
                controller: next,
                obscureText: true,
                decoration: InputDecoration(labelText: l10n.newPassword),
                validator: (v) => (v == null || v.length < 8)
                    ? l10n.passwordTooShort
                    : null,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(l10n.cancel),
          ),
          FilledButton(
            onPressed: () {
              if (formKey.currentState?.validate() ?? false) {
                Navigator.pop(ctx, true);
              }
            },
            child: Text(l10n.save),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _changingPassword = true);
    try {
      await ref.read(apiClientProvider).postMap('/auth/change-password', body: {
        'currentPassword': current.text,
        'newPassword': next.text,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.changePasswordSuccess)),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: DbColors.errorLight),
      );
    } finally {
      if (mounted) setState(() => _changingPassword = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final prefs = ref.watch(appPreferencesProvider);
    final prefsNotifier = ref.read(appPreferencesProvider.notifier);
    final notifPrefs = ref.watch(notificationPrefsProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.settings)),
      body: ListView(
        padding: const EdgeInsets.all(DbSpacing.md),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(DbSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l10n.language, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: DbSpacing.sm),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'bn', label: Text('বাংলা')),
                      ButtonSegment(value: 'en', label: Text('English')),
                    ],
                    selected: {prefs.language},
                    onSelectionChanged: (s) => prefsNotifier.setLanguage(s.first),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: DbSpacing.sm),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(DbSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l10n.theme, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: DbSpacing.sm),
                  SegmentedButton<AppThemeMode>(
                    segments: [
                      ButtonSegment(value: AppThemeMode.system, label: Text(l10n.system)),
                      ButtonSegment(value: AppThemeMode.light, label: Text(l10n.light)),
                      ButtonSegment(value: AppThemeMode.dark, label: Text(l10n.dark)),
                    ],
                    selected: {prefs.themeMode},
                    onSelectionChanged: (s) => prefsNotifier.setThemeMode(s.first),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: DbSpacing.sm),
          Card(
            child: notifPrefs.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(DbSpacing.md),
                child: DbLoadingView(),
              ),
              error: (e, _) => DbErrorView(
                message: l10n.errorGeneric,
                onRetry: () => ref.invalidate(notificationPrefsProvider),
              ),
              data: (raw) {
                final categories = (raw['categories'] as Map<String, dynamic>? ?? {})
                    .map((k, v) => MapEntry(k, v == true));
                return Padding(
                padding: const EdgeInsets.all(DbSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(l10n.preferences,
                        style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: DbSpacing.xs),
                    ...categories.entries.map(
                      (e) {
                        final v = e.value;
                        return SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        dense: true,
                        title: Text(_categoryLabel(l10n, e.key)),
                        value: v,
                        onChanged: (val) async {
                          final updated = Map<String, bool>.from(categories);
                          updated[e.key] = val;
                          await ref
                              .read(notificationRepositoryProvider)
                              .updatePreferences(updated);
                          ref.invalidate(notificationPrefsProvider);
                        },
                      );
                      },
                    ),
                  ],
                ),
              );
              },
            ),
          ),
          const SizedBox(height: DbSpacing.sm),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.lock_rounded),
                  title: Text(l10n.changePassword),
                  trailing: _changingPassword
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.chevron_right_rounded),
                  onTap: _changingPassword ? null : () => _changePassword(l10n),
                ),
              ],
            ),
          ),
          const SizedBox(height: DbSpacing.sm),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(DbSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l10n.about, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: DbSpacing.sm),
                  DbInfoRow(label: l10n.appTitle, value: 'DiplomaBondhu'),
                  DbInfoRow(label: l10n.version, value: '1.0.0+1'),
                ],
              ),
            ),
          ),
          const SizedBox(height: DbSpacing.lg),
        ],
      ),
    );
  }

  String _categoryLabel(AppLocalizations l10n, String key) => switch (key) {
        'material' => l10n.library,
        'exam' => l10n.exams,
        'academic' => l10n.academicInfo,
        'community' => l10n.community,
        'announcement' => l10n.announcements,
        _ => l10n.notifications,
      };
}
