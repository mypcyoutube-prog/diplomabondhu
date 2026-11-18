export const PERMISSIONS = {
  STUDENT_MANAGE: 'students.manage',
  ACADEMIC_MANAGE: 'academic.manage',
  CONTENT_MANAGE: 'content.manage',
  EXAM_MANAGE: 'exams.manage',
  GPA_MANAGE: 'gpa.manage',
  MODERATE: 'community.moderate',
  NOTIFY_MANAGE: 'notifications.manage',
  SETTINGS_MANAGE: 'settings.manage',
  AUDIT_READ: 'audit.read',
  ADMIN_MANAGE: 'admins.manage'
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  student: [],
  moderator: [PERMISSIONS.MODERATE],
  admin: Object.values(PERMISSIONS)
};
