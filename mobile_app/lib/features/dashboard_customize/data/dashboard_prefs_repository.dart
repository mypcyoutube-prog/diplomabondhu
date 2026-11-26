import '../../../core/api/api_client.dart';

class DashboardSectionPref {
  final String key;
  final bool visible;
  final int order;
  final bool customizable;

  const DashboardSectionPref({
    required this.key,
    required this.visible,
    required this.order,
    this.customizable = true,
  });

  factory DashboardSectionPref.fromJson(Map<String, dynamic> json) =>
      DashboardSectionPref(
        key: (json['key'] as String?) ?? '',
        visible: (json['visible'] as bool?) ?? true,
        order: (json['order'] as num?)?.toInt() ?? 0,
        customizable: (json['customizable'] as bool?) ?? true,
      );

  Map<String, dynamic> toPayload() => {
        'key': key,
        'visible': visible,
        'order': order,
      };

  DashboardSectionPref copyWith({bool? visible, int? order}) =>
      DashboardSectionPref(
        key: key,
        visible: visible ?? this.visible,
        order: order ?? this.order,
        customizable: customizable,
      );
}

class DashboardPrefsBundle {
  final bool customized;
  final List<DashboardSectionPref> sections;

  const DashboardPrefsBundle({
    required this.customized,
    required this.sections,
  });

  factory DashboardPrefsBundle.fromJson(Map<String, dynamic> json) =>
      DashboardPrefsBundle(
        customized: (json['customized'] as bool?) ?? false,
        sections: ((json['sections'] as List?) ?? const [])
            .map((e) => DashboardSectionPref.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class DashboardPrefsRepository {
  final ApiClient _client;

  DashboardPrefsRepository(this._client);

  Future<DashboardPrefsBundle> get() async {
    final res = await _client.getMap('/me/dashboard-preferences');
    return DashboardPrefsBundle.fromJson(res.data);
  }

  Future<DashboardPrefsBundle> save(List<DashboardSectionPref> sections) async {
    final res = await _client.putMap('/me/dashboard-preferences', body: {
      'sections': sections.map((s) => s.toPayload()).toList(),
    });
    return DashboardPrefsBundle.fromJson(res);
  }

  Future<DashboardPrefsBundle> reset() async {
    final res = await _client.postMap('/me/dashboard-preferences/reset');
    return DashboardPrefsBundle.fromJson(res);
  }
}
