import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/mistake_item.dart';
import '../services/mistakes_service.dart';
import '../theme/responsive.dart';

class MistakesNotebookScreen extends StatefulWidget {
  const MistakesNotebookScreen({super.key});

  @override
  State<MistakesNotebookScreen> createState() => _MistakesNotebookScreenState();
}

class _MistakesNotebookScreenState extends State<MistakesNotebookScreen> {
  bool _loading = true;
  List<MistakeItem> _mistakes = [];
  ErrorType _selectedFilter = ErrorType.unclassified;
  bool _showOnlyNeedsRevision = true;
  final Set<String> _revealedExplanations = {};

  @override
  void initState() {
    super.initState();
    _loadMistakes();
  }

  Future<void> _loadMistakes() async {
    setState(() => _loading = true);
    final user = Supabase.instance.client.auth.currentUser;
    if (user != null) {
      final items = await MistakesService.fetchMistakes(user.id);
      setState(() {
        _mistakes = items;
        _loading = false;
      });
    } else {
      setState(() => _loading = false);
    }
  }

  List<MistakeItem> get _filteredMistakes {
    return _mistakes.where((m) {
      if (_showOnlyNeedsRevision && m.isMastered) return false;
      if (!_showOnlyNeedsRevision && !m.isMastered) return false;
      if (_selectedFilter != ErrorType.unclassified && m.errorType != _selectedFilter) {
        return false;
      }
      return true;
    }).toList();
  }

  void _showClassificationDialog(MistakeItem item) {
    ErrorType selectedType = item.errorType;
    final noteController = TextEditingController(text: item.studentNotes ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.fromLTRB(
            20,
            20,
            20,
            MediaQuery.of(context).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Tag Error Cause & Key Takeaway',
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  ErrorType.conceptual,
                  ErrorType.careless,
                  ErrorType.timePressure,
                  ErrorType.guess,
                ].map((type) {
                  final isSelected = selectedType == type;
                  return ChoiceChip(
                    label: Text(
                      type.label,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: isSelected ? Colors.white : Colors.black87,
                      ),
                    ),
                    selected: isSelected,
                    selectedColor: const Color(0xFF4F46E5),
                    onSelected: (val) {
                      if (val) setModalState(() => selectedType = type);
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: noteController,
                maxLines: 2,
                decoration: InputDecoration(
                  hintText: 'Add personal takeaway note (e.g. key formula, shortcut trick, trap to avoid)...',
                  hintStyle: const TextStyle(fontSize: 13),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF4F46E5),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: () async {
                    await MistakesService.classifyMistake(
                      mistakeId: item.id,
                      errorType: selectedType,
                      studentNotes: noteController.text.trim(),
                    );
                    if (ctx.mounted) {
                      Navigator.pop(ctx);
                    }
                    if (mounted) {
                      _loadMistakes();
                    }
                  },
                  child: const Text(
                    'Save Error Note & Takeaway',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final masteredCount = _mistakes.where((m) => m.isMastered).length;
    final totalCount = _mistakes.length;
    final masteryRate = totalCount > 0 ? ((masteredCount / totalCount) * 100).round() : 0;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          'Mistakes Notebook',
          style: GoogleFonts.inter(
            fontWeight: FontWeight.w800,
            fontSize: 17,
            color: const Color(0xFF0F172A),
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF64748B)),
            onPressed: _loadMistakes,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ResponsiveCenter(
              maxWidth: 640,
              child: Column(
                children: [
                // Mastery KPI Strip
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                      ),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              FittedBox(
                                fit: BoxFit.scaleDown,
                                alignment: Alignment.centerLeft,
                                child: const Text(
                                  'Revision & Mastery (Zero Negative Marking)',
                                  style: TextStyle(
                                    color: Color(0xFF94A3B8),
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 4),
                              FittedBox(
                                fit: BoxFit.scaleDown,
                                alignment: Alignment.centerLeft,
                                child: Text(
                                  '$masteredCount / $totalCount Mastered 🔥',
                                  style: GoogleFonts.inter(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981).withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: const Color(0xFF10B981).withValues(alpha: 0.4),
                            ),
                          ),
                          child: Text(
                            '$masteryRate% Mastered',
                            style: const TextStyle(
                              color: Color(0xFF34D399),
                              fontWeight: FontWeight.w900,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // Filter Buttons Bar
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        FilterChip(
                          label: const Text('Needs Revision'),
                          selected: _showOnlyNeedsRevision,
                          selectedColor: const Color(0xFFEEF2FF),
                          checkmarkColor: const Color(0xFF4F46E5),
                          labelStyle: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: _showOnlyNeedsRevision
                                ? const Color(0xFF4F46E5)
                                : const Color(0xFF64748B),
                          ),
                          onSelected: (val) {
                            setState(() => _showOnlyNeedsRevision = true);
                          },
                        ),
                        const SizedBox(width: 8),
                        FilterChip(
                          label: const Text('Mastered 🔥'),
                          selected: !_showOnlyNeedsRevision,
                          selectedColor: const Color(0xFFECFDF5),
                          checkmarkColor: const Color(0xFF10B981),
                          labelStyle: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: !_showOnlyNeedsRevision
                                ? const Color(0xFF059669)
                                : const Color(0xFF64748B),
                          ),
                          onSelected: (val) {
                            setState(() => _showOnlyNeedsRevision = false);
                          },
                        ),
                        const SizedBox(width: 8),
                        Container(
                          width: 1,
                          height: 24,
                          color: const Color(0xFFE2E8F0),
                        ),
                        const SizedBox(width: 8),
                        FilterChip(
                          label: const Text('All Causes'),
                          selected: _selectedFilter == ErrorType.unclassified,
                          selectedColor: const Color(0xFFF1F5F9),
                          checkmarkColor: const Color(0xFF475569),
                          labelStyle: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: _selectedFilter == ErrorType.unclassified
                                ? const Color(0xFF0F172A)
                                : const Color(0xFF64748B),
                          ),
                          onSelected: (val) {
                            setState(() => _selectedFilter = ErrorType.unclassified);
                          },
                        ),
                        const SizedBox(width: 6),
                        FilterChip(
                          label: const Text('🧠 Concept Gap'),
                          selected: _selectedFilter == ErrorType.conceptual,
                          selectedColor: const Color(0xFFEFF6FF),
                          checkmarkColor: const Color(0xFF2563EB),
                          labelStyle: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: _selectedFilter == ErrorType.conceptual
                                ? const Color(0xFF1D4ED8)
                                : const Color(0xFF64748B),
                          ),
                          onSelected: (val) {
                            setState(() => _selectedFilter = ErrorType.conceptual);
                          },
                        ),
                        const SizedBox(width: 6),
                        FilterChip(
                          label: const Text('⚡ Silly Mistake'),
                          selected: _selectedFilter == ErrorType.careless,
                          selectedColor: const Color(0xFFFEF3C7),
                          checkmarkColor: const Color(0xFFD97706),
                          labelStyle: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: _selectedFilter == ErrorType.careless
                                ? const Color(0xFFB45309)
                                : const Color(0xFF64748B),
                          ),
                          onSelected: (val) {
                            setState(() => _selectedFilter = ErrorType.careless);
                          },
                        ),
                        const SizedBox(width: 6),
                        FilterChip(
                          label: const Text('⏱️ Time Panic'),
                          selected: _selectedFilter == ErrorType.timePressure,
                          selectedColor: const Color(0xFFF3E8FF),
                          checkmarkColor: const Color(0xFF9333EA),
                          labelStyle: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: _selectedFilter == ErrorType.timePressure
                                ? const Color(0xFF7E22CE)
                                : const Color(0xFF64748B),
                          ),
                          onSelected: (val) {
                            setState(() => _selectedFilter = ErrorType.timePressure);
                          },
                        ),
                        const SizedBox(width: 6),
                        FilterChip(
                          label: const Text('🎲 Blind Guess'),
                          selected: _selectedFilter == ErrorType.guess,
                          selectedColor: const Color(0xFFFCE7F3),
                          checkmarkColor: const Color(0xFFDB2777),
                          labelStyle: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: _selectedFilter == ErrorType.guess
                                ? const Color(0xFFBE185D)
                                : const Color(0xFF64748B),
                          ),
                          onSelected: (val) {
                            setState(() => _selectedFilter = ErrorType.guess);
                          },
                        ),
                      ],
                    ),
                  ),
                ),

                const Divider(height: 1, color: Color(0xFFE2E8F0)),

                // Mistakes List
                Expanded(
                  child: _filteredMistakes.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(
                                Icons.check_circle_outline_rounded,
                                size: 56,
                                color: Color(0xFF10B981),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'Awesome! No pending mistakes! 🎉',
                                style: GoogleFonts.inter(
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFF1E293B),
                                ),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'Mistakes notebook is fully revised. You are ready to avoid negative marking in your target exam!',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _filteredMistakes.length,
                          itemBuilder: (context, idx) {
                            final item = _filteredMistakes[idx];
                            final isRevealed = _revealedExplanations.contains(item.id);

                            return Container(
                              margin: const EdgeInsets.only(bottom: 14),
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.02),
                                    blurRadius: 10,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Category & Tag
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      GestureDetector(
                                        onTap: () => _showClassificationDialog(item),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 10,
                                            vertical: 4,
                                          ),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFEEF2FF),
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(
                                              color: const Color(0xFFC7D2FE),
                                            ),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Text(
                                                '🏷️ ${item.errorType.label}',
                                                style: const TextStyle(
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.bold,
                                                  color: Color(0xFF4338CA),
                                                ),
                                              ),
                                              const SizedBox(width: 4),
                                              const Icon(
                                                Icons.edit,
                                                size: 11,
                                                color: Color(0xFF4338CA),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                      if (item.subject != null)
                                        Text(
                                          item.subject!,
                                          style: const TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                            color: Color(0xFF64748B),
                                          ),
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),

                                  // Question Text
                                  Text(
                                    item.questionText ?? 'Question Details',
                                    style: GoogleFonts.inter(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                      color: const Color(0xFF0F172A),
                                      height: 1.4,
                                    ),
                                  ),
                                  const SizedBox(height: 12),

                                  // Options
                                  if (item.optionA != null)
                                    Column(
                                      children: [
                                        _buildOptionTile('A', item.optionA!, item),
                                        _buildOptionTile('B', item.optionB!, item),
                                        _buildOptionTile('C', item.optionC!, item),
                                        _buildOptionTile('D', item.optionD!, item),
                                      ],
                                    ),

                                  // Student Notes
                                  if (item.studentNotes != null && item.studentNotes!.isNotEmpty)
                                    Container(
                                      margin: const EdgeInsets.only(top: 10),
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFFFFBEB),
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(color: const Color(0xFFFDE68A)),
                                      ),
                                      child: Row(
                                        children: [
                                          const Icon(
                                            Icons.note_alt_outlined,
                                            size: 16,
                                            color: Color(0xFFD97706),
                                          ),
                                          const SizedBox(width: 6),
                                          Expanded(
                                            child: Text(
                                              item.studentNotes!,
                                              style: const TextStyle(
                                                fontSize: 12,
                                                color: Color(0xFF92400E),
                                                fontWeight: FontWeight.w500,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),

                                  const SizedBox(height: 10),

                                  // Toggle Solution Button
                                  Wrap(
                                    alignment: WrapAlignment.spaceBetween,
                                    crossAxisAlignment: WrapCrossAlignment.center,
                                    spacing: 8,
                                    runSpacing: 4,
                                    children: [
                                      TextButton.icon(
                                        onPressed: () {
                                          setState(() {
                                            if (isRevealed) {
                                              _revealedExplanations.remove(item.id);
                                            } else {
                                              _revealedExplanations.add(item.id);
                                            }
                                          });
                                        },
                                        icon: Icon(
                                          isRevealed
                                              ? Icons.visibility_off
                                              : Icons.visibility,
                                          size: 16,
                                          color: const Color(0xFF4F46E5),
                                        ),
                                        label: Text(
                                          isRevealed ? 'Hide Solution' : '💡 View Solution',
                                          style: const TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                            color: Color(0xFF4F46E5),
                                          ),
                                        ),
                                      ),
                                      TextButton(
                                        onPressed: () => _showClassificationDialog(item),
                                        child: const Text(
                                          '✍️ Tag Cause & Note',
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                            color: Color(0xFF64748B),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),

                                  // Explanation Box
                                  if (isRevealed && item.explanation != null)
                                    Container(
                                      margin: const EdgeInsets.only(top: 8),
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF8FAFC),
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(color: const Color(0xFFE2E8F0)),
                                      ),
                                      child: Text(
                                        item.explanation!,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Color(0xFF334155),
                                          height: 1.4,
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
          ),
    );
  }

  Widget _buildOptionTile(String key, String text, MistakeItem item) {
    final isCorrect = key == item.correctAnswer.toUpperCase().trim();
    final isStudentAnswer = key == item.selectedAnswer?.toUpperCase().trim();

    Color bgColor = const Color(0xFFF8FAFC);
    Color borderColor = const Color(0xFFE2E8F0);
    Color textColor = const Color(0xFF334155);

    if (isCorrect) {
      bgColor = const Color(0xFFECFDF5);
      borderColor = const Color(0xFF10B981);
      textColor = const Color(0xFF065F46);
    } else if (isStudentAnswer) {
      bgColor = const Color(0xFFFEF2F2);
      borderColor = const Color(0xFFEF4444);
      textColor = const Color(0xFF991B1B);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        children: [
          Container(
            width: 22,
            height: 22,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: isCorrect
                  ? const Color(0xFF10B981)
                  : isStudentAnswer
                      ? const Color(0xFFEF4444)
                      : Colors.white,
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: borderColor),
            ),
            child: Text(
              key,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: (isCorrect || isStudentAnswer) ? Colors.white : Colors.black87,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isCorrect ? FontWeight.bold : FontWeight.w500,
                color: textColor,
              ),
            ),
          ),
          if (isCorrect)
            const Icon(Icons.check_circle_rounded, size: 16, color: Color(0xFF10B981)),
          if (!isCorrect && isStudentAnswer)
            const Icon(Icons.cancel_rounded, size: 16, color: Color(0xFFEF4444)),
        ],
      ),
    );
  }
}
