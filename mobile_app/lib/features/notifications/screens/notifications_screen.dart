import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../data/notification_models.dart';
import '../providers/notification_providers.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  IconData _iconFor(String type) => switch (type) {
        'announcement' || 'system' => Icons.campaign_rounded,
        'material' => Icons.menu_book_rounded,
        'exam' => Icons.quiz_rounded,
        'community' => Icons.forum_rounded,
        'reminder' || 'task' => Icons.alarm_rounded,
        'sync' => Icons.devices_rounded,
        _ => Icons.notifications_rounded,
      };

  String _formatTime(DateTime dt) {
    final m = dt.month.toString().padLeft(2, '0');
    final d = dt.day.toString().padLeft(2, '0');
    return '$d/$m · ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }

  void _openLink(BuildContext context, WidgetRef ref, NotificationItem n) async {
    if (!n.read) {
      try {
        await ref.read(notificationRepositoryProvider).markRead(n.id);
        ref.invalidate(notificationsProvider);
      } catch (_) {}
    }
    final link = n.link;
    if (link == null || link.isEmpty || !context.mounted) return;
    if (link.startsWith('/')) {
      context.push(link);
      return;
    }
    final uri = Uri.tryParse(link);
    if (uri != null && (uri.scheme == 'http' || uri.scheme == 'https')) {
      launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final notifications = ref.watch(notificationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.notifications),
        actions: [
          TextButton(
            onPressed: () async {
              try {
                await ref.read(notificationRepositoryProvider).markAllRead();
                ref.invalidate(notificationsProvider);
              } catch (_) {}
            },
            child: Text(l10n.markAllRead),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(notificationsProvider),
        child: AsyncValueView(
          value: notifications,
          onRetry: () => ref.invalidate(notificationsProvider),
          isEmpty: (data) => data.items.isEmpty,
          emptyIcon: Icons.notifications_none_rounded,
          builder: (context, data) => ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: data.items.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, i) {
              final n = data.items[i];
              final unread = !n.read;

              return Card(
                color: unread ? DbColors.teal.withValues(alpha: 0.06) : null,
                child: ListTile(
                  onTap: () => _openLink(context, ref, n),
                  leading: Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: unread
                          ? DbColors.teal.withValues(alpha: 0.14)
                          : DbColors.fillLight,
                      borderRadius: BorderRadius.circular(DbRadius.input),
                    ),
                    child: Icon(
                      _iconFor(n.type),
                      size: 22,
                      color: unread ? DbColors.teal : DbColors.textSecondaryLight,
                    ),
                  ),
                  title: Text(
                    n.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: unread
                        ? const TextStyle(fontWeight: FontWeight.w700)
                        : null,
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (n.body != null && n.body!.isNotEmpty)
                        Text(
                          n.body!,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      if (n.createdAt != null)
                        Text(
                          _formatTime(n.createdAt!.toLocal()),
                          style: const TextStyle(
                            fontSize: 11,
                            color: DbColors.textSecondaryLight,
                          ),
                        ),
                    ],
                  ),
                  trailing: unread
                      ? Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: DbColors.teal,
                            shape: BoxShape.circle,
                          ),
                        )
                      : null,
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
