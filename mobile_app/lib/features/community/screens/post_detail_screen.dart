import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../providers/community_providers.dart';

class PostDetailScreen extends ConsumerWidget {
  final String postId;

  const PostDetailScreen({super.key, required this.postId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final post = ref.watch(postDetailProvider(postId));
    final comments = ref.watch(postCommentsProvider(postId));

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.community),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_rounded),
            tooltip: l10n.share,
            onPressed: () async {
              final value = ref.read(postDetailProvider(postId)).asData?.value;
              if (value == null) return;
              await SharePlus.instance.share(ShareParams(text: '${value.title}\n\n${value.body}'));
            },
          ),
          IconButton(
            icon: const Icon(Icons.flag_outlined),
            tooltip: l10n.report,
            onPressed: () => _report(context, ref),
          ),
        ],
      ),
      body: AsyncValueView(
        value: post,
        onRetry: () => ref.invalidate(postDetailProvider(postId)),
        builder: (context, p) => Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text(p.title,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w800,
                          )),
                  const SizedBox(height: 4),
                  Text('${p.authorName} · ${p.type}'),
                  const SizedBox(height: 12),
                  Text(p.body),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      IconButton(
                        icon: Icon(
                          p.likedByMe ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                          color: Theme.of(context).colorScheme.error,
                        ),
                        onPressed: () async {
                          try {
                            if (p.likedByMe) {
                              await ref.read(communityRepositoryProvider).unlike(p.id);
                            } else {
                              await ref.read(communityRepositoryProvider).like(p.id);
                            }
                            ref.invalidate(postDetailProvider(postId));
                          } catch (_) {}
                        },
                      ),
                      Text('${p.likeCount}'),
                      const SizedBox(width: 16),
                      const Icon(Icons.chat_bubble_outline_rounded, size: 20),
                      const SizedBox(width: 4),
                      Text('${p.commentCount}'),
                    ],
                  ),
                  const Divider(height: 32),
                  AsyncValueView(
                    value: comments,
                    onRetry: () => ref.invalidate(postCommentsProvider(postId)),
                    isEmpty: (c) => c.isEmpty,
                    emptyIcon: Icons.chat_bubble_outline_rounded,
                    builder: (context, list) => Column(
                      children: list
                          .map((c) => ListTile(
                                contentPadding: EdgeInsets.zero,
                                title: Text(
                                  c.authorName,
                                  style: const TextStyle(fontWeight: FontWeight.w600),
                                ),
                                subtitle: Text(c.text),
                              ))
                          .toList(),
                    ),
                  ),
                ],
              ),
            ),
            SafeArea(
              child: Padding(
                padding: EdgeInsets.only(
                  left: 16,
                  right: 16,
                  bottom: 16 + MediaQuery.of(context).viewInsets.bottom,
                ),
                child: _CommentComposer(postId: postId),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _report(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context)!;
    final controller = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.report),
        content: TextField(controller: controller, maxLength: 500),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l10n.cancel)),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(l10n.report)),
        ],
      ),
    );
    if (ok != true || controller.text.trim().length < 5) return;
    try {
      await ref.read(communityRepositoryProvider).report(
            targetType: 'post',
            targetId: postId,
            reason: controller.text.trim(),
          );
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(l10n.errorGeneric)));
      }
    }
  }
}

class _CommentComposer extends ConsumerStatefulWidget {
  final String postId;

  const _CommentComposer({required this.postId});

  @override
  ConsumerState<_CommentComposer> createState() => _CommentComposerState();
}

class _CommentComposerState extends ConsumerState<_CommentComposer> {
  final _controller = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _controller,
            maxLength: 5000,
            decoration: InputDecoration(hintText: l10n.reply),
          ),
        ),
        IconButton(
          onPressed: _sending
              ? null
              : () async {
                  if (_controller.text.trim().isEmpty) return;
                  final messenger = ScaffoldMessenger.of(context);
                  setState(() => _sending = true);
                  try {
                    await ref
                        .read(communityRepositoryProvider)
                        .comment(widget.postId, _controller.text.trim());
                    _controller.clear();
                    ref.invalidate(postCommentsProvider(widget.postId));
                    ref.invalidate(postDetailProvider(widget.postId));
                  } catch (_) {
                    messenger.showSnackBar(SnackBar(content: Text(l10n.errorGeneric)));
                  } finally {
                    if (mounted) setState(() => _sending = false);
                  }
                },
          icon: const Icon(Icons.send_rounded),
        ),
      ],
    );
  }
}
