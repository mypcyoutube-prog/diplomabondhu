import '../../../core/api/api_client.dart';
import '../../../core/storage/token_storage.dart';
import 'user.dart';

class AuthRepository {
  final ApiClient _client;
  final TokenStorage _tokens;

  AuthRepository(this._client, this._tokens);

  Future<User> login({required String email, required String password}) async {
    final res = await _client.postMap('/auth/login', body: {
      'email': email,
      'password': password,
    });
    return _persist(res);
  }

  Future<void> requestPasswordReset(String email) async {
    await _client.postMap('/auth/forgot-password', body: {'email': email});
  }

  Future<void> resetPassword({required String token, required String newPassword}) async {
    await _client.postMap('/auth/reset-password', body: {
      'token': token,
      'newPassword': newPassword,
    });
  }

  Future<User> register({
    required String name,
    required String email,
    required String password,
    String? phone,
  }) async {
    final body = <String, dynamic>{
      'name': name,
      'email': email,
      'password': password,
    };
    if (phone != null && phone.isNotEmpty) body['phone'] = phone;
    final res = await _client.postMap('/auth/register', body: body);
    return _persist(res);
  }

  Future<User> updateProfile({String? name, String? phone, String? roll, String? registrationNo}) async {
    final body = <String, dynamic>{};
    if (name != null && name.trim().isNotEmpty) body['name'] = name.trim();
    if (phone != null && phone.trim().isNotEmpty) body['phone'] = phone.trim();
    if (roll != null && roll.trim().isNotEmpty) body['roll'] = roll.trim();
    if (registrationNo != null && registrationNo.trim().isNotEmpty) body['registrationNo'] = registrationNo.trim();
    if (body.isEmpty) return restore();
    final res = await _client.patchMap('/users/me', body: body);
    return User.fromJson(res['user'] as Map<String, dynamic>);
  }

  Future<User> restore() async {
    final refresh = await _tokens.readRefreshToken();
    final access = await _tokens.readAccessToken();
    if (refresh == null || refresh.isEmpty) {
      throw const ApiException('UNAUTHENTICATED', 'No session');
    }
    if (access != null && access.isNotEmpty) {
      try {
        final res = await _client.getMap('/auth/me');
        return User.fromJson(res.data['user'] as Map<String, dynamic>);
      } on ApiException catch (e) {
        if (!e.isUnauthenticated) rethrow;
      }
    }
    final user = await _refresh();
    if (!user.isStudent) {
      await _tokens.clear();
      throw const ApiException('FORBIDDEN', 'Use the admin panel for staff accounts');
    }
    return user;
  }

  Future<User> _refresh() async {
    final refresh = await _tokens.readRefreshToken();
    if (refresh == null || refresh.isEmpty) {
      throw const ApiException('UNAUTHENTICATED', 'No session');
    }
    final res = await _client.postMap('/auth/refresh', body: {'refreshToken': refresh});
    return _persist(res);
  }

  Future<void> logout() async {
    final refresh = await _tokens.readRefreshToken();
    try {
      if (refresh != null && refresh.isNotEmpty) {
        await _client.postMap('/auth/logout', body: {'refreshToken': refresh});
      }
    } on ApiException {
      // Best-effort: local session must be cleared even if the call fails.
    }
    await _tokens.clear();
  }

  Future<User> _persist(Map<String, dynamic> res) async {
    final accessToken = res['accessToken'] as String?;
    final refreshToken = res['refreshToken'] as String?;
    if (accessToken == null || refreshToken == null) {
      throw const ApiException('INTERNAL', 'Auth response missing tokens');
    }
    await _tokens.writeTokens(accessToken: accessToken, refreshToken: refreshToken);
    return User.fromJson(res['user'] as Map<String, dynamic>);
  }
}
