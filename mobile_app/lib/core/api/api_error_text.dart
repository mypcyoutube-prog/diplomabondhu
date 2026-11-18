import '../../app/l10n/generated/app_localizations.dart';
import 'api_exception.dart';

/// Builds a user-facing message from an [ApiException], surfacing the real
/// server message and validation details instead of masking them.
String apiErrorText(ApiException e, AppLocalizations l10n) {
  if (e.code == 'NETWORK' || e.code == 'TIMEOUT') {
    return l10n.errorNetwork;
  }
  final detail = e.details;
  if (detail is List && detail.isNotEmpty) {
    final lines = detail.map((item) {
      if (item is Map) {
        final message = item['message'];
        if (message is String && message.isNotEmpty) return message;
      }
      return item.toString();
    }).join('\n');
    if (lines.isNotEmpty) return lines;
  }
  if (e.message.trim().isNotEmpty) {
    if (e.code == 'HTTP_500' || e.code == 'INTERNAL') return l10n.errorGeneric;
    return e.message;
  }
  return l10n.errorGeneric;
}
