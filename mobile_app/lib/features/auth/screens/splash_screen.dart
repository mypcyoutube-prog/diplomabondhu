import 'package:material_ui/material_ui.dart';
import 'package:go_router/go_router.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/theme/theme.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    // The router's redirect moves the user forward once auth state resolves;
    // this screen is the visual placeholder required by the UI guide (§4.1).
    Future.delayed(const Duration(milliseconds: 800), () {
      if (mounted && context.canPop() == false) {
        context.go('/resolve');
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      backgroundColor: DbColors.navy,
      body: Center(
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0.4, end: 1),
          duration: const Duration(milliseconds: 800),
          builder: (context, scale, child) => Transform.scale(
            scale: scale,
            child: Opacity(opacity: scale, child: child),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.school_rounded, color: DbColors.emerald, size: 72),
              const SizedBox(height: 16),
              Text(
                l10n.appTitle,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                l10n.tagline,
                style: const TextStyle(color: Colors.white70),
              ),
              const SizedBox(height: 32),
              const CircularProgressIndicator(color: DbColors.emerald),
            ],
          ),
        ),
      ),
    );
  }
}
