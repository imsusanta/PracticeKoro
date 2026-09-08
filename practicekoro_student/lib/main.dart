import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'config/supabase_config.dart';
import 'theme/app_theme.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/main_shell.dart';
import 'screens/mistakes_notebook_screen.dart';
import 'screens/practice_drills_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set status bar style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );

  // Initialize Supabase
  await Supabase.initialize(
    url: SupabaseConfig.supabaseUrl,
    anonKey: SupabaseConfig.supabaseAnonKey,
  );

  runApp(const PracticeKoroApp());
}

class PracticeKoroApp extends StatelessWidget {
  const PracticeKoroApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PracticeKoro Student',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      builder: (context, child) {
        final mediaQueryData = MediaQuery.of(context);
        final clampedData = mediaQueryData.copyWith(
          textScaler: mediaQueryData.textScaler.clamp(
            minScaleFactor: 0.85,
            maxScaleFactor: 1.15,
          ),
        );
        return MediaQuery(
          data: clampedData,
          child: child ?? const SizedBox.shrink(),
        );
      },
      initialRoute: '/',
      routes: {
        '/': (context) => const SplashScreen(),
        '/login': (context) => const LoginScreen(),
        '/register': (context) => const RegisterScreen(),
        '/dashboard': (context) => const MainShell(initialIndex: 0),
        '/exams': (context) => const MainShell(initialIndex: 1),
        '/results': (context) => const MainShell(initialIndex: 2),
        '/notes': (context) => const MainShell(initialIndex: 3),
        '/profile': (context) => const MainShell(initialIndex: 4),
        '/mistakes': (context) => const MistakesNotebookScreen(),
        '/practice': (context) => const PracticeDrillsScreen(),
      },
    );
  }
}
