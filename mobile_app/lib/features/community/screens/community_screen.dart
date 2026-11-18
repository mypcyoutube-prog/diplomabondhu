import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../providers/community_providers.dart';

class CommunityScreen extends ConsumerWidget {
  const CommunityScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final feed = ref.watch(communityFeedProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.community),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded),
            tooltip: l10n.newPost,
            onPressed: () => context.push('/community/new'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(communityFeedProvider),
        child: AsyncValueView(
          value: feed,
          onRetry: () => ref.invalidate(communityFeedProvider),
          isEmpty: (items) => items.isEmpty,
          emptyIcon: Icons.forum_rounded,
          builder: (context, items) => ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, i) {
              final post = items[i];
              return Card(
                child: ListTile(
                  title: Row(
                    children: [
                      Expanded(
                        child: Text(
                          post.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ),
                      if (post.isAnswered)
                        Icon(Icons.check_circle_rounded,
                            color: Theme.of(context).colorScheme.secondary, size: 18),
                    ],
                  ),
                  subtitle: Text(
                    '${post.authorName} · ${post.type} · ${'${post.likeCount} ${l10n.like}'} · ${post.commentCount} ${l10n.comments}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => context.push('/community/${post.id}'),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
