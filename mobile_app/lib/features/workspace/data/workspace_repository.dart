import '../../../core/api/api_client.dart';
import 'workspace_models.dart';

class WorkspaceRepository {
  final ApiClient _client;

  WorkspaceRepository(this._client);

  Future<List<WorkspaceNote>> notes({String? q, bool archived = false, String? collectionId}) async {
    final res = await _client.getMap('/workspace/notes', query: {
      if (q != null && q.isNotEmpty) 'q': q,
      if (archived) 'archived': 'true',
      if (collectionId != null) 'collectionId': collectionId,
    });
    return (res.data['items'] as List? ?? const [])
        .map((e) => WorkspaceNote.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<WorkspaceNote> createNote({required String title, required String body, String? collectionId}) async {
    final res = await _client.postMap('/workspace/notes', body: {
      'title': title,
      'body': body,
      if (collectionId != null) 'collectionId': collectionId,
    });
    return WorkspaceNote.fromJson(res['item'] as Map<String, dynamic>);
  }

  Future<void> updateNote(String id, {bool? pinned, bool? archived}) async {
    await _client.putMap('/workspace/notes/$id', body: {
      if (pinned != null) 'pinned': pinned,
      if (archived != null) 'archived': archived,
    });
  }

  Future<void> deleteNote(String id) async {
    await _client.deleteMap('/workspace/notes/$id');
  }

  Future<List<WorkspaceCollection>> collections() async {
    final res = await _client.getMap('/workspace/collections');
    return (res.data['items'] as List? ?? const [])
        .map((e) => WorkspaceCollection.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<WorkspaceCollection> createCollection(String name) async {
    final res = await _client.postMap('/workspace/collections', body: {'name': name});
    return WorkspaceCollection.fromJson(res['item'] as Map<String, dynamic>);
  }

  Future<void> deleteCollection(String id) async {
    await _client.deleteMap('/workspace/collections/$id');
  }

  Future<void> addToCollection(String id, {required String refType, required String refId}) async {
    await _client.postMap('/workspace/collections/$id/items', body: {'refType': refType, 'refId': refId});
  }

  Future<List<WorkspaceRecentItem>> recent() async {
    final res = await _client.getMap('/workspace/recent');
    return (res.data['items'] as List? ?? const [])
        .map((e) => WorkspaceRecentItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
