import 'package:diplomabondhu/app/l10n/generated/app_localizations.dart';
import 'package:diplomabondhu/features/studyplan/data/studyplan_models.dart';
import 'package:diplomabondhu/features/studyplan/data/studyplan_repository.dart';
import 'package:diplomabondhu/features/studyplan/providers/studyplan_providers.dart';
import 'package:diplomabondhu/features/studyplan/screens/study_plan_screen.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeStudyPlanRepository implements StudyPlanRepository {
  _FakeStudyPlanRepository({this.plans = const []});

  final List<StudyPlanModel> plans;

  @override
  Future<StudyPlanModel> generate({
    required List<String> subjects,
    required double availableHoursPerDay,
    required String goal,
    required int days,
  }) async =>
      StudyPlanModel(
        id: 'p1',
        subjects: subjects,
        availableHoursPerDay: availableHoursPerDay,
        goal: goal,
        days: days,
        plan: const [
          PlanDay(label: 'Day 1', focus: 'Math', tasks: [
            PlanTask(title: 'Algebra revision', minutes: 60),
          ]),
        ],
        status: 'draft',
      );

  @override
  Future<List<StudyPlanModel>> list() async => plans;

  @override
  Future<StudyPlanModel> updatePlan(String id, List<PlanDay> days,
      {String? status}) async =>
      plans.first;

  @override
  Future<int> apply(String id) async => 2;

  @override
  Future<void> delete(String id) async {}
}

Future<void> pumpStudyPlan(WidgetTester tester,
    {required StudyPlanRepository repository}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        studyPlanRepositoryProvider.overrideWithValue(repository),
      ],
      child: MaterialApp(
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: [
          AppLocalizations.delegate,
          ...GlobalMaterialLocalizations.delegates,
        ],
        locale: const Locale('en'),
        home: const StudyPlanScreen(),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('renders generate form with Estimated badge', (tester) async {
    await pumpStudyPlan(tester, repository: _FakeStudyPlanRepository());
    expect(find.text('AI Study Plan'), findsOneWidget);
    expect(find.text('Estimated'), findsWidgets);
    expect(find.text('Generate plan'), findsWidgets);
  });

  testWidgets('renders saved plans with days and tasks', (tester) async {
    await pumpStudyPlan(
      tester,
      repository: _FakeStudyPlanRepository(plans: [
        StudyPlanModel(
          id: 'p1',
          subjects: ['Math-1', 'Physics'],
          availableHoursPerDay: 2,
          goal: 'Midterm prep',
          days: 7,
          plan: const [
            PlanDay(label: 'Day 1', focus: 'Math', tasks: [
              PlanTask(title: 'Algebra revision', minutes: 60),
            ]),
          ],
          status: 'draft',
        ),
      ]),
    );
    expect(find.text('Math-1, Physics'), findsOneWidget);
    expect(find.text('Day 1: Math'), findsOneWidget);
    expect(find.text('• Algebra revision (60 min)'), findsOneWidget);
  });
}
