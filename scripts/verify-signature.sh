#!/usr/bin/env bash
# IAMUVIN signature gate. Platform-aware.
# Exit 0 = signed. Exit 1 = incomplete. Wire into CI.

set -uo pipefail
FAIL=0
EX=(--exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git
    --exclude-dir=dist --exclude-dir=build --exclude-dir=Pods
    --exclude-dir=.dart_tool --exclude-dir=vendor --exclude-dir=coverage
    --exclude=IAMUVIN-SIGNATURE.md --exclude=verify-signature.sh)

has()  { grep -rqI "${EX[@]}" -e "$1" . 2>/dev/null; }
any()  { for pat in "$@"; do has "$pat" && return 0; done; return 1; }
pass() { printf '  PASS  %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; FAIL=1; }
skip() { printf '  SKIP  %s\n' "$1"; }

# --- platform detection ---
WEB=0; NATIVE=0
if [ -f package.json ] || [ -f index.html ] || [ -f next.config.ts ]; then WEB=1; fi
if [ -f pubspec.yaml ] || [ -f build.gradle ] || [ -f build.gradle.kts ]; then NATIVE=1; fi
if ls -d ./*.xcodeproj >/dev/null 2>&1 || [ -f Podfile ]; then NATIVE=1; fi
if [ "$WEB" -eq 0 ] && [ "$NATIVE" -eq 0 ]; then WEB=1; fi   # default to web rules

echo "IAMUVIN SIGNATURE GATE"
echo "platform: web=$WEB native=$NATIVE"
echo "----------------------"

# --- universal layers ---
if has "Built by Uvin Vindula"; then pass "attribution line"; else fail "attribution line"; fi
if any "iamuvin.com" "asiresearch.io" "terralabz.io" "uvin.lk"; then
  pass "hub URL"; else fail "hub URL"; fi

# --- runtime badge: chip form OR block form OR explicit native log tag ---
if any '%c IAMUVIN' '██╗ █████╗' 'Log.i("IAMUVIN"' \
  "name: 'IAMUVIN'" 'os_log("Built by Uvin Vindula'; then
  pass "runtime badge"; else fail "runtime badge"; fi

# --- web-only layers ---
if [ "$WEB" -eq 1 ]; then
  if any 'F7931A' 'f7931a'; then pass "accent token"; else fail "accent token"; fi
  if any 'name="author"' 'authors:' 'creator:'; then
    pass "head metadata"; else fail "head metadata"; fi
  if any '"author"' 'X-Built-By' 'humans.txt'; then
    pass "build artifacts"; else fail "build artifacts"; fi
else
  skip "accent token (native)"
  skip "head metadata (native)"
  if any 'built_by' 'Settings.bundle' 'About'; then
    pass "in-app credit surface"; else fail "in-app credit surface"; fi
fi

# --- anti-patterns: source files only, explicit patterns, locale-safe ---
HITS=$(grep -rnI "${EX[@]}" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --include="*.html" --include="*.dart" --include="*.kt" --include="*.swift" \
  --include="*.sol" --include="*.py" \
  -e 'console\.clear()' \
  -e 'Built by Uvin Vindula --' \
  -e 'Built by Uvin Vindula - ' \
  -e 'Made with love' \
  . 2>/dev/null || true)

if [ -n "$HITS" ]; then
  printf '  FAIL  anti-pattern:\n%s\n' "$HITS"; FAIL=1
else
  pass "no anti-patterns"
fi

echo "----------------------"
if [ "$FAIL" -eq 0 ]; then echo "SIGNED"; else echo "INCOMPLETE"; fi
exit "$FAIL"
