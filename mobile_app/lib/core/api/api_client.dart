import 'dart:async';

import 'package:dio/dio.dart';

import '../storage/token_storage.dart';
import 'api_exception.dart';

export 'api_exception.dart';

/// Shape returned by every backend endpoint:
/// `{ success: true, data: ..., meta?: ... }` or
/// `{ success: false, error: { code, message, details? } }`.
class Envelope<T> {
  final T data;
  final Object? meta;

  const Envelope({required this.data, this.meta});
}

typedef RefreshExecutor = Future<({String accessToken, String refreshToken})?> Function();

class ApiClient {
  final Dio dio;
  final TokenStorage tokenStorage;
  RefreshExecutor? refreshExecutor;
  void Function()? onSessionExpired;

  Future<({String accessToken, String refreshToken})?>? _inFlightRefresh;

  ApiClient({
    required String baseUrl,
    required this.tokenStorage,
    this.refreshExecutor,
    this.onSessionExpired,
    Dio? dio,
  }) : dio = dio ?? Dio() {
    this.dio.options
      ..baseUrl = baseUrl
      ..connectTimeout = const Duration(seconds: 15)
      ..receiveTimeout = const Duration(seconds: 20)
      ..headers = {'Accept': 'application/json'};
    this.dio.interceptors.add(InterceptorsWrapper(onRequest: _onRequest, onError: _onError));
  }

  Future<void> _onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await tokenStorage.readAccessToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  Future<void> _onError(DioException err, ErrorInterceptorHandler handler) async {
    final response = err.response;
    final isAuthError = response?.statusCode == 401;
    final isRefreshCall = err.requestOptions.path.contains('/auth/refresh');
    final alreadyRetried = err.requestOptions.extra['__retried_after_refresh__'] == true;

    if (!isAuthError || isRefreshCall || alreadyRetried || refreshExecutor == null) {
      handler.next(err);
      return;
    }

    try {
      final tokens = await _refreshOnce();
      if (tokens == null) {
        await _forceLogout();
        handler.next(err);
        return;
      }
      final opts = err.requestOptions;
      opts.extra['__retried_after_refresh__'] = true;
      opts.headers['Authorization'] = 'Bearer ${tokens.accessToken}';
      final retried = await dio.fetch<dynamic>(opts);
      handler.resolve(retried);
    } on ApiException {
      await _forceLogout();
      handler.next(err);
    } catch (_) {
      handler.next(err);
    }
  }

  /// Runs the refresh flow at most once concurrently; parallel 401s share it.
  Future<({String accessToken, String refreshToken})?> _refreshOnce() {
    final existing = _inFlightRefresh;
    if (existing != null) return existing;
    final future = _doRefresh();
    _inFlightRefresh = future;
    return future.whenComplete(() => _inFlightRefresh = null);
  }

  Future<({String accessToken, String refreshToken})?> _doRefresh() async {
    try {
      return await refreshExecutor!();
    } on ApiException {
      rethrow;
    } catch (_) {
      throw const ApiException('NETWORK', 'Refresh failed');
    }
  }

  Future<void> _forceLogout() async {
    await tokenStorage.clear();
    onSessionExpired?.call();
  }

  Future<T> unwrap<T>(Response<dynamic> response) async {
    final body = response.data;
    if (body is! Map<String, dynamic>) {
      throw const ApiException('INTERNAL', 'Malformed response from server');
    }
    final success = body['success'];
    if (success != true) {
      final error = body['error'];
      throw ApiException(
        error is Map<String, dynamic> ? (error['code'] as String? ?? 'INTERNAL') : 'INTERNAL',
        error is Map<String, dynamic> ? (error['message'] as String? ?? 'Request failed') : 'Request failed',
        statusCode: response.statusCode,
        details: error is Map<String, dynamic> ? error['details'] : null,
      );
    }
    final data = body['data'];
    if (data is T) return data;
    throw const ApiException('INTERNAL', 'Unexpected response payload type');
  }

  Object? _meta(Response<dynamic> res) {
    final body = res.data;
    if (body is Map<String, dynamic>) return body['meta'];
    return null;
  }

  Future<Envelope<Map<String, dynamic>>> getMap(String path, {Map<String, dynamic>? query}) async {
    try {
      final res = await dio.get<dynamic>(path, queryParameters: query);
      return Envelope(data: await unwrap<Map<String, dynamic>>(res), meta: _meta(res));
    } on DioException catch (e) {
      throw _mapDio(e);
    }
  }

  Future<Envelope<List<dynamic>>> getList(String path, {Map<String, dynamic>? query}) async {
    try {
      final res = await dio.get<dynamic>(path, queryParameters: query);
      return Envelope(data: await unwrap<List<dynamic>>(res), meta: _meta(res));
    } on DioException catch (e) {
      throw _mapDio(e);
    }
  }

  Future<Map<String, dynamic>> postMap(String path, {Object? body}) async {
    try {
      final res = await dio.post<dynamic>(path, data: body);
      return await unwrap<Map<String, dynamic>>(res);
    } on DioException catch (e) {
      throw _mapDio(e);
    }
  }

  Future<Map<String, dynamic>> patchMap(String path, {Object? body}) async {
    try {
      final res = await dio.patch<dynamic>(path, data: body);
      return await unwrap<Map<String, dynamic>>(res);
    } on DioException catch (e) {
      throw _mapDio(e);
    }
  }

  Future<Map<String, dynamic>> putMap(String path, {Object? body}) async {
    try {
      final res = await dio.put<dynamic>(path, data: body);
      return await unwrap<Map<String, dynamic>>(res);
    } on DioException catch (e) {
      throw _mapDio(e);
    }
  }

  Future<Map<String, dynamic>> deleteMap(String path, {Object? body}) async {
    try {
      final res = await dio.delete<dynamic>(path, data: body);
      return await unwrap<Map<String, dynamic>>(res);
    } on DioException catch (e) {
      throw _mapDio(e);
    }
  }

  ApiException _mapDio(DioException e) {
    final res = e.response;
    if (res != null) {
      final body = res.data;
      if (body is Map<String, dynamic>) {
        final error = body['error'];
        if (error is Map<String, dynamic>) {
          return ApiException(
            error['code'] as String? ?? 'INTERNAL',
            error['message'] as String? ?? 'Request failed',
            statusCode: res.statusCode,
            details: error['details'],
          );
        }
      }
      return ApiException('HTTP_${res.statusCode}', 'Request failed', statusCode: res.statusCode);
    }
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.sendTimeout) {
      return const ApiException('TIMEOUT', 'Connection timed out');
    }
    return const ApiException('NETWORK', 'You appear to be offline');
  }
}
