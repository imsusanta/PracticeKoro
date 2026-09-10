// Inject via: flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...
// Hardcoded values removed (P0-2). Fallbacks below are empty to fail fast in debug
// if defines are missing. Rotate the previously committed anon key in Supabase dashboard.
class SupabaseConfig {
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: '',
  );
  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: '',
  );

  static void assertConfigured() {
    assert(
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty,
      'Missing --dart-define SUPABASE_URL / SUPABASE_ANON_KEY',
    );
  }
}
