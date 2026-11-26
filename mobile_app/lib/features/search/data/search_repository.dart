import '../../../core/api/api_client.dart';
import 'search_models.dart';

class SearchRepository {
  final ApiClient _client;

  SearchRepository(this._client);

  Future<SearchBundle> search(String q, {String? type, int page = 1}) async {
    final query = <String, dynamic>{
      'q': q,
      if (type != null) 'type': type,
      'page': page,
    };
    final res = await _client.getMap('/search', query: query);

    if (type != null) {
      final items = (res.data['items'] as List? ?? const []);
      final meta = res.meta as Map<String, dynamic>? ?? const {};
      return SearchBundle(
        hits: items
            .map((e) => SearchHit(type: type, raw: e as Map<String, dynamic>))
            .toList(),
        total: (meta['total'] as num?)?.toInt() ?? 0,
      );
    }

    final types = res.data['types'] as Map<String, dynamic>? ?? const {};
    final hits = <SearchHit>[];
    final counts = <String, int>{};
    for (final entry in types.entries) {
      final value = entry.value as Map<String, dynamic>;
      counts[entry.key] = (value['count'] as num?)?.toInt() ?? 0;
      for (final item in (value['items'] as List? ?? const [])) {
        hits.add(SearchHit(type: entry.key, raw: item as Map<String, dynamic>));
      }
    }
    return SearchBundle(hits: hits, counts: counts);
  }

  Future<List<String>> history() async {
    final res = await _client.getMap('/search/history');
    return ((res.data['items'] as List?) ?? const [])
        .map((e) => ((e as Map<String, dynamic>)['q'] as String?) ?? '')
        .where((q) => q.isNotEmpty)
        .toList();
  }

  Future<void> clearHistory() => _client.deleteMap('/search/history');
}
