class CatalogTechnology {
  final String technology;
  final String technologySlug;
  final int regulation;
  final int semesterCount;
  final int subjectCount;

  const CatalogTechnology({
    required this.technology,
    required this.technologySlug,
    required this.regulation,
    required this.semesterCount,
    required this.subjectCount,
  });

  factory CatalogTechnology.fromJson(Map<String, dynamic> json) =>
      CatalogTechnology(
        technology: json['technology'] as String? ?? '',
        technologySlug: json['technologySlug'] as String? ?? '',
        regulation: (json['regulation'] as num?)?.toInt() ?? 0,
        semesterCount: (json['semesterCount'] as num?)?.toInt() ?? 0,
        subjectCount: (json['subjectCount'] as num?)?.toInt() ?? 0,
      );
}

class CatalogSubject {
  final String code;
  final String name;
  final int semester;
  final String? type;
  final String? groupLabel;
  final double? credits;
  final int? theoryMaxMarks;
  final int? practicalMaxMarks;
  final int? ppwTheory;
  final int? ppwPractical;

  const CatalogSubject({
    required this.code,
    required this.name,
    required this.semester,
    this.type,
    this.groupLabel,
    this.credits,
    this.theoryMaxMarks,
    this.practicalMaxMarks,
    this.ppwTheory,
    this.ppwPractical,
  });

  factory CatalogSubject.fromJson(Map<String, dynamic> json) =>
      CatalogSubject(
        code: json['code'] as String? ?? '',
        name: json['name'] as String? ?? '',
        semester: (json['semester'] as num?)?.toInt() ?? 0,
        type: json['type'] as String?,
        groupLabel: json['groupLabel'] as String?,
        credits: (json['credits'] as num?)?.toDouble(),
        theoryMaxMarks: (json['theoryMaxMarks'] as num?)?.toInt(),
        practicalMaxMarks: (json['practicalMaxMarks'] as num?)?.toInt(),
        ppwTheory: (json['ppwTheory'] as num?)?.toInt(),
        ppwPractical: (json['ppwPractical'] as num?)?.toInt(),
      );
}
