import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/result_repository.dart';

final resultRepositoryProvider = Provider<ResultRepository>((ref) {
  return ResultRepository(ref.watch(apiClientProvider));
});

final resultExamsProvider = FutureProvider((ref) {
  return ref.watch(resultRepositoryProvider).exams();
});
