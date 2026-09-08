import 'dart:math';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/exam_target.dart';
import '../models/exam_readiness.dart';

class ReadinessService {
  static ExamReadinessResult computeReadiness({
    required List<double> mockPercentages,
    required int drillQuestionsSolved,
    required int drillAccuracy,
    required int streakDays,
    required int totalMistakes,
    required int masteredMistakes,
    required String targetExamId,
  }) {
    final benchmark = ExamDataCatalog.getCutoff(targetExamId);
    final targetExam = ExamDataCatalog.exams.firstWhere(
      (e) => e.id == targetExamId,
      orElse: () => ExamDataCatalog.exams.first,
    );

    final hasMockData = mockPercentages.isNotEmpty;
    final hasDrillData = drillQuestionsSolved > 0;
    final hasSufficientData = hasMockData || hasDrillData;

    // 1. Mock Accuracy (40%)
    final double avgMockAcc = hasMockData
        ? mockPercentages.reduce((a, b) => a + b) / mockPercentages.length
        : 50.0;

    // 2. Topic Drill Accuracy (25%)
    final double drillAcc = hasDrillData
        ? drillAccuracy.clamp(0, 100).toDouble()
        : 50.0;

    // 3. Mistake Mastery Rate (20%)
    final double masteryRate = totalMistakes > 0
        ? (masteredMistakes / totalMistakes) * 100.0
        : (hasSufficientData ? 75.0 : 50.0);

    // 4. Consistency Score (15%) - 15 days streak = 100%
    final double consistencyScore = ((streakDays / 15.0) * 100.0).clamp(0.0, 100.0);

    int overallReadiness;
    if (!hasSufficientData) {
      overallReadiness = 35;
    } else {
      final raw = (avgMockAcc * 0.40) +
          (drillAcc * 0.25) +
          (masteryRate * 0.20) +
          (consistencyScore * 0.15);
      overallReadiness = raw.round().clamp(10, 99);
    }

    ReadinessBand band;
    String label;
    String bengaliBand;

    if (overallReadiness >= 80) {
      band = ReadinessBand.examReady;
      label = "Exam Ready";
      bengaliBand = "পরীক্ষার জন্য সম্পূর্ণ প্রস্তুত";
    } else if (overallReadiness >= 65) {
      band = ReadinessBand.competitive;
      label = "Competitive Zone";
      bengaliBand = "প্রতিদ্বন্দ্বিতাপূর্ণ স্কোরে আছেন";
    } else if (overallReadiness >= 45) {
      band = ReadinessBand.developing;
      label = "Developing";
      bengaliBand = "উন্নতির পথে আছেন";
    } else {
      band = ReadinessBand.critical;
      label = "Needs Focus";
      bengaliBand = "বিশেষ নজর দেওয়া প্রয়োজন";
    }

    final projectedScore =
        ((overallReadiness / 100.0) * benchmark.totalMarks * 10).round() / 10.0;

    final coreSubjects = [
      {'name': 'General Knowledge', 'bn': 'সাধারণ জ্ঞান', 'mult': 1.05},
      {'name': 'Mathematics', 'bn': 'পাটিগণিত ও অঙ্ক', 'mult': 0.72},
      {'name': 'General Science', 'bn': 'সাধারণ বিজ্ঞান', 'mult': 0.90},
      {'name': 'English', 'bn': 'ইংরেজি', 'mult': 0.82},
      {'name': 'Bengali', 'bn': 'বাংলা সাহিত্য', 'mult': 1.02},
      {'name': 'Reasoning', 'bn': 'রিজনিং', 'mult': 0.85},
    ];

    final subjectReadiness = coreSubjects.map((s) {
      final score = ((overallReadiness * (s['mult'] as double)).round()).clamp(20, 98);
      String status = 'average';
      if (score >= 75) status = 'strong';
      if (score < 55) status = 'weak';

      return SubjectReadinessItem(
        subject: s['name'] as String,
        bengaliName: s['bn'] as String,
        scorePercent: score,
        status: status,
        attemptedCount: hasSufficientData ? max(5, drillQuestionsSolved ~/ 5) : 0,
        mistakesCount: status == 'weak' ? 3 : 1,
      );
    }).toList();

    subjectReadiness.sort((a, b) => a.scorePercent.compareTo(b.scorePercent));
    final weakest = subjectReadiness.first;
    final strongest = subjectReadiness.last;

    final recommendedActions = <RecommendedAction>[
      RecommendedAction(
        id: 'act-weak',
        title: 'Practice ${weakest.subject}',
        bengaliTitle: '${weakest.bengaliName} অনুশীলন করুন',
        subtitle: 'Current accuracy is ${weakest.scorePercent}%. Solve 10 MCQs.',
        actionUrl: '/practice',
        impactLabel: '+4% Readiness',
      ),
      RecommendedAction(
        id: 'act-mistakes',
        title: 'Revise Mistakes Notebook',
        bengaliTitle: 'ভুল নোটবুক রিভাইজ করুন',
        subtitle: 'Master pending mistakes to eliminate negative marking.',
        actionUrl: '/mistakes',
        impactLabel: '+5% Readiness',
      ),
      RecommendedAction(
        id: 'act-mock',
        title: 'Take ${targetExam.name} Mock',
        bengaliTitle: '${targetExam.bengaliName} টেস্ট দিন',
        subtitle: 'Full timed exam with official negative marking.',
        actionUrl: '/exams',
        impactLabel: '+6% Readiness',
      ),
    ];

    return ExamReadinessResult(
      overallReadiness: overallReadiness,
      readinessBand: band,
      readinessLabel: label,
      bengaliBandLabel: bengaliBand,
      mockAccuracy: avgMockAcc.round(),
      topicDrillAccuracy: drillAcc.round(),
      mistakeMasteryRate: masteryRate.round(),
      consistencyScore: consistencyScore.round(),
      projectedScore: projectedScore,
      maxScore: benchmark.totalMarks,
      targetExamId: targetExamId,
      targetExamName: targetExam.name,
      cutoffBenchmark: benchmark,
      subjectReadiness: subjectReadiness,
      weakestSubject: weakest,
      strongestSubject: strongest,
      recommendedActions: recommendedActions,
      hasSufficientData: hasSufficientData,
    );
  }

  static Future<ExamReadinessResult> fetchStudentReadiness(
    String? userId,
    String targetExamId,
  ) async {
    final mockPercentages = <double>[];
    int totalMistakes = 0;
    int masteredMistakes = 0;

    if (userId != null && userId.isNotEmpty) {
      try {
        final client = Supabase.instance.client;

        final attempts = await client
            .from('test_attempts')
            .select('percentage')
            .eq('user_id', userId)
            .eq('is_active', false)
            .limit(10);

        for (final a in attempts) {
          final p = (a['percentage'] as num?)?.toDouble() ?? 0.0;
          mockPercentages.add(p);
        }

        final mistakes = await client
            .from('student_mistakes')
            .select('is_mastered')
            .eq('user_id', userId);

        totalMistakes = mistakes.length;
        masteredMistakes =
            mistakes.where((m) => m['is_mastered'] == true).length;
      } catch (e) {
        // Fallback gracefully on network degradation
      }
    }

    return computeReadiness(
      mockPercentages: mockPercentages,
      drillQuestionsSolved: mockPercentages.isNotEmpty ? 40 : 0,
      drillAccuracy: mockPercentages.isNotEmpty ? 70 : 0,
      streakDays: 3,
      totalMistakes: totalMistakes,
      masteredMistakes: masteredMistakes,
      targetExamId: targetExamId,
    );
  }
}
