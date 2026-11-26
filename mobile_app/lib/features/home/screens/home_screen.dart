import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../auth/providers/auth_controller.dart';
import '../../library/providers/library_providers.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../../../shared/widgets/states.dart';
import '../providers/home_providers.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final user = ref.watch(authControllerProvider).value;
    final settings = ref.watch(appSettingsProvider);
    final recent = ref.watch(recentMaterialsProvider);
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? l10n.goodMorning
        : hour < 17
            ? l10n.goodAfternoon
            : l10n.goodEvening;

    final quickAccess = <(String, IconData, String)>[
      (l10n.library, Icons.menu_book_rounded, '/library'),
      (l10n.exams, Icons.quiz_rounded, '/exams'),
      (l10n.gpa, Icons.calculate_rounded, '/gpa'),
      (l10n.planner, Icons.event_note_rounded, '/planner'),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text('$greeting, ${user?.name ?? ''} 👋'),
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
            DbSectionHeader(title: l10n.quickAccess),
            GridView.count(
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
                                    style: const TextStyle(fontWeight: FontWeight.w600)),
                              ],
                            ),
                          ),
                        ),
                      ))
                  .toList(),
            ),
            const SizedBox(height: 16),
            settings.maybeWhen(
              data: (s) => s.resultCheckerVisible
                  ? Card(
                      color: DbColors.navy,
                      child: ListTile(
                        onTap: () => context.push('/results/checker'),
                        leading: const Icon(Icons.verified_rounded, color: DbColors.emeraldDark),
                        title: Text(l10n.resultChecker,
                            style: const TextStyle(
                                color: Colors.white, fontWeight: FontWeight.w700)),
                        subtitle: Text(l10n.resultCheckerSubtitle,
                            style: const TextStyle(color: Colors.white70)),
                        trailing: const Icon(Icons.chevron_right_rounded, color: Colors.white70),
                      ),
                    )
                  : const SizedBox.shrink(),
              orElse: () => const SizedBox.shrink(),
            ),
            const SizedBox(height: 16),
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
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                        ),
                        onTap: () => context.push('/library/${materials[i].id}'),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: () => context.push('/community'),
              child: Text(l10n.community),
            ),
          ],
        ),
      ),
    );
  }
}
