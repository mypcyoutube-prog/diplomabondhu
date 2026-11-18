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
  _FakeResultRepository({this.onHistory});

  final List<ResultRecord> Function(String roll)? onHistory;

  @override
  Future<List<ResultExam>> exams() async => const [];

  @override
  Future<ResultRecord> check({required String examId, required String roll}) {
    throw const ApiException('NOT_FOUND', 'No result found');
  }

  @override
  Future<List<ResultRecord>> history({required String roll}) {
    final handler = onHistory;
    final records = handler?.call(roll) ?? const <ResultRecord>[];
    if (records.isEmpty) throw const ApiException('NOT_FOUND', 'No result found');
    return Future.value(records);
  }
}

Future<void> pumpChecker(
  WidgetTester tester, {
  List<ResultRecord> Function(String)? onHistory,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        resultRepositoryProvider
            .overrideWithValue(_FakeResultRepository(onHistory: onHistory)),
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

const passRecord = ResultRecord(
  examId: 'eng-7th-2022reg-2026',
  title: 'Diploma in Engineering — 7th Semester (2022 Regulation)',
  roll: '700014',
  name: 'Student One',
  registrationNo: '1040014001',
  gpa: 3.73,
  status: 'pass',
  subjects: [],
  institute: 'Himaloy Polytechnic Institute',
  semesterGpas: {
    'gpa1': 3.36,
    'gpa2': 3.34,
    'gpa3': 3.54,
    'gpa4': 3.76,
    'gpa5': 3.76,
    'gpa6': 3.61,
    'gpa7': 3.73,
  },
  examSemester: 7,
  disclaimer: 'This is not an official BTEB service.',
);

const eighthSemRecord = ResultRecord(
  examId: 'eng-8th-2016reg-2026',
  title: 'Diploma in Engineering — 8th Semester (2016 Regulation)',
  roll: '764001',
  gpa: 3.50,
  cgpa: 3.45,
  status: 'pass',
  subjects: [],
  semesterGpas: {
    'gpa1': 3.30,
    'gpa4': 3.18,
    'gpa8': 3.50,
  },
  examSemester: 8,
  disclaimer: 'This is not an official BTEB service.',
);

const referredRecord = ResultRecord(
  examId: 'eng-7th-2022reg-2026',
  title: 'Diploma in Engineering — 7th Semester (2022 Regulation)',
  roll: '712990',
  gpa: 3.54,
  status: 'referred',
  subjects: [
    ResultSubject(code: '28553', type: 'T'),
  ],
  semesterGpas: {
    'gpa1': 3.30,
    'gpa2': 3.12,
    'gpa3': 3.33,
    'gpa4': 3.18,
    'gpa5': null,
    'gpa6': 3.45,
    'gpa7': 3.54,
  },
  examSemester: 7,
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

  testWidgets('pass record shows semester timeline, GPA and disclaimer', (tester) async {
    await pumpChecker(tester, onHistory: (_) => const [passRecord]);
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
    await pumpChecker(tester, onHistory: (_) => const [passRecord]);
    await tester.enterText(find.byType(TextField), '700014');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();

    expect(find.text('A-'), findsWidgets);
    expect(find.text('A'), findsWidgets);
  });

  testWidgets('CGPA row appears when the record prints a CGPA', (tester) async {
    await tester.binding.setSurfaceSize(const Size(800, 3200));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await pumpChecker(tester, onHistory: (_) => const [eighthSemRecord]);
    await tester.enterText(find.byType(TextField), '764001');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();

    expect(find.text('CGPA'), findsOneWidget);
    expect(find.text('3.45'), findsOneWidget);
  });

  testWidgets('referred record shows missing-subject chip and red banner', (tester) async {
    await pumpChecker(tester, onHistory: (_) => const [referredRecord]);
    await tester.enterText(find.byType(TextField), '712990');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();

    expect(find.text('1 subject yet to pass'), findsNWidgets(2));
    expect(find.text('28553(T)'), findsOneWidget);
  });

  testWidgets('referred chip shows the subject name when available', (tester) async {
    const namedRecord = ResultRecord(
      examId: 'eng-7th-2022reg-2026',
      roll: '712990',
      gpa: 3.54,
      status: 'referred',
      subjects: [
        ResultSubject(
            code: '28553', type: 'T', name: 'Computer Architecture & Microprocessor'),
      ],
      semesterGpas: {'gpa5': null, 'gpa7': 3.54},
      examSemester: 7,
      disclaimer: 'This is not an official BTEB service.',
    );
    await pumpChecker(tester, onHistory: (_) => const [namedRecord]);
    await tester.enterText(find.byType(TextField), '712990');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();

    expect(find.text('28553(T)'), findsOneWidget);
    expect(find.text('Computer Architecture & Microprocessor'), findsOneWidget);
  });

  testWidgets('pass record with a referred subject yet to pass shows red banner', (tester) async {
    const passWithBacklog = ResultRecord(
      examId: 'eng-7th-2022reg-2026',
      roll: '712990',
      gpa: 3.54,
      status: 'pass',
      subjects: [ResultSubject(code: '28553', type: 'T')],
      semesterGpas: {'gpa5': null, 'gpa7': 3.54},
      examSemester: 7,
      disclaimer: 'This is not an official BTEB service.',
    );
    await pumpChecker(tester, onHistory: (_) => const [passWithBacklog]);
    await tester.enterText(find.byType(TextField), '712990');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();

    expect(find.text('1 subject yet to pass'), findsNWidgets(2));
    expect(find.text('28553(T)'), findsOneWidget);
  });

  testWidgets('failed subject is listed under its own semester card with date',
      (tester) async {
    const catalogedRecord = ResultRecord(
      examId: 'eng-7th-2022reg-2026',
      roll: '712990',
      gpa: 3.54,
      status: 'referred',
      subjects: [
        ResultSubject(
            code: '28553',
            type: 'T',
            name: 'Computer Architecture & Microprocessor',
            semester: 5),
      ],
      semesterGpas: {'gpa5': null, 'gpa7': 3.54},
      examSemester: 7,
      publishedAt: '2026-11-10T00:00:00.000Z',
      disclaimer: 'This is not an official BTEB service.',
    );
    await pumpChecker(tester, onHistory: (_) => const [catalogedRecord]);
    await tester.enterText(find.byType(TextField), '712990');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();

    expect(find.text('28553(T)'), findsOneWidget);
    expect(find.text('Computer Architecture & Microprocessor'), findsOneWidget);
    expect(find.text('Theory'), findsOneWidget);
    expect(find.text('5th Semester'), findsOneWidget);
    expect(find.text('10 November, 2026'), findsWidgets);
  });

  testWidgets('referred semester without GPA shows a red dash', (tester) async {
    await pumpChecker(tester, onHistory: (_) => const [referredRecord]);
    await tester.enterText(find.byType(TextField), '712990');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();

    expect(find.text('5th Semester'), findsOneWidget);
  });

  testWidgets('unknown roll shows not-found state', (tester) async {
    await pumpChecker(tester, onHistory: (_) => const []);
    await tester.enterText(find.byType(TextField), '999999');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();
    expect(
      find.textContaining('No result found for this roll'),
      findsOneWidget,
    );
  });

  testWidgets('multiple published exams show the count header', (tester) async {
    await tester.binding.setSurfaceSize(const Size(800, 3200));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await pumpChecker(
      tester,
      onHistory: (_) => const [passRecord, referredRecord],
    );
    await tester.enterText(find.byType(TextField), '700014');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();
    expect(
      find.text('2 published exams found for this roll'),
      findsOneWidget,
    );
    expect(find.text('#700014'), findsOneWidget);
    expect(find.text('#712990'), findsOneWidget);
  });
}
