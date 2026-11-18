import { describe, it, expect } from 'vitest';
import { computeSemester, computeCgpa, computeTargetCgpa, GpaValidationError, type CalculationProfileData, type SubjectInput } from '../modules/gpa/gpa.engine';

const profile2016: CalculationProfileData = {
  grading: {
    scale: 4,
    table: [
      { minPercent: 80, maxPercent: 100, grade: 'A+', point: 4.0 },
      { minPercent: 75, maxPercent: 79.99, grade: 'A', point: 3.75 },
      { minPercent: 70, maxPercent: 74.99, grade: 'A-', point: 3.5 },
      { minPercent: 65, maxPercent: 69.99, grade: 'B+', point: 3.25 },
      { minPercent: 60, maxPercent: 64.99, grade: 'B', point: 3.0 },
      { minPercent: 55, maxPercent: 59.99, grade: 'B-', point: 2.75 },
      { minPercent: 50, maxPercent: 54.99, grade: 'C+', point: 2.5 },
      { minPercent: 45, maxPercent: 49.99, grade: 'C', point: 2.25 },
      { minPercent: 40, maxPercent: 44.99, grade: 'D', point: 2.0 },
      { minPercent: 0, maxPercent: 39.99, grade: 'F', point: 0 }
    ]
  },
  assessments: {
    theory: [
      { key: 'ca', label: 'Continuous Assessment', maxMarks: 30, weightPercent: 30 },
      { key: 'final', label: 'Final Examination', maxMarks: 70, weightPercent: 70 }
    ],
    practical: [
      { key: 'lab', label: 'Laboratory', maxMarks: 50, weightPercent: 60 },
      { key: 'labReport', label: 'Lab Report', maxMarks: 50, weightPercent: 40, minPercent: 40 }
    ],
    theory_practical: [
      { key: 'ca', label: 'Continuous Assessment', maxMarks: 30, weightPercent: 20 },
      { key: 'final', label: 'Final Examination', maxMarks: 70, weightPercent: 50 },
      { key: 'lab', label: 'Laboratory', maxMarks: 50, weightPercent: 30 }
    ]
  },
  passRules: { minSubjectGrade: 'D' },
  cgpa: {
    strategy: 'semester_weighted',
    semesterWeights: [
      { semesterNumber: 1, percent: 5 },
      { semesterNumber: 2, percent: 5 },
      { semesterNumber: 3, percent: 5 },
      { semesterNumber: 4, percent: 10 },
      { semesterNumber: 5, percent: 15 },
      { semesterNumber: 6, percent: 20 },
      { semesterNumber: 7, percent: 25 },
      { semesterNumber: 8, percent: 15 }
    ],
    classBands: [
      { minCgpa: 3.0, label: 'First Class' },
      { minCgpa: 2.0, label: 'Pass' },
      { minCgpa: 0, label: 'Fail' }
    ]
  },
  special: { allowIncompleteProvisional: true }
};

function theorySubject(overrides: Partial<SubjectInput> = {}): SubjectInput {
  return {
    subjectId: 's1', code: '26651', name: 'Mathematics-1', credits: 4,
    subjectType: 'theory', inputMode: 'marks',
    marks: { ca: 24, final: 56 },
    ...overrides
  };
}

describe('GPA engine: marks-based grading boundaries', () => {
  it('maps 80% to A+ (4.00)', () => {
    const r = computeSemester(profile2016, [theorySubject({ marks: { ca: 30, final: 50 } })]);
    expect(r.subjects[0].computedPercent).toBe(80);
    expect(r.subjects[0].grade).toBe('A+');
    expect(r.subjects[0].point).toBe(4.0);
  });

  it('maps 79.99% to A (3.75) - boundary below A+', () => {
    const r = computeSemester(profile2016, [theorySubject({ marks: { ca: 30, final: 49.99 } })]);
    expect(r.subjects[0].grade).toBe('A');
  });

  it('maps 40% to D (2.00) - minimum pass', () => {
    const r = computeSemester(profile2016, [theorySubject({ marks: { ca: 12, final: 28 } })]);
    expect(r.subjects[0].grade).toBe('D');
    expect(r.subjects[0].status).toBe('passed');
  });

  it('maps 39.99% to F (0.00) - fail boundary', () => {
    const r = computeSemester(profile2016, [theorySubject({ marks: { ca: 12, final: 27.99 } })]);
    expect(r.subjects[0].grade).toBe('F');
    expect(r.subjects[0].status).toBe('failed');
  });

  it('maps 75% to A and 74.99% to A-', () => {
    const a = computeSemester(profile2016, [theorySubject({ marks: { ca: 22.5, final: 52.5 } })]);
    const aMinus = computeSemester(profile2016, [theorySubject({ marks: { ca: 22.49, final: 52.5 } })]);
    expect(a.subjects[0].grade).toBe('A');
    expect(aMinus.subjects[0].grade).toBe('A-');
  });
});

describe('GPA engine: credit math and GPA', () => {
  it('computes credit-weighted semester GPA', () => {
    const r = computeSemester(profile2016, [
      theorySubject({ subjectId: 's1', code: 'M1', credits: 4, marks: { ca: 30, final: 50 } }),
      theorySubject({ subjectId: 's2', code: 'M2', credits: 3, marks: { ca: 12, final: 28 } })
    ]);
    expect(r.gpa).toBeCloseTo((4 * 4 + 2 * 3) / 7, 2);
    expect(r.totalCredits).toBe(7);
    expect(r.earnedCreditPoints).toBe(22);
  });

  it('rejects marks exceeding component maximum', () => {
    expect(() => computeSemester(profile2016, [theorySubject({ marks: { ca: 31, final: 56 } })]))
      .toThrow(GpaValidationError);
  });

  it('rejects negative marks', () => {
    expect(() => computeSemester(profile2016, [theorySubject({ marks: { ca: -1, final: 56 } })]))
      .toThrow(GpaValidationError);
  });

  it('fails a subject when a component minimum is not met even with passing total', () => {
    const r = computeSemester(profile2016, [{
      ...theorySubject({ subjectId: 's3', code: 'LAB', credits: 2 }),
      subjectType: 'practical',
      marks: { lab: 50, labReport: 15 }
    }]);
    expect(r.subjects[0].status).toBe('failed');
    expect(r.subjects[0].failureReasons?.join(' ')).toContain('below minimum');
    expect(r.notes.join(' ')).toContain('provisional');
  });
});

describe('GPA engine: incomplete results', () => {
  it('marks missing components as incomplete and withholds GPA', () => {
    const r = computeSemester(profile2016, [
      theorySubject({ marks: { ca: 24 } })
    ]);
    expect(r.status).toBe('incomplete');
    expect(r.gpa).toBeNull();
    expect(r.subjects[0].status).toBe('incomplete');
    expect(r.subjects[0].grade).toBe('I');
  });

  it('throws instead of returning provisional when profile disallows incomplete', () => {
    const strict = { ...profile2016, special: { allowIncompleteProvisional: false } };
    expect(() => computeSemester(strict, [theorySubject({ marks: { ca: 24 } })]))
      .toThrow(GpaValidationError);
  });
});

describe('GPA engine: grade-based input', () => {
  it('accepts a valid grade and computes credit points', () => {
    const r = computeSemester(profile2016, [theorySubject({ inputMode: 'grades', grade: 'A', marks: undefined })]);
    expect(r.subjects[0].point).toBe(3.75);
    expect(r.subjects[0].creditPoints).toBe(15);
    expect(r.gpa).toBe(3.75);
  });

  it('rejects a grade that does not exist in the regulation table', () => {
    expect(() => computeSemester(profile2016, [theorySubject({ inputMode: 'grades', grade: 'E' })]))
      .toThrow(GpaValidationError);
  });
});

describe('GPA engine: CGPA (2016 semester weights 5,5,5,10,15,20,25,15)', () => {
  it('returns 4.00 CGPA when all semester GPAs are 4.00', () => {
    const inputs = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ semesterNumber: n, gpa: 4.0 }));
    const r = computeCgpa(profile2016, inputs);
    expect(r.cgpa).toBe(4.0);
    expect(r.totalWeight).toBe(100);
    expect(r.classBand).toBe('First Class');
  });

  it('weights later semesters more heavily (weightage math)', () => {
    const r = computeCgpa(profile2016, [
      { semesterNumber: 1, gpa: 4.0 },
      { semesterNumber: 8, gpa: 2.0 }
    ]);
    expect(r.cgpa).toBeCloseTo((4 * 5 + 2 * 15) / 20, 2);
  });

  it('normalizes partial CGPA over completed weight only', () => {
    const r = computeCgpa(profile2016, [
      { semesterNumber: 1, gpa: 3.0 },
      { semesterNumber: 2, gpa: 3.5 }
    ]);
    expect(r.totalWeight).toBe(10);
    expect(r.cgpa).toBeCloseTo((3 * 5 + 3.5 * 5) / 10, 2);
    expect(r.classBand).toBeUndefined();
    expect(r.notes.join(' ')).toContain('Partial');
  });

  it('rejects unknown semesters and out-of-range GPAs', () => {
    expect(() => computeCgpa(profile2016, [{ semesterNumber: 9, gpa: 3.0 }])).toThrow(GpaValidationError);
    expect(() => computeCgpa(profile2016, [{ semesterNumber: 1, gpa: 4.5 }])).toThrow(GpaValidationError);
  });
});

describe('GPA engine: CGPA credit_weighted strategy', () => {
  const creditProfile: CalculationProfileData = {
    ...profile2016,
    cgpa: {
      strategy: 'credit_weighted',
      semesterWeights: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ semesterNumber: n, percent: 18 })),
      classBands: [{ minCgpa: 3.5, label: 'First Class' }]
    }
  };

  it('weights semesters by their total credits', () => {
    const r = computeCgpa(creditProfile, [
      { semesterNumber: 1, gpa: 4.0, credits: 20 },
      { semesterNumber: 2, gpa: 3.0, credits: 10 }
    ]);
    expect(r.cgpa).toBeCloseTo((4 * 20 + 3 * 10) / 30, 2);
    expect(r.strategy).toBe('credit_weighted');
  });

  it('requires credits for every provided semester', () => {
    expect(() =>
      computeCgpa(creditProfile, [{ semesterNumber: 1, gpa: 3.5 }])
    ).toThrow(GpaValidationError);
  });

  it('rejects non-positive credits', () => {
    expect(() =>
      computeCgpa(creditProfile, [{ semesterNumber: 1, gpa: 3.5, credits: 0 }])
    ).toThrow(GpaValidationError);
  });

  it('withholds the class band until all defined semesters are covered', () => {
    const partial = computeCgpa(creditProfile, [{ semesterNumber: 1, gpa: 4.0, credits: 20 }]);
    expect(partial.classBand).toBeUndefined();
    const full = computeCgpa(creditProfile, [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ semesterNumber: n, gpa: 4.0, credits: 18 })));
    expect(full.classBand).toBe('First Class');
  });

  it('still supports semester_weighted profiles unchanged', () => {
    const r = computeCgpa(profile2016, [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ semesterNumber: n, gpa: 4.0 })));
    expect(r.cgpa).toBe(4.0);
    expect(r.totalWeight).toBe(100);
  });
});

describe('GPA engine: target CGPA estimate', () => {
  it('computes required average GPA for remaining semesters', () => {
    const r = computeTargetCgpa(
      profile2016,
      [{ semesterNumber: 1, gpa: 3.0 }, { semesterNumber: 2, gpa: 3.0 }],
      3.2,
      [3]
    );
    expect(r.requiredAverageGpa).toBeCloseTo((3.2 * 15 - 3.0 * 5 - 3.0 * 5) / 5, 2);
    expect(r.feasible).toBe(true);
    expect(r.notes[0]).toContain('ESTIMATE');
  });

  it('marks target infeasible when required GPA exceeds scale', () => {
    const r = computeTargetCgpa(profile2016, [{ semesterNumber: 1, gpa: 2.0 }], 4.0, [2]);
    expect(r.feasible).toBe(false);
  });

  it('rejects empty remaining semesters', () => {
    expect(() => computeTargetCgpa(profile2016, [{ semesterNumber: 1, gpa: 3.0 }], 3.5, []))
      .toThrow(GpaValidationError);
  });
});
