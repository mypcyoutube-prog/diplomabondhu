import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/sync_repository.dart';

final syncRepositoryProvider = Provider<SyncRepository>(
  (ref) => SyncRepository(ref.watch(apiClientProvider)),
);

final syncDevicesProvider = FutureProvider.autoDispose<List<SyncDeviceModel>>(
  (ref) => ref.watch(syncRepositoryProvider).devices(),
);
