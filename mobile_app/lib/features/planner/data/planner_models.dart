class Task {
  final String id;
  final String title;
  final String? description;
  final DateTime? dueAt;
  final DateTime? reminderAt;
  final String status;

  const Task({
    required this.id,
    required this.title,
    this.description,
    this.dueAt,
    this.reminderAt,
    required this.status,
  });

  bool get isDone => status == 'done';
  bool get isOverdue =>
      !isDone && dueAt != null && dueAt!.isBefore(DateTime.now());

  factory Task.fromJson(Map<String, dynamic> json) => Task(
        id: (json['_id'] ?? json['id']) as String,
        title: json['title'] as String? ?? '',
        description: json['description'] as String?,
        dueAt: json['dueAt'] == null ? null : DateTime.tryParse(json['dueAt'] as String),
        reminderAt:
            json['reminderAt'] == null ? null : DateTime.tryParse(json['reminderAt'] as String),
        status: json['status'] as String? ?? 'todo',
      );
}

class Goal {
  final String id;
  final String title;
  final int progressPercent;
  final DateTime? targetDate;
  final String status;

  const Goal({
    required this.id,
    required this.title,
    required this.progressPercent,
    this.targetDate,
    required this.status,
  });

  factory Goal.fromJson(Map<String, dynamic> json) => Goal(
        id: (json['_id'] ?? json['id']) as String,
        title: json['title'] as String? ?? '',
        progressPercent: (json['progressPercent'] as num?)?.toInt() ?? 0,
        targetDate:
            json['targetDate'] == null ? null : DateTime.tryParse(json['targetDate'] as String),
        status: json['status'] as String? ?? 'active',
      );
}
