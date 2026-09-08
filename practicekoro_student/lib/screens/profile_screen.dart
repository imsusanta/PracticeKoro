import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';
import '../services/auth_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _authService = AuthService();
  final _client = Supabase.instance.client;
  bool _loading = true;
  Map<String, dynamic>? _profile;
  int _totalTests = 0;
  int _avgScore = 0;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) return;

      final profileData = await _client
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

      final attemptsData = await _client
          .from('test_attempts')
          .select('percentage')
          .eq('user_id', userId);

      if (mounted) {
        final attempts = attemptsData as List;
        setState(() {
          _profile = profileData;
          _totalTests = attempts.length;
          _avgScore = attempts.isNotEmpty
              ? (attempts.fold<double>(
                          0,
                          (s, a) => s + (a['percentage'] as num).toDouble(),
                        ) /
                        attempts.length)
                    .round()
              : 0;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _handleLogout() async {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Logout',
          style: GoogleFonts.inter(fontWeight: FontWeight.w700),
        ),
        content: Text(
          'Are you sure you want to logout?',
          style: GoogleFonts.inter(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(
              'Cancel',
              style: GoogleFonts.inter(
                fontWeight: FontWeight.w600,
                color: const Color(0xFF94A3B8),
              ),
            ),
          ),
          TextButton(
            onPressed: () async {
              Navigator.of(context).pop();
              await _authService.logout();
              if (!context.mounted) return;
              Navigator.of(
                context,
              ).pushNamedAndRemoveUntil('/login', (route) => false);
            },
            child: Text(
              'Logout',
              style: GoogleFonts.inter(
                fontWeight: FontWeight.w700,
                color: AppTheme.error,
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
        body: RefreshIndicator(
          onRefresh: _loadProfile,
          color: AppTheme.primaryEmerald,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(
              parent: BouncingScrollPhysics(),
            ),
            children: [
              SizedBox(
                height: MediaQuery.of(context).size.height * 0.7,
                child: const Center(
                  child: CircularProgressIndicator(
                    color: AppTheme.primaryIndigo,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    final fullName = _profile?['full_name'] ?? 'Student';
    final email = _client.auth.currentUser?.email ?? '';
    final whatsapp = _profile?['whatsapp_number'];

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadProfile,
          color: AppTheme.primaryEmerald,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(
              parent: BouncingScrollPhysics(),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: ResponsiveCenter(
              maxWidth: 600,
              child: Column(
                children: [
                const SizedBox(height: 16),

                // Header
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Profile',
                    style: GoogleFonts.inter(
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                // Avatar Card
                Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        gradient: AppTheme.indigoGradient,
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: Column(
                        children: [
                          Container(
                            width: 80,
                            height: 80,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: Colors.white.withValues(alpha: 0.4),
                                width: 3,
                              ),
                            ),
                            child: _profile?['avatar_url'] != null
                                ? ClipOval(
                                    child: Image.network(
                                      _profile!['avatar_url'],
                                      fit: BoxFit.cover,
                                      errorBuilder: (context, error, stackTrace) => Center(
                                        child: Text(
                                          fullName[0].toUpperCase(),
                                          style: GoogleFonts.inter(
                                            fontSize: 32,
                                            fontWeight: FontWeight.w700,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ),
                                    ),
                                  )
                                : Center(
                                    child: Text(
                                      fullName[0].toUpperCase(),
                                      style: GoogleFonts.inter(
                                        fontSize: 32,
                                        fontWeight: FontWeight.w700,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                          ),
                          const SizedBox(height: 14),
                          Text(
                            fullName,
                            style: GoogleFonts.inter(
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                          if (!email.contains('@whatsapp.'))
                            Text(
                              email,
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                color: Colors.white.withValues(alpha: 0.7),
                              ),
                            ),
                          if (whatsapp != null)
                            Text(
                              'WhatsApp: $whatsapp',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                color: Colors.white.withValues(alpha: 0.7),
                              ),
                            ),
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 20,
                                  vertical: 10,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Column(
                                  children: [
                                    Text(
                                      '$_totalTests',
                                      style: GoogleFonts.inter(
                                        fontSize: 20,
                                        fontWeight: FontWeight.w800,
                                        color: Colors.white,
                                      ),
                                    ),
                                    Text(
                                      'Tests',
                                      style: GoogleFonts.inter(
                                        fontSize: 11,
                                        color: Colors.white.withValues(
                                          alpha: 0.7,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 16),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 20,
                                  vertical: 10,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Column(
                                  children: [
                                    Text(
                                      '$_avgScore%',
                                      style: GoogleFonts.inter(
                                        fontSize: 20,
                                        fontWeight: FontWeight.w800,
                                        color: Colors.white,
                                      ),
                                    ),
                                    Text(
                                      'Avg Score',
                                      style: GoogleFonts.inter(
                                        fontSize: 11,
                                        color: Colors.white.withValues(
                                          alpha: 0.7,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    )
                    .animate()
                    .fadeIn(duration: 500.ms)
                    .scale(
                      begin: const Offset(0.95, 0.95),
                      end: const Offset(1, 1),
                      duration: 500.ms,
                    ),

                const SizedBox(height: 24),

                // Menu Items
                _menuItem(
                  icon: Icons.person_outline,
                  title: 'Edit Profile',
                  color: AppTheme.primaryIndigo,
                  onTap: () => _showSnack('Profile editing coming soon'),
                ),
                _menuItem(
                  icon: Icons.notifications_outlined,
                  title: 'Notifications',
                  color: const Color(0xFFF59E0B),
                  onTap: () => _showSnack('Notifications coming soon'),
                ),
                _menuItem(
                  icon: Icons.help_outline,
                  title: 'Help & Support',
                  color: const Color(0xFF3B82F6),
                  onTap: () => _showSnack('Support coming soon'),
                ),
                _menuItem(
                  icon: Icons.info_outline,
                  title: 'About',
                  color: const Color(0xFF10B981),
                  onTap: () => _showSnack('PracticeKoro v1.0.0'),
                ),

                const SizedBox(height: 12),

                // Logout Button
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: OutlinedButton.icon(
                    onPressed: _handleLogout,
                    icon: const Icon(
                      Icons.logout_rounded,
                      color: AppTheme.error,
                      size: 20,
                    ),
                    label: Text(
                      'Logout',
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.error,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      side: const BorderSide(color: Color(0xFFFECACA)),
                      backgroundColor: const Color(0xFFFEF2F2),
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                // Version
                Text(
                  'PracticeKoro Student v1.0.0',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    color: const Color(0xFFCBD5E1),
                  ),
                ),

                const SizedBox(height: 100),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

  Widget _menuItem({
    required IconData icon,
    required String title,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        leading: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: color, size: 22),
        ),
        title: Text(
          title,
          style: GoogleFonts.inter(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF0F172A),
          ),
        ),
        trailing: const Icon(Icons.chevron_right, color: Color(0xFFCBD5E1)),
      ),
    );
  }

  void _showSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          msg,
          style: GoogleFonts.inter(fontWeight: FontWeight.w500),
        ),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }
}
