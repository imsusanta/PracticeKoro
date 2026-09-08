enum ExamCategory {
  stateGovt,
  police,
  teaching,
  centralGovt,
}

class CutoffBenchmark {
  final String examId;
  final String examName;
  final int totalMarks;
  final double expectedCutoffUR;
  final double expectedCutoffOBC;
  final double expectedCutoffSC;
  final double expectedCutoffST;
  final int year;

  const CutoffBenchmark({
    required this.examId,
    required this.examName,
    required this.totalMarks,
    required this.expectedCutoffUR,
    required this.expectedCutoffOBC,
    required this.expectedCutoffSC,
    required this.expectedCutoffST,
    required this.year,
  });
}

class ExamTarget {
  final String id;
  final String name;
  final String bengaliName;
  final ExamCategory category;
  final String conductingBody;
  final String badge;
  final int defaultQuestions;
  final int defaultDurationMinutes;
  final double defaultNegativeMarks;
  final List<String> subjects;
  final List<int> pyqYears;
  final String description;

  const ExamTarget({
    required this.id,
    required this.name,
    required this.bengaliName,
    required this.category,
    required this.conductingBody,
    required this.badge,
    required this.defaultQuestions,
    required this.defaultDurationMinutes,
    required this.defaultNegativeMarks,
    required this.subjects,
    required this.pyqYears,
    required this.description,
  });
}

class ExamDataCatalog {
  static const List<ExamTarget> exams = [
    ExamTarget(
      id: "wb-panchayat",
      name: "WB Panchayat Recruitment",
      bengaliName: "পশ্চিমবঙ্গ পঞ্চায়েত পরীক্ষা ২০২৬",
      category: ExamCategory.stateGovt,
      conductingBody: "WBPRD",
      badge: "Hot",
      defaultQuestions: 100,
      defaultDurationMinutes: 90,
      defaultNegativeMarks: 0.25,
      subjects: ["General Knowledge", "Arithmetic", "English", "Bengali"],
      pyqYears: [2024, 2023, 2022, 2021],
      description: "Gram Panchayat Karmi, Executive Assistant, Nirman Sahayak & Secretary exam.",
    ),
    ExamTarget(
      id: "wbp-constable",
      name: "WBP Constable & Lady Constable",
      bengaliName: "পশ্চিমবঙ্গ পুলিশ কনস্টেবল",
      category: ExamCategory.police,
      conductingBody: "WBPRB",
      badge: "Popular",
      defaultQuestions: 85,
      defaultDurationMinutes: 60,
      defaultNegativeMarks: 0.25,
      subjects: ["General Awareness", "Elementary Mathematics", "Reasoning", "English"],
      pyqYears: [2024, 2023, 2021, 2019],
      description: "Official recruitment examination for West Bengal Police and Lady Constable.",
    ),
    ExamTarget(
      id: "wbp-si",
      name: "KP & WBP Sub-Inspector (SI)",
      bengaliName: "কলকাতা ও পশ্চিমবঙ্গ পুলিশ এসআই",
      category: ExamCategory.police,
      conductingBody: "WBPRB",
      badge: "Pro",
      defaultQuestions: 100,
      defaultDurationMinutes: 90,
      defaultNegativeMarks: 0.50,
      subjects: ["General Studies", "Logical & Analytical Reasoning", "Arithmetic"],
      pyqYears: [2023, 2022, 2021],
      description: "Kolkata Police & WBP Sub-Inspector Prelims examination.",
    ),
    ExamTarget(
      id: "psc-clerkship",
      name: "WBPSC Clerkship",
      bengaliName: "পিএসসি ক্লার্কশিপ পরীক্ষা",
      category: ExamCategory.stateGovt,
      conductingBody: "WBPSC",
      badge: "Trending",
      defaultQuestions: 100,
      defaultDurationMinutes: 90,
      defaultNegativeMarks: 0.25,
      subjects: ["General Studies", "Arithmetic", "English"],
      pyqYears: [2024, 2019],
      description: "Lower Division Assistant / Clerk (Part I) objective examination.",
    ),
    ExamTarget(
      id: "wb-tet",
      name: "WB Primary TET",
      bengaliName: "পশ্চিমবঙ্গ প্রাথমিক টেট",
      category: ExamCategory.teaching,
      conductingBody: "WBBPE",
      badge: "High Demand",
      defaultQuestions: 150,
      defaultDurationMinutes: 150,
      defaultNegativeMarks: 0.00,
      subjects: ["Child Development", "Bengali", "English", "Mathematics", "EVS"],
      pyqYears: [2023, 2022, 2017],
      description: "West Bengal Board of Primary Education Teacher Eligibility Test.",
    ),
    ExamTarget(
      id: "wbcs",
      name: "WBCS Executive (Prelims)",
      bengaliName: "ডব্লিউবিসিএস প্রিলিমিনারি",
      category: ExamCategory.stateGovt,
      conductingBody: "WBPSC",
      badge: "Elite",
      defaultQuestions: 200,
      defaultDurationMinutes: 150,
      defaultNegativeMarks: 0.33,
      subjects: ["English", "General Science", "History", "Geography", "Polity", "Reasoning"],
      pyqYears: [2023, 2022, 2021, 2020],
      description: "Premier West Bengal Civil Service preliminary screening examination.",
    ),
    ExamTarget(
      id: "rrb-group-d",
      name: "Railway Group D / NTPC",
      bengaliName: "রেলওয়ে গ্রুপ ডি ও এনটিপিসি",
      category: ExamCategory.centralGovt,
      conductingBody: "RRB",
      badge: "National",
      defaultQuestions: 100,
      defaultDurationMinutes: 90,
      defaultNegativeMarks: 0.33,
      subjects: ["General Science", "Mathematics", "Reasoning", "General Awareness"],
      pyqYears: [2022, 2018],
      description: "Railway Recruitment Board Computer-Based Test (CBT).",
    ),
    ExamTarget(
      id: "ssc-gd",
      name: "SSC GD Constable",
      bengaliName: "এসএসসি জিডি কনস্টেবল",
      category: ExamCategory.centralGovt,
      conductingBody: "SSC",
      badge: "National",
      defaultQuestions: 80,
      defaultDurationMinutes: 60,
      defaultNegativeMarks: 0.50,
      subjects: ["Reasoning", "General Knowledge", "Elementary Mathematics", "English"],
      pyqYears: [2024, 2023, 2021],
      description: "Staff Selection Commission Constable GD examination.",
    ),
  ];

  static const Map<String, CutoffBenchmark> cutoffs = {
    "wb-panchayat": CutoffBenchmark(
      examId: "wb-panchayat",
      examName: "WB Panchayat Recruitment",
      totalMarks: 100,
      expectedCutoffUR: 72.0,
      expectedCutoffOBC: 67.0,
      expectedCutoffSC: 62.0,
      expectedCutoffST: 55.0,
      year: 2024,
    ),
    "wbp-constable": CutoffBenchmark(
      examId: "wbp-constable",
      examName: "WBP Constable & Lady Constable",
      totalMarks: 85,
      expectedCutoffUR: 56.0,
      expectedCutoffOBC: 51.0,
      expectedCutoffSC: 46.0,
      expectedCutoffST: 40.0,
      year: 2024,
    ),
    "wbp-si": CutoffBenchmark(
      examId: "wbp-si",
      examName: "KP & WBP Sub-Inspector",
      totalMarks: 200,
      expectedCutoffUR: 142.0,
      expectedCutoffOBC: 134.0,
      expectedCutoffSC: 122.0,
      expectedCutoffST: 108.0,
      year: 2023,
    ),
    "psc-clerkship": CutoffBenchmark(
      examId: "psc-clerkship",
      examName: "WBPSC Clerkship",
      totalMarks: 100,
      expectedCutoffUR: 68.0,
      expectedCutoffOBC: 63.0,
      expectedCutoffSC: 58.0,
      expectedCutoffST: 50.0,
      year: 2024,
    ),
    "wb-tet": CutoffBenchmark(
      examId: "wb-tet",
      examName: "WB Primary TET",
      totalMarks: 150,
      expectedCutoffUR: 90.0,
      expectedCutoffOBC: 83.0,
      expectedCutoffSC: 83.0,
      expectedCutoffST: 83.0,
      year: 2023,
    ),
    "wbcs": CutoffBenchmark(
      examId: "wbcs",
      examName: "WBCS Executive (Prelims)",
      totalMarks: 200,
      expectedCutoffUR: 128.0,
      expectedCutoffOBC: 122.0,
      expectedCutoffSC: 114.0,
      expectedCutoffST: 98.0,
      year: 2023,
    ),
    "rrb-group-d": CutoffBenchmark(
      examId: "rrb-group-d",
      examName: "Railway Group D",
      totalMarks: 100,
      expectedCutoffUR: 68.0,
      expectedCutoffOBC: 63.0,
      expectedCutoffSC: 56.0,
      expectedCutoffST: 50.0,
      year: 2022,
    ),
    "ssc-gd": CutoffBenchmark(
      examId: "ssc-gd",
      examName: "SSC GD Constable",
      totalMarks: 160,
      expectedCutoffUR: 122.0,
      expectedCutoffOBC: 116.0,
      expectedCutoffSC: 104.0,
      expectedCutoffST: 94.0,
      year: 2024,
    ),
  };

  static CutoffBenchmark getCutoff(String examId) {
    return cutoffs[examId] ??
        const CutoffBenchmark(
          examId: "general",
          examName: "State Govt Exam",
          totalMarks: 100,
          expectedCutoffUR: 70.0,
          expectedCutoffOBC: 65.0,
          expectedCutoffSC: 60.0,
          expectedCutoffST: 52.0,
          year: 2024,
        );
  }
}
