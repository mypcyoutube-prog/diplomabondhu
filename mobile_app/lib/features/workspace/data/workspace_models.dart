class WorkspaceNote {
  final String id;
  final String title;
  final String body;
  final bool pinned;
  final bool archived;
  final String? collectionId;

  const WorkspaceNote({
    required this.id,
    required this.title,
    required this.body,
    this.pinned = false,
    this.archived = false,
    this.collectionId,
  });

  factory WorkspaceNote.fromJson(Map<String, dynamic> json) => WorkspaceNote(
        id: json['_id']?.toString() ?? '',
        title: (json['title'] as String?) ?? '',
        body: (json['body'] as String?) ?? '',
        pinned: (json['pinned'] as bool?) ?? false,
        archived: (json['archived'] as bool?) ?? false,
        collectionId: json['collectionId']?.toString(),
      );
}

class WorkspaceCollection {
  final String id;
  final String name;
  final int itemCount;

  const WorkspaceCollection({required this.id, required this.name, this.itemCount = 0});

  factory WorkspaceCollection.fromJson(Map<String, dynamic> json) => WorkspaceCollection(
        id: json['_id']?.toString() ?? '',
        name: (json['name'] as String?) ?? '',
        itemCount: ((json['items'] as List?) ?? const []).length,
      );
}

class WorkspaceRecentItem {
  final String materialId;
  final String title;
  final String? type;

  const WorkspaceRecentItem({required this.materialId, required this.title, this.type});

  factory WorkspaceRecentItem.fromJson(Map<String, dynamic> json) => WorkspaceRecentItem(
        materialId: json['materialId']?.toString() ?? '',
        title: (json['title'] as String?) ?? '',
        type: json['type'] as String?,
      );
}
