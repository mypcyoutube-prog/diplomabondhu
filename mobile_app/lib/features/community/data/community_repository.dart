import '../../../core/api/api_client.dart';
import 'community_models.dart';

class CommunityRepository {
  final ApiClient _client;

  CommunityRepository(this._client);

  Future<({List<Post> items, int total})> posts({int page = 1}) async {
    final res = await _client.getMap('/community/posts', query: {'page': page, 'limit': 20});
    final items = (res.data['items'] as List? ?? [])
        .map((e) => Post.fromJson(e as Map<String, dynamic>))
        .toList();
    final meta = res.meta as Map<String, dynamic>? ?? {};
    return (items: items, total: (meta['total'] as num?)?.toInt() ?? items.length);
  }

  Future<Post> post(String id) async {
    final res = await _client.getMap('/community/posts/$id');
    return Post.fromJson(res.data['post'] as Map<String, dynamic>);
  }

  Future<void> acceptGuidelines() =>
      _client.postMap('/community/guidelines/accept');

  Future<void> createPost({
    required String title,
    required String body,
    required String type,
    List<String> tags = const [],
  }) async {
    await acceptGuidelines();
    await _client.postMap('/community/posts', body: {
      'title': title,
      'body': body,
      'type': type,
      'tags': tags,
    });
  }

  Future<void> like(String id) => _client.postMap('/community/posts/$id/like');

  Future<void> unlike(String id) => _client.deleteMap('/community/posts/$id/like');

  Future<void> comment(String postId, String text, {String? parentId}) =>
      _client.postMap('/community/posts/$postId/comments', body: {
        'text': text,
        ?parentId: parentId,
      });

  Future<void> report({required String targetType, required String targetId, required String reason}) =>
      _client.postMap('/community/reports', body: {
        'targetType': targetType,
        'targetId': targetId,
        'reason': reason,
      });

  Future<List<Comment>> comments(String postId) async {
    final res = await _client.getMap('/community/posts/$postId');
    final list = res.data['comments'] as List? ?? [];
    return list.map((e) => Comment.fromJson(e as Map<String, dynamic>)).toList();
  }
}
