import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/search_models.dart';
import '../data/search_repository.dart';

final searchRepositoryProvider = Provider<SearchRepository>((ref) {
  return SearchRepository(ref.watch(apiClientProvider));
});

typedef SearchParams = (String q, String? type);

final searchBundleProvider =
    FutureProvider.family<SearchBundle, SearchParams>((ref, params) {
  return ref
      .watch(searchRepositoryProvider)
      .search(params.$1, type: params.$2);
});

final searchHistoryProvider = FutureProvider.autoDispose<List<String>>(
  (ref) => ref.watch(searchRepositoryProvider).history(),
);
