import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../../../shared/widgets/pressable_scale.dart';
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
                    return PressableScale(
                      onTap: () => context.push('/notices/${notice.id}'),
                      child: Container(
                        padding: const EdgeInsets.all(DbSpacing.md),
                        decoration: BoxDecoration(
                          color: Theme.of(context).cardColor,
                          borderRadius: BorderRadius.circular(DbRadius.card),
                          boxShadow: DbShadows.card,
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                gradient: notice.isBteb
                                    ? const LinearGradient(
                                        colors: [
                                            DbColors.emerald,
                                            DbColors.emeraldDark
                                          ])
                                    : const LinearGradient(
                                        colors: [
                                            DbColors.teal,
                                            DbColors.emerald
                                          ]),
                                borderRadius:
                                    BorderRadius.circular(DbRadius.input),
                              ),
                              child: Icon(
                                notice.isBteb
                                    ? Icons.verified_rounded
                                    : Icons.campaign_rounded,
                                size: 20,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(width: DbSpacing.md),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    notice.title,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w600),
                                  ),
                                  const SizedBox(height: 5),
                                  Wrap(
                                    spacing: 6,
                                    runSpacing: 4,
                                    crossAxisAlignment:
                                        WrapCrossAlignment.center,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 7, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: (notice.isBteb
                                                  ? DbColors.emerald
                                                  : DbColors.teal)
                                              .withValues(alpha: 0.1),
                                          borderRadius: BorderRadius.circular(
                                              DbRadius.badge),
                                        ),
                                        child: Text(
                                          notice.isBteb
                                              ? 'BTEB'
                                              : 'DiplomaBondhu',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w700,
                                            color: notice.isBteb
                                                ? DbColors.emeraldDark
                                                : DbColors.teal,
                                          ),
                                        ),
                                      ),
                                      if (notice.publishedAt != null)
                                        Text(
                                          DateFormat.yMMMd()
                                              .format(notice.publishedAt!),
                                          style: const TextStyle(
                                              fontSize: 12,
                                              color: DbColors
                                                  .textSecondaryLight),
                                        ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            const Icon(Icons.chevron_right_rounded),
                          ],
                        ),
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
