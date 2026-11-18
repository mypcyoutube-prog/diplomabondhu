import '../../../core/api/api_client.dart';
import 'planner_models.dart';

class PlannerRepository {
  final ApiClient _client;

  PlannerRepository(this._client);

  Future<List<Task>> tasks({int page = 1}) async {
    final res = await _client.getMap('/planner/tasks', query: {'page': page, 'limit': 50});
    return (res.data['items'] as List? ?? [])
        .map((e) => Task.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Task> createTask({
    required String title,
    String? description,
    DateTime? dueAt,
  }) async {
    final res = await _client.postMap('/planner/tasks', body: {
      'title': title,
      if (description != null && description.isNotEmpty) 'description': description,
      if (dueAt != null) 'dueAt': dueAt.toIso8601String(),
    });
    return Task.fromJson(res['item'] as Map<String, dynamic>? ?? res);
  }

  Future<void> setTaskStatus(String id, bool done) =>
      _client.patchMap('/planner/tasks/$id', body: {'status': done ? 'done' : 'todo'});

  Future<void> deleteTask(String id) => _client.deleteMap('/planner/tasks/$id');

  Future<List<Goal>> goals() async {
    final res = await _client.getMap('/planner/goals');
    return (res.data['items'] as List? ?? res.data['goals'] as List? ?? [])
        .map((e) => Goal.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<Map<String, dynamic>>> routine() async {
    final res = await _client.getMap('/planner/routine');
    return (res.data['items'] as List? ?? res.data['slots'] as List? ?? [])
        .map((e) => e as Map<String, dynamic>)
        .toList();
  }
}
