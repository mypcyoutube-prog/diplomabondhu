import '../../../core/api/api_client.dart';
import 'result.dart';

class ResultRepository {
  final ApiClient _client;

  ResultRepository(this._client);

  Future<List<ResultExam>> exams() async {
    final res = await _client.getMap('/results/meta');
    return (res.data['exams'] as List? ?? [])
        .map((e) => ResultExam.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<ResultRecord> check({required String examId, required String roll}) async {
    final res = await _client.getMap('/results/check', query: {
      'examId': examId,
      'roll': roll,
    });
    return ResultRecord.fromJson(res.data);
  }
}
