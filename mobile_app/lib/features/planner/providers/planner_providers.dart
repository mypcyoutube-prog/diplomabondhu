import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/planner_models.dart';
import '../data/planner_repository.dart';

final plannerRepositoryProvider = Provider<PlannerRepository>((ref) {
  return PlannerRepository(ref.watch(apiClientProvider));
});

final tasksProvider = FutureProvider<List<Task>>((ref) {
  return ref.watch(plannerRepositoryProvider).tasks();
});

final goalsProvider = FutureProvider<List<Goal>>((ref) {
  return ref.watch(plannerRepositoryProvider).goals();
});

final routineProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(plannerRepositoryProvider).routine();
});
