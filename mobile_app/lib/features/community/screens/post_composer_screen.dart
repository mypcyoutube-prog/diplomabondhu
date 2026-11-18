import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../providers/community_providers.dart';

class PostComposerScreen extends ConsumerStatefulWidget {
  const PostComposerScreen({super.key});

  @override
  ConsumerState<PostComposerScreen> createState() => _PostComposerScreenState();
}

class _PostComposerScreenState extends ConsumerState<PostComposerScreen> {
  final _title = TextEditingController();
  final _body = TextEditingController();
  String _type = 'discussion';
  bool _accepted = false;
  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.newPost)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SegmentedButton<String>(
            segments: [
              ButtonSegment(value: 'question', label: Text(l10n.question)),
              ButtonSegment(value: 'discussion', label: Text(l10n.discussion)),
            ],
            selected: {_type},
            onSelectionChanged: (s) => setState(() => _type = s.first),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _title,
            maxLength: 300,
            decoration: const InputDecoration(labelText: 'Title'),
          ),
          TextField(
            controller: _body,
            maxLength: 10000,
            maxLines: 6,
            decoration: const InputDecoration(labelText: 'Body'),
          ),
          CheckboxListTile(
            value: _accepted,
            controlAffinity: ListTileControlAffinity.leading,
            title: Text(l10n.communityGuidelines),
            onChanged: (v) => setState(() => _accepted = v ?? false),
          ),
          if (_error != null)
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: (_sending || !_accepted) ? null : _submit,
            child: Text(l10n.post),
          ),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context)!;
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ref.read(communityRepositoryProvider).createPost(
            title: _title.text.trim(),
            body: _body.text.trim(),
            type: _type,
          );
      ref.invalidate(communityFeedProvider);
      if (mounted) context.pop();
    } catch (_) {
      setState(() => _error = l10n.errorGeneric);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }
}
