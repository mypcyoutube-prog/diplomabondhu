import '../../../core/api/api_client.dart';
import 'subject_catalog.dart';

class SubjectRepository {
  final ApiClient _client;

  SubjectRepository(this._client);

  Future<List<CatalogTechnology>> technologies({int? regulation}) async {
    final res = await _client.getMap('/bteb-subjects/technologies',
        query: regulation == null ? null : {'regulation': regulation});
    return (res.data['technologies'] as List? ?? [])
        .map((t) => CatalogTechnology.fromJson(t as Map<String, dynamic>))
        .toList();
  }

  Future<List<CatalogSubject>> subjects({
    required String technologySlug,
    required int regulation,
  }) async {
    const limit = 200;
    var page = 1;
    final all = <CatalogSubject>[];
    while (true) {
      final res = await _client.getMap('/bteb-subjects/subjects', query: {
        'technologySlug': technologySlug,
        'regulation': regulation,
        'limit': limit,
        'page': page,
      });
      final items = (res.data['items'] as List? ?? [])
          .map((s) => CatalogSubject.fromJson(s as Map<String, dynamic>))
          .toList();
      all.addAll(items);
      final meta = res.meta as Map<String, dynamic>?;
      final total = (meta?['total'] as num?)?.toInt() ?? all.length;
      if (items.length < limit || all.length >= total) break;
      page += 1;
    }
    return all;
  }
}
