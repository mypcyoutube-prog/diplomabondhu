import '../../../core/api/api_client.dart';
import 'exam.dart';

class ExamRepository {
  final ApiClient _client;

  ExamRepository(this._client);

  Future<({List<Exam> items, int total})> list({String? type, int page = 1}) async {
    final res = await _client.getMap('/exams', query: {
      'page': page,
      'limit': 20,
      ?type: type,
    });
    final items = (res.data['items'] as List? ?? [])
        .map((e) => Exam.fromJson(e as Map<String, dynamic>))
        .toList();
    final meta = res.meta as Map<String, dynamic>? ?? {};
    return (items: items, total: (meta['total'] as num?)?.toInt() ?? items.length);
  }

  Future<Exam> byId(String id) async {
    final res = await _client.getMap('/exams/$id');
    return Exam.fromJson(res.data['exam'] as Map<String, dynamic>);
  }

  Future<StartedAttempt> start(String examId) async {
    final res = await _client.postMap('/exams/$examId/attempts');
    return StartedAttempt.fromJson(res);
  }

  Future<void> saveAnswer(String attemptId, String questionId, String selectedKey) async {
    await _client.patchMap('/exams/attempts/$attemptId/answer', body: {
      'questionId': questionId,
      'selectedKey': selectedKey,
    });
  }

  Future<ExamAttemptResult> submit(String attemptId) async {
    final res = await _client.postMap('/exams/attempts/$attemptId/submit');
    return _fullResult(res);
  }

  Future<ExamAttemptResult> result(String attemptId) async {
    final res = await _client.getMap('/exams/attempts/$attemptId/result');
    return _fullResult(res.data);
  }

  ExamAttemptResult _fullResult(Map<String, dynamic> res) => ExamAttemptResult(
        attemptId: res['attemptId'] as String,
        examTitle: res['examTitle'] as String?,
        scoring: res['scoring'] == null
            ? null
            : ExamScoring.fromJson(res['scoring'] as Map<String, dynamic>),
        perQuestion: (res['perQuestion'] as List? ?? [])
            .map((e) => PerQuestionResult.fromJson(e as Map<String, dynamic>))
            .toList(),
      );

  Future<({List<Map<String, dynamic>> items, int total})> history({int page = 1}) async {
    final res = await _client.getMap('/exams/history', query: {'page': page, 'limit': 20});
    final items = (res.data['items'] as List? ?? [])
        .map((e) => e as Map<String, dynamic>)
        .toList();
    final meta = res.meta as Map<String, dynamic>? ?? {};
    return (items: items, total: (meta['total'] as num?)?.toInt() ?? items.length);
  }

  Future<Map<String, dynamic>> stats() => _client.getMap('/exams/stats').then((r) => r.data);
}
