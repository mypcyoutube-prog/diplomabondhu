class PlanTask {
  final String title;
  final int minutes;

  const PlanTask({required this.title, this.minutes = 0});

  factory PlanTask.fromJson(dynamic json) {
    if (json is Map<String, dynamic>) {
      return PlanTask(
        title: (json['title'] as String?) ?? '',
        minutes: (json['minutes'] as num?)?.toInt() ?? 0,
      );
    }
    return PlanTask(title: json.toString());
  }

  Map<String, dynamic> toJson() => {'title': title, 'minutes': minutes};
}

class PlanDay {
  final String label;
  final String focus;
  final List<PlanTask> tasks;

  const PlanDay({required this.label, this.focus = '', this.tasks = const []});

  factory PlanDay.fromJson(dynamic json) {
    if (json is Map<String, dynamic>) {
      return PlanDay(
        label: (json['label'] as String?) ?? '',
        focus: (json['focus'] as String?) ?? '',
        tasks: ((json['tasks'] as List?) ?? const [])
            .map((e) => PlanTask.fromJson(e))
            .toList(),
      );
    }
    return const PlanDay(label: '');
  }

  Map<String, dynamic> toJson() => {
        'label': label,
        'focus': focus,
        'tasks': tasks.map((t) => t.toJson()).toList(),
      };
}

class StudyPlanModel {
  final String id;
  final List<String> subjects;
  final double availableHoursPerDay;
  final String goal;
  final int days;
  final List<PlanDay> plan;
  final String status;

  const StudyPlanModel({
    required this.id,
    required this.subjects,
    required this.availableHoursPerDay,
    required this.goal,
    required this.days,
    required this.plan,
    required this.status,
  });

  factory StudyPlanModel.fromJson(Map<String, dynamic> json) {
    final input = json['input'] as Map<String, dynamic>? ?? const {};
    final planRaw = json['plan'] as Map<String, dynamic>? ?? const {};
    return StudyPlanModel(
      id: (json['_id'] ?? json['id'])?.toString() ?? '',
      subjects: ((input['subjects'] as List?) ?? const [])
          .map((e) => e.toString())
          .toList(),
      availableHoursPerDay:
          (input['availableHoursPerDay'] as num?)?.toDouble() ?? 0,
      goal: (input['goal'] as String?) ?? '',
      days: (input['days'] as num?)?.toInt() ?? 7,
      plan: ((planRaw['days'] as List?) ?? const [])
          .map((e) => PlanDay.fromJson(e))
          .toList(),
      status: (json['status'] as String?) ?? 'draft',
    );
  }
}
