import 'package:material_ui/material_ui.dart' hide Material;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../../../shared/widgets/states.dart';
import '../data/material.dart';
import '../providers/library_providers.dart';

class BookmarksScreen extends ConsumerStatefulWidget {
  const BookmarksScreen({super.key});

  @override
  ConsumerState<BookmarksScreen> createState() => _BookmarksScreenState();
}

class _BookmarksScreenState extends ConsumerState<BookmarksScreen> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final bookmarks = ref.watch(bookmarksProvider);
    final filtered = bookmarks.valueOrNull
        ?.where((m) =>
            _query.isEmpty ||
            m.title.toLowerCase().contains(_query.toLowerCase()))
        .toList() ??
        const <Material>[];

    return Scaffold(
      appBar: AppBar(title: Text(l10n.myBookmarks)),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              decoration: InputDecoration(
                hintText: l10n.searchHint,
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: _query.isNotEmpty
                    ? IconButton(
                        tooltip: l10n.cancel,
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => setState(() => _query = ''),
                      )
                    : null,
              ),
              textInputAction: TextInputAction.search,
              onChanged: (q) => setState(() => _query = q),
            ),
          ),
          Expanded(
            child: AsyncValueView(
              value: bookmarks,
              onRetry: () => ref.invalidate(bookmarksProvider),
              isEmpty: (_) => filtered.isEmpty,
              emptyIcon: Icons.bookmarks_rounded,
              builder: (context, _) => RefreshIndicator(
                onRefresh: () async => ref.invalidate(bookmarksProvider),
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: filtered.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, i) {
                    final material = filtered[i];
                    return Card(
                      clipBehavior: Clip.antiAlias,
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: DbSpacing.md, vertical: DbSpacing.xs),
                        leading: Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [DbColors.teal, DbColors.emerald],
                            ),
                            borderRadius: BorderRadius.circular(DbRadius.input),
                          ),
                          child: const Icon(Icons.bookmark_rounded,
                              color: Colors.white, size: 22),
                        ),
                        title: Text(
                          material.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        subtitle: material.payload.examYear != null
                            ? Text('${l10n.examYearLabel}: ${material.payload.examYear}')
                            : null,
                        trailing: IconButton(
                          tooltip: l10n.cancel,
                          icon: const Icon(Icons.bookmark_remove_rounded,
                              color: DbColors.errorLight),
                          onPressed: () async {
                            await ref
                                .read(materialRepositoryProvider)
                                .removeBookmark(material.id);
                            ref.invalidate(bookmarksProvider);
                            ref.invalidate(isBookmarkedProvider(material.id));
                          },
                        ),
                        onTap: () => context.push('/library/${material.id}'),
                      ),
                    );
                  },
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
