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
  _FakeResultRepository(this.examList, {this.onCheck});

  final List<ResultExam> examList;
  final ResultRecord? Function(String examId, String roll)? onCheck;

  @override
  Future<List<ResultExam>> exams() async => examList;

  @override
  Future<ResultRecord> check({required String examId, required String roll}) {
    final handler = onCheck;
    if (handler == null) throw const ApiException('NOT_FOUND', 'No result found');
    final record = handler(examId, roll);
    if (record == null) throw const ApiException('NOT_FOUND', 'No result found');
    return Future.value(record);
  }
}

Future<void> pumpChecker(
  WidgetTester tester, {
  required List<ResultExam> exams,
  ResultRecord? Function(String, String)? onCheck,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        resultRepositoryProvider
            .overrideWithValue(_FakeResultRepository(exams, onCheck: onCheck)),
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

void main() {
  const exam = ResultExam(
    examId: 'eng-3rd-2026-11',
    recordCount: 4,
    title: 'Diploma in Engineering 3rd Semester',
    checkCount: 0,
  );

  testWidgets('empty exams shows empty state', (tester) async {
    await pumpChecker(tester, exams: []);
    expect(find.text('No results have been published yet'), findsOneWidget);
  });

  testWidgets('invalid roll shows validation message', (tester) async {
    await pumpChecker(tester, exams: const [exam]);
    await tester.enterText(find.byType(TextField), 'abc');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();
    expect(find.text('Enter a valid roll number (6-10 digits)'), findsOneWidget);
  });

  testWidgets('successful check shows GPA and disclaimer', (tester) async {
    await pumpChecker(
      tester,
      exams: const [exam],
      onCheck: (examId, roll) => const ResultRecord(
        examId: 'eng-3rd-2026-11',
        roll: '410123',
        name: 'Student One',
        registrationNo: '1040123456',
        gpa: 3.75,
        status: 'pass',
        disclaimer: 'This is not an official BTEB service.',
      ),
    );
    await tester.enterText(find.byType(TextField), '410123');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();

    expect(find.text('Student One'), findsOneWidget);
    expect(find.text('3.75'), findsOneWidget);
    expect(find.text('PASS'), findsOneWidget);
    expect(find.text('This is not an official BTEB service.'), findsOneWidget);
  });

  testWidgets('unknown roll shows not-found state', (tester) async {
    await pumpChecker(tester, exams: const [exam]);
    await tester.enterText(find.byType(TextField), '999999');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();
    expect(
      find.text('No result found for this roll in the selected examination'),
      findsOneWidget,
    );
  });
}
