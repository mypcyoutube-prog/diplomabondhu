import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/dashboard_prefs_repository.dart';

final dashboardPrefsRepositoryProvider = Provider<DashboardPrefsRepository>(
  (ref) => DashboardPrefsRepository(ref.watch(apiClientProvider)),
);

final dashboardPrefsProvider = FutureProvider.autoDispose<DashboardPrefsBundle>(
  (ref) => ref.watch(dashboardPrefsRepositoryProvider).get(),
);
