import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../core/api/api_exception.dart';
import '../../../shared/widgets/states.dart';
import '../../auth/providers/auth_controller.dart';
import '../data/result.dart';
import '../providers/result_providers.dart';
import 'result_checker_screen.dart';

/// Result tab: matches the roll saved in the student's profile automatically.
/// Students without a roll get a prompt to add it; nothing is entered twice.
class ResultTabScreen extends ConsumerStatefulWidget {
  const ResultTabScreen({super.key});

  @override
  ConsumerState<ResultTabScreen> createState() => _ResultTabScreenState();
}

class _ResultTabScreenState extends ConsumerState<ResultTabScreen> {
  ResultTimeline? _timeline;
  bool _checking = true;
  bool _notFound = false;
  String? _error;
  String _checkedRoll = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _autoCheck());
  }

  Future<void> _autoCheck() async {
    final user = ref.read(authControllerProvider).value;
    final roll = user?.academic?.roll ?? '';
    if (roll.isEmpty || roll == _checkedRoll) {
      if (mounted) setState(() => _checking = false);
      return;
    }
    _checkedRoll = roll;
    await _load(roll);
  }

  Future<void> _load(String roll) async {
    setState(() {
      _checking = true;
      _error = null;
      _notFound = false;
    });
    try {
      final timeline =
          await ref.read(resultRepositoryProvider).timeline(roll: roll);
      if (!mounted) return;
      setState(() => _timeline = timeline);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        if (e.code == 'NOT_FOUND') {
          _notFound = true;
        } else {
          _error = e.message;
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = AppLocalizations.of(context)!.errorGeneric);
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final user = ref.watch(authControllerProvider).value;
    final roll = user?.academic?.roll ?? '';

    return Scaffold(
      appBar: AppBar(title: Text(l10n.resultTab)),
      body: RefreshIndicator(
        onRefresh: () async {
          _checkedRoll = '';
          await _autoCheck();
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(DbSpacing.md, DbSpacing.md,
              DbSpacing.md, DbSpacing.xl),
          children: [
            if (roll.isEmpty)
              Container(
                padding: const EdgeInsets.all(DbSpacing.lg),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardColor,
                  borderRadius: BorderRadius.circular(DbRadius.card),
                  boxShadow: DbShadows.card,
                ),
                child: Column(
                  children: [
                    Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [DbColors.teal, DbColors.emerald],
                        ),
                        borderRadius: BorderRadius.circular(DbRadius.input),
                      ),
                      child: const Icon(Icons.badge_outlined,
                          color: Colors.white, size: 36),
                    ),
                    const SizedBox(height: DbSpacing.md),
                    Text(
                      l10n.addRollHint,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: DbSpacing.md),
                    FilledButton.icon(
                      onPressed: () => context.push('/profile'),
                      icon: const Icon(Icons.person_rounded),
                      label: Text(l10n.openProfile),
                    ),
                  ],
                ),
              )
            else ...[
              if (_checking) const DbLoadingView()
              else if (_error != null)
                DbErrorView(message: _error!, onRetry: () => _load(roll))
              else if (_notFound)
                DbEmptyView(
                  message: l10n.noResultSaved,
                  icon: Icons.search_off_rounded,
                )
              else if (_timeline != null)
                Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(DbRadius.card),
                    boxShadow: DbShadows.card,
                  ),
                  child: ResultTimelineCard(timeline: _timeline!),
                ),
            ],
            if (roll.isNotEmpty && !_checking) ...[
              const SizedBox(height: DbSpacing.md),
              Center(
                child: OutlinedButton.icon(
                  onPressed: () => context.push('/results/checker'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: DbColors.teal,
                    side: BorderSide(
                      color: DbColors.teal.withValues(alpha: 0.4),
                    ),
                  ),
                  icon: const Icon(Icons.search_rounded),
                  label: Text(l10n.resultChecker),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
