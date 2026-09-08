import 'package:flutter_test/flutter_test.dart';
import 'package:practicekoro_student/models/drill_model.dart';
import 'package:practicekoro_student/services/drill_service.dart';

void main() {
  group('DrillService — Flutter Practice & Drill Evaluation', () {
    const questions = [
      DrillQuestion(
        id: 'q1',
        questionText: 'Question 1',
        optionA: 'Opt A',
        optionB: 'Opt B',
        optionC: 'Opt C',
        optionD: 'Opt D',
        correctAnswer: 'A',
      ),
      DrillQuestion(
        id: 'q2',
        questionText: 'Question 2',
        optionA: 'Opt A',
        optionB: 'Opt B',
        optionC: 'Opt C',
        optionD: 'Opt D',
        correctAnswer: 'B',
      ),
      DrillQuestion(
        id: 'q3',
        questionText: 'Question 3',
        optionA: 'Opt A',
        optionB: 'Opt B',
        optionC: 'Opt C',
        optionD: 'Opt D',
        correctAnswer: 'C',
      ),
      DrillQuestion(
        id: 'q4',
        questionText: 'Question 4',
        optionA: 'Opt A',
        optionB: 'Opt B',
        optionC: 'Opt C',
        optionD: 'Opt D',
        correctAnswer: 'D',
      ),
    ];

    test('evaluates a perfect attempt with full marks', () {
      final answers = {'q1': 'A', 'q2': 'B', 'q3': 'C', 'q4': 'D'};
      final result = DrillService.evaluateDrill(
        questions: questions,
        answers: answers,
        marksPerQ: 1.0,
        negativeMarks: 0.25,
      );

      expect(result.totalQuestions, equals(4));
      expect(result.attemptedCount, equals(4));
      expect(result.correctCount, equals(4));
      expect(result.wrongCount, equals(0));
      expect(result.score, equals(4.0));
      expect(result.accuracyPercentage, equals(100));
      expect(result.incorrectQuestions, isEmpty);
    });

    test('deducts negative marking accurately (-0.25)', () {
      final answers = {
        'q1': 'A', // correct (+1.0)
        'q2': 'A', // wrong (-0.25)
        'q3': 'C', // correct (+1.0)
        'q4': 'A', // wrong (-0.25)
      };

      final result = DrillService.evaluateDrill(
        questions: questions,
        answers: answers,
        marksPerQ: 1.0,
        negativeMarks: 0.25,
      );

      expect(result.correctCount, equals(2));
      expect(result.wrongCount, equals(2));
      expect(result.score, equals(1.5)); // 2 - 0.50 = 1.50
      expect(result.accuracyPercentage, equals(50));
      expect(result.incorrectQuestions.length, equals(2));
    });

    test('clamps negative raw scores to zero', () {
      final answers = {
        'q1': 'B', // wrong
        'q2': 'A', // wrong
        'q3': 'A', // wrong
        'q4': 'A', // wrong
      };

      final result = DrillService.evaluateDrill(
        questions: questions,
        answers: answers,
        marksPerQ: 1.0,
        negativeMarks: 0.50,
      );

      expect(result.correctCount, equals(0));
      expect(result.wrongCount, equals(4));
      expect(result.score, equals(0.0));
      expect(result.accuracyPercentage, equals(0));
    });
  });
}
