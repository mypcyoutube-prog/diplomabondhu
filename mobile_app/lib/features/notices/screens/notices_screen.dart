import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../providers/notice_providers.dart';

class NoticesScreen extends ConsumerStatefulWidget {
  const NoticesScreen({super.key});

  @override
  ConsumerState<NoticesScreen> createState() => _NoticesScreenState();
}

class _NoticesScreenState extends ConsumerState<NoticesScreen> {
  String _source = 'all';

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final notices = ref.watch(publishedNoticesProvider(_source));

    return Scaffold(
      appBar: AppBar(title: Text(l10n.notices)),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(
                horizontal: DbSpacing.md, vertical: DbSpacing.sm),
            child: Row(
              children: [
                _sourceChip(l10n, 'all', l10n.allNotices),
                const SizedBox(width: DbSpacing.sm),
                _sourceChip(l10n, 'bteb', 'BTEB'),
                const SizedBox(width: DbSpacing.sm),
                _sourceChip(l10n, 'admin', 'DiplomaBondhu'),
              ],
            ),
          ),
          Expanded(
            child: AsyncValueView(
              value: notices,
              onRetry: () =>
                  ref.invalidate(publishedNoticesProvider(_source)),
              isEmpty: (items) => items.isEmpty,
              emptyIcon: Icons.campaign_outlined,
              builder: (context, items) => RefreshIndicator(
                onRefresh: () async =>
                    ref.invalidate(publishedNoticesProvider(_source)),
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(DbSpacing.md, DbSpacing.xs,
                      DbSpacing.md, DbSpacing.xl),
                  itemCount: items.length,
                  separatorBuilder: (_, _) => const SizedBox(height: DbSpacing.sm),
                  itemBuilder: (context, i) {
                    final notice = items[i];
                    return Card(
                      child: ListTile(
                        onTap: () => context.push('/notices/${notice.id}'),
                        title: Text(
                          notice.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        subtitle: Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Row(
                            children: [
                              Icon(
                                notice.isBteb
                                    ? Icons.verified_rounded
                                    : Icons.campaign_rounded,
                                size: 14,
                                color: notice.isBteb
                                    ? DbColors.emeraldDark
                                    : DbColors.teal,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                notice.isBteb ? 'BTEB' : 'DiplomaBondhu',
                                style: const TextStyle(fontSize: 12),
                              ),
                              if (notice.publishedAt != null) ...[
                                const SizedBox(width: 8),
                                Text(
                                  DateFormat.yMMMd()
                                      .format(notice.publishedAt!),
                                  style: const TextStyle(fontSize: 12),
                                ),
                              ],
                            ],
                          ),
                        ),
                        trailing:
                            const Icon(Icons.chevron_right_rounded),
                      ),
                    );
                  },
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sourceChip(AppLocalizations l10n, String value, String label) {
    final selected = _source == value;
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => setState(() => _source = value),
    );
  }
}
