import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../core/api/api_exception.dart';
import '../providers/auth_controller.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _emailFormKey = GlobalKey<FormState>();
  final _resetFormKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _code = TextEditingController();
  final _newPassword = TextEditingController();
  final _confirmPassword = TextEditingController();
  bool _stepRequested = false;
  bool _submitting = false;
  bool _obscure = true;
  String? _info;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _code.dispose();
    _newPassword.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  Future<void> _requestReset() async {
    final l10n = AppLocalizations.of(context)!;
    if (_emailFormKey.currentState?.validate() != true) return;
    setState(() {
      _submitting = true;
      _error = null;
      _info = null;
    });
    try {
      await ref.read(authRepositoryProvider).requestPasswordReset(_email.text.trim());
      if (mounted) {
        setState(() {
          _stepRequested = true;
          _info = l10n.requestAccepted;
        });
      }
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = l10n.errorGeneric);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _submitReset() async {
    final l10n = AppLocalizations.of(context)!;
    if (_resetFormKey.currentState?.validate() != true) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ref.read(authRepositoryProvider).resetPassword(
            token: _code.text.trim(),
            newPassword: _newPassword.text,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.resetSuccess)),
        );
        context.go('/login');
      }
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = l10n.errorGeneric);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.forgotPasswordTitle)),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: _stepRequested ? _buildResetForm(l10n) : _buildRequestForm(l10n),
        ),
      ),
    );
  }

  Widget _buildRequestForm(AppLocalizations l10n) {
    return Form(
      key: _emailFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l10n.forgotPasswordIntro),
          const SizedBox(height: 24),
          TextFormField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.email],
            decoration: InputDecoration(labelText: l10n.email),
            validator: (v) {
              final value = v?.trim() ?? '';
              if (value.isEmpty || !value.contains('@') || !value.contains('.')) {
                return l10n.invalidEmail;
              }
              return null;
            },
            onFieldSubmitted: (_) => _requestReset(),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _submitting ? null : _requestReset,
            child: Text(l10n.requestReset),
          ),
        ],
      ),
    );
  }

  Widget _buildResetForm(AppLocalizations l10n) {
    return Form(
      key: _resetFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_info != null)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.secondaryContainer,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(_info!),
            ),
          const SizedBox(height: 24),
          TextFormField(
            controller: _code,
            decoration: InputDecoration(labelText: l10n.resetCode),
            validator: (v) =>
                (v ?? '').trim().length < 20 ? l10n.resetCodeInvalid : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _newPassword,
            obscureText: _obscure,
            decoration: InputDecoration(
              labelText: l10n.newPassword,
              suffixIcon: IconButton(
                onPressed: () => setState(() => _obscure = !_obscure),
                icon: Icon(_obscure
                    ? Icons.visibility_off_rounded
                    : Icons.visibility_rounded),
              ),
            ),
            validator: (v) =>
                (v ?? '').length < 8 ? l10n.passwordTooShort : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _confirmPassword,
            obscureText: _obscure,
            decoration: InputDecoration(labelText: l10n.confirmPassword),
            validator: (v) =>
                v != _newPassword.text ? l10n.passwordsDoNotMatch : null,
            onFieldSubmitted: (_) => _submitReset(),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _submitting ? null : _submitReset,
            child: Text(l10n.resetPassword),
          ),
        ],
      ),
    );
  }
}
