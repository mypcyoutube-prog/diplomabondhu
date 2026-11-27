import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../providers/gpa_providers.dart';

class GpaHistoryScreen extends ConsumerWidget {
  const GpaHistoryScreen({super.key});

  String _formatDate(DateTime dt) {
    final m = dt.month.toString().padLeft(2, '0');
    final d = dt.day.toString().padLeft(2, '0');
    return '$d/$m/${dt.year} · ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }

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
            final gpa = (item.output['cgpa'] ?? item.output['gpa'])?.toString() ?? '';
            final kind = item.kind;

            return Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(DbRadius.card),
                boxShadow: DbShadows.card,
              ),
              child: Card(
                child: ListTile(
                leading: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [DbColors.teal, DbColors.emerald],
                    ),
                    borderRadius: BorderRadius.circular(DbRadius.input),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    gpa.isEmpty ? '—' : gpa,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                      color: Colors.white,
                    ),
                  ),
                ),
                title: Text(
                  item.label ?? kind,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: item.createdAt == null
                    ? null
                    : Text(
                        _formatDate(item.createdAt!.toLocal()),
                        style: TextStyle(
                          fontSize: 12,
                          color: Theme.of(context).colorScheme.outline,
                        ),
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
