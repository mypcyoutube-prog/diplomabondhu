import 'package:diplomabondhu/app/l10n/generated/app_localizations.dart';
import 'package:diplomabondhu/core/api/api_exception.dart';
import 'package:diplomabondhu/features/results/data/result.dart';
import 'package:diplomabondhu/features/results/data/result_repository.dart';
import 'package:diplomabondhu/features/results/providers/result_providers.dart';
import 'package:diplomabondhu/features/results/screens/result_checker_screen.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeResultRepository implements ResultRepository {
  _FakeResultRepository({this.onTimeline});

  final ResultTimeline Function(String roll)? onTimeline;

  @override
  Future<List<ResultExam>> exams() async => const [];

  @override
  Future<ResultRecord> check({required String examId, required String roll}) {
    throw const ApiException('NOT_FOUND', 'No result found');
  }

  @override
  Future<List<ResultRecord>> history({required String roll}) {
    throw const ApiException('NOT_FOUND', 'No result found');
  }

  @override
  Future<ResultTimeline> timeline({required String roll}) {
    final handler = onTimeline;
    if (handler == null) throw const ApiException('NOT_FOUND', 'No result found');
    return Future.value(handler(roll));
  }
}

Future<void> pumpChecker(
  WidgetTester tester, {
  ResultTimeline Function(String)? onTimeline,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        resultRepositoryProvider
            .overrideWithValue(_FakeResultRepository(onTimeline: onTimeline)),
      ],
      child: MaterialApp(
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: [
          AppLocalizations.delegate,
          ...GlobalMaterialLocalizations.delegates,
        ],
        locale: const Locale('en'),
        home: const ResultCheckerScreen(),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

TimelineSemester sem(
  int semester,
  double? gpa, {
  String? publishedAt,
  List<ResultSubject> subjects = const [],
}) =>
    TimelineSemester(
      semester: semester,
      gpa: gpa,
      publishedAt: publishedAt,
      subjects: subjects,
    );

final passTimeline = ResultTimeline(
  roll: '700014',
  name: 'Student One',
  registrationNo: '1040014001',
  institute: 'Himaloy Polytechnic Institute',
  title: 'Diploma in Engineering — 7th Semester (2022 Regulation)',
  status: 'pass',
  bannerSubjects: 0,
  semesters: [
    sem(7, 3.73),
    sem(6, 3.61),
    sem(5, 3.76),
    sem(4, 3.76),
    sem(3, 3.54),
    sem(2, 3.34),
    sem(1, 3.36),
  ],
  disclaimer: 'This is not an official BTEB service.',
);

final referredTimeline = ResultTimeline(
  roll: '712990',
  title: 'Diploma in Engineering — 7th Semester (2022 Regulation)',
  status: 'referred',
  bannerSubjects: 1,
  semesters: [
    sem(7, 3.54),
    sem(6, 3.45),
    sem(
      5,
      null,
      publishedAt: '2026-06-15T10:00:00.000Z',
      subjects: [ResultSubject(code: '28553', type: 'T')],
    ),
    sem(4, 3.18),
    sem(3, 3.33),
    sem(2, 3.12),
    sem(1, 3.30),
  ],
  disclaimer: 'This is not an official BTEB service.',
);

final clearedTimeline = ResultTimeline(
  roll: '712981',
  title: 'Diploma in Engineering — 7th Semester (2022 Regulation)',
  status: 'pass',
  bannerSubjects: 0,
  semesters: [
    sem(7, 3.73, publishedAt: '2026-11-10T10:00:00.000Z'),
    sem(
      5,
      3.76,
      publishedAt: '2026-06-15T10:00:00.000Z',
      subjects: [
        ResultSubject(
          code: '28553',
          type: 'T',
          name: 'Computer Architecture & Microprocessor',
          semester: 5,
          cleared: true,
        ),
      ],
    ),
    sem(4, 3.76),
  ],
  disclaimer: 'This is not an official BTEB service.',
);

final cgpaTimeline = ResultTimeline(
  roll: '764001',
  title: 'Diploma in Engineering — 8th Semester (2016 Regulation)',
  status: 'pass',
  cgpa: 3.45,
  bannerSubjects: 0,
  semesters: [
    sem(8, 3.50),
    sem(4, 3.18),
    sem(1, 3.30),
  ],
  disclaimer: 'This is not an official BTEB service.',
);

void main() {
  testWidgets('invalid roll shows validation message', (tester) async {
    await pumpChecker(tester);
    await tester.enterText(find.byType(TextField), 'abc');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();
    expect(find.text('Enter a valid roll number (6-10 digits)'), findsOneWidget);
  });

  testWidgets('pass timeline shows semester cards, GPA and disclaimer', (tester) async {
    await tester.binding.setSurfaceSize(const Size(800, 3200));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await pumpChecker(tester, onTimeline: (_) => passTimeline);
    await tester.enterText(find.byType(TextField), '700014');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();

    expect(find.text('#700014'), findsOneWidget);
    expect(find.text('Student One'), findsOneWidget);
    expect(find.text('Passed'), findsNWidgets(7));
    expect(find.text('7th Semester'), findsOneWidget);
    expect(find.text('1st Semester'), findsOneWidget);
    expect(find.text('3.73'), findsOneWidget);
    expect(find.text('3.36'), findsOneWidget);
    expect(
      find.text('This is not an official BTEB service.'),
      findsOneWidget,
    );
  });

  testWidgets('letter grade is shown beside each semester GPA', (tester) async {
    await tester.binding.setSurfaceSize(const Size(800, 3200));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await pumpChecker(tester, onTimeline: (_) => passTimeline);
    await tester.enterText(find.byType(TextField), '700014');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();

    expect(find.text('A-'), findsWidgets);
    expect(find.text('A'), findsWidgets);
  });

  testWidgets('CGPA row appears when the timeline prints a CGPA', (tester) async {
    await tester.binding.setSurfaceSize(const Size(800, 3200));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await pumpChecker(tester, onTimeline: (_) => cgpaTimeline);
    await tester.enterText(find.byType(TextField), '764001');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();

    expect(find.text('CGPA'), findsOneWidget);
    expect(find.text('3.45'), findsOneWidget);
  });

  testWidgets('referred timeline shows red banner and the pending subject', (tester) async {
    await tester.binding.setSurfaceSize(const Size(800, 3200));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await pumpChecker(tester, onTimeline: (_) => referredTimeline);
    await tester.enterText(find.byType(TextField), '712990');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();

    expect(find.text('1 subject yet to pass'), findsNWidgets(2));
    expect(find.text('28553(T)'), findsOneWidget);
  });

  testWidgets('referred subject shows the subject name under its own semester',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(800, 3200));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await pumpChecker(tester, onTimeline: (_) => referredTimeline);
    await tester.enterText(find.byType(TextField), '712990');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();

    expect(find.text('28553(T)'), findsOneWidget);
    expect(find.text('5th Semester'), findsOneWidget);
  });

  testWidgets('cleared referred subject is listed but rendered green as passed later',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(800, 3200));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await pumpChecker(tester, onTimeline: (_) => clearedTimeline);
    await tester.enterText(find.byType(TextField), '712981');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();

    expect(find.text('28553(T)'), findsOneWidget);
    expect(find.text('Computer Architecture & Microprocessor'), findsOneWidget);
    expect(find.text('Passed later'), findsOneWidget);
    expect(find.text('1 subject yet to pass'), findsNothing);
  });

  testWidgets('each semester shows its own publication date', (tester) async {
    await tester.binding.setSurfaceSize(const Size(800, 3200));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await pumpChecker(tester, onTimeline: (_) => clearedTimeline);
    await tester.enterText(find.byType(TextField), '712981');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();

    expect(find.text('10 November, 2026'), findsOneWidget);
    expect(find.text('15 June, 2026'), findsOneWidget);
  });

  testWidgets('referred semester without GPA shows a red dash', (tester) async {
    await pumpChecker(tester, onTimeline: (_) => referredTimeline);
    await tester.enterText(find.byType(TextField), '712990');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();

    expect(find.text('5th Semester'), findsOneWidget);
  });

  testWidgets('unknown roll shows not-found state', (tester) async {
    await pumpChecker(tester);
    await tester.enterText(find.byType(TextField), '999999');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();
    expect(
      find.textContaining('No result found for this roll'),
      findsOneWidget,
    );
  });
}
