import 'exam_target.dart';

enum ReadinessBand {
  critical,
  developing,
  competitive,
  examReady,
}

class SubjectReadinessItem {
  final String subject;
  final String bengaliName;
  final int scorePercent;
  final String status; // 'strong' | 'average' | 'weak'
  final int attemptedCount;
  final int mistakesCount;

  const SubjectReadinessItem({
    required this.subject,
    required this.bengaliName,
    required this.scorePercent,
    required this.status,
    required this.attemptedCount,
    required this.mistakesCount,
  });
}

class RecommendedAction {
  final String id;
  final String title;
  final String bengaliTitle;
  final String subtitle;
  final String actionUrl;
  final String impactLabel;

  const RecommendedAction({
    required this.id,
    required this.title,
    required this.bengaliTitle,
    required this.subtitle,
    required this.actionUrl,
    required this.impactLabel,
  });
}

class ExamReadinessResult {
  final int overallReadiness;
  final ReadinessBand readinessBand;
  final String readinessLabel;
  final String bengaliBandLabel;
  final int mockAccuracy;
  final int topicDrillAccuracy;
  final int mistakeMasteryRate;
  final int consistencyScore;
  final double projectedScore;
  final int maxScore;
  final String targetExamId;
  final String targetExamName;
  final CutoffBenchmark cutoffBenchmark;
  final List<SubjectReadinessItem> subjectReadiness;
  final SubjectReadinessItem? weakestSubject;
  final SubjectReadinessItem? strongestSubject;
  final List<RecommendedAction> recommendedActions;
  final bool hasSufficientData;

  const ExamReadinessResult({
    required this.overallReadiness,
    required this.readinessBand,
    required this.readinessLabel,
    required this.bengaliBandLabel,
    required this.mockAccuracy,
    required this.topicDrillAccuracy,
    required this.mistakeMasteryRate,
    required this.consistencyScore,
    required this.projectedScore,
    required this.maxScore,
    required this.targetExamId,
    required this.targetExamName,
    required this.cutoffBenchmark,
    required this.subjectReadiness,
    this.weakestSubject,
    this.strongestSubject,
    required this.recommendedActions,
    required this.hasSufficientData,
  });
}
