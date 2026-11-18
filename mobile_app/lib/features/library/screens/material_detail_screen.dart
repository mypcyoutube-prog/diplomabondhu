import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../../../shared/widgets/states.dart';
import '../providers/library_providers.dart';

class MaterialDetailScreen extends ConsumerStatefulWidget {
  final String materialId;

  const MaterialDetailScreen({super.key, required this.materialId});

  @override
  ConsumerState<MaterialDetailScreen> createState() => _MaterialDetailScreenState();
}

class _MaterialDetailScreenState extends ConsumerState<MaterialDetailScreen> {
  bool _bookmarked = false;

  Future<void> _openExternal(String url) async {
    final l10n = AppLocalizations.of(context)!;
    final messenger = ScaffoldMessenger.of(context);
    final uri = Uri.tryParse(url);
    if (uri == null || !uri.isAbsolute) {
      messenger.showSnackBar(SnackBar(content: Text(l10n.errorGeneric)));
      return;
    }
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      messenger.showSnackBar(SnackBar(content: Text(l10n.errorGeneric)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final detail = ref.watch(materialDetailProvider(widget.materialId));

    return Scaffold(
      appBar: AppBar(title: Text(l10n.library)),
      body: AsyncValueView(
        value: detail,
        onRetry: () => ref.invalidate(materialDetailProvider(widget.materialId)),
        builder: (context, material) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      material.title,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    if (material.description != null && material.description!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(material.description!),
                    ],
                    const SizedBox(height: 12),
                    DbInfoRow(label: material.type, value: '${material.viewCount}'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            if (material.isExternal) ...[
              FilledButton.icon(
                onPressed: material.payload.externalUrl == null
                    ? null
                    : () => _openExternal(material.payload.externalUrl!),
                icon: const Icon(Icons.open_in_new_rounded),
                label: Text(l10n.openLink),
              ),
              const SizedBox(height: 8),
            ] else if (material.downloadAllowed) ...[
              FilledButton.icon(
                onPressed: material.payload.fileUrl == null
                    ? null
                    : () => _openExternal(material.payload.fileUrl!),
                icon: const Icon(Icons.download_rounded),
                label: Text(l10n.openLink),
              ),
              const SizedBox(height: 8),
            ],
            OutlinedButton.icon(
              onPressed: () async {
                final repo = ref.read(materialRepositoryProvider);
                try {
                  if (_bookmarked) {
                    await repo.removeBookmark(material.id);
                  } else {
                    await repo.addBookmark(material.id);
                  }
                  setState(() => _bookmarked = !_bookmarked);
                } catch (_) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(l10n.errorGeneric)),
                    );
                  }
                }
              },
              icon: Icon(_bookmarked ? Icons.bookmark_rounded : Icons.bookmark_border_rounded),
              label: Text(l10n.bookmark),
            ),
            const SizedBox(height: 8),
            TextButton.icon(
              onPressed: () => _report(context, ref),
              icon: const Icon(Icons.flag_rounded),
              label: Text(l10n.reportContent),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _report(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context)!;
    final controller = TextEditingController();
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(16, 16, 16, 16 + MediaQuery.of(ctx).viewInsets.bottom),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(l10n.reportContent, style: Theme.of(ctx).textTheme.titleMedium),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              maxLines: 3,
              maxLength: 1000,
              decoration: const InputDecoration(hintText: '...'),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: Text(l10n.report),
            ),
          ],
        ),
      ),
    );
    if (ok != true) return;
    try {
      await ref
          .read(materialRepositoryProvider)
          .report(widget.materialId, controller.text.trim());
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(l10n.errorGeneric)));
      }
    }
  }
}
