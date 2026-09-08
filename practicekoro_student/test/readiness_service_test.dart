import 'package:flutter_test/flutter_test.dart';
import 'package:practicekoro_student/models/exam_readiness.dart';
import 'package:practicekoro_student/services/readiness_service.dart';

void main() {
  group('ReadinessService — Flutter Mobile Readiness Engine', () {
    test('calculates weighted readiness and classifies high performers as examReady', () {
      final result = ReadinessService.computeReadiness(
        mockPercentages: [85.0, 87.0],
        drillQuestionsSolved: 120,
        drillAccuracy: 90,
        streakDays: 14,
        totalMistakes: 10,
        masteredMistakes: 8,
        targetExamId: 'wb-panchayat',
      );

      expect(result.overallReadiness, greaterThanOrEqualTo(80));
      expect(result.readinessBand, equals(ReadinessBand.examReady));
      expect(result.bengaliBandLabel, contains('প্রস্তুত'));
      expect(result.hasSufficientData, isTrue);
      expect(result.projectedScore, greaterThanOrEqualTo(80.0));
      expect(result.maxScore, equals(100));
    });

    test('scales projected score to target exam total marks', () {
      // WBP Constable has maxScore: 85
      final result = ReadinessService.computeReadiness(
        mockPercentages: [70.0],
        drillQuestionsSolved: 50,
        drillAccuracy: 70,
        streakDays: 5,
        totalMistakes: 6,
        masteredMistakes: 3,
        targetExamId: 'wbp-constable',
      );

      expect(result.targetExamId, equals('wbp-constable'));
      expect(result.maxScore, equals(85));
      expect(result.projectedScore, lessThanOrEqualTo(85.0));
    });

    test('extracts weakest and strongest subjects accurately', () {
      final result = ReadinessService.computeReadiness(
        mockPercentages: [65.0],
        drillQuestionsSolved: 30,
        drillAccuracy: 60,
        streakDays: 3,
        totalMistakes: 4,
        masteredMistakes: 1,
        targetExamId: 'wb-panchayat',
      );

      expect(result.subjectReadiness.length, equals(6));
      expect(result.weakestSubject, isNotNull);
      expect(result.strongestSubject, isNotNull);
      expect(
        result.weakestSubject!.scorePercent,
        lessThanOrEqualTo(result.strongestSubject!.scorePercent),
      );
    });

    test('handles new students with zero attempts gracefully', () {
      final result = ReadinessService.computeReadiness(
        mockPercentages: [],
        drillQuestionsSolved: 0,
        drillAccuracy: 0,
        streakDays: 0,
        totalMistakes: 0,
        masteredMistakes: 0,
        targetExamId: 'psc-clerkship',
      );

      expect(result.hasSufficientData, isFalse);
      expect(result.overallReadiness, equals(35));
      expect(result.readinessBand, equals(ReadinessBand.critical));
      expect(result.recommendedActions.length, greaterThanOrEqualTo(2));
    });
  });
}
