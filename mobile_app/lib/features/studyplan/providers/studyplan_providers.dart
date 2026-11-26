import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/studyplan_repository.dart';

final studyPlanRepositoryProvider = Provider<StudyPlanRepository>(
  (ref) => StudyPlanRepository(ref.watch(apiClientProvider)),
);

final studyPlanListProvider = FutureProvider.autoDispose<List<StudyPlanModel>>(
  (ref) => ref.watch(studyPlanRepositoryProvider).list(),
);
