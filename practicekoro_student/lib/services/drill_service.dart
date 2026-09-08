import 'dart:math';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/drill_model.dart';

class DrillService {
  static const List<DrillQuestion> fallbackQuestions = [
    DrillQuestion(
      id: "pyq-fb-1",
      questionText: "ভারতের সংবিধানের কত নম্বর ধারায় গ্রাম পঞ্চায়েত গঠনের নির্দেশ দেওয়া হয়েছে?",
      optionA: "ধারা ৪০ (Article 40)",
      optionB: "ধারা ৪৪ (Article 44)",
      optionC: "ধারা ৩২ (Article 32)",
      optionD: "ধারা ৫১A (Article 51A)",
      correctAnswer: "A",
      explanation: "ভারতীয় সংবিধানের অংশ IV-এ ধারা ৪০ (Article 40)-এ গ্রাম পঞ্চায়েত গঠনের নির্দেশ দেওয়া হয়েছে।",
      subject: "Indian Polity",
      topic: "Panchayati Raj",
      difficulty: "easy",
      year: 2024,
    ),
    DrillQuestion(
      id: "pyq-fb-2",
      questionText: "কোনো দ্রব্যের ক্রয়মূল্য ও বিক্রয়মূল্যের অনুপাত 4 : 5 হলে শতকরা লাভের পরিমাণ কত?",
      optionA: "20%",
      optionB: "25%",
      optionC: "30%",
      optionD: "15%",
      correctAnswer: "B",
      explanation: "শতকরা লাভ = (1 / 4) * 100% = 25%।",
      subject: "Mathematics",
      topic: "Profit and Loss",
      difficulty: "easy",
      year: 2024,
    ),
    DrillQuestion(
      id: "pyq-fb-3",
      questionText: "পশ্চিমবঙ্গের সুন্দরবন অঞ্চলকে কোন সালে UNESCO World Heritage Site হিসেবে ঘোষণা করা হয়?",
      optionA: "১৯৮৩",
      optionB: "১৯৮৭",
      optionC: "১৯৮৯",
      optionD: "১৯৯২",
      correctAnswer: "B",
      explanation: "১৯৮৭ সালে ইউনেস্কো সুন্দরবন জাতীয় উদ্যানকে প্রাকৃতিক বিশ্ব ঐতিহ্যবাহী স্থান হিসেবে স্বীকৃতি দেয়।",
      subject: "West Bengal GK",
      topic: "Geography",
      difficulty: "medium",
      year: 2023,
    ),
    DrillQuestion(
      id: "pyq-fb-4",
      questionText: "Choose the correct collective noun: A _______ of lions was resting.",
      optionA: "Pack",
      optionB: "Pride",
      optionC: "Herd",
      optionD: "Flock",
      correctAnswer: "B",
      explanation: "Lions-এর দল বোঝাতে Collective Noun 'Pride' ব্যবহৃত হয় (A pride of lions)।",
      subject: "English",
      topic: "Nouns",
      difficulty: "easy",
      year: 2023,
    ),
  ];

  static DrillResult evaluateDrill({
    required List<DrillQuestion> questions,
    required Map<String, String> answers,
    double marksPerQ = 1.0,
    double negativeMarks = 0.25,
    int timeSpentSeconds = 0,
  }) {
    int attempted = 0;
    int correct = 0;
    int wrong = 0;
    final incorrect = <DrillIncorrectItem>[];

    for (final q in questions) {
      final selected = answers[q.id]?.toUpperCase().trim();
      if (selected == null || selected.isEmpty) continue;

      attempted++;
      final isCorrect = selected == q.correctAnswer.toUpperCase().trim();

      if (isCorrect) {
        correct++;
      } else {
        wrong++;
        incorrect.add(DrillIncorrectItem(
          question: q,
          selectedAnswer: selected,
          correctAnswer: q.correctAnswer,
        ));
      }
    }

    final unattempted = questions.length - attempted;
    final rawScore = (correct * marksPerQ) - (wrong * negativeMarks);
    final score = max(0.0, ((rawScore * 100).round() / 100.0));
    final maxScore = questions.length * marksPerQ;
    final accuracy = attempted > 0 ? ((correct / attempted) * 100).round() : 0;

    return DrillResult(
      totalQuestions: questions.length,
      attemptedCount: attempted,
      correctCount: correct,
      wrongCount: wrong,
      unattemptedCount: unattempted,
      score: score,
      maxScore: maxScore,
      accuracyPercentage: accuracy,
      timeSpentSeconds: timeSpentSeconds,
      incorrectQuestions: incorrect,
    );
  }

  static Future<List<DrillQuestion>> fetchQuestions(DrillConfig config) async {
    try {
      final client = Supabase.instance.client;
      var query = client.from('questions').select();

      if (config.subject != null && config.subject != 'all') {
        query = query.eq('subject', config.subject!);
      }

      final response = await query.limit(config.questionCount);
      if (response.isNotEmpty) {
        return (response as List)
            .map((item) => DrillQuestion.fromJson(item as Map<String, dynamic>))
            .toList();
      }
    } catch (e) {
      // Fallback
    }

    return fallbackQuestions.take(config.questionCount).toList();
  }

  static Future<int> syncMistakes(
    String? userId,
    List<DrillIncorrectItem> incorrectList,
  ) async {
    if (userId == null || userId.isEmpty || incorrectList.isEmpty) return 0;

    try {
      final client = Supabase.instance.client;
      final payload = incorrectList
          .map((item) => {
                'user_id': userId,
                'question_id': item.question.id,
                'selected_answer': item.selectedAnswer,
                'correct_answer': item.correctAnswer,
                'is_mastered': false,
                'error_type': 'unclassified',
                'updated_at': DateTime.now().toIso8601String(),
              })
          .toList();

      await client.from('student_mistakes').upsert(payload);
      return payload.length;
    } catch (e) {
      return 0;
    }
  }
}
