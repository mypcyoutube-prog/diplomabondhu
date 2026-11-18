import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../providers/gpa_providers.dart';

class GpaHistoryScreen extends ConsumerWidget {
  const GpaHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final history = ref.watch(gpaHistoryProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.resultHistory)),
      body: AsyncValueView(
        value: history,
        onRetry: () => ref.invalidate(gpaHistoryProvider),
        isEmpty: (items) => items.isEmpty,
        emptyIcon: Icons.history_rounded,
        builder: (context, items) => ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: items.length,
          separatorBuilder: (_, _) => const SizedBox(height: 8),
          itemBuilder: (context, i) {
            final item = items[i];
            final gpa = item.output['gpa'] ?? item.output['cgpa'];
            return Card(
              child: ListTile(
                title: Text(item.label ?? item.kind),
                subtitle: item.createdAt == null
                    ? null
                    : Text(item.createdAt!.toLocal().toString().split('.').first),
                trailing: Text(
                  gpa?.toString() ?? '',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
