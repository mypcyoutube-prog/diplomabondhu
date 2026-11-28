import 'dart:async';

import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../auth/data/user.dart';
import '../../auth/providers/auth_controller.dart';
import '../../community/data/community_models.dart';
import '../../community/providers/community_providers.dart';
import '../../dashboard_customize/data/dashboard_prefs_repository.dart';
import '../../dashboard_customize/providers/dashboard_prefs_providers.dart';
import '../../exams/providers/exam_providers.dart';
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

  /// One-line bar under the welcome card: during an admin-configured result
  /// window the student's own roll + registration are verified automatically;
  /// otherwise the admin notice takes the same slot.
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

  Widget _welcomeCard(BuildContext context, User? user) {
    final l10n = AppLocalizations.of(context)!;
    return Container(
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
              borderRadius: BorderRadius.circular(DbRadius.input),
            ),
            child: const Icon(Icons.school_rounded,
                color: Colors.white, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  user?.name ?? '',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 2),
                Text(
                  l10n.welcomeSubtitle,
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

  Widget _quickAccessTile(
      BuildContext context, String title, IconData icon, String route) {
    return PressableScale(
      onTap: () => _openLink(context, route),
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
                gradient: const LinearGradient(
                    colors: [DbColors.teal, DbColors.emerald]),
                borderRadius: BorderRadius.circular(DbRadius.input),
              ),
              child: Icon(icon, color: Colors.white, size: 22),
            ),
            const SizedBox(height: 6),
            Text(
              title,
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

  Widget _resourceCountTile(
      BuildContext context, String title, IconData icon, int count) {
    return PressableScale(
      onTap: () => context.push('/library'),
      child: Container(
        padding: const EdgeInsets.all(DbSpacing.md),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(DbRadius.card),
          boxShadow: DbShadows.card,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                    colors: [DbColors.teal, DbColors.emerald]),
                borderRadius: BorderRadius.circular(DbRadius.input),
              ),
              child: Icon(icon, color: Colors.white, size: 20),
            ),
            const SizedBox(height: 8),
            Text(title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w700)),
            if (count > 0)
              Text(
                '$count',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: DbColors.teal,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _communityUpdateCard(BuildContext context, Post post) {
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
                  child: Text(
                    post.authorName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 13),
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

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final settings = ref.watch(appSettingsProvider);
    final recent = ref.watch(recentMaterialsProvider);
    final resourceCounts = ref.watch(resourceCountsProvider);
    final examList = ref.watch(examListControllerProvider);
    final communityFeed = ref.watch(communityFeedProvider);
    final dashPrefs = ref.watch(dashboardPrefsProvider);
    final notices = ref.watch(publishedNoticesProvider('all'));
    final user = ref.watch(authControllerProvider).value;

    Widget sectionWidget(String key) {
      switch (key) {
        case 'services':
          return const SizedBox.shrink();
        case 'resources':
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _sectionHeader(
                  context, l10n.studyResources, '/library',
                  (link) => _openLink(context, link)),
              resourceCounts.maybeWhen(
                data: (counts) {
                  final cards = <_ResourceCardItem>[
                    _ResourceCardItem(l10n.books, Icons.auto_stories_rounded,
                        counts['book'] ?? 0),
                    _ResourceCardItem(l10n.notes, Icons.edit_note_rounded,
                        counts['note'] ?? 0),
                    _ResourceCardItem(l10n.videos, Icons.play_circle_rounded,
                        counts['video'] ?? 0),
                    _ResourceCardItem(l10n.subjectMaterials,
                        Icons.folder_special_rounded,
                        counts['subject_material'] ?? 0),
                  ];
                  return SizedBox(
                    height: 96,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: cards.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 10),
                      itemBuilder: (context, i) => SizedBox(
                        width: 150,
                        child: _resourceCountTile(context, cards[i].title,
                            cards[i].icon, cards[i].count),
                      ),
                    ),
                  );
                },
                orElse: () => const SizedBox.shrink(),
              ),
            ],
          );
        case 'quick_access':
          final quickItems = <_QuickItem>[
            _QuickItem(l10n.studyTab, Icons.menu_book_rounded, '/library'),
            _QuickItem(l10n.examCenter, Icons.quiz_rounded, '/exams'),
            _QuickItem(l10n.cgpa, Icons.functions_rounded, '/gpa/cgpa'),
            _QuickItem(l10n.community, Icons.groups_rounded, '/community'),
            _QuickItem(l10n.notices, Icons.campaign_rounded, '/notices'),
          ];
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
                  itemBuilder: (context, i) => _quickAccessTile(
                      context, quickItems[i].title, quickItems[i].icon,
                      quickItems[i].route),
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
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _sectionHeader(
                  context, l10n.communityUpdates, '/community',
                  (link) => _openLink(context, link)),
              communityFeed.maybeWhen(
                data: (posts) {
                  if (posts.isEmpty) return const SizedBox.shrink();
                  final post = posts.first;
                  return _communityUpdateCard(context, post);
                },
                orElse: () => const SizedBox.shrink(),
              ),
            ],
          );
        case 'exams':
          return examList.maybeWhen(
            data: (page) {
              if (page.items.isEmpty) return const SizedBox.shrink();
              final exam = page.items.first;
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
                              '${exam.questionCount} ${l10n.questionsLabel}',
                              style: const TextStyle(
                                fontSize: 12,
                                color: DbColors.textSecondaryLight,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded,
                          color: DbColors.textSecondaryLight),
                    ],
                  ),
                ),
              );
            },
            orElse: () => const SizedBox.shrink(),
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
            _welcomeCard(context, user),
            const SizedBox(height: 12),
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

class _ResourceCardItem {
  const _ResourceCardItem(this.title, this.icon, this.count);
  final String title;
  final IconData icon;
  final int count;
}

class _QuickItem {
  const _QuickItem(this.title, this.icon, this.route);
  final String title;
  final IconData icon;
  final String route;
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
                                    size: 13, color: DbColors.teal),
                                const SizedBox(width: 4),
                                Text(
                                  adminNotice.text,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(width: 6),
                                Text('\u2022',
                                    style: TextStyle(
                                        color: Theme.of(context)
                                            .colorScheme
                                            .onSurfaceVariant)),
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
