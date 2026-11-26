import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../data/planner_models.dart';
import '../providers/planner_providers.dart';

class PlannerScreen extends ConsumerWidget {
  const PlannerScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final tasks = ref.watch(tasksProvider);
    final goals = ref.watch(goalsProvider);

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: Text(l10n.planner),
          bottom: TabBar(
            tabs: [Tab(text: l10n.today), Tab(text: l10n.tasks), Tab(text: l10n.goals)],
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.add_rounded),
              onPressed: () => _addTask(context, ref),
            ),
          ],
        ),
        body: TabBarView(
          children: [
            AsyncValueView(
              value: tasks,
              onRetry: () => ref.invalidate(tasksProvider),
              isEmpty: (t) => t.where((x) => !x.isDone).isEmpty,
              emptyIcon: Icons.task_alt_rounded,
              builder: (context, t) {
                final all = t.toList();
                final done = all.where((x) => x.isDone).length;
                final percent = all.isEmpty ? 0 : (done * 100 ~/ all.length);
                return Column(
                  children: [
                    Container(
                      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                      padding: const EdgeInsets.all(DbSpacing.md),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [DbColors.navy, DbColors.navyDark],
                        ),
                        borderRadius: BorderRadius.circular(DbRadius.card),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                l10n.todayProgress,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13,
                                ),
                              ),
                              Text(
                                '$done/${all.length} ${l10n.tasksDone}',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.8),
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: DbSpacing.sm),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(DbRadius.full),
                            child: LinearProgressIndicator(
                              value: percent / 100,
                              color: DbColors.emeraldDark,
                              backgroundColor: Colors.white24,
                              minHeight: 8,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: _TaskList(
                        tasks: all.where((x) => !x.isDone).toList(),
                      ),
                    ),
                  ],
                );
              },
            ),
            AsyncValueView(
              value: tasks,
              onRetry: () => ref.invalidate(tasksProvider),
              isEmpty: (t) => t.isEmpty,
              emptyIcon: Icons.task_alt_rounded,
              builder: (context, t) => _TaskList(tasks: t.toList()),
            ),
            AsyncValueView(
              value: goals,
              onRetry: () => ref.invalidate(goalsProvider),
              isEmpty: (g) => g.isEmpty,
              emptyIcon: Icons.track_changes_rounded,
              builder: (context, g) => ListView(
                padding: const EdgeInsets.all(16),
                children: g
                    .map((goal) => Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(goal.title,
                                    style: const TextStyle(fontWeight: FontWeight.w600)),
                                const SizedBox(height: 8),
                                LinearProgressIndicator(
                                  value: goal.progressPercent / 100,
                                  color: DbColors.emerald,
                                  minHeight: 6,
                                ),
                                const SizedBox(height: 4),
                                Text('${goal.progressPercent}%'),
                              ],
                            ),
                          ),
                        ))
                    .toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _addTask(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context)!;
    final controller = TextEditingController();
    final created = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.addTask),
        content: TextField(controller: controller, maxLength: 300),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l10n.cancel)),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(l10n.save)),
        ],
      ),
    );
    if (created != true || controller.text.trim().length < 2) return;
    try {
      await ref.read(plannerRepositoryProvider).createTask(title: controller.text.trim());
      ref.invalidate(tasksProvider);
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(l10n.errorGeneric)));
      }
    }
  }
}

class _TaskList extends ConsumerWidget {
  final List<Task> tasks;

  const _TaskList({required this.tasks});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: tasks.length,
      separatorBuilder: (_, _) => const SizedBox(height: 8),
      itemBuilder: (context, i) {
        final task = tasks[i];
        return Card(
          child: CheckboxListTile(
            value: task.isDone,
            controlAffinity: ListTileControlAffinity.leading,
            onChanged: (v) async {
              try {
                await ref.read(plannerRepositoryProvider).setTaskStatus(task.id, v ?? false);
                ref.invalidate(tasksProvider);
              } catch (_) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context)
                      .showSnackBar(SnackBar(content: Text(l10n.errorGeneric)));
                }
              }
            },
            title: Text(
              task.title,
              style: task.isDone
                  ? const TextStyle(decoration: TextDecoration.lineThrough)
                  : null,
            ),
            subtitle: task.dueAt != null
                ? Text(
                    task.dueAt!.toLocal().toString().split('.').first,
                    style: TextStyle(
                      color: task.isOverdue ? DbColors.errorLight : null,
                    ),
                  )
                : null,
          ),
        );
      },
    );
  }
}
