import 'package:supabase_flutter/supabase_flutter.dart';

class AuthService {
  final SupabaseClient _client = Supabase.instance.client;

  SupabaseClient get client => _client;
  User? get currentUser => _client.auth.currentUser;
  bool get isLoggedIn => currentUser != null;

  // Email Login
  Future<AuthResponse> loginWithEmail({
    required String email,
    required String password,
  }) async {
    return await _client.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }

  // WhatsApp Login (pseudo-email approach)
  Future<AuthResponse> loginWithWhatsApp({
    required String whatsappNumber,
    required String password,
  }) async {
    final pseudoEmail = '$whatsappNumber@whatsapp.practicekoro.local';
    return await _client.auth.signInWithPassword(
      email: pseudoEmail,
      password: password,
    );
  }

  // Email Registration
  Future<AuthResponse> registerWithEmail({
    required String email,
    required String password,
    required String fullName,
  }) async {
    return await _client.auth.signUp(
      email: email,
      password: password,
      data: {'full_name': fullName},
    );
  }

  // WhatsApp Registration
  Future<AuthResponse> registerWithWhatsApp({
    required String whatsappNumber,
    required String password,
    required String fullName,
  }) async {
    final pseudoEmail = '$whatsappNumber@whatsapp.practicekoro.local';
    return await _client.auth.signUp(
      email: pseudoEmail,
      password: password,
      data: {
        'full_name': fullName,
        'whatsapp_number': whatsappNumber,
      },
    );
  }

  // Check if WhatsApp number exists
  Future<bool> whatsappNumberExists(String number) async {
    final data =
        await _client
            .from('profiles')
            .select('id')
            .eq('whatsapp_number', number)
            .maybeSingle();
    return data != null;
  }

  // Google Sign In
  Future<bool> loginWithGoogle() async {
    final response = await _client.auth.signInWithOAuth(
      OAuthProvider.google,
      redirectTo: 'io.supabase.practicekoro://login-callback/',
    );
    return response;
  }

  // Get profile
  Future<Map<String, dynamic>?> getProfile() async {
    if (currentUser == null) return null;
    final data =
        await _client
            .from('profiles')
            .select('*')
            .eq('id', currentUser!.id)
            .single();
    return data;
  }

  // Check if user has student role
  Future<bool> hasStudentRole() async {
    if (currentUser == null) return false;
    final data =
        await _client
            .from('user_roles')
            .select('role')
            .eq('user_id', currentUser!.id)
            .eq('role', 'student')
            .maybeSingle();
    return data != null;
  }

  // Logout
  Future<void> logout() async {
    await _client.auth.signOut();
  }

  // Listen to auth state
  Stream<AuthState> get authStateChanges => _client.auth.onAuthStateChange;
}
