class GpaProfile {
  final String id;
  final String regulationId;
  final int version;
  final String status;

  const GpaProfile({
    required this.id,
    required this.regulationId,
    required this.version,
    required this.status,
  });

  factory GpaProfile.fromJson(Map<String, dynamic> json) => GpaProfile(
        id: (json['_id'] ?? json['id']) as String,
        regulationId: json['regulationId'] is Map
            ? (json['regulationId'] as Map<String, dynamic>)['_id'] as String? ?? ''
            : json['regulationId'] as String? ?? '',
        version: (json['version'] as num?)?.toInt() ?? 1,
        status: json['status'] as String? ?? 'draft',
      );
}

class GradeEntry {
  final String grade;
  final double point;
  final int minMarks;
  final int? maxMarks;

  const GradeEntry({required this.grade, required this.point, required this.minMarks, this.maxMarks});

  factory GradeEntry.fromJson(Map<String, dynamic> json) => GradeEntry(
        grade: json['grade'] as String,
        point: (json['point'] as num).toDouble(),
        minMarks: (json['minMarks'] as num?)?.toInt() ?? 0,
        maxMarks: (json['maxMarks'] as num?)?.toInt(),
      );
}

class AssessmentComponent {
  final String key;
  final String label;
  final int maxMarks;
  final int weightPercent;

  const AssessmentComponent({
    required this.key,
    required this.label,
    required this.maxMarks,
    required this.weightPercent,
  });

  factory AssessmentComponent.fromJson(Map<String, dynamic> json) => AssessmentComponent(
        key: json['key'] as String,
        label: json['label'] as String? ?? json['key'] as String,
        maxMarks: (json['maxMarks'] as num?)?.toInt() ?? 100,
        weightPercent: (json['weightPercent'] as num?)?.toInt() ?? 100,
      );
}

class ProfileStructure {
  final String profileId;
  final int version;
  final List<GradeEntry> gradingTable;
  final Map<String, List<AssessmentComponent>> assessments;
  final String? minSubjectGrade;
  final String cgpaStrategy;
  final List<CgpaSemesterWeight> semesterWeights;

  const ProfileStructure({
    required this.profileId,
    required this.version,
    required this.gradingTable,
    required this.assessments,
    this.minSubjectGrade,
    required this.cgpaStrategy,
    required this.semesterWeights,
  });

  factory ProfileStructure.fromJson(Map<String, dynamic> json) {
    final passRules = json['passRules'] as Map<String, dynamic>? ?? {};
    final cgpa = json['cgpa'] as Map<String, dynamic>? ?? {};
    final assessmentsRaw = json['assessments'] as Map<String, dynamic>? ?? {};
    final assessments = assessmentsRaw.map((k, v) => MapEntry(
          k,
          (v as List? ?? [])
              .map((e) => AssessmentComponent.fromJson(e as Map<String, dynamic>))
              .toList(),
        ));
    return ProfileStructure(
      profileId: json['profileId'] as String,
      version: (json['version'] as num?)?.toInt() ?? 1,
      gradingTable: (json['grading']?['table'] as List? ?? [])
          .map((e) => GradeEntry.fromJson(e as Map<String, dynamic>))
          .toList(),
      assessments: assessments,
      minSubjectGrade: passRules['minSubjectGrade'] as String?,
      cgpaStrategy: cgpa['strategy'] as String? ?? 'semester_weighted',
      semesterWeights: (cgpa['semesterWeights'] as List? ?? [])
          .map((e) => CgpaSemesterWeight.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class CgpaSemesterWeight {
  final int semesterNumber;
  final int percent;

  const CgpaSemesterWeight({required this.semesterNumber, required this.percent});

  factory CgpaSemesterWeight.fromJson(Map<String, dynamic> json) => CgpaSemesterWeight(
        semesterNumber: (json['semesterNumber'] as num?)?.toInt() ?? 0,
        percent: (json['percent'] as num?)?.toInt() ?? 0,
      );
}




class CgpaResult {
  final double cgpa;
  final String strategy;
  final String? classBand;
  final List<String> notes;
  final List<Map<String, dynamic>>? contribution;

  const CgpaResult({
    required this.cgpa,
    required this.strategy,
    this.classBand,
    required this.notes,
    this.contribution,
  });

  factory CgpaResult.fromJson(Map<String, dynamic> json) => CgpaResult(
        cgpa: (json['cgpa'] as num).toDouble(),
        strategy: json['strategy'] as String? ?? '',
        classBand: json['classBand'] as String?,
        notes: (json['notes'] as List?)?.cast<String>() ?? [],
        contribution: (json['contribution'] as List?)
            ?.map((e) => e as Map<String, dynamic>)
            .toList(),
      );
}


class GpaHistoryItem {
  final String id;
  final String kind;
  final Map<String, dynamic> inputs;
  final Map<String, dynamic> output;
  final String? label;
  final DateTime? createdAt;

  const GpaHistoryItem({
    required this.id,
    required this.kind,
    required this.inputs,
    required this.output,
    this.label,
    this.createdAt,
  });

  factory GpaHistoryItem.fromJson(Map<String, dynamic> json) => GpaHistoryItem(
        id: (json['_id'] ?? json['id']) as String,
        kind: json['kind'] as String? ?? 'semester',
        inputs: json['inputs'] as Map<String, dynamic>? ?? {},
        output: json['output'] as Map<String, dynamic>? ?? {},
        label: json['label'] as String?,
        createdAt:
            json['createdAt'] == null ? null : DateTime.tryParse(json['createdAt'] as String),
      );
}
