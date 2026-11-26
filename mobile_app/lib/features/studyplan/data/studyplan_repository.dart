import '../../../core/api/api_client.dart';
import 'studyplan_models.dart';

class StudyPlanRepository {
  final ApiClient _client;

  StudyPlanRepository(this._client);

  Future<StudyPlanModel> generate({
    required List<String> subjects,
    required double availableHoursPerDay,
    required String goal,
    required int days,
  }) async {
    final res = await _client.postMap('/ai/study-plan/generate', body: {
      'subjects': subjects,
      'availableHoursPerDay': availableHoursPerDay,
      'goal': goal,
      'days': days,
    });
    return StudyPlanModel.fromJson((res['item'] as Map<String, dynamic>?) ?? const {});
  }

  Future<List<StudyPlanModel>> list() async {
    final res = await _client.getMap('/ai/study-plan');
    return ((res.data['items'] as List?) ?? const [])
        .map((e) => StudyPlanModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<StudyPlanModel> updatePlan(
    String id,
    List<PlanDay> days, {
    String? status,
  }) async {
    final res = await _client.putMap('/ai/study-plan/$id', body: {
      'plan': {'days': days.map((d) => d.toJson()).toList()},
      if (status != null) 'status': status,
    });
    return StudyPlanModel.fromJson((res['item'] as Map<String, dynamic>?) ?? const {});
  }

  Future<int> apply(String id) async {
    final res = await _client.postMap('/ai/study-plan/$id/apply');
    return (res['createdTasks'] as num?)?.toInt() ?? 0;
  }

  Future<void> delete(String id) => _client.deleteMap('/ai/study-plan/$id');
}
