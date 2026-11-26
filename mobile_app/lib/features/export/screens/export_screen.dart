import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../core/api/api_client.dart';
import '../../../shared/widgets/states.dart';
import '../data/export_repository.dart';
import '../providers/export_providers.dart';

class ExportScreen extends ConsumerStatefulWidget {
  const ExportScreen({super.key});

  @override
  ConsumerState<ExportScreen> createState() => _ExportScreenState();
}

class _ExportScreenState extends ConsumerState<ExportScreen> {
  final Set<String> _datasets = {'notes', 'bookmarks'};
  String _format = 'json';
  bool _creating = false;

  static const _datasetLabels = <String, String>{
    'notes': 'My Notes',
    'bookmarks': 'Bookmarks',
    'collections': 'Collections',
    'tasks': 'Tasks',
    'goals': 'Goals',
    'calculation-history': 'GPA / CGPA History',
  };

  Future<void> _create(AppLocalizations l10n) async {
    setState(() => _creating = true);
    try {
      await ref
          .read(exportRepositoryProvider)
          .createJob(_datasets.toList(), _format);
      ref.invalidate(exportJobsProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.exportCreated)),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.statusCode == 429 ? l10n.exportTooMany : l10n.errorGeneric),
          backgroundColor: DbColors.errorLight,
        ),
      );
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  Future<void> _download(AppLocalizations l10n, ExportJobModel job) async {
    try {
      final content = await ref.read(exportRepositoryProvider).download(job.id);
      await Clipboard.setData(ClipboardData(text: content));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.exportCopied)),
      );
    } on ApiException {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.errorGeneric), backgroundColor: DbColors.errorLight),
      );
    }
  }

  String _statusLabel(AppLocalizations l10n, String status) {
    switch (status) {
      case 'ready':
        return l10n.exportReady;
      case 'expired':
        return l10n.exportExpired;
      case 'failed':
        return l10n.exportFailed;
    }
    return l10n.exportProcessing;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final jobs = ref.watch(exportJobsProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.exportTitle)),
      body: ListView(
        padding: const EdgeInsets.all(DbSpacing.md),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(DbSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l10n.exportSelectData,
                      style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: DbSpacing.xs),
                  ..._datasetLabels.entries.map(
                    (e) => CheckboxListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      title: Text(e.value),
                      value: _datasets.contains(e.key),
                      onChanged: (v) => setState(() {
                        v == true
                            ? _datasets.add(e.key)
                            : _datasets.remove(e.key);
                      }),
                    ),
                  ),
                  const SizedBox(height: DbSpacing.sm),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'json', label: Text('JSON')),
                      ButtonSegment(value: 'csv', label: Text('CSV')),
                    ],
                    selected: {_format},
                    onSelectionChanged: (s) => setState(() => _format = s.first),
                  ),
                  const SizedBox(height: DbSpacing.md),
                  FilledButton.icon(
                    onPressed: (_creating || _datasets.isEmpty)
                        ? null
                        : () => _create(l10n),
                    icon: _creating
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.download_rounded),
                    label: Text(l10n.exportCreate),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: DbSpacing.sm),
          DbSectionHeader(title: l10n.exportHistory),
          jobs.when(
            loading: () => const DbLoadingView(),
            error: (e, _) => DbErrorView(
              message: l10n.errorGeneric,
              onRetry: () => ref.invalidate(exportJobsProvider),
            ),
            data: (items) {
              if (items.isEmpty) {
                return DbEmptyView(
                  message: l10n.emptyGeneric,
                  icon: Icons.folder_zip_rounded,
                );
              }
              return Column(
                children: items
                    .map((job) => Card(
                          child: ListTile(
                            leading: Icon(
                              job.isDownloadable
                                  ? Icons.check_circle_rounded
                                  : Icons.schedule_rounded,
                              color: job.isDownloadable
                                  ? DbColors.teal
                                  : DbColors.navy,
                            ),
                            title: Text(
                              job.fileName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            subtitle: Text(
                              '${_statusLabel(l10n, job.status)} · ${job.format.toUpperCase()}',
                            ),
                            trailing: job.isDownloadable
                                ? IconButton(
                                    icon: const Icon(Icons.download_rounded),
                                    onPressed: () => _download(l10n, job),
                                  )
                                : null,
                          ),
                        ))
                    .toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}
