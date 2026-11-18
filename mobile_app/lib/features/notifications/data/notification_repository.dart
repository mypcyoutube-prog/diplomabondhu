import '../../../core/api/api_client.dart';
import 'notification_models.dart';

class NotificationRepository {
  final ApiClient _client;

  NotificationRepository(this._client);

  Future<({List<NotificationItem> items, int unread})> list({int page = 1}) async {
    final res = await _client.getMap('/notifications', query: {'page': page, 'limit': 50});
    final items = (res.data['items'] as List? ?? [])
        .map((e) => NotificationItem.fromJson(e as Map<String, dynamic>))
        .toList();
    final unread = (res.data['unread'] as num?)?.toInt() ?? 0;
    return (items: items, unread: unread);
  }

  Future<void> markRead(String id) => _client.postMap('/notifications/$id/read');

  Future<void> markAllRead() => _client.postMap('/notifications/read-all');

  Future<Map<String, dynamic>> preferences() =>
      _client.getMap('/notifications/preferences').then((r) => r.data);

  Future<void> updatePreferences(Map<String, bool> categories) =>
      _client.putMap('/notifications/preferences', body: {'categories': categories});
}
