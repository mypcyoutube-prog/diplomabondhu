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
  final String? technologyId;
  final String? semesterId;
  final String? subjectId;
  final int? examYear;
  final String sort;

  const LibraryFilter({
    required this.type,
    this.q,
    this.technologyId,
    this.semesterId,
    this.subjectId,
    this.examYear,
    this.sort = 'recent',
  });

  bool get hasActiveFilters =>
      technologyId != null || semesterId != null || subjectId != null || examYear != null;

  LibraryFilter copyWith({
    String? type,
    String? q,
    bool clearQ = false,
    String? technologyId,
    bool clearTechnology = false,
    String? semesterId,
    bool clearSemester = false,
    String? subjectId,
    bool clearSubject = false,
    int? examYear,
    bool clearExamYear = false,
    String? sort,
  }) =>
      LibraryFilter(
        type: type ?? this.type,
        q: clearQ ? null : (q ?? this.q),
        technologyId: clearTechnology ? null : (technologyId ?? this.technologyId),
        semesterId: clearSemester ? null : (semesterId ?? this.semesterId),
        subjectId: clearSubject ? null : (subjectId ?? this.subjectId),
        examYear: clearExamYear ? null : (examYear ?? this.examYear),
        sort: sort ?? this.sort,
      );
}

class LibraryController extends AsyncNotifier<MaterialPage> {
  @override
  Future<MaterialPage> build() async {
    final filter = ref.watch(libraryFilterProvider);
    return ref.watch(materialRepositoryProvider).list(
          type: filter.type,
          q: filter.q,
          technologyId: filter.technologyId,
          semesterId: filter.semesterId,
          subjectId: filter.subjectId,
          examYear: filter.examYear,
          sort: filter.sort,
        );
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
  }

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || state.isLoading) return;
    if (current.items.length >= current.total) return;
    final filter = ref.read(libraryFilterProvider);
    state = const AsyncLoading<MaterialPage>()
        .copyWithPrevious(AsyncData(current), isRefresh: false);
    try {
      final next = await ref.read(materialRepositoryProvider).list(
            type: filter.type,
            q: filter.q,
            technologyId: filter.technologyId,
            semesterId: filter.semesterId,
            subjectId: filter.subjectId,
            examYear: filter.examYear,
            sort: filter.sort,
            page: current.page + 1,
          );
      state = AsyncData(MaterialPage(
        items: [...current.items, ...next.items],
        page: next.page,
        total: next.total,
        counts: next.counts.isNotEmpty ? next.counts : current.counts,
      ));
    } catch (e, st) {
      state = AsyncError<MaterialPage>(e, st).copyWithPrevious(AsyncData(current));
    }
  }
}

class LibraryFilterController extends Notifier<LibraryFilter> {
  @override
  LibraryFilter build() => const LibraryFilter(type: 'book');

  void setType(String type) {
    state = LibraryFilter(type: type, q: state.q, sort: state.sort);
    ref.invalidate(libraryControllerProvider);
  }

  void setQuery(String q) {
    state = state.copyWith(q: q.isEmpty ? null : q);
    ref.invalidate(libraryControllerProvider);
  }

  void setTechnology(String? id) {
    state = state.copyWith(
      technologyId: id,
      clearTechnology: id == null,
      clearSubject: true,
    );
    ref.invalidate(libraryControllerProvider);
  }

  void setSemester(String? id) {
    state = state.copyWith(
      semesterId: id,
      clearSemester: id == null,
      clearSubject: true,
    );
    ref.invalidate(libraryControllerProvider);
  }

  void setSubject(String? id) {
    state = state.copyWith(subjectId: id, clearSubject: id == null);
    ref.invalidate(libraryControllerProvider);
  }

  void setExamYear(int? year) {
    state = state.copyWith(examYear: year, clearExamYear: year == null);
    ref.invalidate(libraryControllerProvider);
  }

  void setSort(String sort) {
    state = state.copyWith(sort: sort);
    ref.invalidate(libraryControllerProvider);
  }

  void clearAll() {
    state = LibraryFilter(type: state.type, q: state.q, sort: state.sort);
    ref.invalidate(libraryControllerProvider);
  }
}

final libraryFilterProvider =
    NotifierProvider<LibraryFilterController, LibraryFilter>(LibraryFilterController.new);

final libraryControllerProvider =
    AsyncNotifierProvider<LibraryController, MaterialPage>(LibraryController.new);

class RefOption {
  final String id;
  final String name;

  const RefOption({required this.id, required this.name});
}

final libraryTechnologiesProvider = FutureProvider.autoDispose<List<RefOption>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final res = await client.getList('/academic/technologies', query: {'limit': 100});
  return res.data
      .map((e) => e as Map<String, dynamic>)
      .map((e) => RefOption(id: e['_id'] as String, name: (e['name'] as String?) ?? ''))
      .where((o) => o.name.isNotEmpty)
      .toList();
});

final librarySemestersProvider = FutureProvider.autoDispose<List<RefOption>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final res = await client.getList('/academic/semesters', query: {'limit': 100});
  return res.data
      .map((e) => e as Map<String, dynamic>)
      .map((e) => RefOption(id: e['_id'] as String, name: (e['name'] as String?) ?? ''))
      .where((o) => o.name.isNotEmpty)
      .toList();
});

final librarySubjectsProvider =
    FutureProvider.autoDispose.family<List<RefOption>, LibraryFilter>((ref, filter) async {
  final client = ref.watch(apiClientProvider);
  final query = <String, dynamic>{'limit': 200};
  if (filter.technologyId != null) query['technologyId'] = filter.technologyId;
  if (filter.semesterId != null) query['semesterId'] = filter.semesterId;
  final res = await client.getList('/academic/subjects', query: query);
  return res.data
      .map((e) => e as Map<String, dynamic>)
      .map((e) => RefOption(id: e['_id'] as String, name: (e['name'] as String?) ?? ''))
      .where((o) => o.name.isNotEmpty)
      .toList();
});

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

final isBookmarkedProvider =
    FutureProvider.family<bool, String>((ref, id) async {
  final bookmarks = await ref.watch(bookmarksProvider.future);
  return bookmarks.any((m) => m.id == id);
});
