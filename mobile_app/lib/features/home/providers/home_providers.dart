import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';

class AppSettingsData {
  final String appName;
  final List<({String key, bool visible, int order})> homepageSections;
  final Map<String, dynamic> featureFlags;
  final bool maintenanceMode;
  final Map<String, dynamic> supportInfo;

  const AppSettingsData({
    required this.appName,
    required this.homepageSections,
    required this.featureFlags,
    required this.maintenanceMode,
    required this.supportInfo,
  });

  bool get resultCheckerVisible {
    final section = homepageSections.any((s) => s.key == 'result_checker');
    if (!section) return false;
    final flag = featureFlags['resultChecker'];
    if (flag is bool) return flag;
    return true;
  }

  factory AppSettingsData.fromJson(Map<String, dynamic> json) {
    final branding = json['branding'] as Map<String, dynamic>? ?? {};
    return AppSettingsData(
      appName: branding['appName'] as String? ?? 'DiplomaBondhu',
      homepageSections: (json['homepageSections'] as List? ?? [])
          .map((e) {
            final m = e as Map<String, dynamic>;
            return (
              key: m['key'] as String,
              visible: m['visible'] as bool? ?? true,
              order: (m['order'] as num?)?.toInt() ?? 0,
            );
          })
          .where((s) => s.visible)
          .toList()
        ..sort((a, b) => a.order.compareTo(b.order)),
      featureFlags: json['featureFlags'] as Map<String, dynamic>? ?? {},
      maintenanceMode: json['maintenanceMode'] as bool? ?? false,
      supportInfo: json['supportInfo'] as Map<String, dynamic>? ?? {},
    );
  }
}

final appSettingsProvider = FutureProvider<AppSettingsData>((ref) async {
  final client = ref.watch(apiClientProvider);
  final res = await client.getMap('/settings/app');
  return AppSettingsData.fromJson(res.data);
});

class HomeBanner {
  final String id;
  final String title;
  final String imageUrl;
  final String linkUrl;
  final String ctaLabel;

  const HomeBanner({
    required this.id,
    required this.title,
    required this.imageUrl,
    required this.linkUrl,
    required this.ctaLabel,
  });

  factory HomeBanner.fromJson(Map<String, dynamic> json) {
    return HomeBanner(
      id: json['_id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      imageUrl: json['imageUrl'] as String? ?? '',
      linkUrl: json['linkUrl'] as String? ?? '',
      ctaLabel: json['ctaLabel'] as String? ?? '',
    );
  }
}

final homeBannersProvider = FutureProvider<List<HomeBanner>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final res = await client.getMap('/banners');
  final items = res.data['items'] as List? ?? [];
  return items
      .map((e) => HomeBanner.fromJson(e as Map<String, dynamic>))
      .toList();
});
