import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../providers/community_providers.dart';

class CommunityScreen extends ConsumerWidget {
  const CommunityScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final feed = ref.watch(communityFeedProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.community)),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'community_new_post',
        onPressed: () => context.push('/community/new'),
        icon: const Icon(Icons.edit_rounded),
        label: Text(l10n.newPost),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(communityFeedProvider),
        child: AsyncValueView(
          value: feed,
          onRetry: () => ref.invalidate(communityFeedProvider),
          isEmpty: (items) => items.isEmpty,
          emptyIcon: Icons.forum_rounded,
          builder: (context, items) => ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 88),
            itemCount: items.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, i) {
              final post = items[i];
              final initial = post.authorName.isNotEmpty
                  ? post.authorName[0].toUpperCase()
                  : '?';

              return Card(
                child: InkWell(
                  borderRadius: BorderRadius.circular(DbRadius.card),
                  onTap: () => context.push('/community/${post.id}'),
                  child: Padding(
                    padding: const EdgeInsets.all(DbSpacing.md),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 20,
                          backgroundColor:
                              DbColors.teal.withValues(alpha: 0.15),
                          child: Text(
                            initial,
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              color: DbColors.teal,
                              fontSize: 14,
                            ),
                          ),
                        ),
                        const SizedBox(width: DbSpacing.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      post.title,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w600),
                                    ),
                                  ),
                                  if (post.isAnswered)
                                    const Icon(Icons.check_circle_rounded,
                                        color: DbColors.emerald, size: 18),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Wrap(
                                spacing: 6,
                                runSpacing: 4,
                                crossAxisAlignment: WrapCrossAlignment.center,
                                children: [
                                  Text(
                                    post.authorName,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: DbColors.textSecondaryLight,
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 6, vertical: 1),
                                    decoration: BoxDecoration(
                                      color: DbColors.fillLight,
                                      borderRadius: BorderRadius.circular(
                                          DbRadius.badge),
                                    ),
                                    child: Text(
                                      post.type,
                                      style: const TextStyle(
                                        fontSize: 11,
                                        color: DbColors.textSecondaryLight,
                                      ),
                                    ),
                                  ),
                                  Text(
                                    '${post.likeCount} ${l10n.like} · ${post.commentCount} ${l10n.comments}',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: DbColors.textSecondaryLight,
                                    ),
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
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
