import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../auth/providers/auth_controller.dart';
import '../../results/data/result.dart';
import '../../results/data/result_repository.dart';

class AppSettingsData {
  final String appName;
  final List<({String key, bool visible, int order})> homepageSections;
  final Map<String, dynamic> featureFlags;
  final bool maintenanceMode;
  final Map<String, dynamic> supportInfo;
  final ({bool enabled, String examId, DateTime? startsAt, DateTime? endsAt})
      resultDisplay;
  final ({String text, String link, bool visible, DateTime? startsAt, DateTime? endsAt})
      homeNotice;

  const AppSettingsData({
    required this.appName,
    required this.homepageSections,
    required this.featureFlags,
    required this.maintenanceMode,
    required this.supportInfo,
    required this.resultDisplay,
    required this.homeNotice,
  });

  static DateTime? _date(dynamic value) =>
      value is String ? DateTime.tryParse(value) : null;

  bool inWindow(DateTime? startsAt, DateTime? endsAt) {
    final now = DateTime.now();
    if (startsAt != null && now.isBefore(startsAt)) return false;
    if (endsAt != null && now.isAfter(endsAt)) return false;
    return true;
  }

  bool get resultDisplayActive {
    final rd = resultDisplay;
    return rd.enabled && rd.examId.isNotEmpty && inWindow(rd.startsAt, rd.endsAt);
  }

  bool get homeNoticeActive {
    final hn = homeNotice;
    return hn.visible && hn.text.trim().isNotEmpty && inWindow(hn.startsAt, hn.endsAt);
  }

  factory AppSettingsData.fromJson(Map<String, dynamic> json) {
    final branding = json['branding'] as Map<String, dynamic>? ?? {};
    final rd = json['resultDisplay'] as Map<String, dynamic>? ?? {};
    final hn = json['homeNotice'] as Map<String, dynamic>? ?? {};
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
      resultDisplay: (
        enabled: rd['enabled'] as bool? ?? false,
        examId: rd['examId'] as String? ?? '',
        startsAt: _date(rd['startsAt']),
        endsAt: _date(rd['endsAt']),
      ),
      homeNotice: (
        text: hn['text'] as String? ?? '',
        link: hn['link'] as String? ?? '',
        visible: hn['visible'] as bool? ?? true,
        startsAt: _date(hn['startsAt']),
        endsAt: _date(hn['endsAt']),
      ),
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

/// Auto-matched result for the home bar: admin activates a display window for
/// one exam id; the student's roll comes from their own profile. No manual
/// roll entry on the home page. Returns null when inactive, no roll, no match
/// or any error — the admin notice bar takes the slot instead.
final homeResultProvider = FutureProvider.autoDispose<ResultRecord?>((ref) async {
  final settings = await ref.watch(appSettingsProvider.future);
  if (!settings.resultDisplayActive) return null;
  final user = ref.watch(authControllerProvider).value;
  final roll = user?.academic?.roll;
  if (roll == null || roll.isEmpty) return null;
  try {
    final client = ref.watch(apiClientProvider);
    final repo = ResultRepository(client);
    return await repo.check(examId: settings.resultDisplay.examId, roll: roll);
  } catch (_) {
    return null;
  }
});
