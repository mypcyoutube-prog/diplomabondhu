class Exam {
  final String id;
  final String title;
  final String? description;
  final String type;
  final int durationSec;
  final int marksPerQuestion;
  final int negativeMarkPercent;
  final String status;
  final int questionCount;

  const Exam({
    required this.id,
    required this.title,
    this.description,
    required this.type,
    required this.durationSec,
    required this.marksPerQuestion,
    required this.negativeMarkPercent,
    required this.status,
    required this.questionCount,
  });

  factory Exam.fromJson(Map<String, dynamic> json) => Exam(
        id: (json['_id'] ?? json['id']) as String,
        title: json['title'] as String? ?? '',
        description: json['description'] as String?,
        type: json['type'] as String? ?? 'model',
        durationSec: (json['durationSec'] as num?)?.toInt() ?? 0,
        marksPerQuestion: (json['marksPerQuestion'] as num?)?.toInt() ?? 1,
        negativeMarkPercent: (json['negativeMarkPercent'] as num?)?.toInt() ?? 0,
        status: json['status'] as String? ?? 'published',
        questionCount: (json['questionCount'] as num?)?.toInt() ??
            (json['questionIds'] as List?)?.length ??
            0,
      );
}

class ExamQuestion {
  final String id;
  final String text;
  final String? textBn;
  final List<ExamOption> options;
  final int marks;

  const ExamQuestion({
    required this.id,
    required this.text,
    this.textBn,
    required this.options,
    required this.marks,
  });

  factory ExamQuestion.fromJson(Map<String, dynamic> json) => ExamQuestion(
        id: (json['_id'] ?? json['id']) as String,
        text: json['text'] as String? ?? '',
        textBn: json['textBn'] as String?,
        options: (json['options'] as List? ?? [])
            .map((e) => ExamOption.fromJson(e as Map<String, dynamic>))
            .toList(),
        marks: (json['marks'] as num?)?.toInt() ?? 1,
      );
}

class ExamOption {
  final String key;
  final String text;

  const ExamOption({required this.key, required this.text});

  factory ExamOption.fromJson(Map<String, dynamic> json) => ExamOption(
        key: json['key'] as String,
        text: json['text'] as String? ?? '',
      );
}

class ExamScoring {
  final int totalMarks;
  final int marksObtained;
  final int correctCount;
  final int wrongCount;
  final int unansweredCount;
  final int percent;

  const ExamScoring({
    required this.totalMarks,
    required this.marksObtained,
    required this.correctCount,
    required this.wrongCount,
    required this.unansweredCount,
    required this.percent,
  });

  factory ExamScoring.fromJson(Map<String, dynamic> json) => ExamScoring(
        totalMarks: (json['totalMarks'] as num?)?.toInt() ?? 0,
        marksObtained: (json['marksObtained'] as num?)?.toInt() ?? 0,
        correctCount: (json['correctCount'] as num?)?.toInt() ?? 0,
        wrongCount: (json['wrongCount'] as num?)?.toInt() ?? 0,
        unansweredCount: (json['unansweredCount'] as num?)?.toInt() ?? 0,
        percent: (json['percent'] as num?)?.toInt() ?? 0,
      );
}

class PerQuestionResult {
  final String questionId;
  final String? selectedKey;
  final String correctKey;
  final bool isCorrect;
  final int marks;
  final String? explanation;

  const PerQuestionResult({
    required this.questionId,
    this.selectedKey,
    required this.correctKey,
    required this.isCorrect,
    required this.marks,
    this.explanation,
  });

  factory PerQuestionResult.fromJson(Map<String, dynamic> json) => PerQuestionResult(
        questionId: json['questionId'] as String,
        selectedKey: json['selectedKey'] as String?,
        correctKey: json['correctKey'] as String? ?? '',
        isCorrect: json['isCorrect'] as bool? ?? false,
        marks: (json['marks'] as num?)?.toInt() ?? 0,
        explanation: json['explanation'] as String?,
      );
}

class ExamAttemptResult {
  final String attemptId;
  final String? examTitle;
  final ExamScoring? scoring;
  final List<PerQuestionResult> perQuestion;

  const ExamAttemptResult({
    required this.attemptId,
    this.examTitle,
    this.scoring,
    required this.perQuestion,
  });

  factory ExamAttemptResult.fromJson(Map<String, dynamic> json) => ExamAttemptResult(
        attemptId: json['attemptId'] as String,
        examTitle: json['examTitle'] as String?,
        scoring: json['scoring'] == null
            ? null
            : ExamScoring.fromJson(json['scoring'] as Map<String, dynamic>),
        perQuestion: (json['perQuestion'] as List? ?? [])
            .map((e) => PerQuestionResult.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class StartedAttempt {
  final String attemptId;
  final DateTime? deadlineAt;
  final List<ExamQuestion> questions;
  final bool resumed;

  const StartedAttempt({
    required this.attemptId,
    this.deadlineAt,
    required this.questions,
    required this.resumed,
  });

  factory StartedAttempt.fromJson(Map<String, dynamic> json) => StartedAttempt(
        attemptId: json['attemptId'] as String,
        deadlineAt: json['deadlineAt'] == null
            ? null
            : DateTime.parse(json['deadlineAt'] as String),
        questions: (json['questions'] as List? ?? [])
            .map((e) => ExamQuestion.fromJson(e as Map<String, dynamic>))
            .toList(),
        resumed: json['resumed'] as bool? ?? false,
      );
}
