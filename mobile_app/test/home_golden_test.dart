import 'dart:io';
import 'dart:ui' show loadFontFromList;

import 'package:diplomabondhu/app/l10n/generated/app_localizations.dart';
import 'package:diplomabondhu/app/theme/theme.dart';
import 'package:diplomabondhu/features/auth/data/user.dart';
import 'package:diplomabondhu/features/auth/providers/auth_controller.dart';
import 'package:diplomabondhu/features/dashboard_customize/data/dashboard_prefs_repository.dart';
import 'package:diplomabondhu/features/dashboard_customize/providers/dashboard_prefs_providers.dart';
import 'package:diplomabondhu/features/home/data/home_content.dart';
import 'package:diplomabondhu/features/home/providers/home_providers.dart';
import 'package:diplomabondhu/features/home/screens/home_screen.dart';
import 'package:diplomabondhu/features/library/data/material.dart' as model;
import 'package:diplomabondhu/features/library/providers/library_providers.dart';
import 'package:diplomabondhu/features/notices/data/notice.dart';
import 'package:diplomabondhu/features/notices/providers/notice_providers.dart';
import 'package:diplomabondhu/features/results/data/result.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// Renders the Home screen with representative (test-fixture) data through
/// the real Flutter renderer and writes a golden PNG so the running UI can be
/// visually compared against the official reference design.
///
/// Run with:
///   flutter test test/home_golden_test.dart --update-goldens
///
/// The fixture data below exists ONLY inside this test to exercise every
/// section's rendering — the app itself renders strictly DB-driven content.

class _FakeAuthController extends AuthController {
  @override
  Future<User?> build() async => const User(
        id: 'u1',
        name: 'Md. Hasan Mahmud',
        email: 'hasan@example.com',
        role: 'student',
        status: 'active',
        prefs: UserPrefs(language: 'en', theme: 'light'),
        academic: UserAcademicInfo(roll: '123456'),
      );
}

AppSettingsData _settings() => AppSettingsData(
      appName: 'DiplomaBondhu',
      homepageSections: const [],
      featureFlags: const {},
      maintenanceMode: false,
      supportInfo: const {},
      resultDisplay: (
        enabled: true,
        examId: 'exam-1',
        startsAt: DateTime.now().subtract(const Duration(days: 1)),
        endsAt: DateTime.now().add(const Duration(days: 30)),
      ),
      homeNotice: (
        text: 'Semester registration deadline is 15 January',
        link: '/notices',
        visible: true,
        startsAt: null,
        endsAt: null,
      ),
      homeNoticeShowInTicker: true,
      libraryCategories: (
        book: true,
        note: true,
        video: true,
        subjectMaterial: true,
        pastQuestion: true,
      ),
    );

final _content = HomeContent(
  quickAccess: [
    HomeQuickItem(
      slug: 'quick-materials',
      titleEn: 'Study Materials',
      titleBn: 'স্টাডি ম্যাটেরিয়াল',
      subtitleEn: '',
      subtitleBn: '',
      icon: 'menu_book_rounded',
      route: '/library',
      bgColor: '#D1FAE5',
      fgColor: '#059669',
      displayOrder: 1,
    ),
    HomeQuickItem(
      slug: 'quick-syllabus',
      titleEn: 'Syllabus',
      titleBn: 'সিলেবাস',
      subtitleEn: '',
      subtitleBn: '',
      icon: 'description_rounded',
      route: '/syllabus',
      bgColor: '#DBEAFE',
      fgColor: '#1D4ED8',
      displayOrder: 2,
    ),
    HomeQuickItem(
      slug: 'quick-past-questions',
      titleEn: 'Previous Questions',
      titleBn: 'পূর্ববর্তী প্রশ্ন',
      subtitleEn: '',
      subtitleBn: '',
      icon: 'quiz_rounded',
      route: '/exams',
      bgColor: '#EDE9FE',
      fgColor: '#6D28D9',
      displayOrder: 3,
    ),
    HomeQuickItem(
      slug: 'quick-cgpa',
      titleEn: 'CGPA Calculator',
      titleBn: 'সিজিপিএ ক্যালকুলেটর',
      subtitleEn: '',
      subtitleBn: '',
      icon: 'calculate_rounded',
      route: '/gpa/cgpa',
      bgColor: '#FEF3C7',
      fgColor: '#B45309',
      displayOrder: 4,
    ),
    HomeQuickItem(
      slug: 'quick-community',
      titleEn: 'Community',
      titleBn: 'কমিউনিটি',
      subtitleEn: '',
      subtitleBn: '',
      icon: 'groups_rounded',
      route: '/community',
      bgColor: '#FCE7F3',
      fgColor: '#BE185D',
      displayOrder: 5,
    ),
  ],
  studyResources: [
    HomeResource(
      slug: 'resource-notes',
      titleEn: 'Notes',
      titleBn: 'নোট',
      icon: 'edit_note_rounded',
      route: '/library',
      bgColor: '#D1FAE5',
      fgColor: '#059669',
      materialTypes: ['note'],
      displayOrder: 1,
      count: 245,
    ),
    HomeResource(
      slug: 'resource-collections',
      titleEn: 'Collections',
      titleBn: 'কালেকশন',
      icon: 'folder_special_rounded',
      route: '/library',
      bgColor: '#EDE9FE',
      fgColor: '#6D28D9',
      materialTypes: ['subject_material'],
      displayOrder: 2,
      count: 120,
    ),
    HomeResource(
      slug: 'resource-past-papers',
      titleEn: 'Past Papers',
      titleBn: 'পাস্ট পেপার',
      icon: 'history_edu_rounded',
      route: '/library',
      bgColor: '#DBEAFE',
      fgColor: '#1D4ED8',
      materialTypes: ['past_question'],
      displayOrder: 3,
      count: 86,
    ),
    HomeResource(
      slug: 'resource-videos',
      titleEn: 'Video Lectures',
      titleBn: 'ভিডিও লেকচার',
      icon: 'play_circle_rounded',
      route: '/library',
      bgColor: '#FFEDD5',
      fgColor: '#C2410C',
      materialTypes: ['video'],
      displayOrder: 4,
      count: 64,
    ),
  ],
  notices: [],
  upcomingExams: [
    HomeExamItem(
      id: 'e1',
      title: 'Mathematics',
      description: '2nd Semester (Regular)',
      type: 'final',
      durationSec: 3600,
      scheduledAt: DateTime(2026, 1, 20, 10, 0),
    ),
  ],
  featuredPosts: [
    HomeFeaturedPost(
      id: 'p1',
      title: 'How to prepare for the 3rd semester final exam',
      body: '',
      tags: ['Study Tips'],
      type: 'discussion',
      likeCount: 24,
      commentCount: 6,
      authorName: 'Rakib Hasan',
      createdAt: DateTime(2026, 1, 12, 9, 30),
    ),
  ],
  welcome: HomeWelcome(
    messageEn: 'Your diploma life, one platform',
    messageBn: 'তোমার ডিপ্লোমা জীবন, এক প্ল্যাটফর্মে',
    visible: true,
  ),
);

List<Notice> _notices() => const [
      Notice(
        id: 'n1',
        title: 'BTEB নতুন রিজাল্টি প্রকাশ করেছে',
        body: '',
        category: 'announcement',
        source: 'bteb',
      ),
    ];

Future<void> _loadFonts() async {
  final home = Platform.environment['HOME'] ??
      Platform.environment['USERPROFILE'] ??
      '';
  final cacheRoot = Platform.isWindows && home.isNotEmpty
      ? home.replaceFirst(RegExp(r'[/\\]+$'), '')
      : home;
  final fontDir = cacheRoot.isNotEmpty
      ? '$cacheRoot/flutter_sdk/flutter/bin/cache/artifacts/material_fonts'
      : '';
  Future<void> load(String file, String family) async {
    final f = File('$fontDir/$file');
    if (await f.exists()) {
      await loadFontFromList(await f.readAsBytes(), fontFamily: family);
    }
  }

  await load('Roboto-Regular.ttf', 'Roboto');
  await load('Roboto-Medium.ttf', 'RobotoMedium');
  await load('Roboto-Bold.ttf', 'RobotoBold');
  await load('MaterialIcons-Regular.otf', 'MaterialIcons');
}

bool _fontCacheAvailable() {
  final home = Platform.environment['HOME'] ??
      Platform.environment['USERPROFILE'] ??
      '';
  if (home.isEmpty) return false;
  return File(
          '$home/flutter_sdk/flutter/bin/cache/artifacts/material_fonts/Roboto-Regular.ttf')
      .existsSync();
}

void main() {
  setUpAll(() async {
    if (_fontCacheAvailable()) {
      await _loadFonts();
    }
  });

  testWidgets('home renders reference layout with representative data',
      (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appSettingsProvider.overrideWithValue(AsyncValue.data(_settings())),
          homeContentProvider.overrideWithValue(AsyncValue.data(_content)),
          homeBannersProvider.overrideWithValue(AsyncValue.data(<HomeBanner>[])),
          homeResultProvider.overrideWithValue(AsyncValue.data(ResultRecord(
            examId: 'exam-1',
            roll: '123456',
            cgpa: 3.75,
            disclaimer: '',
          ))),
          recentMaterialsProvider
              .overrideWithValue(AsyncValue.data(<model.Material>[])),
          dashboardPrefsProvider.overrideWithValue(AsyncValue.data(
              DashboardPrefsBundle(
            customized: false,
            sections: const [
              DashboardSectionPref(key: 'exams', visible: true, order: 10),
              DashboardSectionPref(
                  key: 'quick_access', visible: true, order: 20),
              DashboardSectionPref(key: 'resources', visible: true, order: 40),
              DashboardSectionPref(key: 'community', visible: true, order: 50),
            ],
          ))),
          publishedNoticesProvider
              .overrideWith((ref, source) async => _notices()),
          authControllerProvider.overrideWith(_FakeAuthController.new),
        ],
        child: MaterialApp(
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: [
            AppLocalizations.delegate,
            ...GlobalMaterialLocalizations.delegates,
          ],
          locale: const Locale('en'),
          theme: buildLightTheme(),
          home: Scaffold(
            backgroundColor: DbColors.backgroundLight,
            appBar: AppBar(
              backgroundColor: Colors.white,
              foregroundColor: DbColors.navy,
              elevation: 0,
              title: const Text('DiplomaBondhu',
                  style: TextStyle(fontWeight: FontWeight.w800)),
              actions: const [
                Icon(Icons.notifications_rounded),
                SizedBox(width: 8),
                Icon(Icons.person_rounded),
                SizedBox(width: 12),
              ],
            ),
            body: const HomeScreen(),
            bottomNavigationBar: NavigationBar(
              selectedIndex: 0,
              destinations: const [
                NavigationDestination(
                  icon: Icon(Icons.home_outlined),
                  selectedIcon: Icon(Icons.home_rounded),
                  label: 'Home',
                ),
                NavigationDestination(
                  icon: Icon(Icons.menu_book_outlined),
                  selectedIcon: Icon(Icons.menu_book_rounded),
                  label: 'Study',
                ),
                NavigationDestination(
                  icon: Icon(Icons.verified_outlined),
                  selectedIcon: Icon(Icons.verified_rounded),
                  label: 'Result',
                ),
                NavigationDestination(
                  icon: Icon(Icons.groups_outlined),
                  selectedIcon: Icon(Icons.groups_rounded),
                  label: 'Community',
                ),
                NavigationDestination(
                  icon: Icon(Icons.person_outlined),
                  selectedIcon: Icon(Icons.person_rounded),
                  label: 'Profile',
                ),
              ],
            ),
          ),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump(const Duration(seconds: 1));

    await expectLater(
      find.byType(MaterialApp),
      matchesGoldenFile('goldens/home_reference.png'),
    );

    await tester.drag(find.byType(ListView).first, const Offset(0, -700));
    await tester.pump(const Duration(milliseconds: 300));
    await expectLater(
      find.byType(MaterialApp),
      matchesGoldenFile('goldens/home_reference_scrolled.png'),
    );
  }, skip: !_fontCacheAvailable());
}
