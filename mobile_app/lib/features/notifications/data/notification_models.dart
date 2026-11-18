class NotificationItem {
  final String id;
  final String type;
  final String title;
  final String? body;
  final String? link;
  final bool read;
  final DateTime? createdAt;

  const NotificationItem({
    required this.id,
    required this.type,
    required this.title,
    this.body,
    this.link,
    required this.read,
    this.createdAt,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) => NotificationItem(
        id: (json['_id'] ?? json['id']) as String,
        type: json['type'] as String? ?? 'system',
        title: json['title'] as String? ?? '',
        body: json['body'] as String?,
        link: json['link'] as String?,
        read: json['read'] as bool? ?? false,
        createdAt:
            json['createdAt'] == null ? null : DateTime.tryParse(json['createdAt'] as String),
      );
}
