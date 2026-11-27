import 'dart:async';

import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../auth/providers/auth_controller.dart';
import '../../dashboard_customize/data/dashboard_prefs_repository.dart';
import '../../dashboard_customize/providers/dashboard_prefs_providers.dart';
import '../../library/providers/library_providers.dart';
import '../../notices/data/notice.dart';
import '../../notices/providers/notice_providers.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../../../shared/widgets/pressable_scale.dart';
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
          height: 132,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: items.length,
            separatorBuilder: (_, _) => const SizedBox(width: 10),
            itemBuilder: (context, i) {
              final banner = items[i];
              return PressableScale(
                onTap: () => openLink(banner.linkUrl),
                child: Container(
                  width: 300,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(DbRadius.card),
                    boxShadow: DbShadows.card,
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(DbRadius.card),
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
                                stops: [0.0, 0.55],
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
    final settings = ref.watch(appSettingsProvider).value;
    if (settings == null) return const SizedBox.shrink();

    if (settings.resultDisplayActive) {
      final result = ref.watch(homeResultProvider);
      return result.maybeWhen(
        data: (record) {
          if (record == null) return const SizedBox.shrink();
          final value = record.cgpa ?? record.gpa;
          final metricLabel = record.cgpa != null ? 'CGPA' : 'GPA';
          return PressableScale(
            onTap: () => context.push('/results/checker'),
            child: Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: DbSpacing.md, vertical: DbSpacing.sm + 4),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [DbColors.navy, DbColors.navyDark],
                ),
                borderRadius: BorderRadius.circular(DbRadius.card),
                boxShadow: DbShadows.card,
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 9, vertical: 4),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                          colors: [DbColors.emerald, DbColors.emeraldDark]),
                      borderRadius: BorderRadius.circular(DbRadius.badge),
                    ),
                    child: const Text(
                      'RESULT',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text(
                          metricLabel,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.75),
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.6,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          value?.toStringAsFixed(2) ?? '--',
                          style: const TextStyle(
                            color: DbColors.emeraldDark,
                            fontWeight: FontWeight.w800,
                            fontSize: 19,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.arrow_forward_rounded,
                        color: Colors.white, size: 16),
                  ),
                ],
              ),
            ),
          );
        },
        orElse: () => const SizedBox.shrink(),
      );
    }

    if (!settings.homeNoticeActive) return const SizedBox.shrink();
    final notice = settings.homeNotice;
    return PressableScale(
      onTap: () => _openLink(context, notice.link),
      child: Container(
        padding: const EdgeInsets.symmetric(
            horizontal: DbSpacing.md, vertical: DbSpacing.sm + 4),
        decoration: BoxDecoration(
          color: DbColors.teal.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(DbRadius.card),
          border: Border.all(color: DbColors.teal.withValues(alpha: 0.25)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: DbColors.teal.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(DbRadius.input),
              ),
              child: const Icon(Icons.campaign_rounded,
                  color: DbColors.teal, size: 18),
            ),
            const SizedBox(width: 12),
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
    );
  }

  Widget _serviceTile(BuildContext context, String title, String subtitle,
      IconData icon, String route, void Function(String) openLink) {
    return PressableScale(
      onTap: () => openLink(route),
      child: Container(
        padding: const EdgeInsets.all(DbSpacing.md),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(DbRadius.card),
          boxShadow: DbShadows.card,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [DbColors.teal, DbColors.emerald],
                ),
                borderRadius: BorderRadius.circular(DbRadius.input),
                boxShadow: [
                  BoxShadow(
                    color: DbColors.teal.withValues(alpha: 0.3),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Icon(icon, color: Colors.white, size: 22),
            ),
            const SizedBox(height: 8),
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
    );
  }

  Widget _sectionHeader(BuildContext context, String title, String route,
      void Function(String route) openLink) {
    return DbSectionHeader(
      title: title,
      trailing: TextButton(
        onPressed: () => openLink(route),
        style: TextButton.styleFrom(
          visualDensity: VisualDensity.compact,
          padding: const EdgeInsets.symmetric(horizontal: 8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              AppLocalizations.of(context)!.seeAll,
              style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: DbColors.teal),
            ),
            const Icon(Icons.chevron_right_rounded,
                size: 18, color: DbColors.teal),
          ],
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
    final user = ref.watch(authControllerProvider).value;
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? l10n.goodMorning
        : hour < 17
            ? l10n.goodAfternoon
            : l10n.goodEvening;

    final services = <(String, IconData, String)>[
      (l10n.checkResult, Icons.verified_rounded, '/results/checker'),
      (l10n.cgpaCalculator, Icons.calculate_rounded, '/gpa/cgpa'),
    ];

    final resources = <(String, IconData, String)>[
      (l10n.syllabus, Icons.menu_book_rounded, '/subjects'),
      (l10n.previousQuestions, Icons.history_edu_rounded, '/library'),
    ];

    Widget gridFor(
        String title, List<(String, IconData, String)> items, String seeAllRoute) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionHeader(
              context, title, seeAllRoute, (link) => _openLink(context, link)),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.55,
            children: items
                .map((item) => _serviceTile(
                    context, item.$1, '', item.$2, item.$3,
                    (link) => _openLink(context, link)))
                .toList(),
          ),
        ],
      );
    }

    Widget sectionWidget(String key) {
      switch (key) {
        case 'services':
          return gridFor(l10n.services, services, '/results/checker');
        case 'resources':
          return gridFor(l10n.resources, resources, '/subjects');
        case 'quick_access':
          return gridFor(
            l10n.services,
            <(String, IconData, String)>[
              (l10n.library, Icons.menu_book_rounded, '/library'),
              (l10n.exams, Icons.quiz_rounded, '/exams'),
              (l10n.cgpa, Icons.functions_rounded, '/gpa/cgpa'),
              (l10n.planner, Icons.event_note_rounded, '/planner'),
            ],
            '/library',
          );
        case 'materials':
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _sectionHeader(
                  context, l10n.recentMaterials, '/library',
                  (link) => _openLink(context, link)),
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
          return PressableScale(
            onTap: () => context.push('/community'),
            child: Card(
              child: ListTile(
                onTap: () => context.push('/community'),
                leading: const Icon(Icons.groups_rounded, color: DbColors.teal),
                title: Text(l10n.community),
                trailing: const Icon(Icons.chevron_right_rounded),
              ),
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
            context,
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
          ..add(const SizedBox(height: 18));
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(5),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                    colors: [DbColors.teal, DbColors.emerald]),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.school_rounded,
                  color: Colors.white, size: 16),
            ),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                settings.value?.appName ?? 'DiplomaBondhu',
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
            Text(
              '$greeting, ${user?.name ?? ''} \ud83d\udc4b',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 12),
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
            const SizedBox(height: 18),
            ...sectionChildren,
          ],
        ),
      ),
    );
  }
}

/// Wraps a tappable child with a subtle press-down scale animation.
/// Compact horizontal ticker: fixed NOTICE chip on the left, notice titles
/// scrolling right-to-left with fade edges. Tapping a title opens its detail
/// page; the chip opens the All Notices page.
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
    final items = widget.notices.value ?? const <Notice>[];
    if (items.isEmpty) return const SizedBox.shrink();

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? DbColors.fillDark : DbColors.fillLight,
        borderRadius: BorderRadius.circular(DbRadius.chip),
        border: Border.all(
          color: isDark ? DbColors.borderDark : DbColors.borderLight,
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: DbSpacing.sm),
      height: 38,
      child: Row(
        children: [
          GestureDetector(
            onTap: () => context.push('/notices'),
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                    colors: [DbColors.teal, DbColors.emerald]),
                borderRadius: BorderRadius.circular(DbRadius.badge),
              ),
              child: Text(
                l10n.noticeTickerLabel,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.8,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: ShaderMask(
              shaderCallback: (bounds) => const LinearGradient(
                colors: [
                  Colors.transparent,
                  Colors.white,
                  Colors.white,
                  Colors.transparent
                ],
                stops: [0, 8 / 200, 0.92, 1],
              ).createShader(bounds),
              blendMode: BlendMode.dstIn,
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
                            onTap: () =>
                                context.push('/notices/${notice.id}'),
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
          ),
        ],
      ),
    );
  }
}
