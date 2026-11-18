import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

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
import '../../features/gpa/screens/semester_gpa_screen.dart';
import '../../features/gpa/screens/target_screen.dart';
import '../../features/home/screens/home_screen.dart';
import '../../features/library/screens/library_screen.dart';
import '../../features/results/screens/result_checker_screen.dart';
import '../../features/library/screens/material_detail_screen.dart';
import '../../features/notifications/screens/notifications_screen.dart';
import '../../features/planner/screens/planner_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../features/settings/providers/app_preferences.dart';
import '../../features/settings/screens/settings_screen.dart';
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
        builder: (context, state) => const SizedBox.shrink(),
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
        path: '/gpa/semester',
        builder: (context, state) => const SemesterGpaScreen(),
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
        path: '/gpa/target',
        builder: (context, state) => const TargetScreen(),
      ),
      GoRoute(
        path: '/results/checker',
        builder: (context, state) => const ResultCheckerScreen(),
      ),
      GoRoute(
        path: '/planner',
        builder: (context, state) => const PlannerScreen(),
      ),
      GoRoute(
        path: '/community',
        builder: (context, state) => const CommunityScreen(),
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
        path: '/notifications',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const NotificationsScreen(),
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
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/exams',
              builder: (context, state) => const ExamCenterScreen(),
              routes: [
                GoRoute(
                  path: ':id',
                  builder: (context, state) =>
                      ExamDetailScreen(examId: state.pathParameters['id']!),
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/gpa',
              builder: (context, state) => const GpaHubScreen(),
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

class _ShellScaffold extends StatelessWidget {
  final StatefulNavigationShell shell;

  const _ShellScaffold({required this.shell});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: shell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: shell.currentIndex,
        onDestinationSelected: (i) => shell.goBranch(
          i,
          initialLocation: i == shell.currentIndex,
        ),
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.home_outlined),
            selectedIcon: const Icon(Icons.home_rounded),
            label: AppLocalizations.of(context)!.home,
          ),
          NavigationDestination(
            icon: const Icon(Icons.menu_book_outlined),
            selectedIcon: const Icon(Icons.menu_book_rounded),
            label: AppLocalizations.of(context)!.library,
          ),
          NavigationDestination(
            icon: const Icon(Icons.quiz_outlined),
            selectedIcon: const Icon(Icons.quiz_rounded),
            label: AppLocalizations.of(context)!.exams,
          ),
          NavigationDestination(
            icon: const Icon(Icons.calculate_outlined),
            selectedIcon: const Icon(Icons.calculate_rounded),
            label: AppLocalizations.of(context)!.gpa,
          ),
          NavigationDestination(
            icon: const Icon(Icons.person_outlined),
            selectedIcon: const Icon(Icons.person_rounded),
            label: AppLocalizations.of(context)!.profile,
          ),
        ],
      ),
    );
  }
}
