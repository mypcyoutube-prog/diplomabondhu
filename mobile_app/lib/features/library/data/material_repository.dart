import '../../../core/api/api_client.dart';
import 'material.dart';

class MaterialRepository {
  final ApiClient _client;

  MaterialRepository(this._client);

  Future<MaterialPage> list({
    String? type,
    String? q,
    String? subjectId,
    String? semesterId,
    String? technologyId,
    String? programId,
    int? examYear,
    String sort = 'recent',
    int page = 1,
    int limit = 20,
  }) async {
    final query = <String, dynamic>{'page': page, 'limit': limit, 'sort': sort};
    if (type != null) query['type'] = type;
    if (q != null && q.isNotEmpty) query['q'] = q;
    if (subjectId != null) query['subjectId'] = subjectId;
    if (semesterId != null) query['semesterId'] = semesterId;
    if (technologyId != null) query['technologyId'] = technologyId;
    if (programId != null) query['programId'] = programId;
    if (examYear != null) query['examYear'] = examYear;
    final res = await _client.getMap('/materials', query: query);
    final items = (res.data['items'] as List? ?? [])
        .map((e) => Material.fromJson(e as Map<String, dynamic>))
        .toList();
    final meta = res.meta as Map<String, dynamic>? ?? {};
    final counts = (meta['counts'] as Map<String, dynamic>? ?? {})
        .map((k, v) => MapEntry(k, (v as num).toInt()));
    return MaterialPage(
      items: items,
      page: (meta['page'] as num?)?.toInt() ?? page,
      total: (meta['total'] as num?)?.toInt() ?? items.length,
      counts: counts,
    );
  }

  Future<Material> byId(String id) async {
    final res = await _client.getMap('/materials/$id');
    return Material.fromJson(res.data['item'] as Map<String, dynamic>);
  }

  Future<List<Material>> recent() async {
    final res = await _client.getMap('/materials/recent');
    final items = res.data['items'] as List<dynamic>? ?? const [];
    return items
        .map((e) => Material.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<Material>> bookmarks() async {
    final res = await _client.getMap('/materials/bookmarks');
    final items = res.data['items'] as List<dynamic>? ?? const [];
    return items
        .map((e) => Material.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> addBookmark(String id) => _client.postMap('/materials/$id/bookmark');

  Future<void> removeBookmark(String id) => _client.deleteMap('/materials/$id/bookmark');

  Future<String> downloadUrl(String id) async {
    final res = await _client.getMap('/materials/download/$id');
    return res.data['url'] as String;
  }

  Future<void> report(String id, {required String reasonCode, String? details}) =>
      _client.postMap('/materials/$id/report', body: {
        'reasonCode': reasonCode,
        if (details != null && details.trim().isNotEmpty) 'details': details.trim(),
      });
}
