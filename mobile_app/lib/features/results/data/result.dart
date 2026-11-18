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

class ResultRecord {
  final String examId;
  final String roll;
  final String? name;
  final String? registrationNo;
  final double? gpa;
  final String? status;
  final String disclaimer;

  const ResultRecord({
    required this.examId,
    required this.roll,
    this.name,
    this.registrationNo,
    this.gpa,
    this.status,
    required this.disclaimer,
  });

  factory ResultRecord.fromJson(Map<String, dynamic> json) => ResultRecord(
        examId: json['examId'] as String,
        roll: json['roll'] as String,
        name: json['name'] as String?,
        registrationNo: json['registrationNo'] as String?,
        gpa: (json['gpa'] as num?)?.toDouble(),
        status: json['status'] as String?,
        disclaimer: json['disclaimer'] as String? ?? '',
      );
}
