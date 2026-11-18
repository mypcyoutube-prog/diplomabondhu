class MaterialHierarchy {
  final String? programId;
  final String? regulationId;
  final String? technologyId;
  final String? semesterId;
  final String? subjectId;
  final String? chapterId;

  const MaterialHierarchy({
    this.programId,
    this.regulationId,
    this.technologyId,
    this.semesterId,
    this.subjectId,
    this.chapterId,
  });

  factory MaterialHierarchy.fromJson(Map<String, dynamic> json) => MaterialHierarchy(
        programId: json['programId'] as String?,
        regulationId: json['regulationId'] as String?,
        technologyId: json['technologyId'] as String?,
        semesterId: json['semesterId'] as String?,
        subjectId: json['subjectId'] as String?,
        chapterId: json['chapterId'] as String?,
      );
}

class MaterialPayload {
  final String? fileUrl;
  final String? externalUrl;
  final int? examYear;
  final int? sizeBytes;
  final int? pageCount;

  const MaterialPayload({this.fileUrl, this.externalUrl, this.examYear, this.sizeBytes, this.pageCount});

  factory MaterialPayload.fromJson(Map<String, dynamic> json) => MaterialPayload(
        fileUrl: json['fileUrl'] as String?,
        externalUrl: json['externalUrl'] as String?,
        examYear: json['examYear'] as int?,
        sizeBytes: json['sizeBytes'] as int?,
        pageCount: json['pageCount'] as int?,
      );
}

class Material {
  final String id;
  final String type;
  final String title;
  final String? titleBn;
  final String? description;
  final MaterialHierarchy hierarchy;
  final MaterialPayload payload;
  final bool downloadAllowed;
  final int viewCount;
  final DateTime? createdAt;

  const Material({
    required this.id,
    required this.type,
    required this.title,
    this.titleBn,
    this.description,
    required this.hierarchy,
    required this.payload,
    required this.downloadAllowed,
    required this.viewCount,
    this.createdAt,
  });

  bool get isExternal => payload.fileUrl == null && payload.externalUrl != null;

  factory Material.fromJson(Map<String, dynamic> json) => Material(
        id: (json['_id'] ?? json['id']) as String,
        type: json['type'] as String,
        title: json['title'] as String? ?? '',
        titleBn: json['titleBn'] as String?,
        description: json['description'] as String?,
        hierarchy: MaterialHierarchy.fromJson(
            json['hierarchyRefs'] as Map<String, dynamic>? ?? {}),
        payload: MaterialPayload.fromJson(json['payload'] as Map<String, dynamic>? ?? {}),
        downloadAllowed: json['downloadAllowed'] as bool? ?? false,
        viewCount: json['viewCount'] as int? ?? 0,
        createdAt: json['createdAt'] == null ? null : DateTime.tryParse(json['createdAt'] as String),
      );
}

class MaterialPage {
  final List<Material> items;
  final int page;
  final int total;

  const MaterialPage({required this.items, required this.page, required this.total});
}
