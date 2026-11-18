export const ALL_PERMISSIONS = [
  'STUDENT_MANAGE',
  'ACADEMIC_MANAGE',
  'CONTENT_MANAGE',
  'EXAM_MANAGE',
  'GPA_MANAGE',
  'MODERATE',
  'NOTIFY_MANAGE',
  'SETTINGS_MANAGE',
  'AUDIT_READ',
  'ADMIN_MANAGE'
] as const;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [...ALL_PERMISSIONS],
  moderator: ['MODERATE'],
  student: []
};

export function permissionsForRole(role: string | undefined): string[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(permissions: string[], required: string | undefined): boolean {
  if (!required) return true;
  return permissions.includes(required);
}
