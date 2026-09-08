import 'package:flutter_test/flutter_test.dart';
import 'package:practicekoro_student/models/mistake_item.dart';
import 'package:practicekoro_student/services/mistakes_service.dart';

void main() {
  group('MistakesService — Flutter Revision & Mastery State', () {
    const item = MistakeItem(
      id: 'm1',
      userId: 'u1',
      questionId: 'q1',
      correctAnswer: 'B',
      errorType: ErrorType.conceptual,
      streak: 0,
      isMastered: false,
    );

    test('increments streak and marks as mastered when reattempt is correct', () {
      final updated = MistakesService.evaluateReAttempt(item, 'B');

      expect(updated.streak, equals(1));
      expect(updated.isMastered, isTrue);
      expect(updated.selectedAnswer, equals('B'));
    });

    test('resets streak to 0 and keeps unmastered when reattempt is incorrect', () {
      final updated = MistakesService.evaluateReAttempt(item, 'C');

      expect(updated.streak, equals(0));
      expect(updated.isMastered, isFalse);
      expect(updated.selectedAnswer, equals('C'));
    });

    test('error type labels map correctly in Bengali and English', () {
      expect(ErrorType.conceptual.label, equals('Concept Gap'));
      expect(ErrorType.conceptual.bengaliLabel, equals('কনসেপ্ট পরিষ্কার ছিল না'));
      expect(ErrorType.careless.label, equals('Silly Mistake'));
      expect(ErrorType.careless.bengaliLabel, equals('তাড়াহুড়োয় জানা প্রশ্ন ভুল'));
      expect(ErrorType.timePressure.label, equals('Time Panic'));
      expect(ErrorType.timePressure.bengaliLabel, equals('সময়ের টান ও নার্ভাসনেস'));
      expect(ErrorType.guess.label, equals('Blind Guess'));
      expect(ErrorType.guess.bengaliLabel, equals('আন্দাজে তুকা মেরেছি'));
    });
  });
}
