import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _authService = AuthService();
  late TabController _tabController;
  bool _loading = false;
  bool _showPassword = false;

  // Email form
  final _emailController = TextEditingController();
  final _emailPasswordController = TextEditingController();

  // WhatsApp form
  final _whatsappController = TextEditingController();
  final _whatsappPasswordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _emailController.dispose();
    _emailPasswordController.dispose();
    _whatsappController.dispose();
    _whatsappPasswordController.dispose();
    super.dispose();
  }

  void _showSnackBar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: GoogleFonts.inter(fontWeight: FontWeight.w500),
        ),
        backgroundColor: isError ? AppTheme.error : AppTheme.success,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  Future<void> _handleEmailLogin() async {
    if (_emailController.text.trim().isEmpty ||
        _emailPasswordController.text.isEmpty) {
      _showSnackBar('Please fill in all fields', isError: true);
      return;
    }

    setState(() => _loading = true);
    try {
      final response = await _authService.loginWithEmail(
        email: _emailController.text.trim(),
        password: _emailPasswordController.text,
      );
      if (response.session != null && mounted) {
        _showSnackBar('Welcome back! 🎉');
        Navigator.of(context).pushReplacementNamed('/dashboard');
      } else if (mounted) {
        _showSnackBar('Login failed. Please check your credentials.', isError: true);
      }
    } on AuthException catch (e) {
      if (mounted) {
        _showSnackBar(_getErrorMessage(e.message), isError: true);
      }
    } catch (e) {
      if (mounted) {
        _showSnackBar('Error: ${e.toString()}', isError: true);
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _handleWhatsAppLogin() async {
    if (_whatsappController.text.length != 10 ||
        _whatsappPasswordController.text.isEmpty) {
      _showSnackBar(
        'Please enter a valid 10-digit number and password',
        isError: true,
      );
      return;
    }

    setState(() => _loading = true);
    try {
      final response = await _authService.loginWithWhatsApp(
        whatsappNumber: _whatsappController.text.trim(),
        password: _whatsappPasswordController.text,
      );
      if (response.session != null && mounted) {
        _showSnackBar('Welcome back! 🎉');
        Navigator.of(context).pushReplacementNamed('/dashboard');
      } else if (mounted) {
        _showSnackBar('Login failed. Invalid number or password.', isError: true);
      }
    } on AuthException catch (e) {
      if (mounted) {
        _showSnackBar(_getErrorMessage(e.message), isError: true);
      }
    } catch (e) {
      if (mounted) {
        _showSnackBar('Error: ${e.toString()}', isError: true);
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _handleGoogleLogin() async {
    setState(() => _loading = true);
    try {
      await _authService.loginWithGoogle();
    } catch (e) {
      if (mounted) {
        _showSnackBar('Google sign-in failed', isError: true);
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _getErrorMessage(String error) {
    final lower = error.toLowerCase();
    if (lower.contains('invalid login credentials')) {
      return 'Invalid email or password. Please try again.';
    }
    if (lower.contains('email not confirmed')) {
      return 'Please verify your email first.';
    }
    if (lower.contains('too many requests')) {
      return 'Too many attempts. Please wait.';
    }
    if (lower.contains('user not found')) {
      return 'Account not found. Please register first.';
    }
    return error.isNotEmpty ? error : 'Login failed. Please try again.';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: ResponsiveCenter(
            maxWidth: 480,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 40),

                // Logo + Branding
                Center(
                  child: Column(
                    children: [
                      Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(22),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.primaryEmerald.withValues(
                                alpha: 0.2,
                              ),
                              blurRadius: 20,
                              offset: const Offset(0, 8),
                            ),
                          ],
                          border: Border.all(
                            color: const Color(0xFFD1FAE5),
                            width: 1.5,
                          ),
                        ),
                        child: const Padding(
                          padding: EdgeInsets.all(14),
                          child: Icon(
                            Icons.school_rounded,
                            size: 36,
                            color: AppTheme.primaryEmerald,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Practice Koro',
                        style: GoogleFonts.inter(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                      Text(
                        'Govt Jobs Preparation App',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.primaryEmerald,
                          letterSpacing: 1.2,
                        ),
                      ),
                    ],
                  ),
                )
                    .animate()
                    .fadeIn(duration: 500.ms)
                    .scale(
                      begin: const Offset(0.8, 0.8),
                      end: const Offset(1, 1),
                      duration: 500.ms,
                    ),

                const SizedBox(height: 36),

                // Welcome Text
                Text(
                  'Welcome back',
                  style: GoogleFonts.inter(
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF0F172A),
                  ),
                ).animate().fadeIn(delay: 200.ms, duration: 400.ms),
                const SizedBox(height: 4),
                Text(
                  'Enter your details to access your account',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: const Color(0xFF94A3B8),
                  ),
                ).animate().fadeIn(delay: 300.ms, duration: 400.ms),

                const SizedBox(height: 28),

                // Login Method Tabs
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  padding: const EdgeInsets.all(4),
                  child: TabBar(
                    controller: _tabController,
                    indicator: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(11),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.06),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    indicatorSize: TabBarIndicatorSize.tab,
                    dividerColor: Colors.transparent,
                    labelColor: const Color(0xFF0F172A),
                    unselectedLabelColor: const Color(0xFF94A3B8),
                    labelStyle: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                    tabs: const [
                      Tab(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.phone_android, size: 16),
                            SizedBox(width: 6),
                            Text('WhatsApp'),
                          ],
                        ),
                      ),
                      Tab(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.email_outlined, size: 16),
                            SizedBox(width: 6),
                            Text('Email'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn(delay: 400.ms, duration: 400.ms),

                const SizedBox(height: 24),

                // Tab Content
                SizedBox(
                  height: 360,
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      // WhatsApp Login
                      _buildWhatsAppForm(),
                      // Email Login
                      _buildEmailForm(),
                    ],
                  ),
                ).animate().fadeIn(delay: 500.ms, duration: 400.ms),

                // Divider
                Row(
                  children: [
                    const Expanded(child: Divider(color: Color(0xFFE2E8F0))),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        'Or continue with',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: const Color(0xFF94A3B8),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    const Expanded(child: Divider(color: Color(0xFFE2E8F0))),
                  ],
                ),

                const SizedBox(height: 16),

                // Google Sign in
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: OutlinedButton.icon(
                    onPressed: _loading ? null : _handleGoogleLogin,
                    icon: Image.network(
                      'https://www.google.com/favicon.ico',
                      width: 20,
                      height: 20,
                      errorBuilder: (context, error, stackTrace) => const Icon(
                        Icons.g_mobiledata,
                        size: 24,
                      ),
                    ),
                    label: Text(
                      'Google',
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF0F172A),
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      backgroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      side: BorderSide(color: Colors.grey.shade200),
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                // Register Link
                Center(
                  child: GestureDetector(
                    onTap: () => Navigator.of(context).pushNamed('/register'),
                    child: RichText(
                      text: TextSpan(
                        style: GoogleFonts.inter(fontSize: 14),
                        children: [
                          TextSpan(
                            text: "Don't have an account? ",
                            style: TextStyle(color: Colors.grey.shade600),
                          ),
                          const TextSpan(
                            text: 'Register',
                            style: TextStyle(
                              color: AppTheme.primaryEmerald,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

  Widget _buildWhatsAppForm() {
    return Column(
      children: [
        // WhatsApp Number
        _buildTextField(
          controller: _whatsappController,
          label: 'WhatsApp Number',
          hint: '10-digit number',
          icon: Icons.phone_android,
          keyboardType: TextInputType.phone,
          maxLength: 10,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        ),
        const SizedBox(height: 6),
        Align(
          alignment: Alignment.centerLeft,
          child: Text(
            'Enter without country code',
            style: GoogleFonts.inter(
              fontSize: 12,
              color: const Color(0xFF94A3B8),
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Password
        _buildTextField(
          controller: _whatsappPasswordController,
          label: 'Password',
          hint: '••••••••',
          icon: Icons.lock_outline,
          isPassword: true,
        ),

        const SizedBox(height: 12),

        // Forgot Password
        Align(
          alignment: Alignment.centerRight,
          child: GestureDetector(
            onTap: () {
              _showSnackBar('Password reset feature coming soon');
            },
            child: Text(
              'Forgot Password?',
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppTheme.primaryEmerald,
              ),
            ),
          ),
        ),

        const SizedBox(height: 24),

        // Login Button
        _buildLoginButton(onPressed: _handleWhatsAppLogin),
      ],
    );
  }

  Widget _buildEmailForm() {
    return Column(
      children: [
        // Email
        _buildTextField(
          controller: _emailController,
          label: 'Email address',
          hint: 'you@example.com',
          icon: Icons.email_outlined,
          keyboardType: TextInputType.emailAddress,
        ),
        const SizedBox(height: 16),

        // Password
        _buildTextField(
          controller: _emailPasswordController,
          label: 'Password',
          hint: '••••••••',
          icon: Icons.lock_outline,
          isPassword: true,
        ),

        const SizedBox(height: 12),

        // Forgot Password
        Align(
          alignment: Alignment.centerRight,
          child: GestureDetector(
            onTap: () {
              _showSnackBar('Password reset feature coming soon');
            },
            child: Text(
              'Forgot Password?',
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppTheme.primaryEmerald,
              ),
            ),
          ),
        ),

        const SizedBox(height: 24),

        // Login Button
        _buildLoginButton(onPressed: _handleEmailLogin),
      ],
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    bool isPassword = false,
    TextInputType? keyboardType,
    int? maxLength,
    List<TextInputFormatter>? inputFormatters,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: const Color(0xFF64748B),
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          obscureText: isPassword && !_showPassword,
          keyboardType: keyboardType,
          maxLength: maxLength,
          inputFormatters: inputFormatters,
          style: GoogleFonts.inter(fontSize: 15),
          decoration: InputDecoration(
            hintText: hint,
            counterText: '',
            prefixIcon: Padding(
              padding: const EdgeInsets.only(left: 16, right: 12),
              child: Icon(icon, size: 22, color: const Color(0xFF94A3B8)),
            ),
            suffixIcon: isPassword
                ? IconButton(
                    icon: Icon(
                      _showPassword
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                      color: const Color(0xFF94A3B8),
                      size: 22,
                    ),
                    onPressed: () =>
                        setState(() => _showPassword = !_showPassword),
                  )
                : null,
          ),
        ),
      ],
    );
  }

  Widget _buildLoginButton({required VoidCallback onPressed}) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: Container(
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF10B981), Color(0xFF22C55E)],
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: AppTheme.primaryEmerald.withValues(alpha: 0.3),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: ElevatedButton(
          onPressed: _loading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.transparent,
            shadowColor: Colors.transparent,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
          child: _loading
              ? const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    color: Colors.white,
                  ),
                )
              : Text(
                  'Login',
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
        ),
      ),
    );
  }
}
