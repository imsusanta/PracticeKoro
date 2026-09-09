import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';
import 'dashboard_screen.dart';
import 'exams_screen.dart';
import 'practice_drills_screen.dart';
import 'results_screen.dart';
import 'profile_screen.dart';

class MainShell extends StatefulWidget {
  final int initialIndex;

  const MainShell({super.key, this.initialIndex = 0});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  late int _selectedIndex;

  // Exact 5 pillars matching Web mobile navigation (studentNav)
  final List<_NavItem> _navItems = const [
    _NavItem(icon: Icons.home_rounded, label: 'Home'),
    _NavItem(icon: Icons.assignment_outlined, label: 'Exams'),
    _NavItem(icon: Icons.track_changes_rounded, label: 'Practice'),
    _NavItem(icon: Icons.bar_chart_rounded, label: 'Results'),
    _NavItem(icon: Icons.person_rounded, label: 'Profile'),
  ];

  @override
  void initState() {
    super.initState();
    _selectedIndex = widget.initialIndex;
  }

  void _onNavigateTab(int index) {
    if (index >= 0 && index < _navItems.length) {
      setState(() => _selectedIndex = index);
    }
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      DashboardScreen(onNavigateTab: _onNavigateTab),
      const ExamsScreen(),
      const PracticeDrillsScreen(),
      const ResultsScreen(),
      const ProfileScreen(),
    ];

    final isSmall = AppResponsive.isSmallPhone(context);

    return Scaffold(
      extendBody: true,
      body: IndexedStack(index: _selectedIndex, children: screens),
      bottomNavigationBar: SafeArea(
        child: ResponsiveCenter(
          maxWidth: 520,
          child: Padding(
            padding: EdgeInsets.fromLTRB(
              isSmall ? 10 : 14,
              0,
              isSmall ? 10 : 14,
              isSmall ? 6 : 10,
            ),
            child: Container(
              height: isSmall ? 62 : 68,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white.withValues(alpha: 0.8)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.08),
                  blurRadius: 24,
                  offset: const Offset(0, 6),
                ),
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: List.generate(_navItems.length, (i) {
                final item = _navItems[i];
                final selected = _selectedIndex == i;
                final colors = AppTheme.navColorSets[i];

                return Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedIndex = i),
                    behavior: HitTestBehavior.opaque,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          curve: Curves.easeOut,
                          width: isSmall ? 36 : 40,
                          height: isSmall ? 34 : 38,
                          transform: Matrix4.translationValues(
                            0,
                            selected ? -2 : 0,
                            0,
                          ),
                          decoration: BoxDecoration(
                            gradient: selected
                                ? LinearGradient(
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                    colors: colors,
                                  )
                                : null,
                            color: selected ? null : const Color(0xFFF1F5F9),
                            shape: BoxShape.circle,
                            boxShadow: selected
                                ? [
                                    BoxShadow(
                                      color: colors[0].withValues(alpha: 0.4),
                                      blurRadius: 10,
                                      offset: const Offset(0, 4),
                                    ),
                                  ]
                                : null,
                          ),
                          child: Center(
                            child: Icon(
                              item.icon,
                              size: isSmall ? 18 : 20,
                              color: selected
                                  ? Colors.white
                                  : const Color(0xFF64748B),
                            ),
                          ),
                        ),
                        SizedBox(height: isSmall ? 2 : 3),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 2),
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              item.label,
                              maxLines: 1,
                              style: GoogleFonts.inter(
                                fontSize: isSmall ? 9.5 : 10,
                                fontWeight:
                                    selected ? FontWeight.w700 : FontWeight.w500,
                                color: selected ? colors[0] : const Color(0xFF94A3B8),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final String label;

  const _NavItem({required this.icon, required this.label});
}
