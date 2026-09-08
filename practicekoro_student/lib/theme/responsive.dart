import 'package:flutter/material.dart';

/// Centralized responsive layout helper for PracticeKoro mobile app.
/// Provides dynamic sizing, padding, and screen breakpoint detection
/// to ensure UI elements fit naturally on small phones (320px-360px),
/// standard smartphones (375px-414px), and tablets (600px+).
class AppResponsive {
  /// Screen width breakpoints
  static const double kSmallPhoneWidth = 360.0;
  static const double kTabletMinWidth = 600.0;
  static const double kMaxContentWidth = 640.0;

  /// Returns true for small/budget phones (<360px width, e.g. 320-350px)
  static bool isSmallPhone(BuildContext context) {
    return MediaQuery.sizeOf(context).width < kSmallPhoneWidth;
  }

  /// Returns true for standard phones (360px - 599px)
  static bool isStandardPhone(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    return width >= kSmallPhoneWidth && width < kTabletMinWidth;
  }

  /// Returns true for tablets or foldables (>= 600px width)
  static bool isTablet(BuildContext context) {
    return MediaQuery.sizeOf(context).width >= kTabletMinWidth;
  }

  /// Responsive horizontal page padding
  static double horizontalPadding(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    if (width < kSmallPhoneWidth) return 12.0;
    if (width >= kTabletMinWidth) return 24.0;
    return 16.0;
  }

  /// Responsive card internal padding
  static double cardPadding(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    if (width < kSmallPhoneWidth) return 14.0;
    if (width >= kTabletMinWidth) return 22.0;
    return 18.0;
  }

  /// Responsive gap / vertical spacing
  static double gap(BuildContext context, {double small = 8, double normal = 14, double large = 20}) {
    final width = MediaQuery.sizeOf(context).width;
    if (width < kSmallPhoneWidth) return small;
    if (width >= kTabletMinWidth) return large;
    return normal;
  }

  /// Responsive icon size multiplier
  static double iconScale(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    if (width < kSmallPhoneWidth) return 0.88;
    if (width >= kTabletMinWidth) return 1.15;
    return 1.0;
  }
}

/// A container that centers and constrains body content to a maximum readable width on tablets
class ResponsiveCenter extends StatelessWidget {
  final Widget child;
  final double maxWidth;
  final EdgeInsetsGeometry? padding;

  const ResponsiveCenter({
    super.key,
    required this.child,
    this.maxWidth = AppResponsive.kMaxContentWidth,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: padding != null
            ? Padding(padding: padding!, child: child)
            : child,
      ),
    );
  }
}
