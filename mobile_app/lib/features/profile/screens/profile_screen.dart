import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../auth/providers/auth_controller.dart';
import '../../../core/api/api_client.dart';
import '../../../core/providers.dart';
import '../../../shared/widgets/states.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _deletionRequested = false;

  Future<void> _confirmLogout(AppLocalizations l10n) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.logout),
        content: Text(l10n.logoutConfirm),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(l10n.cancel),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: DbColors.errorLight),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(l10n.logout),
          ),
        ],
      ),
    );
    if (ok == true && mounted) {
      await ref.read(authControllerProvider.notifier).logout();
    }
  }

  Future<void> _requestDeletion(AppLocalizations l10n) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.deleteAccountRequest),
        content: Text(l10n.deleteAccountExplain),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(l10n.cancel),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: DbColors.errorLight),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(l10n.confirm),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await ref.read(apiClientProvider).postMap('/users/me/deletion-request');
      if (!mounted) return;
      setState(() => _deletionRequested = true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.deleteAccountRequested)),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: DbColors.errorLight),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final user = ref.watch(authControllerProvider).value;

    if (user == null) {
      return Scaffold(
        appBar: AppBar(title: Text(l10n.profile)),
        body: const DbLoadingView(),
      );
    }

    final academic = user.academic;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.profile)),
      body: ListView(
        padding: const EdgeInsets.all(DbSpacing.md),
        children: [
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
            child: Row(
              children: [
                CircleAvatar(
                  radius: 32,
                  backgroundColor: DbColors.emerald,
                  child: Text(
                    user.name.isNotEmpty ? user.name[0].toUpperCase() : '?',
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(width: DbSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user.name,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        user.email,
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.8)),
                      ),
                      if (user.phone != null && user.phone!.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          user.phone!,
                          style: TextStyle(color: Colors.white.withValues(alpha: 0.8)),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: DbSpacing.md),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(DbSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.academicInfo,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: DbSpacing.sm),
                  if (academic == null ||
                      (academic.instituteId == null && academic.semesterNumber == null))
                    Text(
                      l10n.academicInfoMissing,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                    )
                  else ...[
                    if (academic.semesterNumber != null)
                      DbInfoRow(label: l10n.semester, value: '${academic.semesterNumber}'),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: DbSpacing.md),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.bookmark_rounded, color: DbColors.teal),
                  title: Text(l10n.bookmarks),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => context.push('/library?view=bookmarks'),
                ),
                ListTile(
                  leading: const Icon(Icons.history_rounded, color: DbColors.emerald),
                  title: Text(l10n.examResult),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => context.push('/exams'),
                ),
                ListTile(
                  leading: const Icon(Icons.calculate_rounded, color: DbColors.navy),
                  title: Text(l10n.resultHistory),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => context.push('/gpa/history'),
                ),
              ],
            ),
          ),
          const SizedBox(height: DbSpacing.md),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.settings_rounded),
                  title: Text(l10n.settings),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => context.push('/settings'),
                ),
                if (_deletionRequested)
                  ListTile(
                    leading: const Icon(Icons.hourglass_top_rounded,
                        color: DbColors.warningLight),
                    title: Text(l10n.deleteAccountRequested),
                  )
                else
                  ListTile(
                    leading: const Icon(Icons.delete_forever_rounded,
                        color: DbColors.errorLight),
                    title: Text(
                      l10n.deleteAccountRequest,
                      style: const TextStyle(color: DbColors.errorLight),
                    ),
                    onTap: () => _requestDeletion(l10n),
                  ),
                ListTile(
                  leading: const Icon(Icons.logout_rounded, color: DbColors.errorLight),
                  title: Text(
                    l10n.logout,
                    style: const TextStyle(color: DbColors.errorLight),
                  ),
                  onTap: () => _confirmLogout(l10n),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
