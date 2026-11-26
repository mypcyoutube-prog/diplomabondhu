import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../auth/data/user.dart';
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

  void _showEditSheet(AppLocalizations l10n, User user) {
    final nameController = TextEditingController(text: user.name);
    final phoneController = TextEditingController(text: user.phone ?? '');
    var saving = false;

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => StatefulBuilder(
        builder: (sheetContext, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: DbSpacing.lg,
            right: DbSpacing.lg,
            top: DbSpacing.sm,
            bottom: MediaQuery.of(sheetContext).viewInsets.bottom +
                DbSpacing.lg,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l10n.editProfile,
                style: Theme.of(sheetContext).textTheme.titleLarge,
              ),
              const SizedBox(height: DbSpacing.md),
              TextField(
                controller: nameController,
                decoration: InputDecoration(
                  labelText: l10n.fullName,
                  prefixIcon: const Icon(Icons.person_outline_rounded),
                ),
              ),
              const SizedBox(height: DbSpacing.md),
              TextField(
                controller: phoneController,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: l10n.phoneLabel,
                  prefixIcon: const Icon(Icons.phone_outlined),
                ),
              ),
              const SizedBox(height: DbSpacing.lg),
              FilledButton.icon(
                onPressed: saving
                    ? null
                    : () async {
                        final name = nameController.text.trim();
                        if (name.length < 2) {
                          ScaffoldMessenger.of(sheetContext).showSnackBar(
                            SnackBar(content: Text(l10n.nameTooShort)),
                          );
                          return;
                        }
                        setSheetState(() => saving = true);
                        try {
                          await ref
                              .read(authControllerProvider.notifier)
                              .updateProfile(
                                name: name,
                                phone: phoneController.text.trim(),
                              );
                          if (!sheetContext.mounted) return;
                          Navigator.pop(sheetContext);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(l10n.profileUpdated)),
                          );
                        } on ApiException catch (e) {
                          setSheetState(() => saving = false);
                          ScaffoldMessenger.of(sheetContext).showSnackBar(
                            SnackBar(
                              content: Text(e.message),
                              backgroundColor: DbColors.errorLight,
                            ),
                          );
                        }
                      },
                icon: saving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.check_rounded),
                label: Text(l10n.save),
              ),
            ],
          ),
        ),
      ),
    );
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
    final initials = user.name.isNotEmpty ? user.name[0].toUpperCase() : '?';
    final joined = user.createdAt;

    Widget quickTile(String label, IconData icon, String route) {
      return InkWell(
        borderRadius: BorderRadius.circular(DbRadius.card),
        onTap: () => context.push(route),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: DbSpacing.md),
          child: Column(
            children: [
              Icon(icon, color: DbColors.teal, size: 26),
              const SizedBox(height: DbSpacing.xs),
              Text(
                label,
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      );
    }

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
            child: Column(
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(3),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.4),
                          width: 2,
                        ),
                      ),
                      child: CircleAvatar(
                        radius: 34,
                        backgroundColor: DbColors.emerald,
                        child: Text(
                          initials,
                          style: const TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
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
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 19,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            user.email,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.8),
                              fontSize: 13,
                            ),
                          ),
                          if (user.phone != null &&
                              user.phone!.isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Text(
                              user.phone!,
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.8),
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: DbSpacing.md),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: DbSpacing.sm + 2, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(DbRadius.badge),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.school_rounded,
                              size: 14, color: Colors.white),
                          const SizedBox(width: 4),
                          Text(
                            l10n.roleStudent,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: DbSpacing.sm),
                    if (user.status == 'active')
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: DbSpacing.sm + 2, vertical: 4),
                        decoration: BoxDecoration(
                          color: DbColors.emerald.withValues(alpha: 0.25),
                          borderRadius: BorderRadius.circular(DbRadius.badge),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: DbColors.emeraldDark,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              l10n.statusActive,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    const Spacer(),
                    TextButton.icon(
                      onPressed: () => _showEditSheet(l10n, user),
                      style: TextButton.styleFrom(
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                            horizontal: DbSpacing.sm),
                      ),
                      icon: const Icon(Icons.edit_rounded, size: 16),
                      label: Text(l10n.edit,
                          style: const TextStyle(fontSize: 13)),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: DbSpacing.md),
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(
                  horizontal: DbSpacing.xs, vertical: DbSpacing.xs),
              child: Row(
                children: [
                  Expanded(
                    child: quickTile(
                        l10n.bookmarks, Icons.bookmark_rounded, '/library?view=bookmarks'),
                  ),
                  Expanded(
                    child: quickTile(
                        l10n.resultHistory, Icons.history_rounded, '/gpa/history'),
                  ),
                  Expanded(
                    child: quickTile(
                        l10n.examResult, Icons.quiz_rounded, '/exams'),
                  ),
                  Expanded(
                    child: quickTile(l10n.workspaceTitle,
                        Icons.folder_rounded, '/workspace'),
                  ),
                ],
              ),
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
                    l10n.account,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: DbSpacing.sm),
                  DbInfoRow(label: l10n.email, value: user.email),
                  if (user.phone != null && user.phone!.isNotEmpty)
                    DbInfoRow(label: l10n.phoneLabel, value: user.phone!),
                  if (joined != null)
                    DbInfoRow(
                      label: l10n.memberSince,
                      value:
                          '${joined.day}/${joined.month}/${joined.year}',
                    ),
                ],
              ),
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
                      (academic.instituteId == null &&
                          academic.semesterNumber == null))
                    Text(
                      l10n.academicInfoMissing,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                    )
                  else ...[
                    if (academic.semesterNumber != null)
                      DbInfoRow(
                          label: l10n.semester,
                          value: '${academic.semesterNumber}'),
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
