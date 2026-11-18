import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const profileDataSchema = z.object({
  grading: z.object({
    scale: z.number().min(1).max(5),
    table: z.array(z.object({
      minPercent: z.number().min(0).max(100),
      maxPercent: z.number().min(0).max(100),
      grade: z.string().trim().min(1).max(4),
      point: z.number().min(0).max(5)
    })).min(1)
  }),
  assessments: z.record(z.string(), z.array(z.object({
    key: z.string().trim().min(1).max(50),
    label: z.string().trim().min(1).max(100),
    maxMarks: z.number().min(1),
    weightPercent: z.number().min(0).max(100),
    minPercent: z.number().min(0).max(100).optional()
  }))),
  passRules: z.object({
    minSubjectGrade: z.string().trim().min(1).max(4),
    semesterMinGpa: z.number().min(0).max(4).optional()
  }),
  cgpa: z.object({
    strategy: z.enum(['semester_weighted', 'credit_weighted']),
    semesterWeights: z.array(z.object({
      semesterNumber: z.number().int().min(1),
      percent: z.number().min(0).max(100)
    })),
    classBands: z.array(z.object({ minCgpa: z.number(), label: z.string().min(1).max(50) }))
  }),
  special: z.object({
    allowIncompleteProvisional: z.boolean().optional(),
    referredCapGrade: z.string().max(4).optional(),
    improvementCapGrade: z.string().max(4).optional()
  }).default({})
}).strict();

export const createProfileSchema = z.object({
  regulationId: objectId,
  data: profileDataSchema,
  verification: z.object({
    sourceRefs: z.array(z.object({
      title: z.string().trim().min(2).max(300),
      url: z.string().url().optional(),
      note: z.string().max(500).optional()
    })).default([])
  }).optional()
}).strict();

export const updateProfileSchema = z.object({
  data: profileDataSchema.optional(),
  verification: z.object({
    sourceRefs: z.array(z.object({
      title: z.string().trim().min(2).max(300),
      url: z.string().url().optional(),
      note: z.string().max(500).optional()
    }))
  }).optional()
}).strict().refine((v) => v.data !== undefined || v.verification !== undefined, {
  message: 'Nothing to update'
});

export const transitionSchema = z.object({
  to: z.enum(['verification', 'testing', 'approved', 'published', 'retired']),
  note: z.string().max(500).optional()
}).strict();

export const semesterCalcSchema = z.object({
  profileId: objectId,
  inputMode: z.enum(['marks', 'grades']),
  subjects: z.array(z.object({
    subjectId: objectId,
    code: z.string().trim().min(1).max(30),
    name: z.string().trim().min(1).max(200),
    credits: z.number().min(0.5).max(20),
    subjectType: z.enum(['theory', 'practical', 'theory_practical', 'project', 'industrial_training']),
    marks: z.record(z.string(), z.number()).optional(),
    grade: z.string().trim().max(4).optional()
  })).min(1).max(20)
}).strict();

export const cgpaCalcSchema = z.object({
  profileId: objectId,
  semesterGpas: z.array(z.object({
    semesterNumber: z.number().int().min(1).max(12),
    gpa: z.number().min(0).max(5),
    credits: z.number().min(0.5).max(100).optional()
  })).min(1).max(12)
}).strict();

export const saveResultSchema = z.object({
  kind: z.enum(['semester', 'cgpa']),
  profileId: objectId,
  inputs: z.unknown(),
  output: z.unknown(),
  label: z.string().trim().max(200).optional()
}).strict();

export const targetSchema = z.object({
  profileId: objectId,
  targetCgpa: z.number().min(0).max(5),
  completed: z.array(z.object({
    semesterNumber: z.number().int().min(1),
    gpa: z.number().min(0).max(5)
  })).default([]),
  remainingSemesters: z.array(z.number().int().min(1).max(12)).min(1)
}).strict();

export const idParam = z.object({ id: objectId });

export { objectId };
