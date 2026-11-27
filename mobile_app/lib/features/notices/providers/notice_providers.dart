import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/notice.dart';

final publishedNoticesProvider =
    FutureProvider.autoDispose.family<List<Notice>, String>((ref, source) async {
  final client = ref.watch(apiClientProvider);
  final query = (source == 'admin' || source == 'bteb')
      ? '?source=$source&limit=100'
      : '?limit=100';
  final res = await client.getMap('/notifications/announcements/published$query');
  return (res.data['items'] as List? ?? [])
      .map((e) => Notice.fromJson(e as Map<String, dynamic>))
      .toList();
});

final noticeDetailProvider =
    FutureProvider.autoDispose.family<Notice, String>((ref, id) async {
  final client = ref.watch(apiClientProvider);
  final res = await client.getMap('/notifications/announcements/published/$id');
  return Notice.fromJson(res.data['item'] as Map<String, dynamic>);
});
