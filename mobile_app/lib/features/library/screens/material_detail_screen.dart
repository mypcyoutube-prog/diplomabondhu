import 'package:material_ui/material_ui.dart' hide Material;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../../../shared/widgets/states.dart';
import '../data/material.dart';
import '../providers/library_providers.dart';

class MaterialDetailScreen extends ConsumerStatefulWidget {
  final String materialId;

  const MaterialDetailScreen({super.key, required this.materialId});

  @override
  ConsumerState<MaterialDetailScreen> createState() => _MaterialDetailScreenState();
}

class _MaterialDetailScreenState extends ConsumerState<MaterialDetailScreen> {
  bool _toggling = false;
  bool _downloading = false;

  IconData _typeIcon(String type) => switch (type) {
        'book' => Icons.menu_book_rounded,
        'note' => Icons.sticky_note_2_rounded,
        'video' => Icons.play_circle_rounded,
        'past_question' => Icons.history_edu_rounded,
        _ => Icons.folder_rounded,
      };

  Color _accent(String type) => switch (type) {
        'book' => DbColors.teal,
        'note' => DbColors.infoLight,
        'video' => DbColors.errorLight,
        'past_question' => DbColors.warningLight,
        _ => DbColors.emerald,
      };

  Future<void> _openExternal(String url) async {
    final l10n = AppLocalizations.of(context)!;
    final messenger = ScaffoldMessenger.of(context);
    final uri = Uri.tryParse(url);
    if (uri == null || !(uri.scheme == 'http' || uri.scheme == 'https')) {
      messenger.showSnackBar(SnackBar(content: Text(l10n.errorGeneric)));
      return;
    }
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      messenger.showSnackBar(SnackBar(content: Text(l10n.errorGeneric)));
    }
  }

  Future<void> _toggleBookmark(AppLocalizations l10n, Material material) async {
    if (_toggling) return;
    setState(() => _toggling = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final bookmarked = ref.read(isBookmarkedProvider(widget.materialId)).value ?? false;
      final repo = ref.read(materialRepositoryProvider);
      if (bookmarked) {
        await repo.removeBookmark(material.id);
      } else {
        await repo.addBookmark(material.id);
      }
      ref.invalidate(isBookmarkedProvider(widget.materialId));
      ref.invalidate(bookmarksProvider);
      messenger.showSnackBar(SnackBar(
        content: Text(bookmarked ? l10n.bookmarkRemoved : l10n.bookmarkAdded),
      ));
    } catch (_) {
      messenger.showSnackBar(SnackBar(content: Text(l10n.errorGeneric)));
    } finally {
      if (mounted) setState(() => _toggling = false);
    }
  }

  Future<void> _download(AppLocalizations l10n, Material material) async {
    setState(() => _downloading = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final url = await ref.read(materialRepositoryProvider).downloadUrl(material.id);
      await _openExternal(url);
    } catch (_) {
      messenger.showSnackBar(SnackBar(content: Text(l10n.errorGeneric)));
    } finally {
      if (mounted) setState(() => _downloading = false);
    }
  }

  void _share(Material material) {
    final url = material.payload.fileUrl ?? material.payload.externalUrl ?? '';
    Share.share('${material.title}\n$url');
  }

  String _formatSize(int bytes) {
    if (bytes >= 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    if (bytes >= 1024) return '${(bytes / 1024).toStringAsFixed(0)} KB';
    return '$bytes B';
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final detail = ref.watch(materialDetailProvider(widget.materialId));
    final bookmarked = ref.watch(isBookmarkedProvider(widget.materialId));

    return Scaffold(
      appBar: AppBar(title: Text(l10n.library)),
      body: AsyncValueView(
        value: detail,
        onRetry: () => ref.invalidate(materialDetailProvider(widget.materialId)),
        builder: (context, material) {
          final accent = _accent(material.type);
          final chips = <String>[
            material.type,
            if (material.payload.examYear != null)
              '${l10n.examYearLabel}: ${material.payload.examYear}',
            if (material.payload.pageCount != null)
              '${material.payload.pageCount} ${l10n.pagesLabel}',
            if (material.payload.sizeBytes != null)
              '${l10n.sizeLabel}: ${_formatSize(material.payload.sizeBytes!)}',
            if (material.payload.author?.isNotEmpty == true)
              '${l10n.authorLabel}: ${material.payload.author}',
            if (material.payload.edition?.isNotEmpty == true)
              '${l10n.editionLabel}: ${material.payload.edition}',
          ];

          return ListView(
            padding: const EdgeInsets.all(16),
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
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(DbRadius.input),
                      ),
                      child: Icon(_typeIcon(material.type), color: Colors.white, size: 30),
                    ),
                    const SizedBox(width: DbSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            material.title,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          if (material.titleBn != null &&
                              material.titleBn!.isNotEmpty &&
                              material.titleBn != material.title) ...[
                            const SizedBox(height: 4),
                            Text(
                              material.titleBn!,
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.85),
                                fontSize: 14,
                              ),
                            ),
                          ],
                          const SizedBox(height: 6),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.visibility_rounded,
                                  size: 14, color: Colors.white70),
                              const SizedBox(width: 4),
                              Text(
                                '${material.viewCount} ${l10n.viewsLabel}',
                                style: const TextStyle(
                                    color: Colors.white70, fontSize: 12),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              if (material.description != null && material.description!.isNotEmpty) ...[
                const SizedBox(height: DbSpacing.md),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(DbSpacing.md),
                    child: Text(material.description!),
                  ),
                ),
              ],
              const SizedBox(height: DbSpacing.md),
              Wrap(
                spacing: DbSpacing.sm,
                runSpacing: DbSpacing.sm,
                children: chips
                    .map((c) => Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: DbSpacing.sm + 2, vertical: 6),
                          decoration: BoxDecoration(
                            color: accent.withValues(alpha: 0.10),
                            borderRadius: BorderRadius.circular(DbRadius.badge),
                          ),
                          child: Text(
                            c,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: accent,
                            ),
                          ),
                        ))
                    .toList(),
              ),
              const SizedBox(height: DbSpacing.lg),
              if (material.isExternal) ...[
                FilledButton.icon(
                  onPressed: material.payload.externalUrl == null
                      ? null
                      : () => _openExternal(material.payload.externalUrl!),
                  icon: const Icon(Icons.open_in_new_rounded),
                  label: Text(l10n.openLink),
                ),
                const SizedBox(height: 8),
              ] else ...[
                if (material.previewAllowed && material.payload.fileUrl != null) ...[
                  FilledButton.icon(
                    onPressed: () => _openExternal(material.payload.fileUrl!),
                    icon: const Icon(Icons.picture_as_pdf_rounded),
                    label: Text(l10n.openLink),
                  ),
                  const SizedBox(height: 8),
                ],
                if (material.downloadAllowed && material.payload.fileUrl != null) ...[
                  OutlinedButton.icon(
                    onPressed: _downloading
                        ? null
                        : () => _download(l10n, material),
                    icon: _downloading
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.download_rounded),
                    label: Text(l10n.openLink),
                  ),
                  const SizedBox(height: 8),
                ],
              ],
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _toggling
                          ? null
                          : () => _toggleBookmark(l10n, material),
                      icon: bookmarked.maybeWhen(
                        data: (b) => Icon(b
                            ? Icons.bookmark_rounded
                            : Icons.bookmark_border_rounded),
                        orElse: () =>
                            const Icon(Icons.bookmark_border_rounded),
                      ),
                      label: Text(l10n.bookmark),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _share(material),
                      icon: const Icon(Icons.share_rounded),
                      label: Text(l10n.share),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              TextButton.icon(
                onPressed: () => _report(context, ref),
                icon: const Icon(Icons.flag_rounded),
                label: Text(l10n.reportContent),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _report(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context)!;
    final controller = TextEditingController();
    var typeIndex = 0;
    const codes = ['broken_link', 'wrong_info', 'wrong_file', 'duplicate', 'other'];
    final types = [l10n.reportBrokenLink, l10n.reportWrongInfo, l10n.reportWrongFile, l10n.reportDuplicate, l10n.reportOther];
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.fromLTRB(16, 8, 16, 16 + MediaQuery.of(ctx).viewInsets.bottom),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(l10n.reportContent, style: Theme.of(ctx).textTheme.titleMedium),
              const SizedBox(height: 12),
              Text(l10n.reportTypeLabel,
                  style: Theme.of(ctx).textTheme.bodySmall),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: List.generate(types.length, (i) {
                  final selected = typeIndex == i;
                  return ChoiceChip(
                    label: Text(types[i]),
                    selected: selected,
                    onSelected: (_) => setSheetState(() => typeIndex = i),
                  );
                }),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                maxLines: 3,
                maxLength: 1000,
                decoration: InputDecoration(hintText: l10n.reportDetailsLabel),
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: Text(l10n.report),
              ),
            ],
          ),
        ),
      ),
    );
    if (ok != true) return;
    try {
      await ref
          .read(materialRepositoryProvider)
          .report(
            widget.materialId,
            reasonCode: codes[typeIndex],
            details: controller.text.trim(),
          );
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.reportSubmitted)),
        );
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(l10n.errorGeneric)));
      }
    }
  }
}
