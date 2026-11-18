class ApiException implements Exception {
  final String code;
  final String message;
  final int? statusCode;
  final Object? details;

  const ApiException(this.code, this.message, {this.statusCode, this.details});

  bool get isUnauthenticated => code == 'UNAUTHENTICATED';
  bool get isValidationError => code == 'VALIDATION_ERROR';
  bool get isRateLimited => code == 'RATE_LIMITED';

  @override
  String toString() => 'ApiException($code: $message)';
}
