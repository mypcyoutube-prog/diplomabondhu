import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';

class _Command {
  final String route;
  final IconData icon;
  final String Function(AppLocalizations) label;
  final Set<String> keywords;

  const _Command(this.route, this.icon, this.label, this.keywords);
}

class CommandCenterScreen extends ConsumerStatefulWidget {
  const CommandCenterScreen({super.key});

  @override
  ConsumerState<CommandCenterScreen> createState() =>
      _CommandCenterScreenState();
}

class _CommandCenterScreenState extends ConsumerState<CommandCenterScreen> {
  String _query = '';

  static final List<_Command> _commands = [
    _Command('/library', Icons.menu_book_rounded, (l) => l.library,
        {'library', 'book', 'notes', 'materials', 'study', 'লাইব্রেরি', 'বই', 'নোট'}),
    _Command('/exams', Icons.quiz_rounded, (l) => l.exams,
        {'exam', 'mcq', 'test', 'quiz', 'পরীক্ষা'}),
    _Command('/gpa', Icons.functions_rounded, (l) => l.cgpa,
        {'gpa', 'cgpa', 'calculator', 'result', 'রেজাল্ট'}),
    _Command('/gpa/cgpa', Icons.stacked_line_chart_rounded, (l) => l.cgpa,
        {'cgpa', 'final'}),
    _Command('/planner', Icons.event_note_rounded, (l) => l.planner,
        {'planner', 'task', 'routine', 'reminder', 'goal', 'রুটিন', 'টাস্ক', 'পরিকল্পনা'}),
    _Command('/community', Icons.forum_rounded, (l) => l.community,
        {'community', 'post', 'discussion', 'কমিউনিটি', 'পোস্ট'}),
    _Command('/workspace', Icons.space_dashboard_rounded, (l) => l.workspaceTitle,
        {'workspace', 'notes', 'collections', 'recent', 'ওয়ার্কস্পেস'}),
    _Command('/search', Icons.search_rounded, (l) => l.searchTitle,
        {'search', 'find', 'খুঁজুন', 'সার্চ'}),
    _Command('/notifications', Icons.notifications_rounded, (l) => l.notifications,
        {'notification', 'alert', 'message', 'নোটিফিকেশন'}),
    _Command('/export', Icons.folder_zip_rounded, (l) => l.exportTitle,
        {'export', 'download', 'backup', 'data', 'এক্সপোর্ট', 'ডাউনলোড'}),
    _Command('/dashboard-customize', Icons.tune_rounded,
        (l) => l.dashboardCustomizeTitle, {'dashboard', 'customize', 'layout', 'ড্যাশবোর্ড', 'কাস্টমাইজ'}),
    _Command('/study-plan', Icons.auto_awesome_rounded, (l) => l.studyPlanTitle,
        {'ai', 'study plan', 'schedule', 'এআই', 'স্টাডি প্ল্যান'}),
    _Command('/sync-devices', Icons.devices_rounded, (l) => l.syncDevicesTitle,
        {'sync', 'device', 'cross-device', 'সিঙ্ক', 'ডিভাইস'}),
    _Command('/results/checker', Icons.verified_rounded, (l) => l.resultChecker,
        {'bteb', 'official result', 'checker', 'বিটিইবি', 'রেজাল্ট চেকার'}),
    _Command('/settings', Icons.settings_rounded, (l) => l.settings,
        {'settings', 'preference', 'theme', 'language', 'সেটিংস', 'থিম', 'ভাষা'}),
  ];

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final q = _query.trim().toLowerCase();
    final visible = q.isEmpty
        ? _commands
        : _commands.where((c) {
            final label = c.label(l10n).toLowerCase();
            return label.contains(q) ||
                c.keywords.any((k) => k.contains(q) || q.contains(k));
          }).toList();

    return Scaffold(
      appBar: AppBar(title: Text(l10n.commandCenterTitle)),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
                DbSpacing.md, DbSpacing.sm, DbSpacing.md, 0),
            child: TextField(
              autofocus: true,
              decoration: InputDecoration(
                hintText: l10n.commandSearchHint,
                prefixIcon: const Icon(Icons.search_rounded),
              ),
              onChanged: (v) => setState(() => _query = v),
            ),
          ),
          Expanded(
            child: visible.isEmpty
                ? Center(child: Text(l10n.emptyGeneric))
                : ListView.separated(
                    padding: const EdgeInsets.all(DbSpacing.md),
                    itemCount: visible.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 4),
                    itemBuilder: (context, i) {
                      final cmd = visible[i];
                      return Card(
                        child: ListTile(
                          leading: Icon(cmd.icon, color: DbColors.teal),
                          title: Text(cmd.label(l10n)),
                          trailing: const Icon(Icons.chevron_right_rounded),
                          onTap: () => context.push(cmd.route),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
