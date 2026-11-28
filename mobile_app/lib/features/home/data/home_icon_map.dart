import 'package:material_ui/material_ui.dart';

/// Client-side icon mapping for admin-managed home content. Only icons on the
/// repository-verified fallback allowlist (mirroring the backend
/// `ICON_FALLBACK_WHITELIST`) resolve to an IconData; unknown names return
/// null so the item is skipped instead of silently substituted.
const Map<String, IconData> homeIconMap = {
  'menu_book_rounded': Icons.menu_book_rounded,
  'quiz_rounded': Icons.quiz_rounded,
  'functions_rounded': Icons.functions_rounded,
  'groups_rounded': Icons.groups_rounded,
  'campaign_rounded': Icons.campaign_rounded,
  'auto_stories_rounded': Icons.auto_stories_rounded,
  'edit_note_rounded': Icons.edit_note_rounded,
  'play_circle_rounded': Icons.play_circle_rounded,
  'folder_special_rounded': Icons.folder_special_rounded,
  'home_rounded': Icons.home_rounded,
  'notifications_rounded': Icons.notifications_rounded,
  'person_rounded': Icons.person_rounded,
  'search_rounded': Icons.search_rounded,
  'settings_rounded': Icons.settings_rounded,
  'book_rounded': Icons.book_rounded,
  'bookmarks_rounded': Icons.bookmarks_rounded,
  'bookmark_rounded': Icons.bookmark_rounded,
  'calendar_today_rounded': Icons.calendar_today_rounded,
  'event_rounded': Icons.event_rounded,
  'history_edu_rounded': Icons.history_edu_rounded,
  'picture_as_pdf_rounded': Icons.picture_as_pdf_rounded,
  'download_rounded': Icons.download_rounded,
  'category_rounded': Icons.category_rounded,
  'forum_rounded': Icons.forum_rounded,
  'favorite_rounded': Icons.favorite_rounded,
  'check_circle_rounded': Icons.check_circle_rounded,
  'schedule_rounded': Icons.schedule_rounded,
  'school_rounded': Icons.school_rounded,
  'workspace_premium_rounded': Icons.workspace_premium_rounded,
  'dashboard_rounded': Icons.dashboard_rounded,
  'list_alt_rounded': Icons.list_alt_rounded,
  'push_pin_rounded': Icons.push_pin_rounded,
  'visibility_rounded': Icons.visibility_rounded,
  'visibility_off_rounded': Icons.visibility_off_rounded,
  'star_rounded': Icons.star_rounded,
  'info_rounded': Icons.info_rounded,
  'description_rounded': Icons.description_rounded,
};

/// Mirrors the backend ROUTE_WHITELIST sourced from the real GoRouter scan.
const List<String> _routeWhitelist = [
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
  '/commands',
];

/// Only whitelisted routes open from home content; dynamic single-segment
/// routes (e.g. /notices/<id>) are accepted for patterns ending in :id.
bool isHomeRouteAllowed(String route) {
  if (route.isEmpty) return false;
  for (final pattern in _routeWhitelist) {
    final idx = pattern.indexOf(':');
    if (idx == -1) {
      if (route == pattern) return true;
    } else {
      final base = pattern.substring(0, idx);
      if (route.startsWith(base)) {
        final rest = route.substring(base.length);
        return rest.isNotEmpty && !rest.contains('/');
      }
    }
  }
  return false;
}

/// Parses a '#RRGGBB' admin color; returns null when invalid so the item can
/// be skipped instead of rendered with a made-up color.
Color? parseHomeColor(String hex) {
  if (hex.length != 7 || !hex.startsWith('#')) return null;
  final value = int.tryParse(hex.substring(1), radix: 16);
  if (value == null) return null;
  return Color(0xFF000000 | value);
}
