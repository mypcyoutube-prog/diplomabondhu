import 'package:diplomabondhu/app/l10n/generated/app_localizations.dart';
import 'package:diplomabondhu/core/providers.dart';
import 'package:diplomabondhu/features/auth/data/user.dart';
import 'package:diplomabondhu/features/auth/providers/auth_controller.dart';
import 'package:diplomabondhu/core/storage/token_storage.dart';
import 'package:diplomabondhu/features/auth/screens/login_screen.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _FakeAuthController extends AuthController {
  @override
  Future<User?> build() async => null;

  @override
  Future<void> login(String email, String password) async {}

  @override
  Future<void> register({
    required String name,
    required String email,
    required String password,
    String? phone,
  }) async {}
}

Future<void> pumpLogin(WidgetTester tester) async {
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(AsyncValue.data(prefs)),
        tokenStorageProvider.overrideWithValue(InMemoryTokenStorage()),
        authControllerProvider.overrideWith(() => _FakeAuthController()),
      ],
      child: MaterialApp(
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: [
          AppLocalizations.delegate,
          ...GlobalMaterialLocalizations.delegates,
        ],
        locale: const Locale('en'),
        home: const LoginScreen(),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('empty form shows validation errors', (tester) async {
    await pumpLogin(tester);
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();

    expect(find.text('Enter a valid email'), findsOneWidget);
    expect(find.text('Password must be at least 8 characters'), findsOneWidget);
  });

  testWidgets('invalid email shows validation error', (tester) async {
    await pumpLogin(tester);
    await tester.enterText(find.byType(TextFormField).at(0), 'not-an-email');
    await tester.enterText(find.byType(TextFormField).at(1), 'password123');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();

    expect(find.text('Enter a valid email'), findsOneWidget);
  });

  testWidgets('valid input clears validation errors', (tester) async {
    await pumpLogin(tester);
    await tester.enterText(find.byType(TextFormField).at(0), 'student@example.com');
    await tester.enterText(find.byType(TextFormField).at(1), 'password123');
    await tester.tap(find.byType(FilledButton));
    await tester.pump();

    expect(find.text('Enter a valid email'), findsNothing);
    expect(find.text('Password must be at least 8 characters'), findsNothing);
  });
}
