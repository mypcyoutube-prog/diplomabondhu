import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/notification_models.dart';
import '../data/notification_repository.dart';

final notificationRepositoryProvider = Provider<NotificationRepository>((ref) {
  return NotificationRepository(ref.watch(apiClientProvider));
});

final notificationsProvider =
    FutureProvider<({List<NotificationItem> items, int unread})>((ref) {
  return ref.watch(notificationRepositoryProvider).list();
});

final notificationPrefsProvider = FutureProvider<Map<String, dynamic>>((ref) {
  return ref.watch(notificationRepositoryProvider).preferences();
});
