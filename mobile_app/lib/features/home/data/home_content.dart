/// Typed models for the public Home Management API response.
///
/// Contract: `GET /api/v1/home/content` returns only published, visible,
/// schedule-live content; absent section keys mean the admin hid them or
/// there is nothing to show, so they parse as empty lists.
class HomeContent {
  final List<HomeQuickItem> quickAccess;
  final List<HomeResource> studyResources;
  final List<HomeNoticeItem> notices;
  final List<HomeExamItem> upcomingExams;
  final List<HomeFeaturedPost> featuredPosts;
  final HomeWelcome welcome;

  const HomeContent({
    required this.quickAccess,
    required this.studyResources,
    required this.notices,
    required this.upcomingExams,
    required this.featuredPosts,
    required this.welcome,
  });

  factory HomeContent.fromJson(Map<String, dynamic> json) {
    return HomeContent(
      quickAccess: (json['quickAccess'] as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(HomeQuickItem.fromJson)
          .toList(),
      studyResources: (json['studyResources'] as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(HomeResource.fromJson)
          .toList(),
      notices: (json['notices'] as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(HomeNoticeItem.fromJson)
          .toList(),
      upcomingExams: (json['upcomingExams'] as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(HomeExamItem.fromJson)
          .toList(),
      featuredPosts: (json['featuredPosts'] as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(HomeFeaturedPost.fromJson)
          .toList(),
      welcome: HomeWelcome.fromJson(
          json['welcome'] as Map<String, dynamic>? ?? {}),
    );
  }
}

class HomeWelcome {
  final String messageEn;
  final String messageBn;
  final bool visible;

  const HomeWelcome({
    required this.messageEn,
    required this.messageBn,
    required this.visible,
  });

  factory HomeWelcome.fromJson(Map<String, dynamic> json) {
    return HomeWelcome(
      messageEn: json['messageEn'] as String? ?? '',
      messageBn: json['messageBn'] as String? ?? '',
      visible: json['visible'] as bool? ?? true,
    );
  }
}

class HomeQuickItem {
  final String slug;
  final String titleEn;
  final String titleBn;
  final String subtitleEn;
  final String subtitleBn;
  final String icon;
  final String route;
  final String bgColor;
  final String fgColor;
  final int displayOrder;

  const HomeQuickItem({
    required this.slug,
    required this.titleEn,
    required this.titleBn,
    required this.subtitleEn,
    required this.subtitleBn,
    required this.icon,
    required this.route,
    required this.bgColor,
    required this.fgColor,
    required this.displayOrder,
  });

  factory HomeQuickItem.fromJson(Map<String, dynamic> json) {
    return HomeQuickItem(
      slug: json['slug'] as String? ?? '',
      titleEn: json['titleEn'] as String? ?? '',
      titleBn: json['titleBn'] as String? ?? '',
      subtitleEn: json['subtitleEn'] as String? ?? '',
      subtitleBn: json['subtitleBn'] as String? ?? '',
      icon: json['icon'] as String? ?? '',
      route: json['route'] as String? ?? '',
      bgColor: json['bgColor'] as String? ?? '',
      fgColor: json['fgColor'] as String? ?? '',
      displayOrder: (json['displayOrder'] as num?)?.toInt() ?? 0,
    );
  }
}

class HomeResource {
  final String slug;
  final String titleEn;
  final String titleBn;
  final String icon;
  final String route;
  final String bgColor;
  final String fgColor;
  final List<String> materialTypes;
  final int displayOrder;
  final int count;

  const HomeResource({
    required this.slug,
    required this.titleEn,
    required this.titleBn,
    required this.icon,
    required this.route,
    required this.bgColor,
    required this.fgColor,
    required this.materialTypes,
    required this.displayOrder,
    required this.count,
  });

  factory HomeResource.fromJson(Map<String, dynamic> json) {
    return HomeResource(
      slug: json['slug'] as String? ?? '',
      titleEn: json['titleEn'] as String? ?? '',
      titleBn: json['titleBn'] as String? ?? '',
      icon: json['icon'] as String? ?? '',
      route: json['route'] as String? ?? '',
      bgColor: json['bgColor'] as String? ?? '',
      fgColor: json['fgColor'] as String? ?? '',
      materialTypes: (json['materialTypes'] as List? ?? [])
          .whereType<String>()
          .toList(),
      displayOrder: (json['displayOrder'] as num?)?.toInt() ?? 0,
      count: (json['count'] as num?)?.toInt() ?? 0,
    );
  }
}

class HomeNoticeItem {
  final String id;
  final String title;
  final String body;
  final String source;
  final String pdfUrl;
  final DateTime? publishedAt;

  const HomeNoticeItem({
    required this.id,
    required this.title,
    required this.body,
    required this.source,
    required this.pdfUrl,
    required this.publishedAt,
  });

  factory HomeNoticeItem.fromJson(Map<String, dynamic> json) {
    return HomeNoticeItem(
      id: json['_id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? '',
      source: json['source'] as String? ?? 'admin',
      pdfUrl: json['pdfUrl'] as String? ?? '',
      publishedAt: json['publishedAt'] is String
          ? DateTime.tryParse(json['publishedAt'] as String)
          : null,
    );
  }

  bool get isBteb => source == 'bteb';
}

class HomeExamItem {
  final String id;
  final String title;
  final String description;
  final String type;
  final int durationSec;
  final DateTime? scheduledAt;

  const HomeExamItem({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    required this.durationSec,
    required this.scheduledAt,
  });

  factory HomeExamItem.fromJson(Map<String, dynamic> json) {
    return HomeExamItem(
      id: json['_id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      type: json['type'] as String? ?? '',
      durationSec: (json['durationSec'] as num?)?.toInt() ?? 0,
      scheduledAt: json['scheduledAt'] is String
          ? DateTime.tryParse(json['scheduledAt'] as String)
          : null,
    );
  }
}

class HomeFeaturedPost {
  final String id;
  final String title;
  final String body;
  final List<String> tags;
  final String type;
  final int likeCount;
  final int commentCount;
  final String authorName;
  final DateTime? createdAt;

  const HomeFeaturedPost({
    required this.id,
    required this.title,
    required this.body,
    required this.tags,
    required this.type,
    required this.likeCount,
    required this.commentCount,
    required this.authorName,
    required this.createdAt,
  });

  factory HomeFeaturedPost.fromJson(Map<String, dynamic> json) {
    return HomeFeaturedPost(
      id: json['_id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? '',
      tags: (json['tags'] as List? ?? []).whereType<String>().toList(),
      type: json['type'] as String? ?? '',
      likeCount: (json['likeCount'] as num?)?.toInt() ?? 0,
      commentCount: (json['commentCount'] as num?)?.toInt() ?? 0,
      authorName: json['authorName'] as String? ?? '',
      createdAt: json['createdAt'] is String
          ? DateTime.tryParse(json['createdAt'] as String)
          : null,
    );
  }
}
