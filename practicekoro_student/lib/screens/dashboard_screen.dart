import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';
import '../models/exam_readiness.dart';
import '../models/exam_target.dart';
import '../services/readiness_service.dart';

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
  int _totalTests = 0;
  int _avgScore = 0;
  int _passRate = 0;
  int _studyStreak = 0;
  bool _hasSubscription = false;
  int _subscriptionFee = 499;
  List<Map<String, dynamic>> _recentActivity = [];
  List<Map<String, dynamic>> _exams = [];

  ExamReadinessResult? _readiness;
  String _selectedExamId = 'wbp-constable';
  bool _readinessLoading = false;

  final List<String> _quotes = [
    "Success is not final, failure is not fatal.",
    "The secret of getting ahead is getting started.",
    "Believe you can and you're halfway there.",
    "Every expert was once a beginner.",
    "Your only limit is your mind.",
  ];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  String get _greetingText {
    final hour = DateTime.now().hour;
    if (hour < 5) return 'Good Night 🌙';
    if (hour < 12) return 'Good Morning ☀️';
    if (hour < 17) return 'Good Afternoon 🌤️';
    if (hour < 21) return 'Good Evening 🌅';
    return 'Good Night 🌙';
  }

  List<Color> get _greetingColors {
    final hour = DateTime.now().hour;
    if (hour < 5) return [const Color(0xFF4F46E5), const Color(0xFF7C3AED)];
    if (hour < 12) return [const Color(0xFFF59E0B), const Color(0xFFEA580C)];
    if (hour < 17) return [const Color(0xFF3B82F6), const Color(0xFF06B6D4)];
    if (hour < 21) return [const Color(0xFFF97316), const Color(0xFFE11D48)];
    return [const Color(0xFF4F46E5), const Color(0xFF7C3AED)];
  }

  Future<void> _loadData() async {
    try {
      final session = _client.auth.currentSession;
      if (session == null) {
        if (mounted) Navigator.of(context).pushReplacementNamed('/login');
        return;
      }
      final userId = session.user.id;

      // Load profile
      final profileData =
          await _client.from('profiles').select('*').eq('id', userId).single();

      // Load exams
      final examsData = await _client
          .from('exams')
          .select('id, name')
          .order('created_at', ascending: true);

      // Load test attempts
      final attemptsData = await _client
          .from('test_attempts')
          .select('percentage, passed, created_at')
          .eq('user_id', userId);

      // Load recent attempts
      final recentData = await _client
          .from('test_attempts')
          .select('id, percentage, passed, created_at, mock_test_id, mock_tests(name)')
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .limit(5);

      // Check subscription
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

      // Check site settings for subscription fee
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

      if (mounted) {
        final attempts = attemptsData as List;
        final totalTests = attempts.length;
        final avgScore = totalTests > 0
            ? (attempts.fold<double>(
                    0, (s, a) => s + (a['percentage'] as num).toDouble()) /
                totalTests)
            : 0.0;
        final testsPassed =
            attempts.where((a) => a['passed'] == true).length;
        final passRateVal =
            totalTests > 0 ? (testsPassed / totalTests * 100) : 0.0;

        // Calculate study streak
        int streak = 0;
        if (attempts.isNotEmpty) {
          final sortedDates = attempts
              .map((a) => DateTime.parse(a['created_at']).toLocal())
              .toList()
            ..sort((a, b) => b.compareTo(a));

          final uniqueDays = <String>{};
          for (final d in sortedDates) {
            uniqueDays.add(
                '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}');
          }
          final daysList = uniqueDays.toList()..sort((a, b) => b.compareTo(a));
          final today = DateTime.now();
          final todayStr =
              '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

          for (int i = 0; i < daysList.length; i++) {
            final expected = today.subtract(Duration(days: i));
            final expectedStr =
                '${expected.year}-${expected.month.toString().padLeft(2, '0')}-${expected.day.toString().padLeft(2, '0')}';
            if (daysList.contains(expectedStr)) {
              streak++;
            } else if (i == 0 && daysList.first == todayStr) {
              streak++;
            } else {
              break;
            }
          }
        }

        setState(() {
          _profile = profileData;
          _totalTests = totalTests;
          _avgScore = avgScore.round();
          _passRate = passRateVal.round();
          _studyStreak = streak;
          _hasSubscription = hasSub;
          _subscriptionFee = fee;
          _exams = List<Map<String, dynamic>>.from(examsData);
          _recentActivity = List<Map<String, dynamic>>.from(recentData);
          _loading = false;
        });

        // Asynchronously load student exam readiness
        _loadReadiness(userId);
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadReadiness(String userId) async {
    try {
      final res = await ReadinessService.fetchStudentReadiness(
        userId,
        _selectedExamId,
      );
      if (mounted) {
        setState(() {
          _readiness = res;
          _readinessLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _readinessLoading = false);
    }
  }

  void _onExamChanged(String? newExamId) {
    if (newExamId == null || newExamId == _selectedExamId) return;
    setState(() {
      _selectedExamId = newExamId;
      _readinessLoading = true;
    });
    final session = _client.auth.currentSession;
    if (session != null) {
      _loadReadiness(session.user.id);
    }
  }

  void _navigateToTab(int index) {
    if (widget.onNavigateTab != null) {
      widget.onNavigateTab!(index);
    } else {
      switch (index) {
        case 1:
          Navigator.of(context).pushNamed('/exams');
          break;
        case 2:
          Navigator.of(context).pushNamed('/results');
          break;
        case 3:
          Navigator.of(context).pushNamed('/notes');
          break;
        case 4:
          Navigator.of(context).pushNamed('/profile');
          break;
      }
    }
  }

  void _showUpgradeDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Color(0xFF0F172A),
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 24),
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFD4A017), Color(0xFFFBBF24), Color(0xFFD4A017)],
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.4),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: const Icon(
                Icons.workspace_premium_rounded,
                color: Colors.white,
                size: 36,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Go Premium VIP',
              style: GoogleFonts.inter(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Unlock all mock tests, topic practice & premium study notes for an entire year.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 14,
                color: const Color(0xFF94A3B8),
                height: 1.4,
              ),
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Yearly Pass',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                      Text(
                        'Full 365 days access',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                  Text(
                    '₹$_subscriptionFee/yr',
                    style: GoogleFonts.inter(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFFFBBF24),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 54,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        'Please visit practicekoro.com or contact support to complete payment.',
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
                  backgroundColor: const Color(0xFFF59E0B),
                  foregroundColor: const Color(0xFF0F172A),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: Text(
                  'Subscribe Now',
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _showSupportDialog() {
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
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                    ),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.support_agent_rounded,
                    color: Colors.white,
                    size: 26,
                  ),
                ),
                const SizedBox(width: 14),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Student Support',
                      style: GoogleFonts.inter(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                      ),
                    ),
                    Text(
                      'We are here to help you anytime',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: const Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      const Icon(Icons.language_rounded,
                          size: 20, color: Color(0xFF6366F1)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'PracticeKoro.com',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF0F172A),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 20, color: Color(0xFFE2E8F0)),
                  Row(
                    children: [
                      const Icon(Icons.chat_bubble_outline_rounded,
                          size: 20, color: Color(0xFF10B981)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'WhatsApp & Live Chat Support',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF0F172A),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6366F1),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: Text(
                  'Close',
                  style: GoogleFonts.inter(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
          ],
        ),
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
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.primaryIndigo.withValues(alpha: 0.15),
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                padding: const EdgeInsets.all(14),
                child: const Icon(
                  Icons.school_rounded,
                  color: AppTheme.primaryEmerald,
                  size: 36,
                ),
              ),
              const SizedBox(height: 20),
              const SizedBox(
                width: 28,
                height: 28,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: AppTheme.primaryIndigo,
                ),
              ),
            ],
          ),
        ),
      );
    }

    final fullName = _profile?['full_name']?.toString() ?? 'Student';
    final firstName = fullName.trim().split(' ').first;
    final isSmall = AppResponsive.isSmallPhone(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadData,
          color: AppTheme.primaryEmerald,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(
              parent: BouncingScrollPhysics(),
            ),
            padding: EdgeInsets.symmetric(
              horizontal: AppResponsive.horizontalPadding(context),
              vertical: isSmall ? 8 : 10,
            ),
            child: ResponsiveCenter(
              maxWidth: 640,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ═══════════════════════════════════════════════════════════
                  // PREMIUM HERO CARD - Matches Web Student Dashboard
                  // ═══════════════════════════════════════════════════════════
                  Container(
                    width: double.infinity,
                    padding: EdgeInsets.all(AppResponsive.cardPadding(context)),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: _greetingColors,
                      ),
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: _greetingColors[0].withValues(alpha: 0.35),
                          blurRadius: 24,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Stack(
                      children: [
                        // Decorative Blur Circles
                        Positioned(
                          top: -30,
                          right: -30,
                          child: Container(
                            width: 140,
                            height: 140,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white.withValues(alpha: 0.12),
                            ),
                          ),
                        ),
                        Positioned(
                          bottom: -40,
                          left: -40,
                          child: Container(
                            width: 120,
                            height: 120,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.black.withValues(alpha: 0.1),
                            ),
                          ),
                        ),

                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // User Info Row
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                // Avatar Container
                                Container(
                                  width: isSmall ? 50 : 58,
                                  height: isSmall ? 50 : 58,
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(18),
                                    border: Border.all(
                                      color: Colors.white.withValues(alpha: 0.35),
                                      width: 2,
                                    ),
                                  ),
                                  child: _profile?['avatar_url'] != null
                                      ? ClipRRect(
                                          borderRadius: BorderRadius.circular(16),
                                        child: Image.network(
                                          _profile!['avatar_url'],
                                          fit: BoxFit.cover,
                                          errorBuilder: (context, error, stackTrace) => Center(
                                            child: Text(
                                              firstName.isNotEmpty ? firstName[0].toUpperCase() : 'S',
                                              style: GoogleFonts.inter(
                                                fontSize: 24,
                                                fontWeight: FontWeight.w800,
                                                color: Colors.white,
                                              ),
                                            ),
                                          ),
                                        ),
                                      )
                                    : Center(
                                        child: Text(
                                          firstName.isNotEmpty ? firstName[0].toUpperCase() : 'S',
                                          style: GoogleFonts.inter(
                                            fontSize: 24,
                                            fontWeight: FontWeight.w800,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _greetingText,
                                      style: GoogleFonts.inter(
                                        fontSize: 13,
                                        color: Colors.white.withValues(alpha: 0.8),
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      firstName,
                                      style: GoogleFonts.inter(
                                        fontSize: 22,
                                        fontWeight: FontWeight.w800,
                                        color: Colors.white,
                                        letterSpacing: -0.3,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 4),

                                    // Premium or Active Badge
                                    if (_hasSubscription)
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 10, vertical: 3),
                                        decoration: BoxDecoration(
                                          gradient: const LinearGradient(
                                            colors: [
                                              Color(0xFFD4A017),
                                              Color(0xFFFBBF24),
                                              Color(0xFFD4A017),
                                            ],
                                          ),
                                          borderRadius:
                                              BorderRadius.circular(20),
                                          boxShadow: [
                                            BoxShadow(
                                              color: const Color(0xFFF59E0B)
                                                  .withValues(alpha: 0.4),
                                              blurRadius: 8,
                                              offset: const Offset(0, 2),
                                            ),
                                          ],
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            const Icon(
                                              Icons.workspace_premium_rounded,
                                              size: 13,
                                              color: Colors.white,
                                            ),
                                            const SizedBox(width: 4),
                                            Text(
                                              'PREMIUM VIP',
                                              style: GoogleFonts.inter(
                                                fontSize: 10,
                                                fontWeight: FontWeight.w900,
                                                color: Colors.white,
                                                letterSpacing: 0.8,
                                              ),
                                            ),
                                          ],
                                        ),
                                      )
                                    else
                                      Row(
                                        children: [
                                          Container(
                                            width: 7,
                                            height: 7,
                                            decoration: const BoxDecoration(
                                              shape: BoxShape.circle,
                                              color: Color(0xFF34D399),
                                            ),
                                          ),
                                          const SizedBox(width: 6),
                                          Text(
                                            'Active Student',
                                            style: GoogleFonts.inter(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w600,
                                              color: Colors.white
                                                  .withValues(alpha: 0.85),
                                            ),
                                          ),
                                        ],
                                      ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),

                          // Hero Stats Row (Tests Taken, Avg Score, Pass Rate)
                          Row(
                            children: [
                              _statBadge('$_totalTests', 'Tests Taken'),
                              const SizedBox(width: 8),
                              _statBadge('$_avgScore%', 'Avg Score'),
                              const SizedBox(width: 8),
                              _statBadge('$_passRate%', 'Pass Rate'),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                )
                    .animate()
                    .fadeIn(duration: 500.ms)
                    .slideY(begin: 0.08, end: 0, duration: 500.ms),

                // ═══════════════════════════════════════════════════════════
                // GO PREMIUM / VIP UPGRADE CARD (Shown if not subscribed)
                // ═══════════════════════════════════════════════════════════
                if (!_hasSubscription) ...[
                  const SizedBox(height: 16),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(1.5),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [
                          Color(0xFFFBBF24),
                          Color(0xFFF59E0B),
                          Color(0xFFFBBF24),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(22),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            Color(0xFF0F172A),
                            Color(0xFF1E293B),
                            Color(0xFF0F172A),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: isSmall ? 40 : 48,
                            height: isSmall ? 40 : 48,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [
                                  Color(0xFFD4A017),
                                  Color(0xFFFBBF24),
                                  Color(0xFFD4A017),
                                ],
                              ),
                              borderRadius: BorderRadius.circular(isSmall ? 13 : 16),
                            ),
                            child: Icon(
                              Icons.workspace_premium_rounded,
                              color: Colors.white,
                              size: isSmall ? 22 : 26,
                            ),
                          ),
                          SizedBox(width: isSmall ? 10 : 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      'Go Premium',
                                      style: GoogleFonts.inter(
                                        fontSize: isSmall ? 14 : 15,
                                        fontWeight: FontWeight.w800,
                                        color: Colors.white,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFFBBF24),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        '★ VIP',
                                        style: GoogleFonts.inter(
                                          fontSize: 9,
                                          fontWeight: FontWeight.w900,
                                          color: const Color(0xFF78350F),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Unlock all tests & notes — ₹$_subscriptionFee/yr',
                                  style: GoogleFonts.inter(
                                    fontSize: isSmall ? 11 : 12,
                                    color: const Color(0xFF94A3B8),
                                    fontWeight: FontWeight.w500,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton(
                            onPressed: _showUpgradeDialog,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFF59E0B),
                              foregroundColor: const Color(0xFF0F172A),
                              padding: EdgeInsets.symmetric(
                                  horizontal: isSmall ? 10 : 14,
                                  vertical: isSmall ? 8 : 10),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              elevation: 0,
                            ),
                            child: FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                'Upgrade',
                                style: GoogleFonts.inter(
                                  fontSize: isSmall ? 12 : 13,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                      .animate()
                      .fadeIn(delay: 150.ms, duration: 400.ms),
                ],

                const SizedBox(height: 18),

                // ═══════════════════════════════════════════════════════════
                // EXAM READINESS GAUGE CARD (Phase 4 & 5 Cross-Platform)
                // ═══════════════════════════════════════════════════════════
                _buildReadinessCard()
                    .animate()
                    .fadeIn(delay: 150.ms, duration: 400.ms),

                const SizedBox(height: 22),

                // ═══════════════════════════════════════════════════════════
                // QUICK ACTIONS - Native Cards (Primary + 2x2 Grid)
                // ═══════════════════════════════════════════════════════════
                Text(
                  'QUICK PRACTICE ACTIONS',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF94A3B8),
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 12),

                // Primary Action: Start Mock Test
                InkWell(
                  onTap: () => _navigateToTab(1),
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: EdgeInsets.all(isSmall ? 13 : 16),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                      ),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF6366F1).withValues(alpha: 0.3),
                          blurRadius: 18,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: isSmall ? 40 : 48,
                          height: isSmall ? 40 : 48,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Icon(
                            Icons.school_rounded,
                            color: Colors.white,
                            size: isSmall ? 22 : 26,
                          ),
                        ),
                        SizedBox(width: isSmall ? 10 : 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Start Full Mock Test 🚀',
                                style: GoogleFonts.inter(
                                  fontSize: isSmall ? 14.5 : 16,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                ),
                              ),
                              Text(
                                'Real exam simulation with timer & negative marking',
                                style: GoogleFonts.inter(
                                  fontSize: isSmall ? 11 : 12,
                                  color: Colors.white.withValues(alpha: 0.85),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(
                          Icons.chevron_right_rounded,
                          color: Colors.white,
                          size: 24,
                        ),
                      ],
                    ),
                  ),
                ).animate().fadeIn(delay: 150.ms, duration: 400.ms),

                const SizedBox(height: 12),

                // 2x2 Secondary Action Grid
                Row(
                  children: [
                    Expanded(
                      child: _actionCard(
                        title: 'Results & Analytics',
                        subtitle: 'Performance Insights',
                        icon: Icons.bar_chart_rounded,
                        color: const Color(0xFF10B981),
                        bgColor: const Color(0xFFD1FAE5),
                        onTap: () => _navigateToTab(2),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _actionCard(
                        title: 'Topic Drills',
                        subtitle: 'Chapter-Wise MCQs',
                        icon: Icons.gps_fixed_rounded,
                        color: const Color(0xFF3B82F6),
                        bgColor: const Color(0xFFDBEAFE),
                        onTap: () => _navigateToTab(1),
                      ),
                    ),
                  ],
                ).animate().fadeIn(delay: 200.ms, duration: 400.ms),

                const SizedBox(height: 12),

                Row(
                  children: [
                    Expanded(
                      child: _actionCard(
                        title: 'Study Notes',
                        subtitle: 'Quick Revision Sheets',
                        icon: Icons.description_outlined,
                        color: const Color(0xFFF59E0B),
                        bgColor: const Color(0xFFFEF3C7),
                        onTap: () => _navigateToTab(3),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _actionCard(
                        title: 'All Target Exams',
                        subtitle: '${_exams.length} Target Govt Exams',
                        icon: Icons.menu_book_rounded,
                        color: const Color(0xFF8B5CF6),
                        bgColor: const Color(0xFFEDE9FE),
                        onTap: () => _navigateToTab(1),
                      ),
                    ),
                  ],
                ).animate().fadeIn(delay: 250.ms, duration: 400.ms),

                const SizedBox(height: 12),

                Row(
                  children: [
                    Expanded(
                      child: _actionCard(
                        title: 'PYQ Question Vault',
                        subtitle: 'Previous 10 Years Papers',
                        icon: Icons.bolt_rounded,
                        color: const Color(0xFF0284C7),
                        bgColor: const Color(0xFFE0F2FE),
                        onTap: () => Navigator.of(context).pushNamed('/practice'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _actionCard(
                        title: 'Mistakes Notebook',
                        subtitle: 'Zero Negative Marking Revision',
                        icon: Icons.menu_book_rounded,
                        color: const Color(0xFFDC2626),
                        bgColor: const Color(0xFFFEE2E2),
                        onTap: () => Navigator.of(context).pushNamed('/mistakes'),
                      ),
                    ),
                  ],
                ).animate().fadeIn(delay: 300.ms, duration: 400.ms),

                const SizedBox(height: 20),

                // ═══════════════════════════════════════════════════════════
                // STUDY STREAK - Gamification Banner
                // ═══════════════════════════════════════════════════════════
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFF97316), Color(0xFFF59E0B)],
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFF97316).withValues(alpha: 0.25),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Icon(
                          Icons.local_fire_department_rounded,
                          color: Colors.white,
                          size: 30,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  '$_studyStreak',
                                  style: GoogleFonts.inter(
                                    fontSize: 28,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.white,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 4),
                                  child: Text(
                                    'day streak',
                                    style: GoogleFonts.inter(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                      color: Colors.white.withValues(alpha: 0.85),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            Text(
                              _studyStreak == 0
                                  ? 'Take a test to start your streak!'
                                  : _studyStreak == 1
                                      ? 'Great start! Keep it going!'
                                      : "You're on fire! $_studyStreak days in a row!",
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                color: Colors.white.withValues(alpha: 0.85),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn(delay: 280.ms, duration: 400.ms),

                const SizedBox(height: 20),

                // ═══════════════════════════════════════════════════════════
                // YOUR PROGRESS - Detailed Progress Overview
                // ═══════════════════════════════════════════════════════════
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: const Color(0xFFF1F5F9)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 14,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFFEEF2FF), Color(0xFFE0E7FF)],
                              ),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.emoji_events_rounded,
                              color: Color(0xFF4F46E5),
                              size: 22,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Your Progress',
                                style: GoogleFonts.inter(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF0F172A),
                                ),
                              ),
                              Text(
                                'Keep up the great work!',
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  color: const Color(0xFF94A3B8),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),

                      // Tests Completed Progress Bar
                      _progressBarItem(
                        label: 'Tests Completed',
                        valueText: '${min(_totalTests, 10)}/10',
                        ratio: min(_totalTests / 10.0, 1.0),
                        gradient: const LinearGradient(
                          colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Pass Rate Progress Bar
                      _progressBarItem(
                        label: 'Pass Rate',
                        valueText: '$_passRate%',
                        ratio: (_passRate / 100.0).clamp(0.0, 1.0),
                        gradient: _passRate >= 60
                            ? const LinearGradient(
                                colors: [Color(0xFF10B981), Color(0xFF14B8A6)],
                              )
                            : const LinearGradient(
                                colors: [Color(0xFFF59E0B), Color(0xFFEA580C)],
                              ),
                      ),
                      const SizedBox(height: 14),

                      // Average Score Progress Bar
                      _progressBarItem(
                        label: 'Average Score',
                        valueText: '$_avgScore%',
                        ratio: (_avgScore / 100.0).clamp(0.0, 1.0),
                        gradient: const LinearGradient(
                          colors: [Color(0xFF3B82F6), Color(0xFF06B6D4)],
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn(delay: 300.ms, duration: 400.ms),

                const SizedBox(height: 20),

                // ═══════════════════════════════════════════════════════════
                // RECENT ACTIVITY
                // ═══════════════════════════════════════════════════════════
                if (_recentActivity.isNotEmpty) ...[
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(color: const Color(0xFFF1F5F9)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.03),
                          blurRadius: 14,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [Color(0xFFDBEAFE), Color(0xFFBFDBFE)],
                                ),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(
                                Icons.schedule_rounded,
                                color: Color(0xFF2563EB),
                                size: 22,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Recent Activity',
                                  style: GoogleFonts.inter(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF0F172A),
                                  ),
                                ),
                                Text(
                                  'Your latest test attempts',
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    color: const Color(0xFF94A3B8),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        ..._recentActivity.map((a) {
                          final testName =
                              a['mock_tests']?['name'] ?? 'Unknown Test';
                          final score = (a['percentage'] as num).round();
                          final passed = a['passed'] == true;
                          final date = DateTime.parse(a['created_at']).toLocal();
                          final diff = DateTime.now().difference(date);
                          String timeAgo;
                          if (diff.inMinutes < 60) {
                            timeAgo = '${diff.inMinutes}m ago';
                          } else if (diff.inHours < 24) {
                            timeAgo = '${diff.inHours}h ago';
                          } else if (diff.inDays < 7) {
                            timeAgo = '${diff.inDays}d ago';
                          } else {
                            timeAgo = '${date.day}/${date.month}';
                          }

                          return InkWell(
                            onTap: () => _navigateToTab(2),
                            borderRadius: BorderRadius.circular(14),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              child: Row(
                                children: [
                                  Container(
                                    width: 38,
                                    height: 38,
                                    decoration: BoxDecoration(
                                      color: passed
                                          ? const Color(0xFFD1FAE5)
                                          : const Color(0xFFFEE2E2),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Icon(
                                      passed
                                          ? Icons.check_circle_rounded
                                          : Icons.gps_fixed_rounded,
                                      size: 20,
                                      color: passed
                                          ? const Color(0xFF059669)
                                          : const Color(0xFFDC2626),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          testName,
                                          style: GoogleFonts.inter(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w600,
                                            color: const Color(0xFF0F172A),
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        Text(
                                          timeAgo,
                                          style: GoogleFonts.inter(
                                            fontSize: 12,
                                            color: const Color(0xFF94A3B8),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 5,
                                    ),
                                    decoration: BoxDecoration(
                                      color: passed
                                          ? const Color(0xFFD1FAE5)
                                          : const Color(0xFFFEE2E2),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Text(
                                      '$score%',
                                      style: GoogleFonts.inter(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: passed
                                            ? const Color(0xFF047857)
                                            : const Color(0xFFDC2626),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  const Icon(
                                    Icons.chevron_right_rounded,
                                    size: 18,
                                    color: Color(0xFFCBD5E1),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }),
                      ],
                    ),
                  ).animate().fadeIn(delay: 350.ms, duration: 400.ms),
                  const SizedBox(height: 20),
                ],

                // ═══════════════════════════════════════════════════════════
                // DAILY MOTIVATION
                // ═══════════════════════════════════════════════════════════
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                    ),
                    borderRadius: BorderRadius.circular(22),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.15),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFFF59E0B), Color(0xFFEA580C)],
                          ),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Icon(
                          Icons.auto_awesome,
                          color: Colors.white,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Daily Inspiration',
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '"${_quotes[DateTime.now().day % _quotes.length]}"',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                color: const Color(0xFFCBD5E1),
                                fontStyle: FontStyle.italic,
                                height: 1.4,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn(delay: 380.ms, duration: 400.ms),

                // ═══════════════════════════════════════════════════════════
                // EXAMS CATEGORIES - Horizontal Scroll
                // ═══════════════════════════════════════════════════════════
                if (_exams.isNotEmpty) ...[
                  const SizedBox(height: 22),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'EXAMS',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF94A3B8),
                          letterSpacing: 1.2,
                        ),
                      ),
                      GestureDetector(
                        onTap: () => _navigateToTab(1),
                        child: Row(
                          children: [
                            Text(
                              'See All',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF4F46E5),
                              ),
                            ),
                            const Icon(
                              Icons.chevron_right_rounded,
                              size: 16,
                              color: Color(0xFF4F46E5),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 46,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _exams.length,
                      separatorBuilder: (context, index) => const SizedBox(width: 10),
                      itemBuilder: (context, i) {
                        final exam = _exams[i];
                        return InkWell(
                          onTap: () => _navigateToTab(1),
                          borderRadius: BorderRadius.circular(14),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: const Color(0xFFF1F5F9)),
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
                                Container(
                                  width: 26,
                                  height: 26,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFEEF2FF),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(
                                    Icons.school_rounded,
                                    size: 15,
                                    color: Color(0xFF4F46E5),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  exam['name'] ?? '',
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF0F172A),
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

                const SizedBox(height: 22),

                // ═══════════════════════════════════════════════════════════
                // SUPPORT SECTION
                // ═══════════════════════════════════════════════════════════
                InkWell(
                  onTap: _showSupportDialog,
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [
                          Color(0xFF6366F1),
                          Color(0xFF8B5CF6),
                          Color(0xFF9333EA),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF6366F1).withValues(alpha: 0.3),
                          blurRadius: 16,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 46,
                          height: 46,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(
                            Icons.chat_bubble_outline_rounded,
                            color: Colors.white,
                            size: 24,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Chat with Support',
                                style: GoogleFonts.inter(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                              Text(
                                'Get help from our team',
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  color: Colors.white.withValues(alpha: 0.75),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(
                          Icons.chevron_right_rounded,
                          color: Colors.white,
                          size: 24,
                        ),
                      ],
                    ),
                  ),
                ).animate().fadeIn(delay: 420.ms, duration: 400.ms),

                const SizedBox(height: 110), // Bottom navigation spacing
              ],
            ),
          ),
        ),
      ),
    ),
    );
  }

  Widget _statBadge(String value, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.16),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
        ),
        child: Column(
          children: [
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                value,
                style: GoogleFonts.inter(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
            ),
            const SizedBox(height: 2),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2),
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  label,
                  maxLines: 1,
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: Colors.white.withValues(alpha: 0.75),
                    letterSpacing: 0.3,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _actionCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required Color bgColor,
    required VoidCallback onTap,
  }) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 155;
        return InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(20),
          child: Container(
            padding: EdgeInsets.all(isNarrow ? 12 : 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFF1F5F9)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: isNarrow ? 38 : 44,
                  height: isNarrow ? 38 : 44,
                  decoration: BoxDecoration(
                    color: bgColor,
                    borderRadius: BorderRadius.circular(isNarrow ? 11 : 14),
                  ),
                  child: Icon(icon, color: color, size: isNarrow ? 19 : 22),
                ),
                SizedBox(height: isNarrow ? 8 : 12),
                Text(
                  title,
                  style: GoogleFonts.inter(
                    fontSize: isNarrow ? 13 : 14,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF0F172A),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: GoogleFonts.inter(
                    fontSize: isNarrow ? 11 : 12,
                    color: const Color(0xFF94A3B8),
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _progressBarItem({
    required String label,
    required String valueText,
    required double ratio,
    required Gradient gradient,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF475569),
              ),
            ),
            Text(
              valueText,
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: const Color(0xFF0F172A),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Container(
          height: 8,
          width: double.infinity,
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(4),
          ),
          child: FractionallySizedBox(
            alignment: Alignment.centerLeft,
            widthFactor: ratio.clamp(0.0, 1.0),
            child: Container(
              decoration: BoxDecoration(
                gradient: gradient,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildReadinessCard() {
    final readiness = _readiness;
    final exam = ExamDataCatalog.exams.firstWhere(
      (e) => e.id == _selectedExamId,
      orElse: () => ExamDataCatalog.exams[1],
    );
    final cutoff = readiness?.cutoffBenchmark.expectedCutoffUR ??
        ExamDataCatalog.getCutoff(_selectedExamId).expectedCutoffUR;
    final projected = readiness?.projectedScore ?? 0.0;
    final gap = projected - cutoff;
    final score = readiness?.overallReadiness ?? 0;

    Color bandColor;
    if (readiness == null) {
      bandColor = const Color(0xFF6366F1);
    } else {
      switch (readiness.readinessBand) {
        case ReadinessBand.examReady:
          bandColor = const Color(0xFF10B981);
          break;
        case ReadinessBand.competitive:
          bandColor = const Color(0xFF3B82F6);
          break;
        case ReadinessBand.developing:
          bandColor = const Color(0xFFF59E0B);
          break;
        case ReadinessBand.critical:
          bandColor = const Color(0xFFEF4444);
          break;
      }
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row with Exam selector
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: const Color(0xFF0A2655).withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.speed_rounded,
                        color: Color(0xFF0A2655),
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Target Exam Readiness',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF0F172A),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            'Projected score vs cutoff analysis',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: const Color(0xFF64748B),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              // Target Exam Dropdown
              Container(
                constraints: const BoxConstraints(maxWidth: 150),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFCBD5E1)),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedExamId,
                    isDense: true,
                    isExpanded: true,
                    icon: const Icon(Icons.arrow_drop_down, size: 18),
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF0A2655),
                    ),
                    onChanged: _onExamChanged,
                    items: ExamDataCatalog.exams.map((t) {
                      return DropdownMenuItem<String>(
                        value: t.id,
                        child: Text(
                          t.badge.isNotEmpty ? '${t.name.split(' ').first} (${t.badge})' : t.name,
                          overflow: TextOverflow.ellipsis,
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),

          // Main Readiness Radial & Target Breakdown
          Row(
            children: [
              // Radial Gauge
              SizedBox(
                width: 84,
                height: 84,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox(
                      width: 84,
                      height: 84,
                      child: CircularProgressIndicator(
                        value: _readinessLoading ? null : (score / 100.0).clamp(0.0, 1.0),
                        strokeWidth: 8,
                        backgroundColor: const Color(0xFFF1F5F9),
                        valueColor: AlwaysStoppedAnimation<Color>(bandColor),
                      ),
                    ),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '$score%',
                          style: GoogleFonts.inter(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFF0F172A),
                          ),
                        ),
                        Text(
                          'Ready',
                          style: GoogleFonts.inter(
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),

              // Band status & Cutoff Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: bandColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        readiness?.readinessLabel ?? 'Calculating...',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: bandColor,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      exam.name,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF334155),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 3),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Row(
                        children: [
                          Text(
                            'Projected: ${projected.toStringAsFixed(1)}',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                          Text(
                            ' / Cutoff: ${cutoff.toStringAsFixed(0)}',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              color: const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 2),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(
                        gap >= 0
                            ? '+${gap.toStringAsFixed(1)} marks in Safe Zone 🔥'
                            : '-${gap.abs().toStringAsFixed(1)} marks below Cutoff ⚠️',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: gap >= 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 18),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 14),

          // 4 Sub-factor meters (Adaptive 2x2 on narrow screens, 4-col on standard)
          LayoutBuilder(
            builder: (context, constraints) {
              final isCompact = constraints.maxWidth < 340;
              if (isCompact) {
                return Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: _factorMeter(
                            label: 'Full Mock',
                            weight: '40%',
                            percent: readiness?.mockAccuracy ?? 0,
                            color: const Color(0xFF4F46E5),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _factorMeter(
                            label: 'PYQ Drill',
                            weight: '25%',
                            percent: readiness?.topicDrillAccuracy ?? 0,
                            color: const Color(0xFF06B6D4),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: _factorMeter(
                            label: 'Mistakes',
                            weight: '20%',
                            percent: readiness?.mistakeMasteryRate ?? 0,
                            color: const Color(0xFFEC4899),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _factorMeter(
                            label: 'Consistency',
                            weight: '15%',
                            percent: readiness?.consistencyScore ?? 0,
                            color: const Color(0xFFF59E0B),
                          ),
                        ),
                      ],
                    ),
                  ],
                );
              }
              return Row(
                children: [
                  Expanded(
                    child: _factorMeter(
                      label: 'Full Mock',
                      weight: '40%',
                      percent: readiness?.mockAccuracy ?? 0,
                      color: const Color(0xFF4F46E5),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _factorMeter(
                      label: 'PYQ Drill',
                      weight: '25%',
                      percent: readiness?.topicDrillAccuracy ?? 0,
                      color: const Color(0xFF06B6D4),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _factorMeter(
                      label: 'Mistakes',
                      weight: '20%',
                      percent: readiness?.mistakeMasteryRate ?? 0,
                      color: const Color(0xFFEC4899),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _factorMeter(
                      label: 'Consistency',
                      weight: '15%',
                      percent: readiness?.consistencyScore ?? 0,
                      color: const Color(0xFFF59E0B),
                    ),
                  ),
                ],
              );
            },
          ),

          const SizedBox(height: 18),

          // Dual Action CTAs for Drill & Mistakes
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => Navigator.of(context).pushNamed('/practice'),
                  icon: const Icon(Icons.bolt_rounded, size: 16),
                  label: const FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text('PYQ Vault'),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0A2655),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 11, horizontal: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    elevation: 0,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => Navigator.of(context).pushNamed('/mistakes'),
                  icon: const Icon(Icons.menu_book_rounded, size: 16),
                  label: const FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text('Mistakes Notebook'),
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFDC2626),
                    side: const BorderSide(color: Color(0xFFFCA5A5)),
                    backgroundColor: const Color(0xFFFEF2F2),
                    padding: const EdgeInsets.symmetric(vertical: 11, horizontal: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _factorMeter({
    required String label,
    required String weight,
    required int percent,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  label,
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF475569),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 4),
              Text(
                weight,
                style: GoogleFonts.inter(
                  fontSize: 9,
                  color: const Color(0xFF94A3B8),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: LinearProgressIndicator(
              value: (percent / 100.0).clamp(0.0, 1.0),
              minHeight: 4,
              backgroundColor: const Color(0xFFE2E8F0),
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              '$percent%',
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: const Color(0xFF0F172A),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
