import 'package:material_ui/material_ui.dart';
import 'package:go_router/go_router.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../shared/widgets/pressable_scale.dart';

class GpaHubScreen extends StatelessWidget {
  const GpaHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final items = <(String, IconData, String)>[
      (l10n.cgpa, Icons.functions_rounded, '/gpa/cgpa'),
      (l10n.resultHistory, Icons.history_rounded, '/gpa/history'),
    ];

    return Scaffold(
      appBar: AppBar(title: Text(l10n.cgpa)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(DbSpacing.lg),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [DbColors.navy, DbColors.navyDark],
              ),
              borderRadius: BorderRadius.circular(DbRadius.card),
              boxShadow: DbShadows.card,
            ),
            child: Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(DbRadius.input),
                  ),
                  child: const Icon(Icons.functions_rounded,
                      color: Colors.white, size: 28),
                ),
                const SizedBox(width: DbSpacing.md),
                Expanded(
                  child: Text(
                    l10n.cgpa,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: DbSpacing.md),
          for (final item in items)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: PressableScale(
                onTap: () => context.push(item.$3),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: DbSpacing.md, vertical: DbSpacing.md),
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardColor,
                    borderRadius: BorderRadius.circular(DbRadius.card),
                    boxShadow: DbShadows.card,
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [DbColors.teal, DbColors.emerald],
                          ),
                          borderRadius: BorderRadius.circular(DbRadius.input),
                        ),
                        child: Icon(item.$2, color: Colors.white, size: 22),
                      ),
                      const SizedBox(width: DbSpacing.md),
                      Expanded(
                        child: Text(item.$1,
                            style: const TextStyle(
                                fontWeight: FontWeight.w600)),
                      ),
                      const Icon(Icons.chevron_right_rounded),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
