import 'dart:async';
import 'dart:convert';
import 'dart:collection';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:diplomabondhu/core/api/api_client.dart';
import 'package:diplomabondhu/core/storage/token_storage.dart';

void main() {
  late InMemoryTokenStorage storage;

  setUp(() {
    storage = InMemoryTokenStorage();
  });

  ApiClient clientWith(
    Dio dio, {
    RefreshExecutor? refreshExecutor,
    void Function()? onSessionExpired,
  }) {
    final client = ApiClient(
      baseUrl: 'http://localhost:4100/api/v1',
      tokenStorage: storage,
      dio: dio,
    );
    client.refreshExecutor = refreshExecutor;
    client.onSessionExpired = onSessionExpired;
    return client;
  }

  void enqueue(Dio dio, Iterable<ResponsePayload> responses) {
    final queue = Queue<ResponsePayload>.from(responses);
    dio.httpClientAdapter = _MockAdapter(queue);
  }

  group('ApiClient envelope parsing', () {
    test('unwrap returns data on success envelope', () async {
      final dio = Dio(BaseOptions(baseUrl: 'http://localhost'));
      enqueue(dio, [
        ResponsePayload(200, {
          'success': true,
          'data': {'id': 'u1', 'name': 'Rahim'},
        }),
      ]);
      final client = clientWith(dio);
      final res = await client.getMap('/users/me');
      expect(res.data['name'], 'Rahim');
    });

    test('unwrap throws ApiException with backend error code', () async {
      final dio = Dio(BaseOptions(baseUrl: 'http://localhost'));
      enqueue(dio, [
        ResponsePayload(400, {
          'success': false,
          'error': {'code': 'VALIDATION_ERROR', 'message': 'Invalid email'},
        }),
      ]);
      final client = clientWith(dio);
      await expectLater(
        client.getMap('/users/me'),
        throwsA(isA<ApiException>().having(
          (e) => e.code, 'code', 'VALIDATION_ERROR',
        )),
      );
    });
  });

  group('ApiClient refresh-on-401', () {
    test('retries original request after successful refresh', () async {
      final dio = Dio(BaseOptions(baseUrl: 'http://localhost'));
      enqueue(dio, [
        ResponsePayload(401, {
          'success': false,
          'error': {'code': 'UNAUTHENTICATED', 'message': 'expired'},
        }),
        ResponsePayload(200, {
          'success': true,
          'data': {'id': 'u1'},
        }),
      ]);
      var refreshCalls = 0;
      final client = clientWith(
        dio,
        refreshExecutor: () async {
          refreshCalls++;
          await storage.writeTokens(accessToken: 'a2', refreshToken: 'r2');
          return (accessToken: 'a2', refreshToken: 'r2');
        },
      );
      final res = await client.getMap('/users/me');
      expect(res.data['id'], 'u1');
      expect(refreshCalls, 1);
      expect(await storage.readAccessToken(), 'a2');
    });

    test('forces logout when refresh fails', () async {
      final dio = Dio(BaseOptions(baseUrl: 'http://localhost'));
      enqueue(dio, [
        ResponsePayload(401, {
          'success': false,
          'error': {'code': 'UNAUTHENTICATED', 'message': 'expired'},
        }),
      ]);
      var sessionExpired = false;
      final client = clientWith(
        dio,
        refreshExecutor: () async => null,
        onSessionExpired: () => sessionExpired = true,
      );
      await expectLater(
        client.getMap('/users/me'),
        throwsA(isA<ApiException>()),
      );
      expect(sessionExpired, true);
      expect(await storage.readAccessToken(), isNull);
    });
  });
}

class ResponsePayload {
  final int statusCode;
  final Object body;
  const ResponsePayload(this.statusCode, this.body);
}

class _MockAdapter implements HttpClientAdapter {
  final Queue<ResponsePayload> _queue;

  _MockAdapter(this._queue);

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (_queue.isEmpty) {
      fail('Unexpected request: ${options.method} ${options.path}');
    }
    final payload = _queue.removeFirst();
    return ResponseBody.fromString(
      jsonEncode(payload.body),
      payload.statusCode,
      headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
    );
  }
}
