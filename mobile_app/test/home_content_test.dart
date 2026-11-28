import 'dart:async';

import 'package:diplomabondhu/app/l10n/generated/app_localizations.dart';
import 'package:diplomabondhu/features/auth/data/user.dart';
import 'package:diplomabondhu/features/auth/providers/auth_controller.dart';
import 'package:diplomabondhu/features/dashboard_customize/data/dashboard_prefs_repository.dart';
import 'package:diplomabondhu/features/dashboard_customize/providers/dashboard_prefs_providers.dart';
import 'package:diplomabondhu/features/home/data/home_content.dart';
import 'package:diplomabondhu/features/home/data/home_icon_map.dart';
import 'package:diplomabondhu/features/home/providers/home_providers.dart';
import 'package:diplomabondhu/features/home/screens/home_screen.dart';
import 'package:diplomabondhu/features/library/data/material.dart' as model;
import 'package:diplomabondhu/features/library/providers/library_providers.dart';
import 'package:diplomabondhu/features/notices/data/notice.dart';
import 'package:diplomabondhu/features/notices/providers/notice_providers.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const _welcome = HomeWelcome(
    messageEn: 'Everything for your diploma in one place',
    messageBn: 'তোমার ডিপ্লোমা লাইফ, এক প্ল্যাটফর্মে',
    visible: true);

const _content = HomeContent(
  quickAccess: [
    HomeQuickItem(
      slug: 'quick-study',
      titleEn: 'Study',
      titleBn: 'স্টাডি',
      subtitleEn: '',
      subtitleBn: '',
      icon: 'menu_book_rounded',
      route: '/library',
      bgColor: '#E0F2F1',
      fgColor: '#00897B',
      displayOrder: 1,
    ),
    HomeQuickItem(
      slug: 'quick-exams',
      titleEn: 'Exam Center',
      titleBn: 'পরীক্ষা কেন্দ্র',
      subtitleEn: '',
      subtitleBn: '',
      icon: 'quiz_rounded',
      route: '/exams',
      bgColor: '#E3F2FD',
      fgColor: '#1565C0',
      displayOrder: 2,
    ),
  ],
  studyResources: [
    HomeResource(
      slug: 'books',
      titleEn: 'Books',
      titleBn: 'বই',
      icon: 'auto_stories_rounded',
      route: '/library',
      bgColor: '#E0F2F1',
      fgColor: '#00897B',
      materialTypes: ['book'],
      displayOrder: 1,
      count: 12,
    ),
  ],
  notices: [],
  upcomingExams: [],
  featuredPosts: [],
  welcome: _welcome,
);

AppSettingsData _settings() => AppSettingsData(
      appName: 'DiplomaBondhu',
      homepageSections: const [],
      featureFlags: const {},
      maintenanceMode: false,
      supportInfo: const {},
      resultDisplay: (
        enabled: false,
        examId: '',
        startsAt: null,
        endsAt: null,
      ),
      homeNotice: (
        text: '',
        link: '',
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

class _FakeAuthController extends AuthController {
  @override
  FutureOr<User?> build() => null;
}

Future<void> pumpHome(WidgetTester tester, {HomeContent? content}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        appSettingsProvider.overrideWithValue(AsyncValue.data(_settings())),
        homeContentProvider.overrideWithValue(AsyncValue.data(
            content ??
                const HomeContent(
                  quickAccess: [],
                  studyResources: [],
                  notices: [],
                  upcomingExams: [],
                  featuredPosts: [],
                  welcome:
                      HomeWelcome(messageEn: '', messageBn: '', visible: true),
                ))),
        homeBannersProvider.overrideWithValue(AsyncValue.data(<HomeBanner>[])),
        homeResultProvider.overrideWithValue(AsyncValue.data(null)),
        recentMaterialsProvider
            .overrideWithValue(AsyncValue.data(<model.Material>[])),
        dashboardPrefsProvider.overrideWithValue(AsyncValue.data(
            DashboardPrefsBundle(
          customized: false,
          sections: const [
            DashboardSectionPref(key: 'exams', visible: true, order: 10),
            DashboardSectionPref(key: 'quick_access', visible: true, order: 20),
            DashboardSectionPref(key: 'resources', visible: true, order: 40),
            DashboardSectionPref(key: 'community', visible: true, order: 50),
          ],
        ))),
        publishedNoticesProvider
            .overrideWith((ref, source) async => <Notice>[]),
        authControllerProvider.overrideWith(_FakeAuthController.new),
      ],
      child: MaterialApp(
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: [
          AppLocalizations.delegate,
          ...GlobalMaterialLocalizations.delegates,
        ],
        locale: const Locale('en'),
        home: const HomeScreen(),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  group('HomeContent model', () {
    test('parses the public /home/content contract', () {
      final json = {
        'quickAccess': [
          {
            'slug': 'quick-study',
            'titleEn': 'Study',
            'titleBn': 'স্টাডি',
            'subtitleEn': 'Library',
            'subtitleBn': 'লাইব্রেরি',
            'icon': 'menu_book_rounded',
            'route': '/library',
            'bgColor': '#E0F2F1',
            'fgColor': '#00897B',
            'displayOrder': 1,
          }
        ],
        'studyResources': [
          {
            'slug': 'books',
            'titleEn': 'Books',
            'titleBn': 'বই',
            'icon': 'auto_stories_rounded',
            'route': '/library',
            'bgColor': '#E0F2F1',
            'fgColor': '#00897B',
            'materialTypes': ['book'],
            'displayOrder': 1,
            'count': 7,
          }
        ],
        'notices': [
          {
            '_id': 'n1',
            'title': 'Routine published',
            'body': '...',
            'source': 'bteb',
            'publishedAt': '2025-01-05T10:00:00.000Z',
          }
        ],
        'upcomingExams': [
          {
            '_id': 'e1',
            'title': 'Final Exam',
            'description': '',
            'type': 'final',
            'durationSec': 3600,
            'scheduledAt': '2025-02-01T09:00:00.000Z',
          }
        ],
        'featuredPosts': [
          {
            '_id': 'p1',
            'title': 'Tips',
            'body': '...',
            'tags': ['study'],
            'type': 'discussion',
            'likeCount': 3,
            'commentCount': 1,
            'authorName': 'Rakib',
            'createdAt': '2025-01-02T08:00:00.000Z',
          }
        ],
        'welcome': {
          'messageEn': 'Hello',
          'messageBn': 'হ্যালো',
          'visible': true,
        },
      };

      final content = HomeContent.fromJson(json);
      expect(content.quickAccess, hasLength(1));
      expect(content.quickAccess.first.titleBn, 'স্টাডি');
      expect(content.studyResources.first.count, 7);
      expect(content.notices.first.isBteb, isTrue);
      expect(content.upcomingExams.first.scheduledAt, isNotNull);
      expect(content.featuredPosts.first.authorName, 'Rakib');
      expect(content.welcome.messageBn, 'হ্যালো');
    });

    test('absent section keys parse as empty lists', () {
      final content = HomeContent.fromJson({});
      expect(content.quickAccess, isEmpty);
      expect(content.studyResources, isEmpty);
      expect(content.notices, isEmpty);
      expect(content.upcomingExams, isEmpty);
      expect(content.featuredPosts, isEmpty);
      expect(content.welcome.visible, isTrue);
    });

    test('icon/route/color helpers reject unknown values', () {
      expect(homeIconMap.containsKey('made_up_icon'), isFalse);
      expect(homeIconMap.containsKey('menu_book_rounded'), isTrue);
      expect(isHomeRouteAllowed('/library'), isTrue);
      expect(isHomeRouteAllowed('/notices/507f1f77bcf86cd799439011'), isTrue);
      expect(isHomeRouteAllowed('/notices/a/b'), isFalse);
      expect(isHomeRouteAllowed('/admin/secret'), isFalse);
      expect(parseHomeColor('#00897B'), isNotNull);
      expect(parseHomeColor('00897B'), isNull);
      expect(parseHomeColor('#zzzzzz'), isNull);
    });
  });

  group('HomeScreen integration', () {
    testWidgets('renders admin-managed quick access and welcome message',
        (tester) async {
      await pumpHome(tester, content: _content);
      expect(find.text('Study'), findsOneWidget);
      expect(find.text('Exam Center'), findsOneWidget);
      expect(find.text('12'), findsOneWidget);
      expect(
          find.text('Everything for your diploma in one place'),
          findsOneWidget);
    });

    testWidgets('shows no quick access or resources when backend returns none',
        (tester) async {
      await pumpHome(tester);
      expect(find.text('Study'), findsNothing);
      expect(find.text('12'), findsNothing);
    });
  });
}
