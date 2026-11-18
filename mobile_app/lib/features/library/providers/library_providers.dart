import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/material.dart';
import '../data/material_repository.dart';

final materialRepositoryProvider = Provider<MaterialRepository>((ref) {
  return MaterialRepository(ref.watch(apiClientProvider));
});

class LibraryFilter {
  final String type;
  final String? q;

  const LibraryFilter({required this.type, this.q});

  LibraryFilter copyWith({String? type, String? q, bool clearQ = false}) => LibraryFilter(
        type: type ?? this.type,
        q: clearQ ? null : (q ?? this.q),
      );
}

class LibraryController extends AsyncNotifier<MaterialPage> {
  @override
  Future<MaterialPage> build() async {
    final filter = ref.watch(libraryFilterProvider);
    return ref.watch(materialRepositoryProvider).list(type: filter.type, q: filter.q);
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
  }
}

class LibraryFilterController extends Notifier<LibraryFilter> {
  @override
  LibraryFilter build() => const LibraryFilter(type: 'book');

  void setType(String type) {
    state = LibraryFilter(type: type, q: state.q);
    ref.invalidate(libraryControllerProvider);
  }

  void setQuery(String q) {
    state = state.copyWith(q: q.isEmpty ? null : q);
    ref.invalidate(libraryControllerProvider);
  }
}

final libraryFilterProvider =
    NotifierProvider<LibraryFilterController, LibraryFilter>(LibraryFilterController.new);

final libraryControllerProvider =
    AsyncNotifierProvider<LibraryController, MaterialPage>(LibraryController.new);

final recentMaterialsProvider = FutureProvider<List<Material>>((ref) {
  return ref.watch(materialRepositoryProvider).recent();
});

final bookmarksProvider = FutureProvider<List<Material>>((ref) {
  return ref.watch(materialRepositoryProvider).bookmarks();
});

final materialDetailProvider =
    FutureProvider.family<Material, String>((ref, id) {
  return ref.watch(materialRepositoryProvider).byId(id);
});
