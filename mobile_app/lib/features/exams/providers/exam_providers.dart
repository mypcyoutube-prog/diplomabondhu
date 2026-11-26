import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/exam.dart';
import '../data/exam_repository.dart';

final examRepositoryProvider = Provider<ExamRepository>((ref) {
  return ExamRepository(ref.watch(apiClientProvider));
});

class ExamTypeFilterController extends Notifier<String?> {
  @override
  String? build() => null;

  void setType(String? type) => state = type;
}

final examTypeFilterProvider =
    NotifierProvider<ExamTypeFilterController, String?>(ExamTypeFilterController.new);

typedef ExamPageData = ({List<Exam> items, int total, int page});

class ExamListController extends AsyncNotifier<ExamPageData> {
  @override
  Future<ExamPageData> build() async {
    final type = ref.watch(examTypeFilterProvider);
    final r = await ref.watch(examRepositoryProvider).list(type: type);
    return (items: r.items, total: r.total, page: 1);
  }

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || state.isLoading) return;
    if (current.items.length >= current.total) return;
    final type = ref.read(examTypeFilterProvider);
    state = const AsyncLoading<ExamPageData>()
        .copyWithPrevious(AsyncData(current), isRefresh: false);
    try {
      final next = await ref.read(examRepositoryProvider).list(
            type: type,
            page: current.page + 1,
          );
      state = AsyncData((
        items: [...current.items, ...next.items],
        total: next.total,
        page: current.page + 1,
      ));
    } catch (e, st) {
      state = AsyncError(e, st).copyWithPrevious(AsyncData(current));
    }
  }
}

final examListControllerProvider =
    AsyncNotifierProvider<ExamListController, ExamPageData>(ExamListController.new);

final examDetailProvider = FutureProvider.family<Exam, String>((ref, id) {
  return ref.watch(examRepositoryProvider).byId(id);
});

final examStatsProvider = FutureProvider<Map<String, dynamic>>((ref) {
  return ref.watch(examRepositoryProvider).stats();
});

final examHistoryProvider = FutureProvider((ref) async {
  final r = await ref.watch(examRepositoryProvider).history();
  return r.items;
});

/// Holds the live attempt while the runner screen is open.
class ActiveAttempt {
  final String examId;
  final StartedAttempt attempt;
  final Map<String, String> answers;

  const ActiveAttempt({
    required this.examId,
    required this.attempt,
    this.answers = const {},
  });

  ActiveAttempt withAnswer(String questionId, String key) {
    final next = Map<String, String>.from(answers)..[questionId] = key;
    return ActiveAttempt(examId: examId, attempt: attempt, answers: next);
  }
}

class ActiveAttemptController extends AsyncNotifier<ActiveAttempt?> {
  @override
  Future<ActiveAttempt?> build() async => null;

  Future<void> start(String examId) async {
    state = const AsyncLoading();
    try {
      final attempt = await ref.read(examRepositoryProvider).start(examId);
      state = AsyncData(ActiveAttempt(examId: examId, attempt: attempt));
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  void selectAnswer(String questionId, String key) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(current.withAnswer(questionId, key));
    ref.read(examRepositoryProvider).saveAnswer(current.attempt.attemptId, questionId, key);
  }

  Future<ExamAttemptResult?> submit() async {
    final current = state.value;
    if (current == null) return null;
    final result = await ref.read(examRepositoryProvider).submit(current.attempt.attemptId);
    state = const AsyncData(null);
    return result;
  }

  void discard() {
    state = const AsyncData(null);
  }
}

final activeAttemptProvider =
    AsyncNotifierProvider<ActiveAttemptController, ActiveAttempt?>(
  ActiveAttemptController.new,
);
