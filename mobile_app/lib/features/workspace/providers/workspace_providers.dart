import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/workspace_repository.dart';

final workspaceRepositoryProvider = Provider<WorkspaceRepository>(
  (ref) => WorkspaceRepository(ref.watch(apiClientProvider)),
);

final workspaceNotesProvider = FutureProvider.autoDispose.family<List<WorkspaceNote>, String?>(
  (ref, q) => ref.watch(workspaceRepositoryProvider).notes(q: q),
);

final workspaceCollectionsProvider = FutureProvider.autoDispose<List<WorkspaceCollection>>(
  (ref) => ref.watch(workspaceRepositoryProvider).collections(),
);

final workspaceRecentProvider = FutureProvider.autoDispose<List<WorkspaceRecentItem>>(
  (ref) => ref.watch(workspaceRepositoryProvider).recent(),
);
