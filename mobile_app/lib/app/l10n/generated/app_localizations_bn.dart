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
  String get searchHint => 'ম্যাটেরিয়াল, পরীক্ষা খুঁজুন...';

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
}
