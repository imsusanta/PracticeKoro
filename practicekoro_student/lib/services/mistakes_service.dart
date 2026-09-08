import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/mistake_item.dart';

class MistakesService {
  static final _client = Supabase.instance.client;

  static Future<List<MistakeItem>> fetchMistakes(String userId) async {
    try {
      final response = await _client
          .from('student_mistakes')
          .select('''
            id,
            user_id,
            question_id,
            selected_answer,
            correct_answer,
            error_type,
            student_notes,
            streak,
            is_mastered,
            questions (
              question_text,
              option_a,
              option_b,
              option_c,
              option_d,
              explanation,
              subject,
              topic
            )
          ''')
          .eq('user_id', userId)
          .order('updated_at', ascending: false);

      return (response as List)
          .map((item) => MistakeItem.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  static Future<bool> classifyMistake({
    required String mistakeId,
    required ErrorType errorType,
    String? studentNotes,
  }) async {
    try {
      await _client.from('student_mistakes').update({
        'error_type': errorType.toDbString(),
        'student_notes': studentNotes,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', mistakeId);
      return true;
    } catch (e) {
      return false;
    }
  }

  static MistakeItem evaluateReAttempt(MistakeItem item, String selectedOption) {
    final isCorrect = selectedOption.toUpperCase().trim() ==
        item.correctAnswer.toUpperCase().trim();

    final newStreak = isCorrect ? item.streak + 1 : 0;
    final isMastered = isCorrect && (newStreak >= 1 || item.isMastered);

    return item.copyWith(
      selectedAnswer: selectedOption,
      streak: newStreak,
      isMastered: isMastered,
    );
  }

  static Future<bool> recordReAttempt({
    required String mistakeId,
    required String selectedOption,
    required bool isCorrect,
  }) async {
    try {
      await _client.from('student_mistakes').update({
        'selected_answer': selectedOption,
        'is_mastered': isCorrect,
        'streak': isCorrect ? 1 : 0,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', mistakeId);
      return true;
    } catch (e) {
      return false;
    }
  }
}
