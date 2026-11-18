class ResultExam {
  final String examId;
  final int recordCount;
  final String? title;
  final int checkCount;
  final String? updatedAt;

  const ResultExam({
    required this.examId,
    required this.recordCount,
    this.title,
    required this.checkCount,
    this.updatedAt,
  });

  factory ResultExam.fromJson(Map<String, dynamic> json) => ResultExam(
        examId: json['examId'] as String,
        recordCount: (json['recordCount'] as num?)?.toInt() ?? 0,
        title: json['title'] as String?,
        checkCount: (json['checkCount'] as num?)?.toInt() ?? 0,
        updatedAt: json['updatedAt'] as String?,
      );

  String get displayLabel => (title != null && title!.isNotEmpty) ? title! : examId;
}

class ResultSubject {
  final String? code;
  final String? grade;
  final String? type;

  const ResultSubject({this.code, this.grade, this.type});

  factory ResultSubject.fromJson(Map<String, dynamic> json) => ResultSubject(
        code: json['code'] as String?,
        grade: json['grade'] as String?,
        type: json['type'] as String?,
      );

  String get titleSuffix {
    switch (type) {
      case 'T':
        return '(T)';
      case 'P':
        return '(P)';
      default:
        return '';
    }
  }
}

class ResultRecord {
  final String examId;
  final String? title;
  final String roll;
  final String? name;
  final String? registrationNo;
  final double? gpa;
  final double? cgpa;
  final String? status;
  final List<ResultSubject> subjects;
  final String? institute;
  final String? instituteCode;
  final Map<String, double?> semesterGpas;
  final int? examSemester;
  final String disclaimer;

  const ResultRecord({
    required this.examId,
    this.title,
    required this.roll,
    this.name,
    this.registrationNo,
    this.gpa,
    this.cgpa,
    this.status,
    this.subjects = const [],
    this.institute,
    this.instituteCode,
    this.semesterGpas = const {},
    this.examSemester,
    required this.disclaimer,
  });

  factory ResultRecord.fromJson(Map<String, dynamic> json) => ResultRecord(
        examId: json['examId'] as String,
        title: json['title'] as String?,
        roll: json['roll'] as String,
        name: json['name'] as String?,
        registrationNo: json['registrationNo'] as String?,
        gpa: (json['gpa'] as num?)?.toDouble(),
        cgpa: (json['cgpa'] as num?)?.toDouble(),
        status: json['status'] as String?,
        subjects: (json['subjects'] as List? ?? [])
            .map((e) => ResultSubject.fromJson(e as Map<String, dynamic>))
            .toList(),
        institute: json['institute'] as String?,
        instituteCode: json['instituteCode'] as String?,
        semesterGpas: (json['semesterGpas'] as Map<String, dynamic>? ?? {})
            .map((k, v) => MapEntry(k, (v as num?)?.toDouble())),
        examSemester: (json['examSemester'] as num?)?.toInt(),
        disclaimer: json['disclaimer'] as String? ?? '',
      );

  List<MapEntry<String, double?>> get sortedSemesterGpas {
    final entries = semesterGpas.entries
        .map((e) => MapEntry(e.key, e.value))
        .toList();
    int? semesterOf(String key) => int.tryParse(key.replaceAll(RegExp(r'[^0-9]'), ''));
    entries.sort((a, b) {
      final sa = semesterOf(a.key) ?? 0;
      final sb = semesterOf(b.key) ?? 0;
      return sb.compareTo(sa);
    });
    return entries;
  }
}
