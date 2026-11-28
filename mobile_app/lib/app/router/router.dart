import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/theme.dart';
import '../../features/auth/providers/auth_controller.dart';
import '../../features/auth/screens/forgot_password_screen.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/onboarding_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/auth/screens/splash_screen.dart';
import '../../features/community/screens/community_screen.dart';
import '../../features/community/screens/post_composer_screen.dart';
import '../../features/community/screens/post_detail_screen.dart';
import '../../features/exams/screens/exam_center_screen.dart';
import '../../features/exams/screens/exam_detail_screen.dart';
import '../../features/exams/screens/exam_result_screen.dart';
import '../../features/exams/screens/exam_runner_screen.dart';
import '../../features/gpa/screens/cgpa_screen.dart';
import '../../features/gpa/screens/gpa_history_screen.dart';
import '../../features/gpa/screens/gpa_hub_screen.dart';
import '../../features/home/screens/home_screen.dart';
import '../../features/library/screens/bookmarks_screen.dart';
import '../../features/library/screens/library_screen.dart';
import '../../features/results/screens/result_checker_screen.dart';
import '../../features/results/screens/result_tab_screen.dart';
import '../../features/notices/screens/notices_screen.dart';
import '../../features/notices/screens/notice_detail_screen.dart';
import '../../features/library/screens/material_detail_screen.dart';
import '../../features/library/screens/pdf_viewer_screen.dart';
import '../../features/notifications/screens/notifications_screen.dart';
import '../../features/search/screens/search_screen.dart';
import '../../features/planner/screens/planner_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../features/settings/providers/app_preferences.dart';
import '../../features/settings/screens/settings_screen.dart';
import '../../features/subjects/screens/subject_catalog_screen.dart';
import '../../features/commandcenter/screens/command_center_screen.dart';
import '../../features/dashboard_customize/screens/dashboard_customize_screen.dart';
import '../../features/export/screens/export_screen.dart';
import '../../features/studyplan/screens/study_plan_screen.dart';
import '../../features/sync/screens/sync_devices_screen.dart';
import '../../features/workspace/screens/workspace_screen.dart';
import '../../features/subjects/screens/technology_subjects_screen.dart';
import '../l10n/generated/app_localizations.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');

class _AuthRefreshListenable extends ChangeNotifier {
  _AuthRefreshListenable(Ref ref) {
    ref.listen(authControllerProvider, (_, _) => notifyListeners());
  }
}

final rootRouterProvider = Provider<GoRouter>((ref) {
  final refreshListenable = _AuthRefreshListenable(ref);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/splash',
    refreshListenable: refreshListenable,
    redirect: (context, state) {
      final status = ref.read(authStatusProvider);
      final prefs = ref.read(appPreferencesProvider);
      final loc = state.matchedLocation;
      final isGuestRoute = loc == '/splash' ||
          loc == '/resolve' ||
          loc == '/onboarding' ||
          loc == '/login' ||
          loc == '/register' ||
          loc == '/forgot-password';

      if (status == AuthStatus.unknown) {
        return loc == '/splash' || loc == '/resolve' ? null : '/splash';
      }
      if (!prefs.onboardingComplete) {
        return loc == '/onboarding' ? null : '/onboarding';
      }
      if (status == AuthStatus.unauthenticated) {
        if (loc == '/splash' || loc == '/resolve') return '/login';
        return isGuestRoute ? null : '/login';
      }
      if (isGuestRoute) return '/home';
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/resolve',
        builder: (context, state) => const _ResolveScreen(),
      ),
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/forgot-password',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/exams',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const ExamCenterScreen(),
      ),
      GoRoute(
        path: '/exams/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) =>
            ExamDetailScreen(examId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/gpa',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const GpaHubScreen(),
      ),
      GoRoute(
        path: '/exams/:id/run',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) =>
            ExamRunnerScreen(examId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/exams/result/:attemptId',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) =>
            ExamResultScreen(attemptId: state.pathParameters['attemptId']!),
      ),
      GoRoute(
        path: '/gpa/cgpa',
        builder: (context, state) => const CgpaScreen(),
      ),
      GoRoute(
        path: '/gpa/history',
        builder: (context, state) => const GpaHistoryScreen(),
      ),
      GoRoute(
        path: '/results/checker',
        builder: (context, state) => const ResultCheckerScreen(),
      ),
      GoRoute(
        path: '/subjects',
        builder: (context, state) => const SubjectCatalogScreen(),
      ),
      GoRoute(
        path: '/subjects/:slug',
        builder: (context, state) => TechnologySubjectsScreen(
          technologySlug: state.pathParameters['slug']!,
          regulation: int.tryParse(state.uri.queryParameters['reg'] ?? '') ?? 2022,
          technologyName:
              state.uri.queryParameters['name'] ?? state.pathParameters['slug']!,
        ),
      ),
      GoRoute(
        path: '/planner',
        builder: (context, state) => const PlannerScreen(),
      ),
      GoRoute(
        path: '/notices',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const NoticesScreen(),
      ),
      GoRoute(
        path: '/notices/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) =>
            NoticeDetailScreen(noticeId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/community/new',
        builder: (context, state) => const PostComposerScreen(),
      ),
      GoRoute(
        path: '/community/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) =>
            PostDetailScreen(postId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/bookmarks',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const BookmarksScreen(),
      ),
      GoRoute(
        path: '/search',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => SearchScreen(
          initialQuery: state.uri.queryParameters['q'] ?? '',
        ),
      ),
      GoRoute(
        path: '/notifications',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const NotificationsScreen(),
      ),
      GoRoute(
        path: '/workspace',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const WorkspaceScreen(),
      ),
      GoRoute(
        path: '/dashboard-customize',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const DashboardCustomizeScreen(),
      ),
      GoRoute(
        path: '/export',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const ExportScreen(),
      ),
      GoRoute(
        path: '/study-plan',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const StudyPlanScreen(),
      ),
      GoRoute(
        path: '/commands',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const CommandCenterScreen(),
      ),
      GoRoute(
        path: '/sync-devices',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const SyncDevicesScreen(),
      ),
      GoRoute(
        path: '/settings',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const SettingsScreen(),
      ),
      StatefulShellRoute.indexedStack(
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state, shell) => _ShellScaffold(shell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/home',
              builder: (context, state) => const HomeScreen(),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/library',
              builder: (context, state) => const LibraryScreen(),
              routes: [
                GoRoute(
                  path: ':id',
                  builder: (context, state) => MaterialDetailScreen(
                    materialId: state.pathParameters['id']!,
                  ),
                  routes: [
                    GoRoute(
                      path: 'preview',
                      parentNavigatorKey: _rootNavigatorKey,
                      builder: (context, state) => PdfViewerScreen(
                        materialId: state.pathParameters['id']!,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/results',
              builder: (context, state) => const ResultTabScreen(),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/community',
              builder: (context, state) => const CommunityScreen(),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/profile',
              builder: (context, state) => const ProfileScreen(),
            ),
          ]),
        ],
      ),
    ],
  );
});

/// Placeholder while the session is being restored. Never blank: shows the
/// brand background with a spinner so a stuck restore is always visible.
class _ResolveScreen extends StatelessWidget {
  const _ResolveScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: DbColors.navy,
      body: Center(
        child: CircularProgressIndicator(color: Colors.white),
      ),
    );
  }
}

class _ShellScaffold extends StatelessWidget {
  final StatefulNavigationShell shell;

  const _ShellScaffold({required this.shell});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final currentIndex = shell.currentIndex;

    Widget tab({
      required int branchIndex,
      required IconData icon,
      required IconData activeIcon,
      required String label,
    }) {
      final selected = currentIndex == branchIndex;
      return Expanded(
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () => shell.goBranch(
            branchIndex,
            initialLocation: branchIndex == currentIndex,
          ),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.symmetric(vertical: 6),
            decoration: BoxDecoration(
              color: selected
                  ? DbColors.emerald.withValues(alpha: 0.12)
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(DbRadius.full),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  selected ? activeIcon : icon,
                  color: selected ? DbColors.emerald : DbColors.textSecondaryLight,
                  size: 22,
                ),
                const SizedBox(height: 2),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: selected
                        ? DbColors.emerald
                        : DbColors.textSecondaryLight,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      body: shell,
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          margin: const EdgeInsets.fromLTRB(12, 4, 12, 8),
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(DbRadius.card + 6),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 18,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Row(
            children: [
              tab(
                branchIndex: 0,
                icon: Icons.home_outlined,
                activeIcon: Icons.home_rounded,
                label: l10n.home,
              ),
              tab(
                branchIndex: 1,
                icon: Icons.menu_book_outlined,
                activeIcon: Icons.menu_book_rounded,
                label: l10n.studyTab,
              ),
              GestureDetector(
                onTap: () => context.push('/community/new'),
                child: Container(
                  width: 54,
                  height: 44,
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                        colors: [DbColors.emerald, DbColors.emeraldDark]),
                    borderRadius: BorderRadius.circular(DbRadius.input + 2),
                    boxShadow: [
                      BoxShadow(
                        color: DbColors.emerald.withValues(alpha: 0.35),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.add_rounded,
                      color: Colors.white, size: 26),
                ),
              ),
              tab(
                branchIndex: 3,
                icon: Icons.groups_outlined,
                activeIcon: Icons.groups_rounded,
                label: l10n.community,
              ),
              tab(
                branchIndex: 4,
                icon: Icons.person_outlined,
                activeIcon: Icons.person_rounded,
                label: l10n.profile,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
