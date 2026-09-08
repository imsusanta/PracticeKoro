import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/exam_target.dart';
import '../models/drill_model.dart';
import '../services/drill_service.dart';

class PracticeDrillsScreen extends StatefulWidget {
  const PracticeDrillsScreen({super.key});

  @override
  State<PracticeDrillsScreen> createState() => _PracticeDrillsScreenState();
}

class _PracticeDrillsScreenState extends State<PracticeDrillsScreen> {
  bool _loading = true;
  String _selectedExamId = 'wb-panchayat';
  List<DrillQuestion> _questions = [];
  final Set<String> _revealedAnswers = {};

  // Active Drill Session States
  bool _isDrilling = false;
  int _currentDrillIndex = 0;
  final Map<String, String> _userAnswers = {};
  DrillResult? _drillResult;
  Timer? _timer;
  int _elapsedSeconds = 0;

  @override
  void initState() {
    super.initState();
    _loadQuestions();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadQuestions() async {
    setState(() => _loading = true);
    final target = ExamDataCatalog.exams.firstWhere(
      (e) => e.id == _selectedExamId,
      orElse: () => ExamDataCatalog.exams.first,
    );

    final config = DrillConfig(
      title: target.name,
      examId: target.id,
      questionCount: 15,
      negativeMarks: target.defaultNegativeMarks,
    );

    final qs = await DrillService.fetchQuestions(config);
    setState(() {
      _questions = qs;
      _loading = false;
    });
  }

  void _startDrill() {
    setState(() {
      _isDrilling = true;
      _currentDrillIndex = 0;
      _userAnswers.clear();
      _drillResult = null;
      _elapsedSeconds = 0;
    });

    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (mounted) setState(() => _elapsedSeconds++);
    });
  }

  void _submitDrill() async {
    _timer?.cancel();
    final target = ExamDataCatalog.exams.firstWhere(
      (e) => e.id == _selectedExamId,
      orElse: () => ExamDataCatalog.exams.first,
    );

    final result = DrillService.evaluateDrill(
      questions: _questions,
      answers: _userAnswers,
      marksPerQ: 1.0,
      negativeMarks: target.defaultNegativeMarks,
      timeSpentSeconds: _elapsedSeconds,
    );

    setState(() {
      _drillResult = result;
    });

    final user = Supabase.instance.client.auth.currentUser;
    if (user != null && result.incorrectQuestions.isNotEmpty) {
      await DrillService.syncMistakes(user.id, result.incorrectQuestions);
    }
  }

  @override
  Widget build(BuildContext context) {
    final target = ExamDataCatalog.exams.firstWhere(
      (e) => e.id == _selectedExamId,
      orElse: () => ExamDataCatalog.exams.first,
    );

    if (_isDrilling) {
      return _buildActiveDrillScaffold(target);
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          'Smart Practice & PYQ Vault',
          style: GoogleFonts.inter(
            fontWeight: FontWeight.w800,
            fontSize: 18,
            color: const Color(0xFF0F172A),
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
      ),
      body: Column(
        children: [
          // Target Exam Carousel
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: ExamDataCatalog.exams.map((exam) {
                  final isSelected = exam.id == _selectedExamId;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(
                        exam.name,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: isSelected ? Colors.white : Colors.black87,
                        ),
                      ),
                      selected: isSelected,
                      selectedColor: const Color(0xFF0F172A),
                      onSelected: (val) {
                        if (val) {
                          setState(() => _selectedExamId = exam.id);
                          _loadQuestions();
                        }
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
          ),

          // Exam Overview & Drill Launcher Card
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF0A2655), Color(0xFF1455AF)],
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF0A2655).withValues(alpha: 0.3),
                  blurRadius: 15,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      target.bengaliName,
                      style: GoogleFonts.inter(
                        color: const Color(0xFFFBBF24),
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '-${target.defaultNegativeMarks} Negative',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  target.name,
                  style: GoogleFonts.inter(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  target.description,
                  style: const TextStyle(
                    color: Color(0xFFCBD5E1),
                    fontSize: 12,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFFBBF24),
                      foregroundColor: const Color(0xFF0F172A),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onPressed: _startDrill,
                    icon: const Icon(Icons.bolt_rounded, size: 18),
                    label: const Text(
                      'Launch Interactive Drill (10 MCQs)',
                      style: TextStyle(fontWeight: FontWeight.w900),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Questions Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Solved Practice Questions (${_questions.length})',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                TextButton(
                  onPressed: () {
                    setState(() {
                      if (_revealedAnswers.length == _questions.length) {
                        _revealedAnswers.clear();
                      } else {
                        _revealedAnswers.addAll(_questions.map((q) => q.id));
                      }
                    });
                  },
                  child: Text(
                    _revealedAnswers.length == _questions.length
                        ? 'Hide Solutions'
                        : 'Reveal All Solutions',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF4F46E5),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Study Questions List
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    itemCount: _questions.length,
                    itemBuilder: (context, idx) {
                      final q = _questions[idx];
                      final isRevealed = _revealedAnswers.contains(q.id);

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                if (q.year != null)
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFEF3C7),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      'PYQ ${q.year}',
                                      style: const TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFFB45309),
                                      ),
                                    ),
                                  ),
                                if (q.subject != null) ...[
                                  const SizedBox(width: 6),
                                  Text(
                                    q.subject!,
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF64748B),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              q.questionText,
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF0F172A),
                              ),
                            ),
                            const SizedBox(height: 10),
                            _buildStudyOption('A', q.optionA, q, isRevealed),
                            _buildStudyOption('B', q.optionB, q, isRevealed),
                            _buildStudyOption('C', q.optionC, q, isRevealed),
                            _buildStudyOption('D', q.optionD, q, isRevealed),
                            if (isRevealed && q.explanation != null)
                              Container(
                                margin: const EdgeInsets.only(top: 8),
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(
                                  '💡 ব্যাখ্যা: ${q.explanation}',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: Color(0xFF334155),
                                    height: 1.3,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildStudyOption(String key, String text, DrillQuestion q, bool isRevealed) {
    final isCorrect = isRevealed && key == q.correctAnswer;
    return Container(
      margin: const EdgeInsets.only(bottom: 5),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: isCorrect ? const Color(0xFFECFDF5) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isCorrect ? const Color(0xFF10B981) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Row(
        children: [
          Text(
            '($key) ',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: isCorrect ? const Color(0xFF065F46) : Colors.black54,
            ),
          ),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 12,
                color: isCorrect ? const Color(0xFF065F46) : const Color(0xFF334155),
                fontWeight: isCorrect ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ),
          if (isCorrect)
            const Icon(Icons.check_circle, size: 14, color: Color(0xFF10B981)),
        ],
      ),
    );
  }

  // Active Interactive Drill Scaffold
  Widget _buildActiveDrillScaffold(ExamTarget target) {
    if (_drillResult != null) {
      return Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          title: const Text('Drill Summary'),
          backgroundColor: Colors.white,
          elevation: 0,
        ),
        body: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.emoji_events_rounded, size: 64, color: Color(0xFFF59E0B)),
              const SizedBox(height: 16),
              Text(
                'অনুশীলন সম্পন্ন!',
                style: GoogleFonts.inter(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Final Score: ${_drillResult!.score} / ${_drillResult!.maxScore}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF4F46E5),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  Text('সঠিক: ${_drillResult!.correctCount}'),
                  Text('ভুল: ${_drillResult!.wrongCount}'),
                  Text('নির্ভুলতা: ${_drillResult!.accuracyPercentage}%'),
                ],
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0F172A),
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onPressed: () => setState(() => _isDrilling = false),
                child: const Text('ফিরে যান (Back to Practice)', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        ),
      );
    }

    final q = _questions[_currentDrillIndex];

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(
          'Question ${_currentDrillIndex + 1} of ${_questions.length}',
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
        ),
        actions: [
          Center(
            child: Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Text(
                '${_elapsedSeconds}s',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF4F46E5),
                ),
              ),
            ),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              q.questionText,
              style: GoogleFonts.inter(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 20),
            ...['A', 'B', 'C', 'D'].map((optKey) {
              final text = optKey == 'A'
                  ? q.optionA
                  : optKey == 'B'
                      ? q.optionB
                      : optKey == 'C'
                          ? q.optionC
                          : q.optionD;
              final isSelected = _userAnswers[q.id] == optKey;

              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: ListTile(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(
                      color: isSelected ? const Color(0xFF4F46E5) : const Color(0xFFE2E8F0),
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  tileColor: isSelected ? const Color(0xFFEEF2FF) : const Color(0xFFF8FAFC),
                  title: Text(
                    '($optKey) $text',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                  onTap: () {
                    setState(() {
                      _userAnswers[q.id] = optKey;
                    });
                  },
                ),
              );
            }),
            const Spacer(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (_currentDrillIndex > 0)
                  TextButton(
                    onPressed: () => setState(() => _currentDrillIndex--),
                    child: const Text('Previous'),
                  )
                else
                  const SizedBox(),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF4F46E5),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  ),
                  onPressed: () {
                    if (_currentDrillIndex < _questions.length - 1) {
                      setState(() => _currentDrillIndex++);
                    } else {
                      _submitDrill();
                    }
                  },
                  child: Text(
                    _currentDrillIndex == _questions.length - 1 ? 'Submit Drill' : 'Next',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
