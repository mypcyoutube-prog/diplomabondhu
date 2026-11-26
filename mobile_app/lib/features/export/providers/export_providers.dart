import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/export_repository.dart';

final exportRepositoryProvider = Provider<ExportRepository>(
  (ref) => ExportRepository(ref.watch(apiClientProvider)),
);

final exportJobsProvider = FutureProvider.autoDispose<List<ExportJobModel>>(
  (ref) => ref.watch(exportRepositoryProvider).listJobs(),
);
