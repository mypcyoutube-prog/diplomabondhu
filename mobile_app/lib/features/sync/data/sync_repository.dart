import '../../../core/api/api_client.dart';

class SyncDeviceModel {
  final String id;
  final String deviceId;
  final String platform;
  final String name;
  final DateTime? lastSyncAt;

  const SyncDeviceModel({
    required this.id,
    required this.deviceId,
    required this.platform,
    required this.name,
    this.lastSyncAt,
  });

  factory SyncDeviceModel.fromJson(Map<String, dynamic> json) =>
      SyncDeviceModel(
        id: (json['id'] ?? json['_id'])?.toString() ?? '',
        deviceId: (json['deviceId'] as String?) ?? '',
        platform: (json['platform'] as String?) ?? '',
        name: (json['name'] as String?) ?? '',
        lastSyncAt: json['lastSyncAt'] == null
            ? null
            : DateTime.tryParse(json['lastSyncAt'].toString()),
      );
}

class SyncRepository {
  final ApiClient _client;

  SyncRepository(this._client);

  Future<void> registerDevice({
    required String deviceId,
    String platform = 'android',
    String name = '',
  }) =>
      _client.postMap('/sync/devices', body: {
        'deviceId': deviceId,
        'platform': platform,
        'name': name,
      });

  Future<List<SyncDeviceModel>> devices() async {
    final res = await _client.getMap('/sync/devices');
    return ((res.data['items'] as List?) ?? const [])
        .map((e) => SyncDeviceModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> revoke(String id) => _client.deleteMap('/sync/devices/$id');
}
