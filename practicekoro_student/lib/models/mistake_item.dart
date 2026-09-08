enum ErrorType {
  conceptual,
  careless,
  timePressure,
  guess,
  unclassified;

  static ErrorType fromString(String? val) {
    switch (val?.toLowerCase()) {
      case 'conceptual':
        return ErrorType.conceptual;
      case 'careless':
        return ErrorType.careless;
      case 'time_pressure':
        return ErrorType.timePressure;
      case 'guess':
        return ErrorType.guess;
      default:
        return ErrorType.unclassified;
    }
  }

  String toDbString() {
    switch (this) {
      case ErrorType.conceptual:
        return 'conceptual';
      case ErrorType.careless:
        return 'careless';
      case ErrorType.timePressure:
        return 'time_pressure';
      case ErrorType.guess:
        return 'guess';
      case ErrorType.unclassified:
        return 'unclassified';
    }
  }

  String get label {
    switch (this) {
      case ErrorType.conceptual:
        return 'Conceptual';
      case ErrorType.careless:
        return 'Careless';
      case ErrorType.timePressure:
        return 'Time Pressure';
      case ErrorType.guess:
        return 'Guess';
      case ErrorType.unclassified:
        return 'Unclassified';
    }
  }

  String get bengaliLabel {
    switch (this) {
      case ErrorType.conceptual:
        return 'ধারণাগত ভুল';
      case ErrorType.careless:
        return 'অসাবধানতা';
      case ErrorType.timePressure:
        return 'সময়ের অভাব';
      case ErrorType.guess:
        return 'অনুমান';
      case ErrorType.unclassified:
        return 'অনির্ধারিত';
    }
  }
}

class MistakeItem {
  final String id;
  final String userId;
  final String questionId;
  final String? selectedAnswer;
  final String correctAnswer;
  final ErrorType errorType;
  final String? studentNotes;
  final int streak;
  final bool isMastered;
  final String? questionText;
  final String? optionA;
  final String? optionB;
  final String? optionC;
  final String? optionD;
  final String? explanation;
  final String? subject;
  final String? topic;

  const MistakeItem({
    required this.id,
    required this.userId,
    required this.questionId,
    this.selectedAnswer,
    required this.correctAnswer,
    this.errorType = ErrorType.unclassified,
    this.studentNotes,
    this.streak = 0,
    this.isMastered = false,
    this.questionText,
    this.optionA,
    this.optionB,
    this.optionC,
    this.optionD,
    this.explanation,
    this.subject,
    this.topic,
  });

  factory MistakeItem.fromJson(Map<String, dynamic> json) {
    final q = json['questions'] as Map<String, dynamic>?;
    return MistakeItem(
      id: json['id']?.toString() ?? '',
      userId: json['user_id']?.toString() ?? '',
      questionId: json['question_id']?.toString() ?? '',
      selectedAnswer: json['selected_answer']?.toString(),
      correctAnswer: json['correct_answer']?.toString() ?? 'A',
      errorType: ErrorType.fromString(json['error_type']?.toString()),
      studentNotes: json['student_notes']?.toString(),
      streak: (json['streak'] as num?)?.toInt() ?? 0,
      isMastered: json['is_mastered'] == true,
      questionText: q?['question_text']?.toString(),
      optionA: q?['option_a']?.toString(),
      optionB: q?['option_b']?.toString(),
      optionC: q?['option_c']?.toString(),
      optionD: q?['option_d']?.toString(),
      explanation: q?['explanation']?.toString(),
      subject: q?['subject']?.toString(),
      topic: q?['topic']?.toString(),
    );
  }

  MistakeItem copyWith({
    String? id,
    String? userId,
    String? questionId,
    String? selectedAnswer,
    String? correctAnswer,
    ErrorType? errorType,
    String? studentNotes,
    int? streak,
    bool? isMastered,
    String? questionText,
    String? optionA,
    String? optionB,
    String? optionC,
    String? optionD,
    String? explanation,
    String? subject,
    String? topic,
  }) {
    return MistakeItem(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      questionId: questionId ?? this.questionId,
      selectedAnswer: selectedAnswer ?? this.selectedAnswer,
      correctAnswer: correctAnswer ?? this.correctAnswer,
      errorType: errorType ?? this.errorType,
      studentNotes: studentNotes ?? this.studentNotes,
      streak: streak ?? this.streak,
      isMastered: isMastered ?? this.isMastered,
      questionText: questionText ?? this.questionText,
      optionA: optionA ?? this.optionA,
      optionB: optionB ?? this.optionB,
      optionC: optionC ?? this.optionC,
      optionD: optionD ?? this.optionD,
      explanation: explanation ?? this.explanation,
      subject: subject ?? this.subject,
      topic: topic ?? this.topic,
    );
  }
}
