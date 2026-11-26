class SearchHit {
  final String type;
  final Map<String, dynamic> raw;

  const SearchHit({required this.type, required this.raw});

  String get id => raw['_id']?.toString() ?? '';

  String get title =>
      (raw['title'] ?? raw['name'] ?? raw['code'])?.toString() ?? '';
}

class SearchBundle {
  final List<SearchHit> hits;
  final Map<String, int> counts;
  final int total;

  const SearchBundle({
    required this.hits,
    this.counts = const {},
    this.total = 0,
  });
}
