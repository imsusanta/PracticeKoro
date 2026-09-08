enum DrillMode {
  instantFeedback,
  timedQuiz,
}

class DrillQuestion {
  final String id;
  final String questionText;
  final String optionA;
  final String optionB;
  final String optionC;
  final String optionD;
  final String correctAnswer;
  final String? explanation;
  final String? subject;
  final String? topic;
  final String? difficulty;
  final int? year;

  const DrillQuestion({
    required this.id,
    required this.questionText,
    required this.optionA,
    required this.optionB,
    required this.optionC,
    required this.optionD,
    required this.correctAnswer,
    this.explanation,
    this.subject,
    this.topic,
    this.difficulty,
    this.year,
  });

  factory DrillQuestion.fromJson(Map<String, dynamic> json) {
    return DrillQuestion(
      id: json['id']?.toString() ?? '',
      questionText: json['question_text']?.toString() ?? '',
      optionA: json['option_a']?.toString() ?? '',
      optionB: json['option_b']?.toString() ?? '',
      optionC: json['option_c']?.toString() ?? '',
      optionD: json['option_d']?.toString() ?? '',
      correctAnswer: (json['correct_answer']?.toString() ?? 'A').toUpperCase().trim(),
      explanation: json['explanation']?.toString(),
      subject: json['subject']?.toString(),
      topic: json['topic']?.toString(),
      difficulty: json['difficulty']?.toString(),
      year: (json['year'] as num?)?.toInt(),
    );
  }
}

class DrillConfig {
  final String title;
  final String? subtitle;
  final String? examId;
  final String? subject;
  final String? topic;
  final int questionCount;
  final double negativeMarks;
  final double marksPerQuestion;
  final int timeLimitMinutes;
  final DrillMode mode;

  const DrillConfig({
    required this.title,
    this.subtitle,
    this.examId,
    this.subject,
    this.topic,
    this.questionCount = 10,
    this.negativeMarks = 0.25,
    this.marksPerQuestion = 1.0,
    this.timeLimitMinutes = 15,
    this.mode = DrillMode.instantFeedback,
  });
}

class DrillIncorrectItem {
  final DrillQuestion question;
  final String selectedAnswer;
  final String correctAnswer;

  const DrillIncorrectItem({
    required this.question,
    required this.selectedAnswer,
    required this.correctAnswer,
  });
}

class DrillResult {
  final int totalQuestions;
  final int attemptedCount;
  final int correctCount;
  final int wrongCount;
  final int unattemptedCount;
  final double score;
  final double maxScore;
  final int accuracyPercentage;
  final int timeSpentSeconds;
  final List<DrillIncorrectItem> incorrectQuestions;

  const DrillResult({
    required this.totalQuestions,
    required this.attemptedCount,
    required this.correctCount,
    required this.wrongCount,
    required this.unattemptedCount,
    required this.score,
    required this.maxScore,
    required this.accuracyPercentage,
    required this.timeSpentSeconds,
    required this.incorrectQuestions,
  });
}
