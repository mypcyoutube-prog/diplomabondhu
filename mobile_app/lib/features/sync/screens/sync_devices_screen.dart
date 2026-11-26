import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../shared/widgets/states.dart';
import '../providers/sync_providers.dart';

class SyncDevicesScreen extends ConsumerWidget {
  const SyncDevicesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final devices = ref.watch(syncDevicesProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.syncDevicesTitle)),
      body: devices.when(
        loading: () => const DbLoadingView(),
        error: (e, _) => DbErrorView(
          message: l10n.errorGeneric,
          onRetry: () => ref.invalidate(syncDevicesProvider),
        ),
        data: (items) {
          if (items.isEmpty) {
            return DbEmptyView(
              message: l10n.emptyGeneric,
              icon: Icons.devices_rounded,
            );
          }
          return ListView(
            padding: const EdgeInsets.all(DbSpacing.md),
            children: items
                .map((d) => Card(
                      child: ListTile(
                        leading: Icon(
                          d.platform.contains('ios')
                              ? Icons.phone_iphone_rounded
                              : Icons.phone_android_rounded,
                          color: DbColors.teal,
                        ),
                        title: Text(
                          d.name.isEmpty ? d.deviceId : d.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Text(d.lastSyncAt == null
                            ? d.platform
                            : '${d.platform} · ${_shortDate(d.lastSyncAt!)}'),
                        trailing: IconButton(
                          tooltip: l10n.delete,
                          icon: const Icon(Icons.logout_rounded),
                          onPressed: () async {
                            await ref
                                .read(syncRepositoryProvider)
                                .revoke(d.id);
                            ref.invalidate(syncDevicesProvider);
                          },
                        ),
                      ),
                    ))
                .toList(),
          );
        },
      ),
    );
  }

  String _shortDate(DateTime dt) =>
      '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
}
