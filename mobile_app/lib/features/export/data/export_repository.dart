import '../../../core/api/api_client.dart';

class ExportJobModel {
  final String id;
  final List<String> datasets;
  final String format;
  final String status;
  final String fileName;
  final String? error;
  final DateTime? expiresAt;

  const ExportJobModel({
    required this.id,
    required this.datasets,
    required this.format,
    required this.status,
    required this.fileName,
    this.error,
    this.expiresAt,
  });

  factory ExportJobModel.fromJson(Map<String, dynamic> json) => ExportJobModel(
        id: (json['_id'] ?? json['id'])?.toString() ?? '',
        datasets: ((json['datasets'] as List?) ?? const [])
            .map((e) => e.toString())
            .toList(),
        format: (json['format'] as String?) ?? 'json',
        status: (json['status'] as String?) ?? 'processing',
        fileName: (json['fileName'] as String?) ?? '',
        error: json['error'] as String?,
        expiresAt: json['expiresAt'] == null
            ? null
            : DateTime.tryParse(json['expiresAt'].toString()),
      );

  bool get isDownloadable => status == 'ready';
}

class ExportRepository {
  final ApiClient _client;

  ExportRepository(this._client);

  Future<ExportJobModel> createJob(List<String> datasets, String format) async {
    final res = await _client.postMap('/export/jobs', body: {
      'datasets': datasets,
      'format': format,
    });
    return ExportJobModel.fromJson(
        (res['item'] as Map<String, dynamic>?) ?? const {});
  }

  Future<List<ExportJobModel>> listJobs() async {
    final res = await _client.getMap('/export/jobs');
    return ((res.data['items'] as List?) ?? const [])
        .map((e) => ExportJobModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<String> download(String jobId) async {
    final res = await _client.dio.get<String>('/export/jobs/$jobId/download');
    return res.data ?? '';
  }
}
