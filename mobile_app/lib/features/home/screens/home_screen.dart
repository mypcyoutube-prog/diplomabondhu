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
import '../../../shared/widgets/async_value_view.dart';
import '../../../shared/widgets/states.dart';
import '../providers/home_providers.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  List<DashboardSectionPref> _orderedSections(
      AsyncValue<DashboardPrefsBundle> prefs) {
    const fallback = ['quick_access', 'materials', 'community', 'result_checker'];
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

  Widget _bannersStrip(WidgetRef ref) {
    final banners = ref.watch(homeBannersProvider);
    return banners.maybeWhen(
      data: (items) {
        if (items.isEmpty) return const SizedBox.shrink();
        return SizedBox(
          height: 120,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: items.length,
            separatorBuilder: (_, _) => const SizedBox(width: 8),
            itemBuilder: (context, i) {
              final banner = items[i];
              return GestureDetector(
                onTap: () => _openBanner(context, banner.linkUrl),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(DbRadius.card),
                  child: SizedBox(
                    width: 280,
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

  void _openBanner(BuildContext context, String linkUrl) {
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
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final user = ref.watch(authControllerProvider).value;
    final settings = ref.watch(appSettingsProvider);
    final recent = ref.watch(recentMaterialsProvider);
    final dashPrefs = ref.watch(dashboardPrefsProvider);
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? l10n.goodMorning
        : hour < 17
            ? l10n.goodAfternoon
            : l10n.goodEvening;

    final quickAccess = <(String, IconData, String)>[
      (l10n.library, Icons.menu_book_rounded, '/library'),
      (l10n.exams, Icons.quiz_rounded, '/exams'),
      (l10n.cgpa, Icons.functions_rounded, '/gpa'),
      (l10n.planner, Icons.event_note_rounded, '/planner'),
    ];

    Widget sectionWidget(String key) {
      switch (key) {
        case 'announcements':
          return Card(
            child: ListTile(
              onTap: () => context.push('/notifications'),
              leading: const Icon(Icons.campaign_rounded, color: DbColors.teal),
              title: Text(l10n.notifications),
              trailing: const Icon(Icons.chevron_right_rounded),
            ),
          );
        case 'quick_access':
          return GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 1.6,
            children: quickAccess
                .map((item) => Card(
                      child: InkWell(
                        borderRadius: BorderRadius.circular(DbRadius.card),
                        onTap: () => context.push(item.$3),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(item.$2, color: DbColors.teal, size: 28),
                              const SizedBox(height: 6),
                              Text(item.$1,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                      ),
                    ))
                .toList(),
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
          return OutlinedButton(
            onPressed: () => context.push('/community'),
            child: Text(l10n.community),
          );
        case 'result_checker':
          return settings.maybeWhen(
            data: (s) => s.resultCheckerVisible
                ? Card(
                    color: DbColors.navy,
                    child: ListTile(
                      onTap: () => context.push('/results/checker'),
                      leading: const Icon(Icons.verified_rounded,
                          color: DbColors.emeraldDark),
                      title: Text(l10n.resultChecker,
                          style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700)),
                      subtitle: Text(l10n.resultCheckerSubtitle,
                          style: const TextStyle(color: Colors.white70)),
                      trailing: const Icon(Icons.chevron_right_rounded,
                          color: Colors.white70),
                    ),
                  )
                : const SizedBox.shrink(),
            orElse: () => const SizedBox.shrink(),
          );
      }
      return const SizedBox.shrink();
    }

    final sectionChildren = <Widget>[];
    for (final section in _orderedSections(dashPrefs)) {
      final widget = sectionWidget(section.key);
      if (widget is! SizedBox || section.key == 'result_checker') {
        sectionChildren
          ..add(widget)
          ..add(const SizedBox(height: 16));
      }
      if (section.key == 'announcements') {
        sectionChildren
          ..add(_bannersStrip(ref))
          ..add(const SizedBox(height: 16));
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('$greeting, ${user?.name ?? ''} \ud83d\udc4b'),
        actions: [
          IconButton(
            tooltip: l10n.commandCenterTitle,
            icon: const Icon(Icons.grid_view_rounded),
            onPressed: () => context.push('/commands'),
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
            Card(
              child: ListTile(
                leading: const Icon(Icons.school_rounded, color: DbColors.navy),
                title: Text(l10n.academicInfo),
                subtitle: Text(user?.academic == null ? '-' : '...'),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                hintText: l10n.searchHint,
                prefixIcon: const Icon(Icons.search_rounded),
              ),
              onSubmitted: (q) {
                final query = q.trim();
                if (query.length < 2) return;
                context.push('/search?q=${Uri.encodeComponent(query)}');
              },
            ),
            const SizedBox(height: 16),
            ...sectionChildren,
          ],
        ),
      ),
    );
  }
}
