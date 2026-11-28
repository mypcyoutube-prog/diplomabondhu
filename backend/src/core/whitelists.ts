import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Route whitelist sourced from the real GoRouter scan of
 * mobile_app/lib/app/router/router.dart (verified in repository audit).
 */
export const ROUTE_WHITELIST: readonly string[] = Object.freeze([
  '/library',
  '/exams',
  '/gpa/cgpa',
  '/gpa/history',
  '/community',
  '/notices',
  '/notices/:id',
  '/subjects',
  '/planner',
  '/results/checker',
  '/bookmarks',
  '/workspace',
  '/study-plan',
  '/notifications',
  '/profile',
  '/settings',
  '/dashboard-customize',
  '/commands'
]);

export function isRouteAllowed(route: string): boolean {
  if (ROUTE_WHITELIST.includes(route)) return true;
  if (route.startsWith('/notices/')) {
    const rest = route.slice('/notices/'.length);
    return rest.length > 0 && !rest.includes('/');
  }
  return false;
}

/**
 * Icon fallback allowlist: Material icons verified as actually used in the
 * mobile app (grep of mobile_app/lib). When the user generates
 * icon-whitelist.generated.json from the Flutter SDK via
 * mobile_app/tool/generate_icon_whitelist.dart, that full SDK list is merged.
 */
export const ICON_FALLBACK_WHITELIST: readonly string[] = Object.freeze([
  'menu_book_rounded', 'quiz_rounded', 'functions_rounded', 'groups_rounded',
  'campaign_rounded', 'auto_stories_rounded', 'edit_note_rounded',
  'play_circle_rounded', 'folder_special_rounded', 'home_rounded',
  'notifications_rounded', 'person_rounded', 'search_rounded', 'settings_rounded',
  'book_rounded', 'bookmarks_rounded', 'bookmark_rounded', 'calendar_today_rounded',
  'event_rounded', 'history_edu_rounded', 'picture_as_pdf_rounded',
  'download_rounded', 'category_rounded', 'forum_rounded', 'favorite_rounded',
  'check_circle_rounded', 'schedule_rounded', 'school_rounded', 'workspace_premium_rounded',
  'dashboard_rounded', 'list_alt_rounded', 'push_pin_rounded', 'visibility_rounded',
  'visibility_off_rounded', 'star_rounded', 'info_rounded', 'description_rounded'
]);

let generatedIcons: Set<string> | null = null;

function loadGeneratedIcons(): Set<string> {
  if (generatedIcons) return generatedIcons;
  generatedIcons = new Set<string>();
  try {
    const p = join(__dirname, 'icon-whitelist.generated.json');
    if (existsSync(p)) {
      const parsed = JSON.parse(readFileSync(p, 'utf8')) as { icons?: string[] };
      for (const icon of parsed.icons ?? []) generatedIcons.add(icon);
    }
  } catch {
    generatedIcons = new Set<string>();
  }
  return generatedIcons;
}

export function isIconAllowed(icon: string): boolean {
  if (!icon || icon.startsWith('Icons.')) return false;
  if (ICON_FALLBACK_WHITELIST.includes(icon)) return true;
  return loadGeneratedIcons().has(icon);
}
