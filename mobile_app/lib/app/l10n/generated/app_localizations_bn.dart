// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Bengali Bangla (`bn`).
class AppLocalizationsBn extends AppLocalizations {
  AppLocalizationsBn([String locale = 'bn']) : super(locale);

  @override
  String get appTitle => 'ডিপ্লোমাবন্ধু';

  @override
  String get tagline => 'আপনার ডিপ্লোমা জীবন, এক প্ল্যাটফর্মে';

  @override
  String get skip => 'এড়িয়ে যান';

  @override
  String get next => 'পরবর্তী';

  @override
  String get getStarted => 'শুরু করুন';

  @override
  String get onboarding1Title => 'স্টাডি ম্যাটেরিয়াল';

  @override
  String get onboarding1Body => 'সব বই, নোট, লেকচার এক জায়গায়';

  @override
  String get onboarding2Title => 'পরীক্ষার প্রস্তুতি ও GPA';

  @override
  String get onboarding2Body => 'পরীক্ষার প্র্যাকটিস ও GPA হিসাব একসাথে';

  @override
  String get onboarding3Title => 'কমিউনিটি ও প্ল্যানার';

  @override
  String get onboarding3Body => 'সিনিয়র-জুনিয়র সংযোগ ও পড়ার পরিকল্পনা';

  @override
  String get language => 'ভাষা';

  @override
  String get email => 'ইমেইল';

  @override
  String get password => 'পাসওয়ার্ড';

  @override
  String get confirmPassword => 'পাসওয়ার্ড নিশ্চিত করুন';

  @override
  String get fullName => 'পূর্ণ নাম';

  @override
  String get phoneOptional => 'ফোন (ঐচ্ছিক)';

  @override
  String get login => 'লগ ইন';

  @override
  String get register => 'রেজিস্ট্রেশন';

  @override
  String get logout => 'লগ আউট';

  @override
  String get noAccount => 'অ্যাকাউন্ট নেই?';

  @override
  String get haveAccount => 'অ্যাকাউন্ট আছে?';

  @override
  String get home => 'হোম';

  @override
  String get library => 'লাইব্রেরি';

  @override
  String get exams => 'পরীক্ষা';

  @override
  String get gpa => 'জিপিএ';

  @override
  String get planner => 'প্ল্যানার';

  @override
  String get community => 'কমিউনিটি';

  @override
  String get notifications => 'নোটিফিকেশন';

  @override
  String get profile => 'প্রোফাইল';

  @override
  String get settings => 'সেটিংস';

  @override
  String get goodMorning => 'শুভ সকাল';

  @override
  String get goodAfternoon => 'শুভ অপরাহ্ন';

  @override
  String get goodEvening => 'শুভ সন্ধ্যা';

  @override
  String get searchHint => 'ম্যাটেরিয়াल, পরীক্ষা খুঁজুন...';

  @override
  String get searchTitle => 'সব কিছু খুঁজুন';

  @override
  String get searchAll => 'সব';

  @override
  String get searchMaterials => 'ম্যাটেরিয়াল';

  @override
  String get searchPosts => 'পোস্ট';

  @override
  String get searchStartTyping => 'খুঁজতে অন্তত ২ অক্ষর লিখুন';

  @override
  String get quickAccess => 'দ্রুত অ্যাক্সেস';

  @override
  String get recentMaterials => 'সাম্প্রতিক ম্যাটেরিয়াল';

  @override
  String get announcements => 'ঘোষণা';

  @override
  String get comingSoon => 'শীঘ্রই আসছে';

  @override
  String get resultCheckerComingSoon => 'বিটিইবি রেজাল্ট চেকার শীঘ্রই আসছে';

  @override
  String get resultChecker => 'বিটিইবি রেজাল্ট চেকার';

  @override
  String get resultCheckerSubtitle =>
      'আপনার রোল নম্বর দিয়ে প্রকাশিত বিটিইবি রেজাল্ট দেখুন';

  @override
  String get selectExam => 'পরীক্ষা নির্বাচন করুন';

  @override
  String get rollNumber => 'রোল নম্বর';

  @override
  String get registrationNumber => 'রেজিস্ট্রেশন নম্বর';

  @override
  String get checkResult => 'রেজাল্ট দেখুন';

  @override
  String get noResultFound =>
      'নির্বাচিত পরীক্ষায় এই রোল নম্বরের কোনো ফলাফল পাওয়া যায়নি';

  @override
  String get noExamsAvailable => 'এখনো কোনো রেজাল্ট প্রকাশ করা হয়নি';

  @override
  String get resultPassed => 'উত্তীর্ণ';

  @override
  String get resultReferred => 'রেফারড';

  @override
  String get resultDropped => 'ড্রপড';

  @override
  String get resultExpelled => 'বহিষ্কৃত';

  @override
  String get resultFail => 'অকৃতকার্য';

  @override
  String resultSubjectsYetToPass(num count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$countটি সাবজেক্ট এখনো পাস করেননি',
      one: '১টি সাবজেক্ট এখনো পাস করেননি',
    );
    return '$_temp0';
  }

  @override
  String get resultCleared => 'পরে পাস করেছে';

  @override
  String get resultThisExam => 'এই পরীক্ষা';

  @override
  String get resultGpa => 'জিপিএ';

  @override
  String get resultSubjectsList => 'সাবজেক্ট';

  @override
  String get resultTheory => 'তত্ত্বীয়';

  @override
  String get resultPractical => 'ব্যবহারিক';

  @override
  String resultExamCount(num count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'এই রোল নম্বরে $countটি প্রকাশিত পরীক্ষা পাওয়া গেছে',
      one: 'এই রোল নম্বরে ১টি প্রকাশিত পরীক্ষা পাওয়া গেছে',
    );
    return '$_temp0';
  }

  @override
  String get rollInvalid => 'সঠিক রোল নম্বর লিখুন (৬-১০ ডিজিট)';

  @override
  String get retry => 'আবার চেষ্টা করুন';

  @override
  String get errorGeneric => 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।';

  @override
  String get offlineMessage => 'আপনি অফলাইনে আছেন। ইন্টারনেট সংযোগ দেখুন।';

  @override
  String get emptyGeneric => 'এখনো কিছু নেই';

  @override
  String get loading => 'লোড হচ্ছে...';

  @override
  String get books => 'বই';

  @override
  String get notes => 'নোট';

  @override
  String get videos => 'ভিডিও';

  @override
  String get subjectMaterials => 'সাবজেক্ট ম্যাটেরিয়াল';

  @override
  String get previousQuestions => 'বিগত প্রশ্ন';

  @override
  String get bookmarks => 'বুকমার্ক';

  @override
  String get bookmark => 'বুকমার্ক';

  @override
  String get reportContent => 'ভুল তথ্য রিপোর্ট করুন';

  @override
  String get openLink => 'লিংক খুলুন';

  @override
  String get startExam => 'পরীক্ষা শুরু করুন';

  @override
  String get submit => 'জমা দিন';

  @override
  String get timeLeft => 'সময় বাকি';

  @override
  String get question => 'প্রশ্ন';

  @override
  String get markForReview => 'রিভিউয়ের জন্য চিহ্নিত';

  @override
  String get confirmSubmit => 'পরীক্ষা জমা দেবেন?';

  @override
  String get examResult => 'ফলাফল';

  @override
  String get correct => 'সঠিক';

  @override
  String get wrong => 'ভুল';

  @override
  String get skipped => 'বাদ';

  @override
  String get retake => 'আবার দিন';

  @override
  String get seeExplanation => 'ব্যাখ্যা দেখুন';

  @override
  String get semesterGpa => 'সেমিস্টার GPA';

  @override
  String get cgpa => 'সিজিপিএ';

  @override
  String get resultHistory => 'ফলাফল ইতিহাস';

  @override
  String get targetPlanner => 'টার্গেট প্ল্যানার';

  @override
  String get marksMode => 'মার্কস';

  @override
  String get gradeMode => 'গ্রেড';

  @override
  String get calculate => 'হিসাব করুন';

  @override
  String get saveToHistory => 'ইতিহাসে সংরক্ষণ';

  @override
  String get viewBreakdown => 'হিসাব দেখুন';

  @override
  String get estimateDisclaimer =>
      'এটি একটি সম্ভাব্য হিসাব, অফিসিয়াল ফলাফল নয়।';

  @override
  String get today => 'আজ';

  @override
  String get tasks => 'কাজ';

  @override
  String get routine => 'রুটিন';

  @override
  String get calendar => 'ক্যালেন্ডার';

  @override
  String get goals => 'লক্ষ্য';

  @override
  String get addTask => 'কাজ যোগ করুন';

  @override
  String get newPost => 'নতুন পোস্ট';

  @override
  String get discussion => 'আলোচনা';

  @override
  String get comments => 'মন্তব্য';

  @override
  String get like => 'লাইক';

  @override
  String get reply => 'উত্তর';

  @override
  String get post => 'পোস্ট';

  @override
  String get report => 'রিপোর্ট';

  @override
  String get communityGuidelines => 'কমিউনিটি নিয়মাবলি';

  @override
  String get markAllRead => 'সব পড়া হয়েছে';

  @override
  String get preferences => 'পছন্দসমূহ';

  @override
  String get darkMode => 'ডার্ক মোড';

  @override
  String get theme => 'থিম';

  @override
  String get system => 'সিস্টেম';

  @override
  String get light => 'লাইট';

  @override
  String get dark => 'ডার্ক';

  @override
  String get academicInfo => 'একাডেমিক তথ্য';

  @override
  String get account => 'অ্যাকাউন্ট';

  @override
  String get changePassword => 'পাসওয়ার্ড পরিবর্তন';

  @override
  String get deleteAccountRequest => 'অ্যাকাউন্ট ডিলিটের অনুরোধ';

  @override
  String get about => 'সম্পর্কে';

  @override
  String get version => 'ভার্সন';

  @override
  String get save => 'সংরক্ষণ';

  @override
  String get cancel => 'বাতিল';

  @override
  String get confirm => 'নিশ্চিত করুন';

  @override
  String get delete => 'মুছুন';

  @override
  String get edit => 'সম্পাদনা';

  @override
  String get loginFailed => 'লগ ইন ব্যর্থ। ইমেইল ও পাসওয়ার্ড দেখুন।';

  @override
  String get registerFailed => 'রেজিস্ট্রেশন ব্যর্থ। তথ্য দেখুন।';

  @override
  String get errorNetwork =>
      'সার্ভারে সংযোগ করা যাচ্ছে না। নিশ্চিত করুন backend চালু আছে (npm run dev, port 5000), তারপর আবার চেষ্টা করুন।';

  @override
  String get passwordTooShort => 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে';

  @override
  String get invalidEmail => 'সঠিক ইমেইল দিন';

  @override
  String get nameTooShort => 'আপনার পূর্ণ নাম লিখুন';

  @override
  String get passwordsDoNotMatch => 'পাসওয়ার্ড মেলেনি';

  @override
  String get logoutConfirm => 'আপনি কি লগ আউট করতে চান?';

  @override
  String get deleteAccountExplain =>
      'একটি ডিলিট অনুরোধ পাঠানো হবে। প্রশাসন যাচাই করে আপনার অ্যাকাউন্ট মুছে ফেলবে।';

  @override
  String get deleteAccountRequested => 'ডিলিট অনুরোধ জমা হয়েছে';

  @override
  String get academicInfoMissing =>
      'একাডেমিক তথ্য এখনো দেওয়া হয়নি। সেটিংস থেকে হালনাগাদ করুন।';

  @override
  String get currentPassword => 'বর্তমান পাসওয়ার্ড';

  @override
  String get newPassword => 'নতুন পাসওয়ার্ড';

  @override
  String get changePasswordSuccess => 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে';

  @override
  String get semester => 'সেমিস্টার';

  @override
  String get ofLabel => 'এর';

  @override
  String get forgotPassword => 'পাসওয়ার্ড ভুলে গেছেন?';

  @override
  String get forgotPasswordTitle => 'পাসওয়ার্ড রিসেট করুন';

  @override
  String get forgotPasswordIntro =>
      'আপনার নিবন্ধিত ইমেইল দিন। অ্যাকাউন্ট থাকলে একটি রিসেট রিকোয়েস্ট তৈরি হবে। ওয়ান-টাইম রিসেট কোড পেতে সাপোর্টে যোগাযোগ করুন।';

  @override
  String get requestReset => 'রিসেট রিকোয়েস্ট';

  @override
  String get requestAccepted =>
      'রিকোয়েস্ট গৃহীত হয়েছে। ওয়ান-টাইম রিসেট কোড পেতে সাপোর্টে যোগাযোগ করুন।';

  @override
  String get resetCode => 'রিসেট কোড';

  @override
  String get resetCodeInvalid => 'আপনি পাওয়া রিসেট কোডটি দিন';

  @override
  String get resetPassword => 'নতুন পাসওয়ার্ড সেট করুন';

  @override
  String get resetSuccess =>
      'পাসওয়ার্ড পরিবর্তন হয়েছে। নতুন পাসওয়ার্ড দিয়ে লগ ইন করুন।';

  @override
  String get share => 'শেয়ার';

  @override
  String get subjectCatalog => 'সাবজেক্ট ক্যাটালগ';

  @override
  String get subjectCatalogSubtitle =>
      'টেকনোলজি ও রেগুলেশন অনুযায়ী BTEB সাবজেক্ট দেখুন';

  @override
  String get searchSubjects => 'সাবজেক্টের নাম বা কোড খুঁজুন';

  @override
  String subjectsCount(num count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$countটি সাবজেক্ট',
      one: '১টি সাবজেক্ট',
    );
    return '$_temp0';
  }

  @override
  String get credits => 'ক্রেডিট';

  @override
  String get optionalSubjects => 'ঐচ্ছিক সাবজেক্ট';

  @override
  String get noSubjectsFound => 'কোনো সাবজেক্ট পাওয়া যায়নি';

  @override
  String get regulationLabel => 'রেগুলেশন';

  @override
  String marksTheory(Object marks) {
    return 'থিওরি $marks';
  }

  @override
  String marksPractical(Object marks) {
    return 'প্র্যাকটিক্যাল $marks';
  }

  @override
  String get subjectTypeTheory => 'থিওরি';

  @override
  String get subjectTypePractical => 'প্র্যাকটিক্যাল';

  @override
  String get subjectTypeTheoryPractical => 'থিওরি + প্র্যাকটিক্যাল';

  @override
  String resultTimeAgoHours(num count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count ঘণ্টা আগে',
      one: '১ ঘণ্টা আগে',
    );
    return '$_temp0';
  }

  @override
  String resultTimeAgoDays(num count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count দিন আগে',
      one: '১ দিন আগে',
    );
    return '$_temp0';
  }

  @override
  String resultTimeAgoMonths(num count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count মাস আগে',
      one: '১ মাস আগে',
    );
    return '$_temp0';
  }

  @override
  String resultTimeAgoYears(num count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count বছর আগে',
      one: '১ বছর আগে',
    );
    return '$_temp0';
  }
  @override
  String get marksTheory => 'থিওরি {marks}';

  @override
  String get marksPractical => 'প্র্যাকটিক্যাল {marks}';

  @override
  String get workspaceTitle => 'ব্যাকসপেস';

  @override
  String get workspaceCollections => 'কালেকশন';

  @override
  String get workspaceRecent => 'সাম্প্রতিক আইটেম';

  @override
  String get workspaceNewNote => 'নতুন নোট';

  @override
  String get noteTitleHint => 'নোটের শিরোনাম';

  @override
  String get noteBodyHint => 'আপনার নোট লিখুন...';

  @override
  String get dashboardCustomizeTitle => 'ড্যাশবোর্ড কাস্টমাইজ';

  @override
  String get dashboardCustomizeHint => 'হোম সেকশন দেখান, লুকান বা এলোমালো করুন। পরিবর্তন শুধু আপনার অ্যাকাউন্টে প্রযুক হবে।';

  @override
  String get dashboardSave => 'লেআউট সাইভ করুন';

  @override
  String get dashboardSaved => 'ড্যাশবোর্ড লেআউট সাইভ হযেছে';

  @override
  String get dashboardResetLayout => 'লেআউট রিসেট';

  @override
  String get dashboardResetDone => 'ড্যাশবোর্ড ডিফল্টে রিসেট হযেছে';

  @override
  String get dashboardLockedSection => 'অ্যাডমিন কর্তৃক লক্ষ করা';

  @override
  String get exportTitle => 'আমার ডেটা এক্সপোর্ট';

  @override
  String get exportSelectData => 'যে ডেটা অন্তর্ভুক্ষণ হবে তা নির্বাচন করুন';

  @override
  String get exportCreate => 'এক্সপোর্ট তৈরি করুন';

  @override
  String get exportCreated => 'এক্সপোর্ট ডাউনলোডের জন্য প্রস্তুত';

  @override
  String get exportHistory => 'এক্সপোর্ট হিস্টোরি';

  @override
  String get exportReady => 'প্রস্তুত';

  @override
  String get exportExpired => 'মেয়াদ হয়েছে';

  @override
  String get exportFailed => 'ব্যর্থ';

  @override
  String get exportProcessing => 'প্রক্রিয়াসধীন';

  @override
  String get exportTooMany => 'অতিবেশী এক্সপোর্ট চলমান। পরে আবার চেষ্টা করুন।';

  @override
  String get exportCopied => 'এক্সপোর্ট কনটেন্ট ক্লিপবোর্ডে কপি হয়েছে';

  @override
  String get studyPlanTitle => 'এআই স্টাডি প্লান';

  @override
  String get studyPlanGenerate => 'প্লান তৈরি করুন';

  @override
  String get studyPlanGenerated => 'স্টাডি প্লান তৈরি হয়েছে';

  @override
  String get studyPlanEstimated => 'আনুমান';

  @override
  String get studyPlanApply => 'টাস্কে প্রয়োগ করুন';

  @override
  String get studyPlanApplyConfirm => 'এই প্লান থেকে প্লানার টাস্ক তৈরি হবে?';

  @override
  String get studyPlanTasksAdded => 'টাস্ক প্লানারে যুক হয়েছে';

  @override
  String get studyPlanHoursHint => 'প্রতিদিন পড়ার সময়';

  @override
  String get studyPlanGoalHint => 'পড়ার লক্ষ্য (ঐচ্ছিক)';

  @override
  String get studyPlanSubjectsHint => 'বিষয় (কমা দিয়ে আলাদা)';

  @override
  String get studyPlanDays => 'দিন';

  @override
  String get studyPlanNotConfigured => 'এআই এখনো চালূ হয়নি। অ্যাডমিনকে জানান।';

  @override
  String get studyPlanLimitReached => 'দৈনিক এআই সীমা শেষ। আগামীকাল চেষ্টা করুন।';

  @override
  String get commandCenterTitle => 'কমান্ড সেন্টার';

  @override
  String get commandSearchHint => 'ফিচার ও কমান্ড খুঁজুন';

  @override
  String get syncDevicesTitle => 'সিংক্রনীত ডিভাইস';

  @override
  String get quietHoursLabel => 'ক্যুআইয়েট হাউর্স';

  @override
  String get editProfile => 'প্রোফাইল সম্পাদনা';

  @override
  String get memberSince => 'যোগ দিয়েছেন';

  @override
  String get profileUpdated => 'প্রোফাইল আপডেট হয়েছে';

  @override
  String get phoneLabel => 'ফোন';

  @override
  String get statusActive => 'সক্রিয়';

  @override
  String get roleStudent => 'শিক্ষার্থী';

  @override
  String get filterAll => 'সব';

  @override
  String get examTypeModel => 'মডেল টেস্ট';

  @override
  String get examTypePrevious => 'পুরনো প্রশ্ন';

  @override
  String get examTypeChapter => 'অধ্যায়';

  @override
  String get examTypeSubject => 'বিষয়';

  @override
  String get examTypeSemester => 'সেমিস্টার';

  @override
  String get minutesLabel => 'মিনিট';

  @override
  String get negativeMarking => 'নেগেটিভ মার্কিং';

  @override
  String get avgScore => 'গড়';

  @override
  String get durationLabel => 'সময়';

  @override
  String get cgpaGpaHint => 'GPA (0-5)';

  @override
  String get cgpaCreditsHint => 'ক্রেডিট';

  @override
  String get profileLabel => 'প্রোফাইল';

  @override
  String get todayProgress => 'আজকের অগ্রগতি';

  @override
  String get tasksDone => 'সম্পন্ন';

  @override
  String get loadMore => 'আরও দেখুন';

  @override
  String get viewsLabel => 'ভিউ';

  @override
  String get typeLabel => 'ধরন';

  @override
  String get examYearLabel => 'পরীক্ষার বছর';

  @override
  String get pagesLabel => 'পৃষ্ঠা';

  @override
  String get sizeLabel => 'সাইজ';

  @override
  String get bookmarkAdded => 'বুকমার্কে যোগ হয়েছে';

  @override
  String get bookmarkRemoved => 'বুকমার্ক থেকে সরানো হয়েছে';

  @override
  String get reportTypeLabel => 'রিপোর্টের ধরন';

  @override
  String get reportWrongInfo => 'ভুল তথ্য';

  @override
  String get reportBrokenLink => 'লিংক নষ্ট';

  @override
  String get reportInappropriate => 'অনুপযুক্ত কনটেন্ট';

  @override
  String get reportOther => 'অন্যান্য';

  @override
  String get searchRecent => 'সাম্প্রতিক সর্চ';
  @override
  String get notices => 'নোটিশ';

  @override
  String get seeAll => 'সব দেখুন';

  @override
  String get sortBy => 'সাজান';

  @override
  String get sortLatest => 'নতুন যোগ হয়েছে';

  @override
  String get sortOldest => 'পুরনো আগে';

  @override
  String get sortPopular => 'সর্বাধিক দেখা';

  @override
  String get sortTitleAZ => 'শিরোনাম A–Z';

  @override
  String get endOfList => 'শেষ পর্যন্ত দেখা হয়েছে';

  @override
  String get myBookmarks => 'আমার বুকমার্ক';

  @override
  String get clearFilters => 'ফিল্টার সরান';

  @override
  String get all => 'সব';

  @override
  String get filterTechnology => 'টেকনোলজি';

  @override
  String get filterSemester => 'সেমিস্টার';

  @override
  String get filterSubject => 'সাবজেক্ট';

  @override
  String get filterYear => 'সাল';

  @override
  String get reportWrongFile => 'ভুল ফাইল';

  @override
  String get reportDuplicate => 'ডুপ্লিকেট ম্যাটেরিয়াল';

  @override
  String get reportSubmitted => 'রিপোর্ট জমা হয়েছে। ধন্যবাদ।';

  @override
  String get reportDetailsLabel => 'বিস্তারিত (ঐচ্ছিক)';

  @override
  String get bookmarkEmpty => 'এখনো কোনো বুকমার্ক নেই';

  @override
  String get authorLabel => 'লেখক';

  @override
  String get editionLabel => 'সংস্করণ';
  @override
  String get noticeTickerLabel => 'নোটিশ';
  @override
  String get allNotices => 'সব নোটিশ';
  @override
  String get viewDetails => 'বিস্তারিত দেখুন';
  @override
  String get syllabus => 'সিলেবাস';
  @override
  String get services => 'সেবা';
  @override
  String get resources => 'রিসোর্স';
  @override
  String get cgpaCalculator => 'সিজিপিএ ক্যালকুলেটর';
  @override
  String get addRollHint => 'প্রোফাইলে নিজের রোল সেভ করলে রেজাল্ট এখানে অটোমেটিক দেখা যাবে।';
  @override
  String get noticeEmpty => 'এখনো কোনো নোটিশ নেই।';
  @override
  String get publishedOn => 'প্রকাশিত';
  @override
  String get viewPdf => 'পিডিএফ দেখুন';
  @override
  String get studyTab => 'পড়াশোনা';
  @override
  String get resultTab => 'রেজাল্ট';
  @override
  String get noResultSaved => 'এই পরীক্ষায় আপনার রোলে কোনো রেজাল্ট পাওয়া যায়নি।';
  @override
  String get openProfile => 'প্রোফাইল খুলুন';
}
