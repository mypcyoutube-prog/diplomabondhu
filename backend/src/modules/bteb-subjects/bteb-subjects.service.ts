import type { FilterQuery } from 'mongoose';
import { BtebSubject, IBtebSubject } from '../../models/bteb-subject.model';

export interface CatalogTechnology {
  technologySlug: string;
  technology: string;
  regulation: number;
  semesterCount: number;
  subjectCount: number;
}

export const CATALOG_SOURCES: Record<number, string> = {
  2022: 'BTEB Regulation 2022 booklist data (btebresultszone.com booklists, harvested 2026-11-18)',
  2016: 'BTEB Regulation 2016 booklist data (btebresultszone.com booklists, harvested 2026-11-18)'
};

export async function listTechnologies(regulation?: number): Promise<CatalogTechnology[]> {
  const match: FilterQuery<IBtebSubject> = {};
  if (regulation) match.regulation = regulation;
  const docs = await BtebSubject.aggregate<{
    _id: { technologySlug: string; regulation: number },
    technology: string,
    semesterCount: number,
    subjectCount: number
  }>([
    { $match: match },
    {
      $group: {
        _id: { technologySlug: '$technologySlug', regulation: '$regulation' },
        technology: { $first: '$technology' },
        semesterCount: { $addToSet: '$semester' },
        subjectCount: { $sum: 1 }
      }
    },
    { $addFields: { semesterCount: { $size: '$semesterCount' } } },
    {
      $project: {
        _id: 0,
        technologySlug: '$_id.technologySlug',
        technology: 1,
        regulation: '$_id.regulation',
        semesterCount: 1,
        subjectCount: 1
      }
    },
    { $sort: { technology: 1, regulation: -1 } }
  ]);
  return docs.map((d) => ({
    technologySlug: (d as unknown as { technologySlug: string }).technologySlug,
    technology: d.technology,
    regulation: (d as unknown as { regulation: number }).regulation,
    semesterCount: d.semesterCount,
    subjectCount: d.subjectCount
  }));
}

export async function listSubjects(
  query: { regulation?: number; technologySlug?: string; semester?: number; q?: string; page: number; limit: number }
): Promise<{ items: Array<Record<string, unknown>>; meta: { page: number; limit: number; total: number; totalPages: number } }> {
  const filter: FilterQuery<IBtebSubject> = {};
  if (query.regulation) filter.regulation = query.regulation;
  if (query.technologySlug) filter.technologySlug = query.technologySlug.toLowerCase();
  if (query.semester) filter.semester = query.semester;
  if (query.q) {
    const escaped = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ name: { $regex: escaped, $options: 'i' } }, { code: { $regex: escaped, $options: 'i' } }];
  }
  const [items, total] = await Promise.all([
    BtebSubject.find(filter)
      .sort({ regulation: -1, technologySlug: 1, semester: 1, code: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .select('-__v -updatedAt -createdAt')
      .lean(),
    BtebSubject.countDocuments(filter)
  ]);
  return {
    items,
    meta: { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) }
  };
}

/** code -> name lookup used to enrich referred subjects on result records. */
export async function resolveSubjectNames(codes: Array<string | undefined | null>): Promise<Map<string, string>> {
  const wanted = [...new Set(
    codes
      .map((c) => String(c ?? '').trim().toUpperCase())
      .filter((c) => /^\d{5}$/.test(c))
  )];
  if (wanted.length === 0) return new Map();
  const docs = await BtebSubject.find({ code: { $in: wanted } })
    .sort({ regulation: -1 })
    .select('code name')
    .lean();
  const map = new Map<string, string>();
  for (const d of docs) {
    const code = String(d.code).toUpperCase();
    if (!map.has(code)) map.set(code, d.name);
  }
  return map;
}
