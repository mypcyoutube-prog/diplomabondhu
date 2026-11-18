import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../providers/notification_providers.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

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
              return Card(
                child: ListTile(
                  onTap: () async {
                    if (n.read) return;
                    try {
                      await ref.read(notificationRepositoryProvider).markRead(n.id);
                      ref.invalidate(notificationsProvider);
                    } catch (_) {}
                  },
                  leading: Icon(
                    n.read ? Icons.notifications_none_rounded : Icons.notifications_rounded,
                    color: n.read ? null : Theme.of(context).colorScheme.secondary,
                  ),
                  title: Text(n.title),
                  subtitle: n.body != null && n.body!.isNotEmpty ? Text(n.body!) : null,
                  trailing: n.read
                      ? null
                      : Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.secondary,
                            shape: BoxShape.circle,
                          ),
                        ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
