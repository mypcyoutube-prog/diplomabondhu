class Post {
  final String id;
  final String title;
  final String body;
  final String type;
  final List<String> tags;
  final String authorName;
  final bool isAnswered;
  final int likeCount;
  final int commentCount;
  final bool likedByMe;
  final String status;
  final DateTime? createdAt;

  const Post({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    required this.tags,
    required this.authorName,
    required this.isAnswered,
    required this.likeCount,
    required this.commentCount,
    required this.likedByMe,
    required this.status,
    this.createdAt,
  });

  factory Post.fromJson(Map<String, dynamic> json) {
    final authorObj = json['author'] ?? json['authorId'];
    final author = authorObj is Map<String, dynamic> ? authorObj : null;
    return Post(
      id: (json['_id'] ?? json['id']) as String,
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? '',
      type: json['type'] as String? ?? 'discussion',
      tags: (json['tags'] as List?)?.cast<String>() ?? [],
      authorName: author?['name'] as String? ?? 'Student',
      isAnswered: json['isAnswered'] as bool? ?? false,
      likeCount: (json['likeCount'] as num?)?.toInt() ?? 0,
      commentCount: (json['commentCount'] as num?)?.toInt() ?? 0,
      likedByMe: json['likedByMe'] as bool? ?? false,
      status: json['status'] as String? ?? 'published',
      createdAt:
          json['createdAt'] == null ? null : DateTime.tryParse(json['createdAt'] as String),
    );
  }
}

class Comment {
  final String id;
  final String text;
  final String authorName;
  final String? parentId;
  final DateTime? createdAt;

  const Comment({
    required this.id,
    required this.text,
    required this.authorName,
    this.parentId,
    this.createdAt,
  });

  factory Comment.fromJson(Map<String, dynamic> json) {
    final authorObj = json['author'] ?? json['authorId'];
    final author = authorObj is Map<String, dynamic> ? authorObj : null;
    return Comment(
      id: (json['_id'] ?? json['id']) as String,
      text: json['text'] as String? ?? '',
      authorName: author?['name'] as String? ?? 'Student',
      parentId: json['parentId'] as String?,
      createdAt:
          json['createdAt'] == null ? null : DateTime.tryParse(json['createdAt'] as String),
    );
  }
}
