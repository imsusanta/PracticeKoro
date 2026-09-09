import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';
import '../models/exam_readiness.dart';
import '../services/readiness_service.dart';
import 'notes_screen.dart';

class DashboardScreen extends StatefulWidget {
  final void Function(int tabIndex)? onNavigateTab;

  const DashboardScreen({super.key, this.onNavigateTab});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _client = Supabase.instance.client;

  bool _loading = true;
  Map<String, dynamic>? _profile;
  
  // Today's Metrics (matching Web TodayMetrics)
  int _todayQuestions = 0;
  int _todayAccuracy = 0;
  int _todayStudyTimeMinutes = 0;
  int _studyStreak = 0;

  // Subscription
  bool _hasSubscription = false;
  int _subscriptionFee = 499;

  // Data lists
  List<Map<String, dynamic>> _exams = [];
  List<Map<String, dynamic>> _mockTests = [];
  List<Map<String, dynamic>> _recentActivity = [];
  Map<String, Map<String, dynamic>> _userAttemptsByTest = {};

  // Readiness Engine
  ExamReadinessResult? _readiness;
  final String _selectedExamId = 'wbp-constable';

  // Hero Carousel
  late final PageController _heroPageController;
  int _currentHeroSlide = 0;
  Timer? _heroCarouselTimer;

  // Search Prompts Animation
  final List<String> _rotatingSearchPrompts = [
    "Search 'Primary TET 2026'...",
    "Search 'WBCS Mock Tests'...",
    "Search 'Panchayat Clerkship'...",
    "Search 'Topic Tests'...",
    "Search 'Math & Reasoning'...",
    "Search 'PYQ Vault'...",
    "Search 'Current Affairs'...",
  ];
  int _currentSearchPromptIndex = 0;
  Timer? _searchPromptTimer;

  @override
  void initState() {
    super.initState();
    _heroPageController = PageController();
    _startTimers();
    _loadData();
  }

  @override
  void dispose() {
    _heroCarouselTimer?.cancel();
    _searchPromptTimer?.cancel();
    _heroPageController.dispose();
    super.dispose();
  }

  void _startTimers() {
    // Hero carousel auto-scroll (4.5s)
    _heroCarouselTimer = Timer.periodic(const Duration(milliseconds: 4500), (_) {
      if (_heroPageController.hasClients) {
        final next = (_currentHeroSlide + 1) % 3;
        _heroPageController.animateToPage(
          next,
          duration: const Duration(milliseconds: 450),
          curve: Curves.easeInOut,
        );
      }
    });

    // Rotating search placeholder (3s)
    _searchPromptTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      if (mounted) {
        setState(() {
          _currentSearchPromptIndex =
              (_currentSearchPromptIndex + 1) % _rotatingSearchPrompts.length;
        });
      }
    });
  }

  void _navigateToTab(int index) {
    widget.onNavigateTab?.call(index);
  }

  String get _greetingText {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  Future<void> _loadData() async {
    try {
      final session = _client.auth.currentSession;
      if (session == null) {
        if (mounted) Navigator.of(context).pushReplacementNamed('/login');
        return;
      }
      final userId = session.user.id;

      // 1. Profile
      final profileData =
          await _client.from('profiles').select('*').eq('id', userId).maybeSingle();

      // 2. Exams
      final examsData = await _client
          .from('exams')
          .select('id, name')
          .order('created_at', ascending: true);

      // 3. Mock Tests
      List<Map<String, dynamic>> mockTestsList = [];
      try {
        final testsData = await _client
            .from('mock_tests')
            .select('id, name, duration_minutes, total_questions, total_marks, is_paid, is_active, exam_id')
            .order('created_at', ascending: false)
            .limit(6);
        mockTestsList = List<Map<String, dynamic>>.from(testsData);
      } catch (_) {}

      // 4. Test attempts
      final attemptsData = await _client
          .from('test_attempts')
          .select('id, mock_test_id, percentage, score, passed, created_at, completed_at')
          .eq('user_id', userId)
          .order('created_at', ascending: false);

      final attempts = List<Map<String, dynamic>>.from(attemptsData as List);

      // User attempts keyed by test_id
      final Map<String, Map<String, dynamic>> attemptsMap = {};
      for (final a in attempts) {
        final testId = a['mock_test_id']?.toString();
        if (testId != null && !attemptsMap.containsKey(testId)) {
          attemptsMap[testId] = a;
        }
      }

      // Recent attempts (up to 4)
      List<Map<String, dynamic>> recentList = [];
      try {
        final recentData = await _client
            .from('test_attempts')
            .select('id, percentage, passed, created_at, mock_test_id, mock_tests(name)')
            .eq('user_id', userId)
            .order('created_at', ascending: false)
            .limit(4);
        recentList = List<Map<String, dynamic>>.from(recentData);
      } catch (_) {}

      // Calculate Today's Metrics
      final now = DateTime.now();
      final startOfToday = DateTime(now.year, now.month, now.day);
      final todayAttempts = attempts.where((a) {
        final createdAtStr = a['completed_at'] ?? a['created_at'];
        if (createdAtStr == null) return false;
        final date = DateTime.tryParse(createdAtStr.toString())?.toLocal();
        return date != null && date.isAfter(startOfToday);
      }).toList();

      int todayQuestions = 0;
      double todayScoreSum = 0;
      int todayStudyTime = 0;

      for (final a in todayAttempts) {
        todayQuestions += 15; // standard test chunk
        todayScoreSum += (a['percentage'] as num?)?.toDouble() ?? 0.0;
        todayStudyTime += 15; // approx 15 mins per session
      }

      final todayAccuracy = todayAttempts.isNotEmpty
          ? (todayScoreSum / todayAttempts.length).round()
          : (attempts.isNotEmpty
              ? ((attempts.fold<double>(0, (s, a) => s + ((a['percentage'] as num?)?.toDouble() ?? 0.0))) / attempts.length).round()
              : 0);

      // Calculate streak
      int streak = 0;
      if (attempts.isNotEmpty) {
        final uniqueDays = attempts
            .map((a) {
              final s = a['created_at']?.toString();
              if (s == null) return null;
              final d = DateTime.tryParse(s)?.toLocal();
              return d != null ? DateTime(d.year, d.month, d.day) : null;
            })
            .whereType<DateTime>()
            .toSet()
            .toList()
          ..sort((a, b) => b.compareTo(a));

        if (uniqueDays.isNotEmpty) {
          final today = DateTime(now.year, now.month, now.day);
          final yesterday = today.subtract(const Duration(days: 1));

          if (uniqueDays.first == today || uniqueDays.first == yesterday) {
            streak = 1;
            for (int i = 0; i < uniqueDays.length - 1; i++) {
              final diff = uniqueDays[i].difference(uniqueDays[i + 1]).inDays;
              if (diff == 1) {
                streak++;
              } else {
                break;
              }
            }
          }
        }
      }

      // Check Subscription
      bool hasSub = false;
      try {
        final oneYearAgo = DateTime.now().subtract(const Duration(days: 365));
        final purchaseData = await _client
            .from('purchases')
            .select('id')
            .eq('user_id', userId)
            .eq('content_type', 'subscription')
            .eq('status', 'completed')
            .gt('created_at', oneYearAgo.toIso8601String())
            .maybeSingle();
        hasSub = purchaseData != null;
      } catch (_) {}

      // Fee
      int fee = 499;
      try {
        final settingsData =
            await _client.from('site_settings').select('key, value');
        for (final s in settingsData) {
          if (s['key'] == 'yearly_subscription_fee') {
            fee = int.tryParse(s['value'].toString()) ?? 499;
            break;
          }
        }
      } catch (_) {}

      // Readiness Diagnostic
      ExamReadinessResult? readinessResult;
      try {
        final percentages = attempts
            .map((a) => (a['percentage'] as num?)?.toDouble() ?? 0.0)
            .toList();
        readinessResult = ReadinessService.computeReadiness(
          mockPercentages: percentages,
          drillQuestionsSolved: todayQuestions > 0 ? todayQuestions : 10,
          drillAccuracy: todayAccuracy,
          streakDays: streak,
          totalMistakes: 5,
          masteredMistakes: 2,
          targetExamId: _selectedExamId,
        );
      } catch (_) {}

      if (mounted) {
        setState(() {
          _profile = profileData;
          _exams = List<Map<String, dynamic>>.from(examsData);
          _mockTests = mockTestsList;
          _recentActivity = recentList;
          _userAttemptsByTest = attemptsMap;
          _todayQuestions = todayQuestions > 0 ? todayQuestions : (attempts.length * 10);
          _todayAccuracy = todayAccuracy;
          _todayStudyTimeMinutes = todayStudyTime > 0 ? todayStudyTime : (attempts.length * 12);
          _studyStreak = streak > 0 ? streak : (attempts.isNotEmpty ? 1 : 0);
          _hasSubscription = hasSub;
          _subscriptionFee = fee;
          _readiness = readinessResult;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showSearchSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _SearchBottomSheet(
        exams: _exams,
        mockTests: _mockTests,
        onSelectExam: (examId) {
          Navigator.pop(context);
          _navigateToTab(1); // Exams tab
        },
        onSelectTest: (testId) {
          Navigator.pop(context);
          _navigateToTab(1); // Exams tab
        },
      ),
    );
  }

  void _showUpgradeDialog() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    gradient: AppTheme.amberGradient,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(
                    Icons.workspace_premium_rounded,
                    color: Colors.white,
                    size: 30,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'PracticeKoro VIP Pass',
                        style: GoogleFonts.inter(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                      Text(
                        'Unlimited Full Mocks & Instant Solutions',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            _benefitRow('Unlimited Full-Length Mock Tests with Rank'),
            _benefitRow('Chapter-wise Topic Tests with Instant Solutions'),
            _benefitRow('10-Year PYQ Vault & Mistakes Notebook'),
            _benefitRow('Complete Explanations in Bengali & English'),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        'Please visit practicekoro.com or contact support to unlock PRO access.',
                        style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                      ),
                      backgroundColor: const Color(0xFF0F172A),
                      behavior: SnackBarBehavior.floating,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryBlue,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: Text(
                  'Unlock All Tests — ₹$_subscriptionFee/Year',
                  style: GoogleFonts.inter(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  void _showCurrentAffairsSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.public_rounded,
                    color: Color(0xFF0066FF),
                    size: 26,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Current Affairs Hub',
                        style: GoogleFonts.inter(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                      Text(
                        'মক টেস্ট ও স্টাডি ডাইজেস্ট',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () {
                Navigator.pop(context);
                _navigateToTab(2); // Practice tab
              },
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  border: Border.all(color: const Color(0xFFBBF7D0)),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.play_circle_fill_rounded, color: Color(0xFF059669), size: 30),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Current Affairs Mock Tests',
                            style: GoogleFonts.inter(
                              fontWeight: FontWeight.w800,
                              fontSize: 14,
                              color: const Color(0xFF065F46),
                            ),
                          ),
                          Text(
                            'দৈনিক ও বিষয়ভিত্তিক কারেন্ট অ্যাফেয়ার্স মক টেস্ট দিন',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: const Color(0xFF047857),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded, color: Color(0xFF059669)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () {
                Navigator.pop(context);
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const NotesScreen()),
                );
              },
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.menu_book_rounded, color: Color(0xFF0066FF), size: 28),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Study Notes & Daily Digest',
                            style: GoogleFonts.inter(
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                          Text(
                            'দৈনিক তথ্য ও রিভিশন আর্টিকেল পড়ুন',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded, color: Color(0xFF64748B)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _benefitRow(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          const Icon(Icons.check_circle_rounded,
              color: Color(0xFF10B981), size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF334155),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.primaryBlue.withValues(alpha: 0.12),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                padding: const EdgeInsets.all(12),
                child: Image.asset(
                  'assets/images/logo-circle.png',
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) => const Icon(
                    Icons.school_rounded,
                    color: AppTheme.primaryBlue,
                    size: 30,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: AppTheme.primaryBlue,
                ),
              ),
            ],
          ),
        ),
      );
    }

    final fullName = _profile?['full_name']?.toString() ?? 'Student';
    final firstName = fullName.trim().split(' ').first;
    final avatarUrl = _profile?['avatar_url']?.toString();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadData,
          color: AppTheme.primaryBlue,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(
              parent: BouncingScrollPhysics(),
            ),
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
            child: ResponsiveCenter(
              maxWidth: 640,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ═══════════════════════════════════════════════════════════
                  // 1. TOP HEADER (Logo + Brand + Streak + Profile Avatar)
                  // ═══════════════════════════════════════════════════════════
                  _buildTopHeader(firstName, avatarUrl),

                  const SizedBox(height: 14),

                  // ═══════════════════════════════════════════════════════════
                  // 2. DYNAMIC SEARCH BAR (Rotating Prompts & Instant Modal)
                  // ═══════════════════════════════════════════════════════════
                  _buildSearchBar(),

                  const SizedBox(height: 16),

                  // ═══════════════════════════════════════════════════════════
                  // 3. HERO BANNER CAROUSEL (3 Swipeable Real-Image Slides)
                  // ═══════════════════════════════════════════════════════════
                  _buildHeroCarousel(firstName),

                  const SizedBox(height: 16),

                  // ═══════════════════════════════════════════════════════════
                  // 4. TODAY'S PROGRESS (Solved, Accuracy, Study Time, Streak)
                  // ═══════════════════════════════════════════════════════════
                  _buildTodaysProgressCard(),

                  const SizedBox(height: 18),

                  // ═══════════════════════════════════════════════════════════
                  // 5. TARGET EXAM READINESS GAUGE (Phase 4 Diagnostic Engine)
                  // ═══════════════════════════════════════════════════════════
                  _buildReadinessCard(),

                  const SizedBox(height: 20),

                  // ═══════════════════════════════════════════════════════════
                  // 6. POPULAR EXAMS (Horizontal Scroll)
                  // ═══════════════════════════════════════════════════════════
                  _buildPopularExamsSection(),

                  const SizedBox(height: 20),

                  // ═══════════════════════════════════════════════════════════
                  // 7. MOCK TEST SERIES (Cards with Start / Unlock / Retry)
                  // ═══════════════════════════════════════════════════════════
                  _buildMockTestSeriesSection(),

                  const SizedBox(height: 20),

                  // ═══════════════════════════════════════════════════════════
                  // 8. QUICK ACTIONS (6 Grid Study Tools with "Test" term)
                  // ═══════════════════════════════════════════════════════════
                  _buildQuickActionsSection(),

                  const SizedBox(height: 20),

                  // ═══════════════════════════════════════════════════════════
                  // 9. RECOMMENDED FOR YOU (AI Powered Weak Subject Focus)
                  // ═══════════════════════════════════════════════════════════
                  _buildRecommendedSection(),

                  const SizedBox(height: 20),

                  // ═══════════════════════════════════════════════════════════
                  // 10. RECENT ACTIVITY (Latest Test Attempts)
                  // ═══════════════════════════════════════════════════════════
                  _buildRecentActivitySection(),

                  const SizedBox(height: 20),

                  // ═══════════════════════════════════════════════════════════
                  // 11. VIP MEMBERSHIP BANNER (If not subscribed)
                  // ═══════════════════════════════════════════════════════════
                  if (!_hasSubscription) _buildVipPromoCard(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION BUILDERS
  // ═══════════════════════════════════════════════════════════════════════════

  Widget _buildTopHeader(String firstName, String? avatarUrl) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // Left: Logo + Brand
        Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFE2E8F0), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: ClipOval(
                child: Image.asset(
                  'assets/images/logo-circle.png',
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => Container(
                    color: AppTheme.primaryBlue,
                    child: const Icon(Icons.school, color: Colors.white, size: 20),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                RichText(
                  text: TextSpan(
                    style: GoogleFonts.inter(
                      fontSize: 17,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.4,
                    ),
                    children: const [
                      TextSpan(
                        text: 'Practice',
                        style: TextStyle(color: Color(0xFF0F172A)),
                      ),
                      TextSpan(
                        text: 'Koro',
                        style: TextStyle(color: Color(0xFF0066FF)),
                      ),
                    ],
                  ),
                ),
                Text(
                  '$_greetingText, $firstName 👋',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    color: const Color(0xFF64748B),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ],
        ),

        // Right: Streak Badge + Notification + Avatar
        Row(
          children: [
            // Streak Pill
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBEB),
                border: Border.all(color: const Color(0xFFFDE68A)),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.local_fire_department_rounded,
                    size: 15,
                    color: Color(0xFFD97706),
                  ),
                  const SizedBox(width: 3),
                  Text(
                    '$_studyStreak',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF92400E),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(width: 8),

            // Profile Avatar
            GestureDetector(
              onTap: () => _navigateToTab(4), // Profile
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white,
                  border: Border.all(color: const Color(0xFFE2E8F0), width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 6,
                    ),
                  ],
                ),
                child: ClipOval(
                  child: avatarUrl != null
                      ? Image.network(
                          avatarUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Center(
                            child: Text(
                              firstName.isNotEmpty ? firstName[0].toUpperCase() : 'S',
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.primaryBlue,
                              ),
                            ),
                          ),
                        )
                      : Center(
                          child: Text(
                            firstName.isNotEmpty ? firstName[0].toUpperCase() : 'S',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.primaryBlue,
                            ),
                          ),
                        ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSearchBar() {
    return GestureDetector(
      onTap: _showSearchSheet,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Row(
          children: [
            const Icon(Icons.search_rounded, color: Color(0xFF0066FF), size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 300),
                transitionBuilder: (child, anim) => FadeTransition(
                  opacity: anim,
                  child: SlideTransition(
                    position: Tween<Offset>(
                      begin: const Offset(0, 0.2),
                      end: Offset.zero,
                    ).animate(anim),
                    child: child,
                  ),
                ),
                child: Text(
                  _rotatingSearchPrompts[_currentSearchPromptIndex],
                  key: ValueKey<int>(_currentSearchPromptIndex),
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    color: const Color(0xFF94A3B8),
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFDBEAFE)),
              ),
              child: Text(
                'TESTS',
                style: GoogleFonts.inter(
                  fontSize: 9.5,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF0066FF),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeroCarousel(String firstName) {
    final slides = [
      _CarouselItem(
        image: 'assets/images/student_hero_banner.jpg',
        badge: 'Target Govt Job Selection 🎯',
        title: 'Turn Preparation Into Selection 🔥',
        highlightText: 'Selection 🔥',
        highlightColor: const Color(0xFFFBBF24),
        subtitle: '$_greetingText, $firstName! Smart Practice • Speed Test • Selection',
        ctaText: 'Start Practice 🚀',
        ctaBg: const Color(0xFFFBBF24),
        ctaColor: const Color(0xFF0F172A),
        onTap: () => _navigateToTab(2), // Practice tab
      ),
      _CarouselItem(
        image: 'assets/images/student_hero_himalaya.jpg',
        badge: 'Full Mock Tests & Live Ranks',
        title: 'WB & Central Crack Cutoff',
        highlightText: 'Crack Cutoff',
        highlightColor: const Color(0xFF60A5FA),
        subtitle: 'Real exam simulation with negative marking for Police, Clerkship & TET.',
        ctaText: 'Explore Mock Tests',
        ctaBg: const Color(0xFF0066FF),
        ctaColor: Colors.white,
        onTap: () => _navigateToTab(1), // Exams tab
      ),
      _CarouselItem(
        image: 'assets/images/student_mountains.jpg',
        badge: 'Daily Speed Booster',
        title: 'Daily 10 Speed Test ⏱️',
        highlightText: 'Speed Test ⏱️',
        highlightColor: const Color(0xFFFBBF24),
        subtitle: 'Build exam-ready speed and eliminate timer panic with 10 daily MCQs.',
        ctaText: 'Take Daily Test',
        ctaBg: const Color(0xFFFBBF24),
        ctaColor: const Color(0xFF0F172A),
        onTap: () => Navigator.of(context).pushNamed('/practice'),
      ),
    ];

    return Column(
      children: [
        SizedBox(
          height: 180,
          child: PageView.builder(
            controller: _heroPageController,
            onPageChanged: (i) => setState(() => _currentHeroSlide = i),
            itemCount: slides.length,
            itemBuilder: (context, i) {
              final slide = slides[i];
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 2),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.08),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(24),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      // Background Image
                      Image.asset(
                        slide.image,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => Container(
                          decoration: const BoxDecoration(
                            gradient: AppTheme.heroGradient,
                          ),
                        ),
                      ),

                      // Gradient Overlay (Dark Navy)
                      Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              const Color(0xFF0A2655).withValues(alpha: 0.5),
                              const Color(0xFF0A2655).withValues(alpha: 0.88),
                            ],
                          ),
                        ),
                      ),

                      // Content
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            // Top Badge
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.25),
                                ),
                              ),
                              child: Text(
                                slide.badge,
                                style: GoogleFonts.inter(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                ),
                              ),
                            ),

                            // Middle: Title & Subtitle
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  slide.title,
                                  style: GoogleFonts.inter(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.white,
                                    letterSpacing: -0.3,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  slide.subtitle,
                                  style: GoogleFonts.inter(
                                    fontSize: 11,
                                    color: Colors.white.withValues(alpha: 0.85),
                                    fontWeight: FontWeight.w500,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),

                            // Bottom: CTA Button
                            Align(
                              alignment: Alignment.bottomLeft,
                              child: ElevatedButton(
                                onPressed: slide.onTap,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: slide.ctaBg,
                                  foregroundColor: slide.ctaColor,
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 14, vertical: 8),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  elevation: 0,
                                ),
                                child: Text(
                                  slide.ctaText,
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),

        const SizedBox(height: 8),

        // Carousel Indicator Dots
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(slides.length, (i) {
            final active = _currentHeroSlide == i;
            return AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: active ? 18 : 6,
              height: 5,
              decoration: BoxDecoration(
                color: active
                    ? const Color(0xFF0066FF)
                    : const Color(0xFFCBD5E1),
                borderRadius: BorderRadius.circular(4),
              ),
            );
          }),
        ),
      ],
    );
  }

  Widget _buildTodaysProgressCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 7,
                    height: 7,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: Color(0xFF0066FF),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    "Today's Progress",
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (_studyStreak > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFFFEF3C7), Color(0xFFFFEDD5)],
                        ),
                        border: Border.all(color: const Color(0xFFFDE68A)),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.local_fire_department_rounded,
                              size: 11, color: Color(0xFFD97706)),
                          const SizedBox(width: 2),
                          Text(
                            '$_studyStreak Day Streak',
                            style: GoogleFonts.inter(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF92400E),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
              GestureDetector(
                onTap: () => _navigateToTab(3), // Results
                child: Row(
                  children: [
                    Text(
                      'View Details',
                      style: GoogleFonts.inter(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF0066FF),
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded,
                        size: 16, color: Color(0xFF0066FF)),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // 4-Grid Metric Cards
          Row(
            children: [
              // Metric 1: Solved
              Expanded(
                child: _progressMetricItem(
                  icon: Icons.track_changes_rounded,
                  iconColor: const Color(0xFF0066FF),
                  badgeBg: const Color(0xFFEFF6FF),
                  value: '$_todayQuestions',
                  label: 'Solved',
                  gradient: const LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Color(0xFFEFF6FF), Color(0xFFEEF2FF)],
                  ),
                  borderColor: const Color(0xFFDBEAFE),
                  onTap: () => _navigateToTab(3),
                ),
              ),
              const SizedBox(width: 8),

              // Metric 2: Accuracy
              Expanded(
                child: _progressMetricItem(
                  icon: Icons.bolt_rounded,
                  iconColor: const Color(0xFF9333EA),
                  badgeBg: const Color(0xFFFAF5FF),
                  value: '$_todayAccuracy%',
                  label: 'Accuracy',
                  gradient: const LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Color(0xFFFAF5FF), Color(0xFFF3E8FF)],
                  ),
                  borderColor: const Color(0xFFE9D5FF),
                  onTap: () => _navigateToTab(3),
                ),
              ),
              const SizedBox(width: 8),

              // Metric 3: Study Time
              Expanded(
                child: _progressMetricItem(
                  icon: Icons.schedule_rounded,
                  iconColor: const Color(0xFFD97706),
                  badgeBg: const Color(0xFFFFFBEB),
                  value: '${_todayStudyTimeMinutes}m',
                  label: 'Study Time',
                  gradient: const LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Color(0xFFFFFBEB), Color(0xFFFEF3C7)],
                  ),
                  borderColor: const Color(0xFFFDE68A),
                  onTap: () => _navigateToTab(3),
                ),
              ),
              const SizedBox(width: 8),

              // Metric 4: Streak
              Expanded(
                child: _progressMetricItem(
                  icon: Icons.local_fire_department_rounded,
                  iconColor: const Color(0xFF059669),
                  badgeBg: const Color(0xFFECFDF5),
                  value: '$_studyStreak',
                  label: 'Streak',
                  gradient: const LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Color(0xFFECFDF5), Color(0xFFD1FAE5)],
                  ),
                  borderColor: const Color(0xFFA7F3D0),
                  onTap: () => _navigateToTab(3),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _progressMetricItem({
    required IconData icon,
    required Color iconColor,
    required Color badgeBg,
    required String value,
    required String label,
    required Gradient gradient,
    required Color borderColor,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: borderColor),
        ),
        child: Column(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: badgeBg,
              ),
              child: Icon(icon, size: 17, color: iconColor),
            ),
            const SizedBox(height: 6),
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                value,
                style: GoogleFonts.inter(
                  fontSize: 17,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF0F172A),
                  letterSpacing: -0.3,
                ),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF64748B),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReadinessCard() {
    final score = _readiness?.overallReadiness ?? 68;
    final examName = _readiness?.targetExamName ?? 'WBP Constable';
    final projected = _readiness?.projectedScore ?? 62;
    final maxScore = _readiness?.maxScore ?? 85;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF0F172A),
            Color(0xFF1E1B4B),
            Color(0xFF0F172A),
          ],
        ),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFF334155)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              // Circular Gauge
              SizedBox(
                width: 54,
                height: 54,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    CircularProgressIndicator(
                      value: (score / 100.0).clamp(0.0, 1.0),
                      strokeWidth: 5,
                      backgroundColor: Colors.white.withValues(alpha: 0.1),
                      valueColor: const AlwaysStoppedAnimation<Color>(
                        Color(0xFFFBBF24),
                      ),
                    ),
                    Center(
                      child: Text(
                        '$score%',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(width: 14),

              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFBBF24).withValues(alpha: 0.2),
                            border: Border.all(
                                color: const Color(0xFFFBBF24).withValues(alpha: 0.4)),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '🎯 ${_readiness?.readinessLabel ?? "Exam Ready"}',
                            style: GoogleFonts.inter(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFFFBBF24),
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            examName,
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFFCBD5E1),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    RichText(
                      text: TextSpan(
                        style: GoogleFonts.inter(
                            fontSize: 12, color: Colors.white),
                        children: [
                          const TextSpan(text: 'Projected Score: '),
                          TextSpan(
                            text: '$projected',
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              color: Color(0xFFFBBF24),
                            ),
                          ),
                          TextSpan(
                            text: ' / $maxScore',
                            style: const TextStyle(color: Color(0xFF94A3B8)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),
          const Divider(height: 1, color: Color(0xFF334155)),
          const SizedBox(height: 10),

          GestureDetector(
            onTap: () => _navigateToTab(3), // Results
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'View Cutoff & Target Diagnostics',
                  style: GoogleFonts.inter(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF93C5FD),
                  ),
                ),
                const Icon(
                  Icons.arrow_forward_rounded,
                  size: 14,
                  color: Color(0xFF93C5FD),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPopularExamsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Popular Exams',
              style: GoogleFonts.inter(
                fontSize: 15,
                fontWeight: FontWeight.w900,
                color: const Color(0xFF0F172A),
              ),
            ),
            GestureDetector(
              onTap: () => _navigateToTab(1), // Exams tab
              child: Row(
                children: [
                  Text(
                    'View All',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF0066FF),
                    ),
                  ),
                  const Icon(Icons.chevron_right_rounded,
                      size: 16, color: Color(0xFF0066FF)),
                ],
              ),
            ),
          ],
        ),

        const SizedBox(height: 10),

        if (_exams.isEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Center(
              child: Text(
                'Loading popular exams...',
                style: GoogleFonts.inter(
                    fontSize: 12, color: const Color(0xFF94A3B8)),
              ),
            ),
          )
        else
          SizedBox(
            height: 130,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              itemCount: _exams.length,
              separatorBuilder: (context, index) => const SizedBox(width: 10),
              itemBuilder: (context, i) {
                final exam = _exams[i];
                final name = exam['name']?.toString() ?? 'State Exam';
                final isWb = name.toLowerCase().contains('wb') ||
                    name.toLowerCase().contains('bengal');

                return GestureDetector(
                  onTap: () => _navigateToTab(1),
                  child: Container(
                    width: 150,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.02),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 34,
                          height: 34,
                          decoration: BoxDecoration(
                            color: isWb
                                ? const Color(0xFFEFF6FF)
                                : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            Icons.account_balance_rounded,
                            size: 18,
                            color: isWb
                                ? const Color(0xFF0066FF)
                                : const Color(0xFF475569),
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              name,
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF0F172A),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              isWb ? 'West Bengal' : 'State Govt',
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                color: const Color(0xFF94A3B8),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Center(
                            child: Text(
                              'Explore Mocks',
                              style: GoogleFonts.inter(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF0066FF),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }

  Widget _buildMockTestSeriesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Mock Test Series',
                  style: GoogleFonts.inter(
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                Text(
                  'Simulated exams with detailed analysis',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    color: const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
            GestureDetector(
              onTap: () => _navigateToTab(1), // Exams
              child: Row(
                children: [
                  Text(
                    'View All',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF0066FF),
                    ),
                  ),
                  const Icon(Icons.chevron_right_rounded,
                      size: 16, color: Color(0xFF0066FF)),
                ],
              ),
            ),
          ],
        ),

        const SizedBox(height: 12),

        if (_mockTests.isEmpty)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Center(
              child: Text(
                'No mock tests currently scheduled.',
                style: GoogleFonts.inter(
                    fontSize: 12, color: const Color(0xFF94A3B8)),
              ),
            ),
          )
        else
          Column(
            children: _mockTests.take(3).map((test) {
              final testId = test['id']?.toString() ?? '';
              final title =
                  test['name'] ?? test['title'] ?? 'Mock Test Paper';
              final duration = test['duration_minutes'] ?? 90;
              final marks = test['total_marks'] ?? 100;
              final isPaid = test['is_paid'] == true;
              final attempt = _userAttemptsByTest[testId];

              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.02),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    // Score / Badge icon
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: attempt != null
                            ? (attempt['passed'] == true
                                ? const Color(0xFFD1FAE5)
                                : const Color(0xFFFEE2E2))
                            : const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: attempt != null
                              ? (attempt['passed'] == true
                                  ? const Color(0xFFA7F3D0)
                                  : const Color(0xFFFECACA))
                              : const Color(0xFFDBEAFE),
                        ),
                      ),
                      child: Center(
                        child: attempt != null
                            ? Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    '${(attempt['percentage'] as num?)?.round() ?? 0}%',
                                    style: GoogleFonts.inter(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w900,
                                      color: attempt['passed'] == true
                                          ? const Color(0xFF047857)
                                          : const Color(0xFFDC2626),
                                    ),
                                  ),
                                  Text(
                                    attempt['passed'] == true ? 'PASS' : 'RETRY',
                                    style: GoogleFonts.inter(
                                      fontSize: 7.5,
                                      fontWeight: FontWeight.w800,
                                      color: attempt['passed'] == true
                                          ? const Color(0xFF047857)
                                          : const Color(0xFFDC2626),
                                    ),
                                  ),
                                ],
                              )
                            : const Icon(
                                Icons.school_rounded,
                                size: 20,
                                color: Color(0xFF0066FF),
                              ),
                      ),
                    ),

                    const SizedBox(width: 12),

                    // Test Info
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEFF6FF),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(
                                      color: const Color(0xFFDBEAFE)),
                                ),
                                child: Text(
                                  'FULL MOCK',
                                  style: GoogleFonts.inter(
                                    fontSize: 8.5,
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF0066FF),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              if (isPaid)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 5, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFEF3C7),
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(
                                        color: const Color(0xFFFDE68A)),
                                  ),
                                  child: Text(
                                    'PRO',
                                    style: GoogleFonts.inter(
                                      fontSize: 8,
                                      fontWeight: FontWeight.w900,
                                      color: const Color(0xFF92400E),
                                    ),
                                  ),
                                )
                              else
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 5, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    'FREE',
                                    style: GoogleFonts.inter(
                                      fontSize: 8,
                                      fontWeight: FontWeight.w800,
                                      color: const Color(0xFF475569),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(
                            title,
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF0F172A),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '$duration Mins • $marks Marks',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(width: 8),

                    // Start / Unlock Button
                    ElevatedButton(
                      onPressed: () {
                        if (isPaid && !_hasSubscription) {
                          _showUpgradeDialog();
                        } else {
                          _navigateToTab(1); // Go to Exams
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: attempt != null
                            ? const Color(0xFFF1F5F9)
                            : (isPaid && !_hasSubscription
                                ? const Color(0xFFFEF3C7)
                                : const Color(0xFF0066FF)),
                        foregroundColor: attempt != null
                            ? const Color(0xFF334155)
                            : (isPaid && !_hasSubscription
                                ? const Color(0xFF92400E)
                                : Colors.white),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 8),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      child: Text(
                        attempt != null
                            ? 'Retry'
                            : (isPaid && !_hasSubscription
                                ? 'Unlock'
                                : 'Start'),
                        style: GoogleFonts.inter(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
      ],
    );
  }

  Widget _buildQuickActionsSection() {
    final actions = [
      _QuickAction(
        title: 'Daily Test',
        icon: Icons.bolt_rounded,
        color: const Color(0xFFD97706),
        bg: const Color(0xFFFEF3C7),
        border: const Color(0xFFFDE68A),
        onTap: () => Navigator.of(context).pushNamed('/practice'),
      ),
      _QuickAction(
        title: 'Topic Test',
        icon: Icons.track_changes_rounded,
        color: const Color(0xFF9333EA),
        bg: const Color(0xFFF3E8FF),
        border: const Color(0xFFE9D5FF),
        onTap: () => _navigateToTab(2), // Practice tab
      ),
      _QuickAction(
        title: 'Current Affairs',
        icon: Icons.newspaper_rounded,
        color: const Color(0xFF059669),
        bg: const Color(0xFFD1FAE5),
        border: const Color(0xFFA7F3D0),
        onTap: _showCurrentAffairsSheet,
      ),
      _QuickAction(
        title: 'Mistakes Notebook',
        icon: Icons.replay_rounded,
        color: const Color(0xFFE11D48),
        bg: const Color(0xFFFFE4E6),
        border: const Color(0xFFFECDD3),
        onTap: () => Navigator.of(context).pushNamed('/mistakes'),
      ),
      _QuickAction(
        title: 'Study Notes',
        icon: Icons.menu_book_rounded,
        color: const Color(0xFF0066FF),
        bg: const Color(0xFFDBEAFE),
        border: const Color(0xFFBFDBFE),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const NotesScreen()),
          );
        },
      ),
      _QuickAction(
        title: 'PYQ Vault',
        icon: Icons.history_edu_rounded,
        color: const Color(0xFF0891B2),
        bg: const Color(0xFFCFFAFE),
        border: const Color(0xFFA5F3FC),
        onTap: () => Navigator.of(context).pushNamed('/practice'),
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Quick Actions',
          style: GoogleFonts.inter(
            fontSize: 15,
            fontWeight: FontWeight.w900,
            color: const Color(0xFF0F172A),
          ),
        ),
        const SizedBox(height: 10),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.05,
          ),
          itemCount: actions.length,
          itemBuilder: (context, i) {
            final a = actions[i];
            return InkWell(
              onTap: a.onTap,
              borderRadius: BorderRadius.circular(18),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.02),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: a.bg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: a.border),
                      ),
                      child: Icon(a.icon, color: a.color, size: 20),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      a.title,
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF0F172A),
                      ),
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildRecommendedSection() {
    final weakest = _readiness?.weakestSubject;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFFDE68A)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: const Color(0xFFF59E0B),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.auto_awesome_rounded,
              color: Colors.white,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      weakest != null
                          ? 'Focus on ${weakest.subject}'
                          : 'Personalized Recommendation',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF78350F),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFDE68A),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        'AI',
                        style: GoogleFonts.inter(
                          fontSize: 8.5,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF78350F),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  weakest != null
                      ? 'Accuracy is lower than average in ${weakest.subject}. Practice 10 targeted MCQs to boost score.'
                      : 'Practice topic tests to unlock intelligent AI weak area diagnostic recommendations.',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    color: const Color(0xFF92400E),
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 8),
                GestureDetector(
                  onTap: () => _navigateToTab(2), // Practice
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Start Targeted Practice',
                        style: GoogleFonts.inter(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFFB45309),
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(
                        Icons.arrow_forward_rounded,
                        size: 14,
                        color: Color(0xFFB45309),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentActivitySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Recent Activity',
              style: GoogleFonts.inter(
                fontSize: 15,
                fontWeight: FontWeight.w900,
                color: const Color(0xFF0F172A),
              ),
            ),
            GestureDetector(
              onTap: () => _navigateToTab(3), // Results
              child: Row(
                children: [
                  Text(
                    'View All',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF0066FF),
                    ),
                  ),
                  const Icon(Icons.chevron_right_rounded,
                      size: 16, color: Color(0xFF0066FF)),
                ],
              ),
            ),
          ],
        ),

        const SizedBox(height: 10),

        if (_recentActivity.isEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Center(
              child: Text(
                'No tests taken yet. Start your first practice session!',
                style: GoogleFonts.inter(
                    fontSize: 12, color: const Color(0xFF94A3B8)),
              ),
            ),
          )
        else
          Column(
            children: _recentActivity.map((attempt) {
              final testName =
                  attempt['mock_tests']?['name'] ?? 'Mock Test Attempt';
              final score = (attempt['percentage'] as num?)?.round() ?? 0;
              final passed = attempt['passed'] == true;
              final dateStr = attempt['created_at']?.toString();
              String timeAgo = 'Recent';
              if (dateStr != null) {
                final date = DateTime.tryParse(dateStr)?.toLocal();
                if (date != null) {
                  final diff = DateTime.now().difference(date);
                  if (diff.inMinutes < 60) {
                    timeAgo = '${diff.inMinutes}m ago';
                  } else if (diff.inHours < 24) {
                    timeAgo = '${diff.inHours}h ago';
                  } else {
                    timeAgo = '${diff.inDays}d ago';
                  }
                }
              }

              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: passed
                            ? const Color(0xFFD1FAE5)
                            : const Color(0xFFFEE2E2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        passed
                            ? Icons.check_circle_rounded
                            : Icons.schedule_rounded,
                        size: 18,
                        color: passed
                            ? const Color(0xFF059669)
                            : const Color(0xFFDC2626),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            testName,
                            style: GoogleFonts.inter(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF0F172A),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            timeAgo,
                            style: GoogleFonts.inter(
                              fontSize: 10.5,
                              color: const Color(0xFF94A3B8),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: passed
                            ? const Color(0xFFD1FAE5)
                            : const Color(0xFFFEE2E2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '$score%',
                        style: GoogleFonts.inter(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: passed
                              ? const Color(0xFF047857)
                              : const Color(0xFFDC2626),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
      ],
    );
  }

  Widget _buildVipPromoCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF0A2655),
            Color(0xFF0F172A),
          ],
        ),
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0A2655).withValues(alpha: 0.3),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              gradient: AppTheme.amberGradient,
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.workspace_premium_rounded,
              color: Colors.white,
              size: 24,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Unlock All Mock Tests',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                  ),
                ),
                Text(
                  '₹$_subscriptionFee/Year • Full Exam Prep',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    color: const Color(0xFF94A3B8),
                  ),
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: _showUpgradeDialog,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFFBBF24),
              foregroundColor: const Color(0xFF0F172A),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              'Upgrade',
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER MODELS & BOTTOM SEARCH SHEET
// ═══════════════════════════════════════════════════════════════════════════

class _CarouselItem {
  final String image;
  final String badge;
  final String title;
  final String highlightText;
  final Color highlightColor;
  final String subtitle;
  final String ctaText;
  final Color ctaBg;
  final Color ctaColor;
  final VoidCallback onTap;

  const _CarouselItem({
    required this.image,
    required this.badge,
    required this.title,
    required this.highlightText,
    required this.highlightColor,
    required this.subtitle,
    required this.ctaText,
    required this.ctaBg,
    required this.ctaColor,
    required this.onTap,
  });
}

class _QuickAction {
  final String title;
  final IconData icon;
  final Color color;
  final Color bg;
  final Color border;
  final VoidCallback onTap;

  const _QuickAction({
    required this.title,
    required this.icon,
    required this.color,
    required this.bg,
    required this.border,
    required this.onTap,
  });
}

class _SearchBottomSheet extends StatefulWidget {
  final List<Map<String, dynamic>> exams;
  final List<Map<String, dynamic>> mockTests;
  final void Function(String examId) onSelectExam;
  final void Function(String testId) onSelectTest;

  const _SearchBottomSheet({
    required this.exams,
    required this.mockTests,
    required this.onSelectExam,
    required this.onSelectTest,
  });

  @override
  State<_SearchBottomSheet> createState() => _SearchBottomSheetState();
}

class _SearchBottomSheetState extends State<_SearchBottomSheet> {
  String _query = '';
  String _selectedCategory = 'all'; // all, exams, mocks

  @override
  Widget build(BuildContext context) {
    final filteredExams = widget.exams.where((e) {
      final name = (e['name'] ?? '').toString().toLowerCase();
      return _query.isEmpty || name.contains(_query.toLowerCase());
    }).toList();

    final filteredTests = widget.mockTests.where((t) {
      final name = (t['name'] ?? t['title'] ?? '').toString().toLowerCase();
      return _query.isEmpty || name.contains(_query.toLowerCase());
    }).toList();

    return Container(
      height: MediaQuery.of(context).size.height * 0.78,
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Search Field
          TextField(
            autofocus: true,
            onChanged: (v) => setState(() => _query = v),
            decoration: InputDecoration(
              hintText: 'Search exams, topic tests, PYQs...',
              prefixIcon:
                  const Icon(Icons.search_rounded, color: Color(0xFF0066FF)),
              filled: true,
              fillColor: const Color(0xFFF8FAFC),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: Color(0xFF0066FF), width: 1.5),
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16),
            ),
          ),

          const SizedBox(height: 12),

          // Filter Chips
          Row(
            children: [
              _filterChip('all', 'All'),
              const SizedBox(width: 8),
              _filterChip('exams', 'Exams'),
              const SizedBox(width: 8),
              _filterChip('mocks', 'Mock Tests'),
            ],
          ),

          const SizedBox(height: 14),

          // Results list
          Expanded(
            child: ListView(
              physics: const BouncingScrollPhysics(),
              children: [
                if (_selectedCategory == 'all' || _selectedCategory == 'exams') ...[
                  if (filteredExams.isNotEmpty) ...[
                    Text(
                      'TARGET EXAMS (${filteredExams.length})',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF94A3B8),
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...filteredExams.map((e) => ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(
                              Icons.account_balance_rounded,
                              color: Color(0xFF0066FF),
                              size: 18,
                            ),
                          ),
                          title: Text(
                            e['name'] ?? '',
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                          trailing: const Icon(Icons.chevron_right_rounded,
                              size: 20, color: Color(0xFFCBD5E1)),
                          onTap: () => widget.onSelectExam(e['id'].toString()),
                        )),
                    const SizedBox(height: 16),
                  ],
                ],
                if (_selectedCategory == 'all' || _selectedCategory == 'mocks') ...[
                  if (filteredTests.isNotEmpty) ...[
                    Text(
                      'MOCK TESTS (${filteredTests.length})',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF94A3B8),
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...filteredTests.map((t) => ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(
                              Icons.school_rounded,
                              color: Color(0xFF475569),
                              size: 18,
                            ),
                          ),
                          title: Text(
                            t['name'] ?? t['title'] ?? 'Mock Test',
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                          subtitle: Text(
                            '${t['duration_minutes'] ?? 90} Mins • ${t['total_marks'] ?? 100} Marks',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: const Color(0xFF64748B),
                            ),
                          ),
                          trailing: const Icon(Icons.chevron_right_rounded,
                              size: 20, color: Color(0xFFCBD5E1)),
                          onTap: () => widget.onSelectTest(t['id'].toString()),
                        )),
                  ],
                ],
                if (filteredExams.isEmpty && filteredTests.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 40),
                    child: Center(
                      child: Column(
                        children: [
                          const Icon(Icons.search_off_rounded,
                              size: 48, color: Color(0xFFCBD5E1)),
                          const SizedBox(height: 10),
                          Text(
                            'No results found for "$_query"',
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _filterChip(String id, String label) {
    final active = _selectedCategory == id;
    return GestureDetector(
      onTap: () => setState(() => _selectedCategory = id),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: active ? const Color(0xFF0066FF) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11.5,
            fontWeight: FontWeight.w700,
            color: active ? Colors.white : const Color(0xFF64748B),
          ),
        ),
      ),
    );
  }
}
