import 'package:diplomabondhu/app/l10n/generated/app_localizations.dart';
import 'package:diplomabondhu/core/api/api_exception.dart';
import 'package:diplomabondhu/features/subjects/data/subject_catalog.dart';
import 'package:diplomabondhu/features/subjects/data/subject_repository.dart';
import 'package:diplomabondhu/features/subjects/providers/subject_providers.dart';
import 'package:diplomabondhu/features/subjects/screens/subject_catalog_screen.dart';
import 'package:diplomabondhu/features/subjects/screens/technology_subjects_screen.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

class _FakeSubjectRepository implements SubjectRepository {
  _FakeSubjectRepository({this.techs, this.subjectRows, this.fail = false});

  final List<CatalogTechnology>? techs;
  final List<CatalogSubject>? subjectRows;
  final bool fail;

  @override
  Future<List<CatalogTechnology>> technologies({int? regulation}) {
    if (fail) throw const ApiException('UPSTREAM', 'boom');
    return Future.value(techs ?? const []);
  }

  @override
  Future<List<CatalogSubject>> subjects({
    required String technologySlug,
    required int regulation,
  }) {
    if (fail) throw const ApiException('UPSTREAM', 'boom');
    return Future.value(subjectRows ?? const []);
  }
}

Future<void> pumpCatalog(
  WidgetTester tester, {
  required List<Override> overrides,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: overrides,
      child: MaterialApp(
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: [
          AppLocalizations.delegate,
          ...GlobalMaterialLocalizations.delegates,
        ],
        locale: const Locale('en'),
        home: const SubjectCatalogScreen(),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> pumpTechSubjects(
  WidgetTester tester, {
  required List<CatalogSubject> subjects,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        subjectRepositoryProvider
            .overrideWithValue(_FakeSubjectRepository(subjectRows: subjects)),
      ],
      child: MaterialApp(
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: [
          AppLocalizations.delegate,
          ...GlobalMaterialLocalizations.delegates,
        ],
        locale: const Locale('en'),
        home: const TechnologySubjectsScreen(
          technologySlug: 'computer-technology',
          regulation: 2022,
          technologyName: 'Computer Technology',
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  final techList = [
    const CatalogTechnology(
      technology: 'Computer Technology',
      technologySlug: 'computer-technology',
      regulation: 2022,
      semesterCount: 8,
      subjectCount: 53,
    ),
    const CatalogTechnology(
      technology: 'Civil Technology',
      technologySlug: 'civil-technology',
      regulation: 2022,
      semesterCount: 8,
      subjectCount: 49,
    ),
  ];

  testWidgets('catalog shows technologies for the selected regulation',
      (tester) async {
    await pumpCatalog(tester, overrides: [
      subjectRepositoryProvider
          .overrideWithValue(_FakeSubjectRepository(techs: techList)),
    ]);

    expect(find.text('Computer Technology'), findsOneWidget);
    expect(find.text('Civil Technology'), findsOneWidget);
    expect(find.text('53 subjects'), findsOneWidget);
    expect(find.text('Subject Catalog'), findsOneWidget);
  });

  testWidgets('catalog filters by technology name', (tester) async {
    await pumpCatalog(tester, overrides: [
      subjectRepositoryProvider
          .overrideWithValue(_FakeSubjectRepository(techs: techList)),
    ]);

    await tester.enterText(find.byType(TextField), 'civil');
    await tester.pumpAndSettle();

    expect(find.text('Civil Technology'), findsOneWidget);
    expect(find.text('Computer Technology'), findsNothing);
  });

  testWidgets('catalog error state shows retry', (tester) async {
    await pumpCatalog(tester, overrides: [
      subjectRepositoryProvider
          .overrideWithValue(_FakeSubjectRepository(fail: true)),
    ]);

    expect(find.text('Something went wrong. Please try again.'),
        findsOneWidget);
    expect(find.byType(FilledButton), findsOneWidget);
  });

  testWidgets('technology subjects grouped by semester with details',
      (tester) async {
    await pumpTechSubjects(tester, subjects: const [
      CatalogSubject(
        code: '28553',
        name: 'Computer Architecture & Microprocessor',
        semester: 5,
        type: 'theory_practical',
        credits: 4,
        theoryMaxMarks: 150,
        practicalMaxMarks: 50,
      ),
      CatalogSubject(
        code: '25852',
        name: 'Industrial Management',
        semester: 6,
        type: 'theory',
        credits: 2,
        theoryMaxMarks: 100,
      ),
    ]);

    expect(find.text('Semester 5'), findsOneWidget);
    expect(find.text('Semester 6'), findsOneWidget);
    expect(find.text('Computer Architecture & Microprocessor'),
        findsOneWidget);
    expect(find.text('Theory 150'), findsOneWidget);
    expect(find.text('Practical 50'), findsOneWidget);
    expect(find.text('Credits 4'), findsOneWidget);
    expect(find.text('T+P'), findsOneWidget);
  });

  testWidgets('technology subjects search finds by code', (tester) async {
    await pumpTechSubjects(tester, subjects: const [
      CatalogSubject(
          code: '28553', name: 'Computer Architecture', semester: 5),
      CatalogSubject(code: '25852', name: 'Industrial Management', semester: 6),
    ]);

    await tester.enterText(find.byType(TextField), '28553');
    await tester.pumpAndSettle();

    expect(find.text('Computer Architecture'), findsOneWidget);
    expect(find.text('Industrial Management'), findsNothing);
  });
}
