import '../../../core/api/api_client.dart';
import 'gpa_models.dart';

class GpaRepository {
  final ApiClient _client;

  GpaRepository(this._client);

  Future<List<GpaProfile>> profiles() async {
    final res = await _client.getMap('/gpa/profiles');
    return (res.data['items'] as List? ?? [])
        .map((e) => GpaProfile.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<ProfileStructure> structure(String profileId) async {
    final res = await _client.getMap('/gpa/profiles/$profileId/structure');
    return ProfileStructure.fromJson(res.data);
  }

  Future<CgpaResult> calculateCgpa({
    required String profileId,
    required List<({int semesterNumber, double gpa, double? credits})> semesterGpas,
  }) async {
    final res = await _client.postMap('/gpa/calculate/cgpa', body: {
      'profileId': profileId,
      'semesterGpas': semesterGpas
          .map((s) => {
                'semesterNumber': s.semesterNumber,
                'gpa': s.gpa,
                if (s.credits != null) 'credits': s.credits,
              })
          .toList(),
    });
    return CgpaResult.fromJson(res);
  }

  Future<String> saveResult({
    required String kind,
    required String profileId,
    required Map<String, dynamic> inputs,
    required Map<String, dynamic> output,
    String? label,
  }) async {
    final res = await _client.postMap('/gpa/results', body: {
      'kind': kind,
      'profileId': profileId,
      'inputs': inputs,
      'output': output,
      ?label: label,
    });
    return res['id'] as String;
  }

  Future<List<GpaHistoryItem>> history() async {
    final res = await _client.getMap('/gpa/results', query: {'page': 1, 'limit': 50});
    return (res.data['items'] as List? ?? [])
        .map((e) => GpaHistoryItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> deleteHistory(String id) => _client.deleteMap('/gpa/results/$id');
}
