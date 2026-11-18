import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/providers.dart';
import '../data/auth_repository.dart';
import '../data/user.dart';

/// Session state machine: `unknown` while restoring, then authenticated or not.
enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthController extends AsyncNotifier<User?> {
  @override
  Future<User?> build() async {
    final client = ref.watch(apiClientProvider);
    final storage = ref.watch(tokenStorageProvider);
    final repo = AuthRepository(client, storage);

    client.refreshExecutor = () async {
      final refresh = await storage.readRefreshToken();
      if (refresh == null || refresh.isEmpty) return null;
      final res = await client.postMap('/auth/refresh', body: {'refreshToken': refresh});
      final access = res['accessToken'] as String?;
      final newRefresh = res['refreshToken'] as String?;
      final user = res['user'] as Map<String, dynamic>?;
      if (access == null || newRefresh == null) return null;
      await storage.writeTokens(accessToken: access, refreshToken: newRefresh);
      state = AsyncData(user == null ? null : User.fromJson(user));
      return (accessToken: access, refreshToken: newRefresh);
    };
    client.onSessionExpired = () {
      state = const AsyncData(null);
    };

    try {
      final user = await repo.restore();
      return user.isStudent ? user : null;
    } on ApiException {
      return null;
    } catch (_) {
      return null;
    }
  }

  AuthRepository _repo() {
    final client = ref.read(apiClientProvider);
    final storage = ref.read(tokenStorageProvider);
    return AuthRepository(client, storage);
  }

  Future<void> login(String email, String password) async {
    final repo = _repo();
    final user = await repo.login(email: email, password: password);
    if (!user.isStudent) {
      await repo.logout();
      throw const ApiException('FORBIDDEN', 'Use the admin panel for staff accounts');
    }
    state = AsyncData(user);
  }

  Future<void> register({
    required String name,
    required String email,
    required String password,
    String? phone,
  }) async {
    final user = await _repo().register(
      name: name,
      email: email,
      password: password,
      phone: phone,
    );
    state = AsyncData(user);
  }

  Future<void> logout() async {
    await _repo().logout();
    state = const AsyncData(null);
  }
}

final authControllerProvider =
    AsyncNotifierProvider<AuthController, User?>(AuthController.new);

final authStatusProvider = Provider<AuthStatus>((ref) {
  final auth = ref.watch(authControllerProvider);
  return auth.when(
    data: (user) => user != null ? AuthStatus.authenticated : AuthStatus.unauthenticated,
    loading: () => AuthStatus.unknown,
    error: (_, _) => AuthStatus.unauthenticated,
  );
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    ref.watch(apiClientProvider),
    ref.watch(tokenStorageProvider),
  );
});
