import 'dart:io';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_pdfview/flutter_pdfview.dart';
import 'package:material_ui/material_ui.dart' hide Material;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../core/api/api_client.dart';
import '../../../core/providers.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../data/material.dart';
import '../providers/library_providers.dart';

class PdfViewerScreen extends ConsumerStatefulWidget {
  final String materialId;

  const PdfViewerScreen({super.key, required this.materialId});

  @override
  ConsumerState<PdfViewerScreen> createState() => _PdfViewerScreenState();
}

class _PdfViewerScreenState extends ConsumerState<PdfViewerScreen> {
  String? _filePath;
  String? _error;
  double _progress = 0;
  bool _rendering = true;

  @override
  void initState() {
    super.initState();
    if (kIsWeb) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _openExternalAndPop());
    } else {
      _download();
    }
  }

  Future<void> _openExternalAndPop() async {
    final material = ref.read(materialDetailProvider(widget.materialId)).valueOrNull;
    final url = material?.payload.fileUrl;
    final navigator = Navigator.of(context);
    if (url != null) {
      final uri = Uri.tryParse(url);
      if (uri != null) {
        try {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        } catch (_) {}
      }
    }
    if (navigator.canPop()) navigator.pop();
  }

  Future<void> _download() async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _filePath = null;
      _error = null;
      _progress = 0;
    });
    final material = ref.read(materialDetailProvider(widget.materialId)).valueOrNull;
    final url = material?.payload.fileUrl;
    if (url == null || url.isEmpty) {
      setState(() => _error = l10n?.errorGeneric ?? 'Failed to load');
      return;
    }
    try {
      final client = ref.read(apiClientProvider);
      final tempPath =
          '${Directory.systemTemp.path}/db_pdf_${DateTime.now().millisecondsSinceEpoch}.pdf';
      await client.dio.download(
        url,
        tempPath,
        options: Options(receiveTimeout: const Duration(minutes: 5)),
        onReceiveProgress: (received, total) {
          if (total > 0 && mounted) {
            setState(() => _progress = received / total);
          }
        },
      );
      if (mounted) setState(() => _filePath = tempPath);
    } catch (_) {
      if (mounted) {
        setState(() => _error = l10n?.errorGeneric ?? 'Failed to load');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final detail = ref.watch(materialDetailProvider(widget.materialId));

    return Scaffold(
      appBar: AppBar(
        title: Text(detail.valueOrNull?.title ?? l10n.viewPdf,
            maxLines: 1, overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(
            tooltip: l10n.openLink,
            icon: const Icon(Icons.open_in_new_rounded),
            onPressed: () {
              final url = detail.valueOrNull?.payload.fileUrl;
              if (url != null) _launch(url);
            },
          ),
        ],
      ),
      body: detail.maybeWhen(
        data: (material) => _buildBody(l10n, material),
        orElse: () => AsyncValueView(
          value: detail,
          onRetry: () => ref.invalidate(materialDetailProvider(widget.materialId)),
          builder: (context, _) => const SizedBox.shrink(),
        ),
      ),
    );
  }

  Widget _buildBody(AppLocalizations l10n, Material material) {
    if (material.isExternal) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.open_in_new_rounded, size: 40, color: DbColors.textSecondaryLight),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: () => _launch(material.payload.externalUrl!),
              icon: const Icon(Icons.open_in_new_rounded),
              label: Text(l10n.openLink),
            ),
          ],
        ),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded, size: 40, color: DbColors.errorLight),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: _download,
              icon: const Icon(Icons.refresh_rounded),
              label: Text(l10n.retry),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => _launch(material.payload.fileUrl!),
              child: Text(l10n.openLink),
            ),
          ],
        ),
      );
    }

    if (_filePath == null) {
      return Center(
        child: SizedBox(
          width: 64,
          height: 64,
          child: Stack(
            fit: StackFit.expand,
            children: [
              CircularProgressIndicator(value: _progress > 0 ? _progress : null),
              Center(
                child: Text(
                  _progress > 0 ? '${(_progress * 100).toStringAsFixed(0)}%' : '',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Stack(
      children: [
        PDFView(
          filePath: _filePath,
          enableSwipe: true,
          swipeHorizontal: false,
          autoSpacing: true,
          pageFling: false,
          fitPolicy: FitPolicy.WIDTH,
          backgroundColor: Theme.of(context).colorScheme.surface,
          onRender: (_) {
            if (mounted) setState(() => _rendering = false);
          },
          onError: (_) {
            if (mounted) setState(() => _error = l10n.errorGeneric);
          },
        ),
        if (_rendering)
          const Center(child: CircularProgressIndicator(strokeWidth: 2)),
      ],
    );
  }

  Future<void> _launch(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null || !(uri.scheme == 'http' || uri.scheme == 'https')) return;
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {}
  }
}
