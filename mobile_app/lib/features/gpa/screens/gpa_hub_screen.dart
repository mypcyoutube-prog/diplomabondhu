import 'package:material_ui/material_ui.dart';
import 'package:go_router/go_router.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';

class GpaHubScreen extends StatelessWidget {
  const GpaHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final items = <(String, IconData, String)>[
      (l10n.semesterGpa, Icons.calculate_rounded, '/gpa/semester'),
      (l10n.cgpa, Icons.functions_rounded, '/gpa/cgpa'),
      (l10n.resultHistory, Icons.history_rounded, '/gpa/history'),
      (l10n.targetPlanner, Icons.track_changes_rounded, '/gpa/target'),
    ];

    return Scaffold(
      appBar: AppBar(title: Text(l10n.gpa)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          for (final item in items)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Card(
                child: ListTile(
                  leading: Icon(item.$2, color: DbColors.teal),
                  title: Text(item.$1,
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => context.push(item.$3),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
