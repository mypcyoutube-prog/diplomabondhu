import 'dart:async';

import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../auth/data/user.dart';
import '../../auth/providers/auth_controller.dart';
import '../data/home_content.dart';
import '../data/home_icon_map.dart';
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

  static const List<String> _sectionOrder = [
    'quick_access',
    'exams',
    'resources',
    'materials',
    'community',
    'planner',
    'services',
    'gpa_calculator',
    'result_checker',
    'announcements',
  ];

  List<DashboardSectionPref> _orderedSections(
      AsyncValue<DashboardPrefsBundle> prefs) {
    const fallback = ['services', 'resources', 'materials', 'community'];
    int rank(String key) {
      final i = _sectionOrder.indexOf(key);
      return i == -1 ? 100 : i;
    }

    return prefs.maybeWhen(
      data: (bundle) {
        final visible =
            bundle.sections.where((s) => s.visible).toList()
              ..sort((a, b) {
                final ka = rank(a.key);
                final kb = rank(b.key);
                if (ka != kb) return ka.compareTo(kb);
                return a.order.compareTo(b.order);
              });
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
        return _BannerPager(items: items, openLink: openLink);
      },
      orElse: () => const SizedBox.shrink(),
    );
  }

  Widget _resultOrNoticeBar(BuildContext context, WidgetRef ref) {
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
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                          colors: [DbColors.emerald, DbColors.emeraldDark]),
                      borderRadius: BorderRadius.circular(DbRadius.full),
                    ),
                    child: Text(
                      AppLocalizations.of(context)!.viewDetails,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
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

  Widget _welcomeCard(BuildContext context, User? user, HomeWelcome? welcome) {
    final l10n = AppLocalizations.of(context)!;
    final isBn = Localizations.localeOf(context).languageCode == 'bn';
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? l10n.goodMorning
        : hour < 17
            ? l10n.goodAfternoon
            : l10n.goodEvening;
    String adminMessage = '';
    if (welcome != null && welcome.visible) {
      adminMessage = isBn ? welcome.messageBn : welcome.messageEn;
      if (adminMessage.isEmpty) adminMessage = welcome.messageEn;
    }
    return Container(
      padding: const EdgeInsets.all(DbSpacing.md),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFF0FFF4), Color(0xFFBBF7D0)],
        ),
        borderRadius: BorderRadius.circular(DbRadius.card),
        boxShadow: DbShadows.card,
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                  colors: [DbColors.teal, DbColors.emerald]),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.person_rounded,
                color: Colors.white, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  user?.name?.isNotEmpty == true
                      ? '$greeting, ${user!.name}'
                      : greeting,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: DbColors.navy),
                ),
                const SizedBox(height: 2),
                Text(
                  adminMessage.isNotEmpty ? adminMessage : l10n.welcomeSubtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 12, color: DbColors.textSecondaryLight),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _quickAccessTile(BuildContext context, _QuickItem item) {
    return PressableScale(
      onTap: () => _openLink(context, item.route),
      child: Container(
        width: 88,
        padding: const EdgeInsets.all(DbSpacing.sm),
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
                color: item.bg,
                borderRadius: BorderRadius.circular(DbRadius.input),
              ),
              child: Icon(item.icon, color: item.fg, size: 22),
            ),
            const SizedBox(height: 6),
            Text(
              item.title,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  fontSize: 11, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }

  Widget _resourceCountTile(BuildContext context, _ResourceCardItem item) {
    return PressableScale(
      onTap: () => context.push(item.route),
      child: Container(
        padding: const EdgeInsets.all(DbSpacing.md),
        decoration: BoxDecoration(
          color: item.bg,
          borderRadius: BorderRadius.circular(DbRadius.card),
          boxShadow: DbShadows.card,
        ),
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.65),
                  borderRadius: BorderRadius.circular(DbRadius.input),
                ),
                child: Icon(item.icon, color: item.fg, size: 20),
              ),
              const SizedBox(height: 8),
              Text(item.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w700)),
              if (item.count > 0)
                Text(
                  '${item.count}',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: item.fg,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _communityUpdateCard(BuildContext context, HomeFeaturedPost post) {
    return PressableScale(
      onTap: () => context.push('/community/${post.id}'),
      child: Container(
        padding: const EdgeInsets.all(DbSpacing.md),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(DbRadius.card),
          boxShadow: DbShadows.card,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                        colors: [DbColors.teal, DbColors.emerald]),
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    post.authorName.isNotEmpty
                        ? post.authorName[0].toUpperCase()
                        : '?',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        post.authorName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontWeight: FontWeight.w700, fontSize: 13),
                      ),
                      if (post.createdAt != null)
                        Text(
                          _formatDate(post.createdAt!),
                          style: const TextStyle(
                              fontSize: 11,
                              color: DbColors.textSecondaryLight),
                        ),
                    ],
                  ),
                ),
                Icon(
                  Icons.thumb_up_alt_rounded,
                  size: 14,
                  color: DbColors.textSecondaryLight,
                ),
                const SizedBox(width: 4),
                Text('${post.likeCount}',
                    style: const TextStyle(fontSize: 12)),
                const SizedBox(width: 8),
                Icon(Icons.chat_bubble_rounded,
                    size: 14, color: DbColors.textSecondaryLight),
                const SizedBox(width: 4),
                Text('${post.commentCount}',
                    style: const TextStyle(fontSize: 12)),
              ],
            ),
            if (post.tags.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: DbColors.emerald.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(DbRadius.badge),
                  ),
                  child: Text(
                    post.tags.first,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: DbColors.emerald,
                    ),
                  ),
                ),
              ),
            const SizedBox(height: 8),
            Text(
              post.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
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

  String _pickTitle(bool isBn, String en, String bn) {
    if (isBn && bn.isNotEmpty) return bn;
    return en.isNotEmpty ? en : bn;
  }

  String _formatDate(DateTime date) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${date.day} ${months[date.month - 1]} ${date.year}';
  }

  Widget _homeContentErrorCard(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    return Card(
      child: ListTile(
        leading: const Icon(Icons.info_rounded, color: DbColors.warningLight),
        title: Text(l10n.errorNetwork),
        trailing: TextButton(
          onPressed: () => ref.invalidate(homeContentProvider),
          child: Text(l10n.retry),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final settings = ref.watch(appSettingsProvider);
    final recent = ref.watch(recentMaterialsProvider);
    final homeContent = ref.watch(homeContentProvider);
    final content = homeContent.asData?.value;
    final dashPrefs = ref.watch(dashboardPrefsProvider);
    final notices = ref.watch(publishedNoticesProvider('all'));
    final user = ref.watch(authControllerProvider).value;
    final isBn = Localizations.localeOf(context).languageCode == 'bn';

    Widget sectionWidget(String key) {
      switch (key) {
        case 'services':
          return const SizedBox.shrink();
        case 'resources':
          final resourceCards = <_ResourceCardItem>[
            for (final r in (content?.studyResources ?? const <HomeResource>[]))
              if (homeIconMap.containsKey(r.icon) &&
                  isHomeRouteAllowed(r.route) &&
                  parseHomeColor(r.bgColor) != null &&
                  parseHomeColor(r.fgColor) != null)
                _ResourceCardItem(
                    _pickTitle(isBn, r.titleEn, r.titleBn),
                    homeIconMap[r.icon]!,
                    r.count,
                    parseHomeColor(r.bgColor)!,
                    parseHomeColor(r.fgColor)!,
                    r.route),
          ];
          if (resourceCards.isEmpty) return const SizedBox.shrink();
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _sectionHeader(
                  context, l10n.studyResources, '/library',
                  (link) => _openLink(context, link)),
              SizedBox(
                height: 96,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: resourceCards.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 10),
                  itemBuilder: (context, i) => SizedBox(
                    width: 150,
                    child: _resourceCountTile(context, resourceCards[i]),
                  ),
                ),
              ),
            ],
          );
        case 'quick_access':
          final quickItems = <_QuickItem>[
            for (final q in (content?.quickAccess ?? const <HomeQuickItem>[]))
              if (homeIconMap.containsKey(q.icon) &&
                  isHomeRouteAllowed(q.route) &&
                  parseHomeColor(q.bgColor) != null &&
                  parseHomeColor(q.fgColor) != null)
                _QuickItem(
                    _pickTitle(isBn, q.titleEn, q.titleBn),
                    homeIconMap[q.icon]!,
                    q.route,
                    parseHomeColor(q.bgColor)!,
                    parseHomeColor(q.fgColor)!),
          ];
          if (quickItems.isEmpty) return const SizedBox.shrink();
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _sectionHeader(
                  context, l10n.quickAccess, '/library',
                  (link) => _openLink(context, link)),
              SizedBox(
                height: 108,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: quickItems.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 10),
                  itemBuilder: (context, i) =>
                      _quickAccessTile(context, quickItems[i]),
                ),
              ),
            ],
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
          final featured = content?.featuredPosts ?? const <HomeFeaturedPost>[];
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _sectionHeader(
                  context, l10n.communityUpdates, '/community',
                  (link) => _openLink(context, link)),
              if (featured.isNotEmpty)
                _communityUpdateCard(context, featured.first),
            ],
          );
        case 'exams':
          final exams = content?.upcomingExams ?? const <HomeExamItem>[];
          if (exams.isEmpty) return const SizedBox.shrink();
          final exam = exams.first;
          return PressableScale(
                onTap: () => context.push('/exams'),
                child: Container(
                  padding: const EdgeInsets.all(DbSpacing.md),
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardColor,
                    borderRadius: BorderRadius.circular(DbRadius.card),
                    boxShadow: DbShadows.card,
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                              colors: [DbColors.teal, DbColors.emerald]),
                          borderRadius:
                              BorderRadius.circular(DbRadius.input),
                        ),
                        child: const Icon(Icons.quiz_rounded,
                            color: Colors.white, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              exam.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              exam.scheduledAt != null
                                  ? _formatDate(exam.scheduledAt!)
                                  : exam.type,
                              style: const TextStyle(
                                fontSize: 12,
                                color: DbColors.textSecondaryLight,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: DbColors.infoLight,
                          borderRadius: BorderRadius.circular(DbRadius.full),
                        ),
                        child: Text(
                          AppLocalizations.of(context)!.viewDetails,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
        case 'gpa_calculator':
        case 'result_checker':
          return const SizedBox.shrink();
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
        continue;
      }
      final widget = sectionWidget(section.key);
      if (widget is! SizedBox) {
        sectionChildren
          ..add(widget)
          ..add(const SizedBox(height: 18));
      }
    }
    final showBanners =
        _orderedSections(dashPrefs).any((s) => s.key == 'announcements');

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: DbColors.navy,
        elevation: 0,
        scrolledUnderElevation: 0,
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
                style: const TextStyle(
                    fontWeight: FontWeight.w800, color: DbColors.navy),
              ),
            ),
          ],
        ),
        actions: [
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
          ref.invalidate(homeContentProvider);
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
            if (showBanners) ...[
              _bannersStrip(ref, (link) => _openLink(context, link)),
              const SizedBox(height: 12),
            ],
            _welcomeCard(context, user, content?.welcome),
            const SizedBox(height: 12),
            _resultOrNoticeBar(context, ref),
            const SizedBox(height: 12),
            _NoticeTicker(notices: notices),
            const SizedBox(height: 18),
            if (homeContent.hasError) ...[
              _homeContentErrorCard(context, ref),
              const SizedBox(height: 18),
            ],
            ...sectionChildren,
          ],
        ),
      ),
    );
  }
}

/// Reference-design admin banner slider: one banner per page with dot
/// indicators underneath, driven entirely by real admin-managed banners.
class _BannerPager extends StatefulWidget {
  final List<HomeBanner> items;
  final void Function(String) openLink;

  const _BannerPager({required this.items, required this.openLink});

  @override
  State<_BannerPager> createState() => _BannerPagerState();
}

class _BannerPagerState extends State<_BannerPager> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final items = widget.items;
    return Column(
      children: [
        SizedBox(
          height: 120,
          child: PageView.builder(
            itemCount: items.length,
            onPageChanged: (i) => setState(() => _index = i),
            itemBuilder: (context, i) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: 1),
              child: _BannerPage(
                banner: items[i],
                openLink: widget.openLink,
              ),
            ),
          ),
        ),
        if (items.length > 1)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var i = 0; i < items.length; i++)
                  AnimatedContainer(
                    duration: DbDurations.fast,
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    width: i == _index ? 18 : 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: i == _index
                          ? DbColors.emerald
                          : DbColors.borderStrongLight,
                      borderRadius: BorderRadius.circular(DbRadius.full),
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

class _BannerPage extends StatelessWidget {
  final HomeBanner banner;
  final void Function(String) openLink;

  const _BannerPage({required this.banner, required this.openLink});

  @override
  Widget build(BuildContext context) {
    return PressableScale(
      onTap: () => openLink(banner.linkUrl),
      child: Container(
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
              if (banner.title.isNotEmpty || banner.ctaLabel.isNotEmpty)
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
                          padding: const EdgeInsets.only(top: 4),
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
  }
}

class _ResourceCardItem {
  const _ResourceCardItem(this.title, this.icon, this.count, this.bg, this.fg, this.route);
  final String title;
  final IconData icon;
  final int count;
  final Color bg;
  final Color fg;
  final String route;
}

class _QuickItem {
  const _QuickItem(this.title, this.icon, this.route, this.bg, this.fg);
  final String title;
  final IconData icon;
  final String route;
  final Color bg;
  final Color fg;
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

  void _openTickerLink(BuildContext context, String linkUrl) {
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

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final settings = ref.watch(appSettingsProvider).value;
    final adminNotice = (settings != null &&
            settings.homeNoticeActive &&
            settings.homeNotice.text.isNotEmpty &&
            settings.homeNoticeShowInTicker)
        ? settings.homeNotice
        : null;
    final items = widget.notices.value ?? const <Notice>[];
    if (adminNotice == null && items.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(DbRadius.chip),
        border: Border.all(color: DbColors.borderLight),
        boxShadow: DbShadows.card,
      ),
      padding: const EdgeInsets.symmetric(horizontal: DbSpacing.sm),
      height: 40,
      child: Row(
        children: [
          GestureDetector(
            onTap: () => context.push('/notices'),
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: DbColors.emerald,
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
                      if (adminNotice != null)
                        Padding(
                          padding:
                              const EdgeInsets.symmetric(horizontal: 6),
                          child: GestureDetector(
                            onTap: () =>
                                _openTickerLink(context, adminNotice.link),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.campaign_rounded,
                                    size: 13, color: DbColors.emerald),
                                const SizedBox(width: 4),
                                Text(
                                  adminNotice.text,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: DbColors.textPrimaryLight),
                                ),
                                const SizedBox(width: 6),
                                const Text('\u2022',
                                    style: TextStyle(
                                        color: DbColors.textSecondaryLight)),
                              ],
                            ),
                          ),
                        ),
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
                                  color: DbColors.emerald,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  notice.title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: DbColors.textPrimaryLight),
                                ),
                                const SizedBox(width: 6),
                                const Text('•',
                                    style: TextStyle(
                                        color: DbColors.textSecondaryLight)),
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
