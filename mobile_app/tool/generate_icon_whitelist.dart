// Generates backend/src/core/icon-whitelist.generated.json from the real
// Flutter SDK Icons class. Run from mobile_app/ on a machine with Flutter:
//   dart run tool/generate_icon_whitelist.dart
//
// The script locates the Flutter SDK via FLUTTER_ROOT or the `flutter`
// executable on PATH, parses packages/flutter/lib/src/material/icons.dart,
// extracts every `static const IconData <name> = ...` entry and writes the
// sorted name list as JSON. The backend merges this list with its verified
// fallback allowlist and rejects any icon absent from both.
import 'dart:convert';
import 'dart:io';

void main() {
  final iconsFile = _locateIconsDotDart();
  if (iconsFile == null) {
    stderr.writeln('ERROR: Could not locate the Flutter SDK icons.dart.');
    stderr.writeln('Set FLUTTER_ROOT or ensure `flutter` is on PATH.');
    exit(1);
  }
  final source = iconsFile.readAsStringSync();
  final regex = RegExp(r'static\s+const\s+IconData\s+(\w+)\s*=');
  final names = regex
      .allMatches(source)
      .map((m) => m.group(1)!)
      .toSet()
      .toList()
    ..sort();
  if (names.length < 1000) {
    stderr.writeln('ERROR: Only ${names.length} icons extracted; '
        'expected >1000 from a real Flutter SDK. Aborting.');
    exit(1);
  }
  final scriptDir = File(Platform.script.toFilePath()).parent.path;
  final outPath = _normalize('$scriptDir/../../backend/src/core/icon-whitelist.generated.json');
  final file = File(outPath);
  file.writeAsStringSync(const JsonEncoder.withIndent('  ').convert({'icons': names}));
  stdout.writeln('Wrote ${names.length} icons to $outPath');
}

String _normalize(String p) => File(p).absolute.path;

File? _locateIconsDotDart() {
  final envRoot = Platform.environment['FLUTTER_ROOT'];
  if (envRoot != null) {
    final f = File(_normalize('$envRoot/packages/flutter/lib/src/material/icons.dart'));
    if (f.existsSync()) return f;
  }
  final exe = _findFlutterExecutable();
  if (exe != null) {
    var sdkBin = File(exe).parent.path;
    if (RegExp(r'\.bat$|\.exe$', caseSensitive: false).hasMatch(exe)) {
      sdkBin = sdkBin;
    }
    final f = File(_normalize('$sdkBin/../packages/flutter/lib/src/material/icons.dart'));
    if (f.existsSync()) return f;
    final cacheLink = File(_normalize('$sdkBin/cache'));
    if (cacheLink.existsSync()) {
      final f2 = File(_normalize('$sdkBin/../../packages/flutter/lib/src/material/icons.dart'));
      if (f2.existsSync()) return f2;
    }
  }
  return null;
}

String? _findFlutterExecutable() {
  final paths = (Platform.environment['PATH'] ?? '').split(Platform.isWindows ? ';' : ':');
  for (final dir in paths) {
    if (dir.isEmpty) continue;
    for (final name in Platform.isWindows ? ['flutter.bat', 'flutter.exe'] : ['flutter']) {
      final candidate = File(_normalize('$dir/$name'));
      if (candidate.existsSync()) return candidate.path;
    }
  }
  return null;
}
