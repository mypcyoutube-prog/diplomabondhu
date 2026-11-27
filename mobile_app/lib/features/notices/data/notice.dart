class Notice {
  final String id;
  final String title;
  final String body;
  final String category;
  final String source;
  final String? pdfUrl;
  final DateTime? publishedAt;

  const Notice({
    required this.id,
    required this.title,
    required this.body,
    required this.category,
    required this.source,
    this.pdfUrl,
    this.publishedAt,
  });

  bool get isBteb => source == 'bteb';

  factory Notice.fromJson(Map<String, dynamic> json) => Notice(
        id: (json['_id'] ?? json['id']) as String,
        title: json['title'] as String? ?? '',
        body: json['body'] as String? ?? '',
        category: json['category'] as String? ?? 'announcement',
        source: json['source'] as String? ?? 'admin',
        pdfUrl: json['pdfUrl'] as String?,
        publishedAt: json['publishedAt'] is String
            ? DateTime.tryParse(json['publishedAt'] as String)
            : null,
      );
}
