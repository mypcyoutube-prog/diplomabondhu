import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/gpa_models.dart';
import '../data/gpa_repository.dart';

final gpaRepositoryProvider = Provider<GpaRepository>((ref) {
  return GpaRepository(ref.watch(apiClientProvider));
});

final gpaProfilesProvider = FutureProvider<List<GpaProfile>>((ref) {
  return ref.watch(gpaRepositoryProvider).profiles();
});

final profileStructureProvider =
    FutureProvider.family<ProfileStructure, String>((ref, profileId) {
  return ref.watch(gpaRepositoryProvider).structure(profileId);
});

final gpaHistoryProvider = FutureProvider<List<GpaHistoryItem>>((ref) {
  return ref.watch(gpaRepositoryProvider).history();
});
