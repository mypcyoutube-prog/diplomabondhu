import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/community_models.dart';
import '../data/community_repository.dart';

final communityRepositoryProvider = Provider<CommunityRepository>((ref) {
  return CommunityRepository(ref.watch(apiClientProvider));
});

final communityFeedProvider = FutureProvider<List<Post>>((ref) async {
  final r = await ref.watch(communityRepositoryProvider).posts();
  return r.items;
});

final postDetailProvider = FutureProvider.family<Post, String>((ref, id) {
  return ref.watch(communityRepositoryProvider).post(id);
});

final postCommentsProvider = FutureProvider.family<List<Comment>, String>((ref, id) {
  return ref.watch(communityRepositoryProvider).comments(id);
});
