class UserPrefs {
  final String language;
  final String theme;

  const UserPrefs({required this.language, required this.theme});

  factory UserPrefs.fromJson(Map<String, dynamic> json) => UserPrefs(
        language: json['language'] as String? ?? 'bn',
        theme: json['theme'] as String? ?? 'system',
      );
}

class UserAcademicInfo {
  final String? instituteId;
  final String? programId;
  final String? regulationId;
  final String? technologyId;
  final String? sessionId;
  final int? semesterNumber;
  final String? roll;
  final String? registrationNo;

  const UserAcademicInfo({
    this.instituteId,
    this.programId,
    this.regulationId,
    this.technologyId,
    this.sessionId,
    this.semesterNumber,
    this.roll,
    this.registrationNo,
  });

  factory UserAcademicInfo.fromJson(Map<String, dynamic> json) => UserAcademicInfo(
        instituteId: json['instituteId'] as String?,
        programId: json['programId'] as String?,
        regulationId: json['regulationId'] as String?,
        technologyId: json['technologyId'] as String?,
        sessionId: json['sessionId'] as String?,
        semesterNumber: json['semesterNumber'] as int?,
        roll: json['roll'] as String?,
        registrationNo: json['registrationNo'] as String?,
      );
}

class User {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final String role;
  final String status;
  final UserPrefs prefs;
  final UserAcademicInfo? academic;
  final DateTime? createdAt;

  const User({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    required this.role,
    required this.status,
    required this.prefs,
    this.academic,
    this.createdAt,
  });

  bool get isStudent => role == 'student';

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: (json['id'] ?? json['_id']) as String,
        name: json['name'] as String? ?? '',
        email: json['email'] as String? ?? '',
        phone: json['phone'] as String?,
        role: json['role'] as String? ?? 'student',
        status: json['status'] as String? ?? 'active',
        prefs: UserPrefs.fromJson(json['prefs'] as Map<String, dynamic>? ?? {}),
        academic: json['profile'] is Map<String, dynamic>
            ? UserAcademicInfo.fromJson(json['profile'] as Map<String, dynamic>)
            : json['academic'] is Map<String, dynamic>
                ? UserAcademicInfo.fromJson(json['academic'] as Map<String, dynamic>)
                : null,
        createdAt: json['createdAt'] is String
            ? DateTime.tryParse(json['createdAt'] as String)
            : null,
      );
}
