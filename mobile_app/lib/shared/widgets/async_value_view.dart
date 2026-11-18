import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/l10n/generated/app_localizations.dart';
import 'states.dart';

/// Renders the three mandatory async states (loading / error / empty) for any
/// `AsyncValue`. `hasData` on an empty-but-successful list should pass `isEmpty`.
class AsyncValueView<T> extends StatelessWidget {
  final AsyncValue<T> value;
  final Widget Function(BuildContext context, T data) builder;
  final bool Function(T data)? isEmpty;
  final VoidCallback? onRetry;
  final IconData emptyIcon;

  const AsyncValueView({
    super.key,
    required this.value,
    required this.builder,
    this.isEmpty,
    this.onRetry,
    this.emptyIcon = Icons.inbox_rounded,
  });

  @override
  Widget build(BuildContext context) {
    return value.when(
      loading: () => const DbLoadingView(),
      error: (error, _) => DbErrorView(
        message: AppLocalizations.of(context)!.errorGeneric,
        onRetry: onRetry,
      ),
      data: (data) {
        if (isEmpty?.call(data) ?? false) {
          return DbEmptyView(
            message: AppLocalizations.of(context)!.emptyGeneric,
            icon: emptyIcon,
          );
        }
        return builder(context, data);
      },
    );
  }
}
