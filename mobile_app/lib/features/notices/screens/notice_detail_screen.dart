import 'package:intl/intl.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../providers/notice_providers.dart';

class NoticeDetailScreen extends ConsumerWidget {
  final String noticeId;

  const NoticeDetailScreen({super.key, required this.noticeId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final notice = ref.watch(noticeDetailProvider(noticeId));

    return Scaffold(
      appBar: AppBar(title: Text(l10n.notices)),
      body: AsyncValueView(
        value: notice,
        onRetry: () => ref.invalidate(noticeDetailProvider(noticeId)),
        emptyIcon: Icons.campaign_outlined,
        builder: (context, item) => ListView(
          padding: const EdgeInsets.all(DbSpacing.md),
          children: [
            Row(
              children: [
                Icon(
                  item.isBteb ? Icons.verified_rounded : Icons.campaign_rounded,
                  size: 16,
                  color: item.isBteb ? DbColors.emeraldDark : DbColors.teal,
                ),
                const SizedBox(width: 6),
                Text(
                  item.isBteb ? 'BTEB' : 'DiplomaBondhu',
                  style: const TextStyle(
                      fontSize: 12, fontWeight: FontWeight.w600),
                ),
                const Spacer(),
                if (item.publishedAt != null)
                  Text(
                    '${l10n.publishedOn}: ${DateFormat.yMMMd().format(item.publishedAt!)}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
              ],
            ),
            const SizedBox(height: DbSpacing.sm),
            Text(
              item.title,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: DbSpacing.md),
            const Divider(),
            const SizedBox(height: DbSpacing.sm),
            SelectableText(
              item.body,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.6),
            ),
            if (item.pdfUrl != null && item.pdfUrl!.isNotEmpty) ...[
              const SizedBox(height: DbSpacing.lg),
              FilledButton.tonalIcon(
                onPressed: () async {
                  final uri = Uri.tryParse(item.pdfUrl!);
                  if (uri != null &&
                      (uri.scheme == 'http' || uri.scheme == 'https')) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  }
                },
                icon: const Icon(Icons.picture_as_pdf_rounded),
                label: Text(l10n.viewPdf),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
