import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/subject_repository.dart';

final subjectRepositoryProvider = Provider<SubjectRepository>((ref) {
  return SubjectRepository(ref.watch(apiClientProvider));
});

final catalogTechnologiesProvider = FutureProvider.autoDispose
    .family<List<CatalogTechItem>, int>((ref, regulation) async {
  final repo = ref.watch(subjectRepositoryProvider);
  final techs = await repo.technologies(regulation: regulation);
  return techs
      .map((t) => CatalogTechItem(
            technology: t.technology,
            technologySlug: t.technologySlug,
            regulation: t.regulation,
            semesterCount: t.semesterCount,
            subjectCount: t.subjectCount,
          ))
      .toList();
});

class CatalogTechItem {
  final String technology;
  final String technologySlug;
  final int regulation;
  final int semesterCount;
  final int subjectCount;

  const CatalogTechItem({
    required this.technology,
    required this.technologySlug,
    required this.regulation,
    required this.semesterCount,
    required this.subjectCount,
  });
}

final technologySubjectsProvider = FutureProvider.autoDispose
    .family<List<CatalogSubjectRow>, CatalogTechRequest>((ref, req) async {
  final repo = ref.watch(subjectRepositoryProvider);
  final rows = await repo.subjects(
    technologySlug: req.technologySlug,
    regulation: req.regulation,
  );
  return rows.map((s) {
    String? type;
    switch (s.type) {
      case 'theory':
        type = 'T';
      case 'practical':
        type = 'P';
      case 'theory_practical':
        type = 'T+P';
      default:
        type = null;
    }
    return CatalogSubjectRow(
      code: s.code,
      name: s.name,
      semester: s.semester,
      type: type,
      groupLabel: s.groupLabel,
      credits: s.credits,
      theoryMaxMarks: s.theoryMaxMarks,
      practicalMaxMarks: s.practicalMaxMarks,
    );
  }).toList();
});

class CatalogSubjectRow {
  final String code;
  final String name;
  final int semester;
  final String? type;
  final String? groupLabel;
  final double? credits;
  final int? theoryMaxMarks;
  final int? practicalMaxMarks;

  const CatalogSubjectRow({
    required this.code,
    required this.name,
    required this.semester,
    this.type,
    this.groupLabel,
    this.credits,
    this.theoryMaxMarks,
    this.practicalMaxMarks,
  });
}

class CatalogTechRequest {
  final String technologySlug;
  final int regulation;

  const CatalogTechRequest({required this.technologySlug, required this.regulation});

  @override
  bool operator ==(Object other) =>
      other is CatalogTechRequest &&
      other.technologySlug == technologySlug &&
      other.regulation == regulation;

  @override
  int get hashCode => Object.hash(technologySlug, regulation);
}
