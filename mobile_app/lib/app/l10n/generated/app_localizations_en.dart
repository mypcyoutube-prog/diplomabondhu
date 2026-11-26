// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'DiplomaBondhu';

  @override
  String get tagline => 'Your Diploma Life, One Platform';

  @override
  String get skip => 'Skip';

  @override
  String get next => 'Next';

  @override
  String get getStarted => 'Get Started';

  @override
  String get onboarding1Title => 'Study Materials';

  @override
  String get onboarding1Body => 'All books, notes and lessons in one place';

  @override
  String get onboarding2Title => 'Exam Prep & GPA';

  @override
  String get onboarding2Body => 'Practice exams and GPA calculation together';

  @override
  String get onboarding3Title => 'Community & Planner';

  @override
  String get onboarding3Body => 'Connect with peers and plan your studies';

  @override
  String get language => 'Language';

  @override
  String get email => 'Email';

  @override
  String get password => 'Password';

  @override
  String get confirmPassword => 'Confirm Password';

  @override
  String get fullName => 'Full Name';

  @override
  String get phoneOptional => 'Phone (optional)';

  @override
  String get login => 'Log In';

  @override
  String get register => 'Register';

  @override
  String get logout => 'Log Out';

  @override
  String get noAccount => 'No account?';

  @override
  String get haveAccount => 'Already have an account?';

  @override
  String get home => 'Home';

  @override
  String get library => 'Library';

  @override
  String get exams => 'Exams';

  @override
  String get gpa => 'GPA';

  @override
  String get planner => 'Planner';

  @override
  String get community => 'Community';

  @override
  String get notifications => 'Notifications';

  @override
  String get profile => 'Profile';

  @override
  String get settings => 'Settings';

  @override
  String get goodMorning => 'Good morning';

  @override
  String get goodAfternoon => 'Good afternoon';

  @override
  String get goodEvening => 'Good evening';

  @override
  String get searchHint => 'Search materials, exams...';

  @override
  String get searchTitle => 'Search everything';

  @override
  String get searchAll => 'All';

  @override
  String get searchMaterials => 'Materials';

  @override
  String get searchPosts => 'Posts';

  @override
  String get searchStartTyping => 'Type at least 2 characters to search';

  @override
  String get quickAccess => 'Quick Access';

  @override
  String get recentMaterials => 'Recent Materials';

  @override
  String get announcements => 'Announcements';

  @override
  String get comingSoon => 'Coming Soon';

  @override
  String get resultCheckerComingSoon => 'BTEB Result Checker is coming soon';

  @override
  String get resultChecker => 'BTEB Result Checker';

  @override
  String get resultCheckerSubtitle =>
      'Check published BTEB results with your roll number';

  @override
  String get selectExam => 'Select examination';

  @override
  String get rollNumber => 'Roll number';

  @override
  String get checkResult => 'Check result';

  @override
  String get noResultFound =>
      'No result found for this roll in the selected examination';

  @override
  String get noExamsAvailable => 'No results have been published yet';

  @override
  String get resultPassed => 'Passed';

  @override
  String get resultReferred => 'Referred';

  @override
  String get resultDropped => 'Dropped';

  @override
  String get resultExpelled => 'Expelled';

  @override
  String get resultFail => 'Failed';

  @override
  String resultSubjectsYetToPass(num count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count subjects yet to pass',
      one: '1 subject yet to pass',
    );
    return '$_temp0';
  }

  @override
  String get resultCleared => 'Passed later';

  @override
  String get resultThisExam => 'This exam';

  @override
  String get resultGpa => 'GPA';

  @override
  String get resultSubjectsList => 'Subjects';

  @override
  String get resultTheory => 'Theory';

  @override
  String get resultPractical => 'Practical';

  @override
  String resultExamCount(num count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count published exams found for this roll',
      one: '1 published exam found for this roll',
    );
    return '$_temp0';
  }

  @override
  String get rollInvalid => 'Enter a valid roll number (6-10 digits)';

  @override
  String get retry => 'Retry';

  @override
  String get errorGeneric => 'Something went wrong. Please try again.';

  @override
  String get offlineMessage => 'You are offline. Check your connection.';

  @override
  String get emptyGeneric => 'Nothing here yet';

  @override
  String get loading => 'Loading...';

  @override
  String get books => 'Books';

  @override
  String get notes => 'Notes';

  @override
  String get videos => 'Videos';

  @override
  String get subjectMaterials => 'Subject Materials';

  @override
  String get previousQuestions => 'Previous Questions';

  @override
  String get bookmarks => 'Bookmarks';

  @override
  String get bookmark => 'Bookmark';

  @override
  String get reportContent => 'Report incorrect content';

  @override
  String get openLink => 'Open Link';

  @override
  String get startExam => 'Start Exam';

  @override
  String get submit => 'Submit';

  @override
  String get timeLeft => 'Time left';

  @override
  String get question => 'Question';

  @override
  String get markForReview => 'Mark for review';

  @override
  String get confirmSubmit => 'Submit exam?';

  @override
  String get examResult => 'Result';

  @override
  String get correct => 'Correct';

  @override
  String get wrong => 'Wrong';

  @override
  String get skipped => 'Skipped';

  @override
  String get retake => 'Retake';

  @override
  String get seeExplanation => 'See explanation';

  @override
  String get semesterGpa => 'Semester GPA';

  @override
  String get cgpa => 'CGPA';

  @override
  String get resultHistory => 'Result History';

  @override
  String get targetPlanner => 'Target Planner';

  @override
  String get marksMode => 'Marks';

  @override
  String get gradeMode => 'Grades';

  @override
  String get calculate => 'Calculate';

  @override
  String get saveToHistory => 'Save to History';

  @override
  String get viewBreakdown => 'View Breakdown';

  @override
  String get estimateDisclaimer =>
      'This is an estimate, not an official result.';

  @override
  String get today => 'Today';

  @override
  String get tasks => 'Tasks';

  @override
  String get routine => 'Routine';

  @override
  String get calendar => 'Calendar';

  @override
  String get goals => 'Goals';

  @override
  String get addTask => 'Add Task';

  @override
  String get newPost => 'New Post';

  @override
  String get discussion => 'Discussion';

  @override
  String get comments => 'Comments';

  @override
  String get like => 'Like';

  @override
  String get reply => 'Reply';

  @override
  String get post => 'Post';

  @override
  String get report => 'Report';

  @override
  String get communityGuidelines => 'Community Guidelines';

  @override
  String get markAllRead => 'Mark all read';

  @override
  String get preferences => 'Preferences';

  @override
  String get darkMode => 'Dark Mode';

  @override
  String get theme => 'Theme';

  @override
  String get system => 'System';

  @override
  String get light => 'Light';

  @override
  String get dark => 'Dark';

  @override
  String get academicInfo => 'Academic Info';

  @override
  String get account => 'Account';

  @override
  String get changePassword => 'Change Password';

  @override
  String get deleteAccountRequest => 'Request Account Deletion';

  @override
  String get about => 'About';

  @override
  String get version => 'Version';

  @override
  String get save => 'Save';

  @override
  String get cancel => 'Cancel';

  @override
  String get confirm => 'Confirm';

  @override
  String get delete => 'Delete';

  @override
  String get edit => 'Edit';

  @override
  String get loginFailed => 'Login failed. Check your email and password.';

  @override
  String get registerFailed => 'Registration failed. Please check the details.';

  @override
  String get errorNetwork =>
      'Cannot reach the server. Make sure the backend is running (npm run dev, port 5000) and try again.';

  @override
  String get passwordTooShort => 'Password must be at least 8 characters';

  @override
  String get invalidEmail => 'Enter a valid email';

  @override
  String get nameTooShort => 'Enter your full name';

  @override
  String get passwordsDoNotMatch => 'Passwords do not match';

  @override
  String get logoutConfirm => 'Are you sure you want to log out?';

  @override
  String get deleteAccountExplain =>
      'A deletion request will be sent. Your account will be reviewed and deleted by the administration.';

  @override
  String get deleteAccountRequested => 'Deletion request submitted';

  @override
  String get academicInfoMissing =>
      'Academic information not set yet. Update it from Settings.';

  @override
  String get currentPassword => 'Current password';

  @override
  String get newPassword => 'New password';

  @override
  String get changePasswordSuccess => 'Password changed successfully';

  @override
  String get semester => 'Semester';

  @override
  String get ofLabel => 'of';

  @override
  String get forgotPassword => 'Forgot password?';

  @override
  String get forgotPasswordTitle => 'Reset your password';

  @override
  String get forgotPasswordIntro =>
      'Enter your registered email. If it matches an account, a reset request is created. Contact support to receive your one-time reset code.';

  @override
  String get requestReset => 'Request reset';

  @override
  String get requestAccepted =>
      'Request accepted. Contact support to receive your one-time reset code.';

  @override
  String get resetCode => 'Reset code';

  @override
  String get resetCodeInvalid => 'Enter the reset code you received';

  @override
  String get resetPassword => 'Set new password';

  @override
  String get resetSuccess =>
      'Password updated. Please log in with your new password.';

  @override
  String get share => 'Share';

  @override
  String get subjectCatalog => 'Subject Catalog';

  @override
  String get subjectCatalogSubtitle =>
      'Browse BTEB subjects by technology and regulation';

  @override
  String get searchSubjects => 'Search subject name or code';

  @override
  String subjectsCount(num count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count subjects',
      one: '1 subject',
    );
    return '$_temp0';
  }

  @override
  String get credits => 'Credits';

  @override
  String get optionalSubjects => 'Optional subjects';

  @override
  String get noSubjectsFound => 'No subjects found';

  @override
  String get regulationLabel => 'Regulation';

  @override
  String marksTheory(Object marks) {
    return 'Theory $marks';
  }

  @override
  String marksPractical(Object marks) {
    return 'Practical $marks';
  }

  @override
  String get subjectTypeTheory => 'Theory';

  @override
  String get subjectTypePractical => 'Practical';

  @override
  String get subjectTypeTheoryPractical => 'Theory + Practical';

  @override
  String resultTimeAgoHours(num count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count hours ago',
      one: '1 hour ago',
    );
    return '$_temp0';
  }

  @override
  String resultTimeAgoDays(num count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count days ago',
      one: '1 day ago',
    );
    return '$_temp0';
  }

  @override
  String resultTimeAgoMonths(num count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count months ago',
      one: '1 month ago',
    );
    return '$_temp0';
  }

  @override
  String resultTimeAgoYears(num count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count years ago',
      one: '1 year ago',
    );
    return '$_temp0';
  }
  @override
  String get appTitle => 'DiplomaBondhu';

  @override
  String get tagline => 'Your Diploma Life, One Platform';

  @override
  String get skip => 'Skip';

  @override
  String get next => 'Next';

  @override
  String get getStarted => 'Get Started';

  @override
  String get onboarding1Title => 'Study Materials';

  @override
  String get onboarding1Body => 'All books, notes and lessons in one place';

  @override
  String get onboarding2Title => 'Exam Prep & GPA';

  @override
  String get onboarding2Body => 'Practice exams and GPA calculation together';

  @override
  String get onboarding3Title => 'Community & Planner';

  @override
  String get onboarding3Body => 'Connect with peers and plan your studies';

  @override
  String get language => 'Language';

  @override
  String get email => 'Email';

  @override
  String get password => 'Password';

  @override
  String get confirmPassword => 'Confirm Password';

  @override
  String get fullName => 'Full Name';

  @override
  String get phoneOptional => 'Phone (optional)';

  @override
  String get login => 'Log In';

  @override
  String get register => 'Register';

  @override
  String get logout => 'Log Out';

  @override
  String get noAccount => 'No account?';

  @override
  String get haveAccount => 'Already have an account?';

  @override
  String get home => 'Home';

  @override
  String get library => 'Library';

  @override
  String get exams => 'Exams';

  @override
  String get gpa => 'GPA';

  @override
  String get planner => 'Planner';

  @override
  String get community => 'Community';

  @override
  String get notifications => 'Notifications';

  @override
  String get profile => 'Profile';

  @override
  String get settings => 'Settings';

  @override
  String get goodMorning => 'Good morning';

  @override
  String get goodAfternoon => 'Good afternoon';

  @override
  String get goodEvening => 'Good evening';

  @override
  String get searchHint => 'Search materials, exams...';

  @override
  String get searchTitle => 'Search everything';

  @override
  String get searchAll => 'All';

  @override
  String get searchMaterials => 'Materials';

  @override
  String get searchPosts => 'Posts';

  @override
  String get searchStartTyping => 'Type at least 2 characters to search';

  @override
  String get quickAccess => 'Quick Access';

  @override
  String get recentMaterials => 'Recent Materials';

  @override
  String get announcements => 'Announcements';

  @override
  String get comingSoon => 'Coming Soon';

  @override
  String get resultCheckerComingSoon => 'BTEB Result Checker is coming soon';

  @override
  String get resultChecker => 'BTEB Result Checker';

  @override
  String get resultCheckerSubtitle => 'Check published BTEB results with your roll number';

  @override
  String get selectExam => 'Select examination';

  @override
  String get rollNumber => 'Roll number';

  @override
  String get checkResult => 'Check result';

  @override
  String get noResultFound => 'No result found for this roll in the selected examination';

  @override
  String get noExamsAvailable => 'No results have been published yet';

  @override
  String get resultPassed => 'Passed';

  @override
  String get resultReferred => 'Referred';

  @override
  String get resultDropped => 'Dropped';

  @override
  String get resultExpelled => 'Expelled';

  @override
  String get resultFail => 'Failed';

  @override
  String get resultSubjectsYetToPass => '{count, plural, one{1 subject yet to pass} other{{count} subjects yet to pass}}';

  @override
  String get resultCleared => 'Passed later';

  @override
  String get resultThisExam => 'This exam';

  @override
  String get resultGpa => 'GPA';

  @override
  String get resultSubjectsList => 'Subjects';

  @override
  String get resultTheory => 'Theory';

  @override
  String get resultPractical => 'Practical';

  @override
  String get resultExamCount => '{count, plural, one{1 published exam found for this roll} other{{count} published exams found for this roll}}';

  @override
  String get rollInvalid => 'Enter a valid roll number (6-10 digits)';

  @override
  String get retry => 'Retry';

  @override
  String get errorGeneric => 'Something went wrong. Please try again.';

  @override
  String get offlineMessage => 'You are offline. Check your connection.';

  @override
  String get emptyGeneric => 'Nothing here yet';

  @override
  String get loading => 'Loading...';

  @override
  String get books => 'Books';

  @override
  String get notes => 'Notes';

  @override
  String get videos => 'Videos';

  @override
  String get subjectMaterials => 'Subject Materials';

  @override
  String get previousQuestions => 'Previous Questions';

  @override
  String get bookmarks => 'Bookmarks';

  @override
  String get bookmark => 'Bookmark';

  @override
  String get reportContent => 'Report incorrect content';

  @override
  String get openLink => 'Open Link';

  @override
  String get startExam => 'Start Exam';

  @override
  String get submit => 'Submit';

  @override
  String get timeLeft => 'Time left';

  @override
  String get question => 'Question';

  @override
  String get markForReview => 'Mark for review';

  @override
  String get confirmSubmit => 'Submit exam?';

  @override
  String get examResult => 'Result';

  @override
  String get correct => 'Correct';

  @override
  String get wrong => 'Wrong';

  @override
  String get skipped => 'Skipped';

  @override
  String get retake => 'Retake';

  @override
  String get seeExplanation => 'See explanation';

  @override
  String get semesterGpa => 'Semester GPA';

  @override
  String get cgpa => 'CGPA';

  @override
  String get resultHistory => 'Result History';

  @override
  String get targetPlanner => 'Target Planner';

  @override
  String get marksMode => 'Marks';

  @override
  String get gradeMode => 'Grades';

  @override
  String get calculate => 'Calculate';

  @override
  String get saveToHistory => 'Save to History';

  @override
  String get viewBreakdown => 'View Breakdown';

  @override
  String get estimateDisclaimer => 'This is an estimate, not an official result.';

  @override
  String get today => 'Today';

  @override
  String get tasks => 'Tasks';

  @override
  String get routine => 'Routine';

  @override
  String get calendar => 'Calendar';

  @override
  String get goals => 'Goals';

  @override
  String get addTask => 'Add Task';

  @override
  String get newPost => 'New Post';

  @override
  String get discussion => 'Discussion';

  @override
  String get comments => 'Comments';

  @override
  String get like => 'Like';

  @override
  String get reply => 'Reply';

  @override
  String get post => 'Post';

  @override
  String get report => 'Report';

  @override
  String get communityGuidelines => 'Community Guidelines';

  @override
  String get markAllRead => 'Mark all read';

  @override
  String get preferences => 'Preferences';

  @override
  String get darkMode => 'Dark Mode';

  @override
  String get theme => 'Theme';

  @override
  String get system => 'System';

  @override
  String get light => 'Light';

  @override
  String get dark => 'Dark';

  @override
  String get academicInfo => 'Academic Info';

  @override
  String get account => 'Account';

  @override
  String get changePassword => 'Change Password';

  @override
  String get deleteAccountRequest => 'Request Account Deletion';

  @override
  String get about => 'About';

  @override
  String get version => 'Version';

  @override
  String get save => 'Save';

  @override
  String get cancel => 'Cancel';

  @override
  String get confirm => 'Confirm';

  @override
  String get delete => 'Delete';

  @override
  String get edit => 'Edit';

  @override
  String get loginFailed => 'Login failed. Check your email and password.';

  @override
  String get registerFailed => 'Registration failed. Please check the details.';

  @override
  String get errorNetwork => 'Cannot reach the server. Make sure the backend is running (npm run dev, port 5000) and try again.';

  @override
  String get passwordTooShort => 'Password must be at least 8 characters';

  @override
  String get invalidEmail => 'Enter a valid email';

  @override
  String get nameTooShort => 'Enter your full name';

  @override
  String get passwordsDoNotMatch => 'Passwords do not match';

  @override
  String get logoutConfirm => 'Are you sure you want to log out?';

  @override
  String get deleteAccountExplain => 'A deletion request will be sent. Your account will be reviewed and deleted by the administration.';

  @override
  String get deleteAccountRequested => 'Deletion request submitted';

  @override
  String get academicInfoMissing => 'Academic information not set yet. Update it from Settings.';

  @override
  String get currentPassword => 'Current password';

  @override
  String get newPassword => 'New password';

  @override
  String get changePasswordSuccess => 'Password changed successfully';

  @override
  String get semester => 'Semester';

  @override
  String get ofLabel => 'of';

  @override
  String get forgotPassword => 'Forgot password?';

  @override
  String get forgotPasswordTitle => 'Reset your password';

  @override
  String get forgotPasswordIntro => 'Enter your registered email. If it matches an account, a reset request is created. Contact support to receive your one-time reset code.';

  @override
  String get requestReset => 'Request reset';

  @override
  String get requestAccepted => 'Request accepted. Contact support to receive your one-time reset code.';

  @override
  String get resetCode => 'Reset code';

  @override
  String get resetCodeInvalid => 'Enter the reset code you received';

  @override
  String get resetPassword => 'Set new password';

  @override
  String get resetSuccess => 'Password updated. Please log in with your new password.';

  @override
  String get share => 'Share';

  @override
  String get subjectCatalog => 'Subject Catalog';

  @override
  String get subjectCatalogSubtitle => 'Browse BTEB subjects by technology and regulation';

  @override
  String get searchSubjects => 'Search subject name or code';

  @override
  String get subjectsCount => '{count, plural, one{1 subject} other{{count} subjects}}';

  @override
  String get credits => 'Credits';

  @override
  String get optionalSubjects => 'Optional subjects';

  @override
  String get noSubjectsFound => 'No subjects found';

  @override
  String get regulationLabel => 'Regulation';

  @override
  String get marksTheory => 'Theory {marks}';

  @override
  String get marksPractical => 'Practical {marks}';

  @override
  String get subjectTypeTheory => 'Theory';

  @override
  String get subjectTypePractical => 'Practical';

  @override
  String get subjectTypeTheoryPractical => 'Theory + Practical';

  @override
  String get resultTimeAgoHours => '{count, plural, one{1 hour ago} other{{count} hours ago}}';

  @override
  String get resultTimeAgoDays => '{count, plural, one{1 day ago} other{{count} days ago}}';

  @override
  String get resultTimeAgoMonths => '{count, plural, one{1 month ago} other{{count} months ago}}';

  @override
  String get resultTimeAgoYears => '{count, plural, one{1 year ago} other{{count} years ago}}';

  @override
  String get workspaceTitle => 'Workspace';

  @override
  String get workspaceCollections => 'Collections';

  @override
  String get workspaceRecent => 'Recent items';

  @override
  String get workspaceNewNote => 'New note';

  @override
  String get noteTitleHint => 'Note title';

  @override
  String get noteBodyHint => 'Write your note...';

  @override
  String get dashboardCustomizeTitle => 'Customize dashboard';

  @override
  String get dashboardCustomizeHint => 'Show, hide or reorder home sections. Changes apply to your account only.';

  @override
  String get dashboardSave => 'Save layout';

  @override
  String get dashboardSaved => 'Dashboard layout saved';

  @override
  String get dashboardResetLayout => 'Reset layout';

  @override
  String get dashboardResetDone => 'Dashboard reset to default';

  @override
  String get dashboardLockedSection => 'Locked by admin';

  @override
  String get exportTitle => 'Export my data';

  @override
  String get exportSelectData => 'Select data to include';

  @override
  String get exportCreate => 'Create export';

  @override
  String get exportCreated => 'Export ready to download';

  @override
  String get exportHistory => 'Export history';

  @override
  String get exportReady => 'Ready';

  @override
  String get exportExpired => 'Expired';

  @override
  String get exportFailed => 'Failed';

  @override
  String get exportProcessing => 'Processing';

  @override
  String get exportTooMany => 'Too many active exports. Try again later.';

  @override
  String get exportCopied => 'Export content copied to clipboard';

  @override
  String get studyPlanTitle => 'AI Study Plan';

  @override
  String get studyPlanGenerate => 'Generate plan';

  @override
  String get studyPlanGenerated => 'Study plan generated';

  @override
  String get studyPlanEstimated => 'Estimated';

  @override
  String get studyPlanApply => 'Apply to tasks';

  @override
  String get studyPlanApplyConfirm => 'Create planner tasks from this plan?';

  @override
  String get studyPlanTasksAdded => 'tasks added to planner';

  @override
  String get studyPlanHoursHint => 'Study hours per day';

  @override
  String get studyPlanGoalHint => 'Study goal (optional)';

  @override
  String get studyPlanSubjectsHint => 'Subjects (comma separated)';

  @override
  String get studyPlanDays => 'Days';

  @override
  String get studyPlanNotConfigured => 'AI is not configured yet. Ask the admin to enable it.';

  @override
  String get studyPlanLimitReached => 'Daily AI limit reached. Try again tomorrow.';

  @override
  String get commandCenterTitle => 'Command Center';

  @override
  String get commandSearchHint => 'Search features and commands';

  @override
  String get syncDevicesTitle => 'Synced devices';

  @override
  String get quietHoursLabel => 'Quiet hours';

  @override
  String get editProfile => 'Edit Profile';

  @override
  String get memberSince => 'Member since';

  @override
  String get profileUpdated => 'Profile updated';

  @override
  String get phoneLabel => 'Phone';

  @override
  String get statusActive => 'Active';

  @override
  String get roleStudent => 'Student';
  @override
  String get loadMore => 'Load more';
  @override
  String get viewsLabel => 'Views';
  @override
  String get typeLabel => 'Type';
  @override
  String get examYearLabel => 'Exam year';
  @override
  String get pagesLabel => 'Pages';
  @override
  String get sizeLabel => 'Size';
  @override
  String get bookmarkAdded => 'Added to bookmarks';
  @override
  String get bookmarkRemoved => 'Removed from bookmarks';
  @override
  String get reportTypeLabel => 'Report type';
  @override
  String get reportWrongInfo => 'Wrong information';
  @override
  String get reportBrokenLink => 'Broken link';
  @override
  String get reportInappropriate => 'Inappropriate content';
  @override
  String get reportOther => 'Other';

  @override
  String get searchRecent => 'Recent searches';

}
