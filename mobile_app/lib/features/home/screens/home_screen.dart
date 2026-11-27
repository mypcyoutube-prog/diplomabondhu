import 'dart:async';

import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../dashboard_customize/data/dashboard_prefs_repository.dart';
import '../../dashboard_customize/providers/dashboard_prefs_providers.dart';
import '../../library/providers/library_providers.dart';
import '../../notices/data/notice.dart';
import '../../notices/providers/notice_providers.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../../../shared/widgets/states.dart';
import '../providers/home_providers.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  List<DashboardSectionPref> _orderedSections(
      AsyncValue<DashboardPrefsBundle> prefs) {
    const fallback = ['services', 'resources', 'materials', 'community'];
    return prefs.maybeWhen(
      data: (bundle) {
        final visible =
            bundle.sections.where((s) => s.visible).toList()
              ..sort((a, b) => a.order.compareTo(b.order));
        return visible;
      },
      orElse: () => fallback
          .map((key) => DashboardSectionPref(key: key, visible: true, order: 0))
          .toList(),
    );
  }

  void _openLink(BuildContext context, String linkUrl) {
    if (linkUrl.isEmpty) return;
    if (linkUrl.startsWith('/')) {
      context.push(linkUrl);
      return;
    }
    final uri = Uri.tryParse(linkUrl);
    if (uri != null && (uri.scheme == 'http' || uri.scheme == 'https')) {
      launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Widget _bannersStrip(WidgetRef ref, void Function(String) openLink) {
    final banners = ref.watch(homeBannersProvider);
    return banners.maybeWhen(
      data: (items) {
        if (items.isEmpty) return const SizedBox.shrink();
        return SizedBox(
          height: 130,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: items.length,
            separatorBuilder: (_, _) => const SizedBox(width: 8),
            itemBuilder: (context, i) {
              final banner = items[i];
              return GestureDetector(
                onTap: () => openLink(banner.linkUrl),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(DbRadius.card),
                  child: SizedBox(
                    width: 300,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        Image.network(
                          banner.imageUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => Container(
                            color: DbColors.fillLight,
                            child: const Icon(Icons.image_rounded,
                                color: DbColors.textSecondaryLight, size: 32),
                          ),
                        ),
                        if (banner.title.isNotEmpty ||
                            banner.ctaLabel.isNotEmpty)
                          Container(
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.bottomCenter,
                                end: Alignment.topCenter,
                                colors: [DbColors.overlay, Colors.transparent],
                              ),
                            ),
                            padding: const EdgeInsets.all(12),
                            alignment: Alignment.bottomLeft,
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (banner.title.isNotEmpty)
                                  Text(
                                    banner.title,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14,
                                    ),
                                  ),
                                if (banner.ctaLabel.isNotEmpty)
                                  Padding(
                                    padding:
                                        const EdgeInsets.only(top: 4),
                                    child: Text(
                                      banner.ctaLabel,
                                      style: const TextStyle(
                                        color: Colors.white70,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        );
      },
      orElse: () => const SizedBox.shrink(),
    );
  }

  /// Result bar during an admin-configured display window: the student's own
  /// roll (saved in profile) is matched automatically. Without a window the
  /// admin notice bar takes the same slot.
  Widget _resultOrNoticeBar(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final settings = ref.watch(appSettingsProvider).valueOrNull;
    if (settings == null) return const SizedBox.shrink();

    if (settings.resultDisplayActive) {
      final result = ref.watch(homeResultProvider);
      return result.maybeWhen(
        data: (record) {
          if (record == null) return const SizedBox.shrink();
          final value = record.cgpa ?? record.gpa;
          final metric = record.cgpa != null
              ? 'CGPA ${value?.toStringAsFixed(2)}'
              : 'GPA ${value?.toStringAsFixed(2)}';
          return Card(
            color: DbColors.navy,
            margin: EdgeInsets.zero,
            child: InkWell(
              borderRadius: BorderRadius.circular(DbRadius.card),
              onTap: () => context.push('/results/checker'),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                    horizontal: DbSpacing.md, vertical: DbSpacing.sm + 2),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: DbColors.emeraldDark,
                        borderRadius: BorderRadius.circular(DbRadius.badge),
                      ),
                      child: const Text(
                        'RESULT',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        metric,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                        ),
                      ),
                    ),
                    Text(
                      l10n.viewDetails,
                      style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 13,
                          fontWeight: FontWeight.w600),
                    ),
                    const Icon(Icons.chevron_right_rounded,
                        color: Colors.white70, size: 20),
                  ],
                ),
              ),
            ),
          );
        },
        orElse: () => const SizedBox.shrink(),
      );
    }

    if (!settings.homeNoticeActive) return const SizedBox.shrink();
    final notice = settings.homeNotice;
    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(DbRadius.card),
        onTap: () => _openLink(context, notice.link),
        child: Padding(
          padding: const EdgeInsets.symmetric(
              horizontal: DbSpacing.md, vertical: DbSpacing.sm + 2),
          child: Row(
            children: [
              const Icon(Icons.campaign_rounded, color: DbColors.teal, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  notice.text,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontWeight: FontWeight.w600, fontSize: 13),
                ),
              ),
              const Icon(Icons.chevron_right_rounded,
                  color: DbColors.textSecondaryLight, size: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _serviceTile(String title, String subtitle, IconData icon,
      String route, void Function(String) openLink) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(DbRadius.card),
        onTap: () => openLink(route),
        child: Padding(
          padding: const EdgeInsets.all(DbSpacing.md),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: DbColors.teal, size: 30),
              const SizedBox(height: 6),
              Text(title,
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w700)),
              if (subtitle.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(subtitle,
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 11, color: DbColors.textSecondaryLight)),
              ],
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final settings = ref.watch(appSettingsProvider);
    final recent = ref.watch(recentMaterialsProvider);
    final dashPrefs = ref.watch(dashboardPrefsProvider);
    final notices = ref.watch(publishedNoticesProvider('all'));

    final services = <(String, IconData, String)>[
      (l10n.checkResult, Icons.verified_rounded, '/results/checker'),
      (l10n.cgpaCalculator, Icons.calculate_rounded, '/gpa/cgpa'),
    ];

    final resources = <(String, IconData, String)>[
      (l10n.syllabus, Icons.menu_book_rounded, '/subjects'),
      (l10n.previousQuestions, Icons.history_edu_rounded, '/library'),
    ];

    Widget sectionWidget(String key) {
      switch (key) {
        case 'services':
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              DbSectionHeader(title: l10n.services),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 8,
                crossAxisSpacing: 8,
                childAspectRatio: 1.7,
                children: services
                    .map((item) => _serviceTile(item.$1, '', item.$2, item.$3,
                        (link) => _openLink(context, link)))
                    .toList(),
              ),
            ],
          );
        case 'resources':
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              DbSectionHeader(title: l10n.resources),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 8,
                crossAxisSpacing: 8,
                childAspectRatio: 1.7,
                children: resources
                    .map((item) => _serviceTile(item.$1, '', item.$2, item.$3,
                        (link) => _openLink(context, link)))
                    .toList(),
              ),
            ],
          );
        case 'quick_access':
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              DbSectionHeader(title: l10n.services),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 8,
                crossAxisSpacing: 8,
                childAspectRatio: 1.7,
                children: <(String, IconData, String)>[
                  (l10n.library, Icons.menu_book_rounded, '/library'),
                  (l10n.exams, Icons.quiz_rounded, '/exams'),
                  (l10n.cgpa, Icons.functions_rounded, '/gpa/cgpa'),
                  (l10n.planner, Icons.event_note_rounded, '/planner'),
                ]
                    .map((item) => _serviceTile(item.$1, '', item.$2, item.$3,
                        (link) => _openLink(context, link)))
                    .toList(),
              ),
            ],
          );
        case 'materials':
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              DbSectionHeader(title: l10n.recentMaterials),
              AsyncValueView(
                value: recent,
                onRetry: () => ref.invalidate(recentMaterialsProvider),
                isEmpty: (m) => m.isEmpty,
                emptyIcon: Icons.menu_book_rounded,
                builder: (context, materials) => SizedBox(
                  height: 120,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: materials.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 8),
                    itemBuilder: (context, i) => SizedBox(
                      width: 200,
                      child: Card(
                        child: ListTile(
                          title: Text(
                            materials[i].title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 14),
                          ),
                          onTap: () =>
                              context.push('/library/${materials[i].id}'),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        case 'community':
          return Card(
            child: ListTile(
              onTap: () => context.push('/community'),
              leading: const Icon(Icons.groups_rounded, color: DbColors.teal),
              title: Text(l10n.community),
              trailing: const Icon(Icons.chevron_right_rounded),
            ),
          );
        case 'exams':
          return Card(
            child: ListTile(
              onTap: () => context.push('/exams'),
              leading: const Icon(Icons.quiz_rounded, color: DbColors.teal),
              title: Text(l10n.exams),
              trailing: const Icon(Icons.chevron_right_rounded),
            ),
          );
        case 'gpa_calculator':
        case 'result_checker':
          return _serviceTile(
            l10n.checkResult,
            '',
            Icons.verified_rounded,
            '/results/checker',
            (link) => _openLink(context, link),
          );
        case 'planner':
          return Card(
            child: ListTile(
              onTap: () => context.push('/planner'),
              leading:
                  const Icon(Icons.event_note_rounded, color: DbColors.teal),
              title: Text(l10n.planner),
              trailing: const Icon(Icons.chevron_right_rounded),
            ),
          );
        case 'announcements':
          return const SizedBox.shrink();
      }
      return const SizedBox.shrink();
    }

    final sectionChildren = <Widget>[];
    for (final section in _orderedSections(dashPrefs)) {
      if (section.key == 'announcements') {
        sectionChildren
          ..add(_bannersStrip(ref, (link) => _openLink(context, link)))
          ..add(const SizedBox(height: 12));
        continue;
      }
      final widget = sectionWidget(section.key);
      if (widget is! SizedBox) {
        sectionChildren
          ..add(widget)
          ..add(const SizedBox(height: 16));
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.school_rounded, color: DbColors.teal, size: 22),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                settings.valueOrNull?.appName ?? 'DiplomaBondhu',
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: l10n.commandCenterTitle,
            icon: const Icon(Icons.grid_view_rounded),
            onPressed: () => context.push('/commands'),
          ),
          IconButton(
            icon: const Icon(Icons.search_rounded),
            onPressed: () => context.push('/search'),
          ),
          IconButton(
            icon: const Icon(Icons.notifications_rounded),
            onPressed: () => context.push('/notifications'),
          ),
          IconButton(
            icon: const Icon(Icons.person_rounded),
            onPressed: () => context.push('/profile'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(appSettingsProvider);
          ref.invalidate(recentMaterialsProvider);
          ref.invalidate(dashboardPrefsProvider);
          ref.invalidate(homeBannersProvider);
          ref.invalidate(publishedNoticesProvider('all'));
          ref.invalidate(homeResultProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            settings.maybeWhen(
              data: (s) => s.maintenanceMode
                  ? Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: DbColors.warningLight.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text('Maintenance mode active'),
                    )
                  : const SizedBox.shrink(),
              orElse: () => const SizedBox.shrink(),
            ),
            _resultOrNoticeBar(context, ref),
            const SizedBox(height: 12),
            _NoticeTicker(notices: notices),
            const SizedBox(height: 16),
            ...sectionChildren,
          ],
        ),
      ),
    );
  }
}

/// Compact horizontal ticker: fixed NOTICE label on the left, notice titles
/// scrolling right-to-left. Tapping a title opens its detail page; the label
/// opens the All Notices page.
class _NoticeTicker extends ConsumerStatefulWidget {
  final AsyncValue<List<Notice>> notices;

  const _NoticeTicker({required this.notices});

  @override
  ConsumerState<_NoticeTicker> createState() => _NoticeTickerState();
}

class _NoticeTickerState extends ConsumerState<_NoticeTicker> {
  final ScrollController _controller = ScrollController();
  Timer? _timer;
  bool _overflow = false;

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _startScroll() {
    _timer?.cancel();
    if (!_overflow) return;
    _timer = Timer.periodic(const Duration(milliseconds: 40), (_) {
      if (!_controller.hasClients) return;
      final max = _controller.position.maxScrollExtent;
      if (max <= 0) return;
      final next = _controller.offset + 1;
      _controller.jumpTo(next >= max ? 0 : next);
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final items = widget.notices.valueOrNull ?? const <Notice>[];
    if (items.isEmpty) return const SizedBox.shrink();

    return Container(
      decoration: BoxDecoration(
        color: DbColors.fillLight,
        borderRadius: BorderRadius.circular(DbRadius.badge),
      ),
      padding: const EdgeInsets.symmetric(horizontal: DbSpacing.sm),
      height: 36,
      child: Row(
        children: [
          GestureDetector(
            onTap: () => context.push('/notices'),
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: DbColors.teal,
                borderRadius: BorderRadius.circular(DbRadius.badge),
              ),
              child: Text(
                l10n.noticeTickerLabel,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.6,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: NotificationListener<ScrollMetricsNotification>(
              onNotification: (n) {
                final overflow = n.metrics.maxScrollExtent > 0;
                if (overflow != _overflow) {
                  _overflow = overflow;
                  _startScroll();
                }
                return false;
              },
              child: SingleChildScrollView(
                controller: _controller,
                scrollDirection: Axis.horizontal,
                physics: const NeverScrollableScrollPhysics(),
                child: Row(
                  children: [
                    for (final notice in items.take(20))
                      Padding(
                        padding:
                            const EdgeInsets.symmetric(horizontal: 6),
                        child: GestureDetector(
                          onTap: () => context.push('/notices/${notice.id}'),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                notice.isBteb
                                    ? Icons.verified_rounded
                                    : Icons.campaign_rounded,
                                size: 13,
                                color: notice.isBteb
                                    ? DbColors.emeraldDark
                                    : DbColors.teal,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                notice.title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(width: 6),
                              Text('•',
                                  style: TextStyle(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurfaceVariant)),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
