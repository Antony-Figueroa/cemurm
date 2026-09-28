#!/usr/bin/env bash
#
# check-visual-contract.sh -- enforcement gate for the CEMURM visual system.
#
# WHAT THIS IS FOR
# The visual system defines a small, deliberate token palette and a chrome-free
# projector surface. Those rules are only real if something refuses to let them
# drift. This script is that something. It runs in CI between `pnpm lint` and
# `pnpm test`, and it is runnable locally.
#
# HOW TO SET A RULE ENFORCING OR REPORT-ONLY
# Every rule is driven by ONE declaration in the RULE MODES block below. Set a
# rule's value to one of three modes and the runner changes behaviour with no
# other edit:
#
#   enforcing  A count above 0 fails the script (exit 1). Every finding is
#              listed with file and line. Use when the correct count is 0 today.
#   ratchet    A report-only rule with an enforced ceiling. The current count
#              is tolerated, but exceeding RATCHET_*_MAX fails. Use when the
#              rule is right in principle, false today, and the existing debt
#              must not grow. Lower the ceiling as the debt is paid down.
#   report     Printed with its count, never fails. Visibility only.
#
# The mode and the ceiling for a rule sit in the same block on purpose: a
# reviewer should never have to look in two places to learn whether a rule can
# fail. When a report-only or ratchet count reaches 0, promote that rule to
# `enforcing` and delete its ceiling. That promotion is the point of the count.
#
# SCOPE
# Colours are scanned in src/ only. The sanctioned home for a raw colour
# literal is the token declaration in tailwind.config.js and the token
# stylesheet the skill owns; neither is scanned, by design.
#
# DEPENDENCIES
# bash and grep only. No package installs, no test runner, no build step. This
# gate must stay cheaper and more reliable than the thing it guards.
#
# USAGE
#   bash scripts/check-visual-contract.sh
#   ./scripts/check-visual-contract.sh
#   pnpm check:visual
# Resolves every path from the script location, so it runs from any cwd.

set -euo pipefail

# ---------------------------------------------------------------------------
# RULE MODES  -- the single obvious declaration per rule
# ---------------------------------------------------------------------------
RULE_01A_RAW_COLOUR_LITERALS=enforcing
RULE_01B_TAILWIND_PALETTE=ratchet
RULE_02_DEAD_ACCENTS=ratchet
RULE_03_OVERLAY_CHROME=enforcing
RULE_04_PALETTE_GROWTH=enforcing
REPORT_STAGEMODE_CHROME=report
REPORT_CONFIG_TOKEN_COUNT=report

# ---------------------------------------------------------------------------
# RATCHET CEILINGS  -- measured baseline, may only fall
# ---------------------------------------------------------------------------
# Measured against the working tree on the branch this gate landed on. Re-run
# the script after lowering one; the printed count is the number to compare.
#
# 82 occurrences across 5 files: bg-black, text-white/*, border-white/*,
# text-red-400. Tailwind's built-in palette, so they bypass the token layer
# without ever being a "raw literal" in the CSS sense. Rule 01A covers raw
# literals; this rule covers the token bypass.
RATCHET_01B_MAX=82
# 252 occurrences across 35 files, as the Tailwind class form
# (cem-rose 177, cem-emerald 68, cem-sky 7, cem-coral 0). NOT zero: these four
# accents are declared in tailwind.config.js and used across the UI, they are
# simply no longer part of the intended palette. Retiring them is a source
# migration across 35 files, not a gate change, so this ceiling is what stops
# the palette from growing until that migration lands.
RATCHET_02_MAX=252

# ---------------------------------------------------------------------------
# ALLOWLISTS  -- named exceptions, each with a reason
# ---------------------------------------------------------------------------
# Rule 03: the projector surface must stay chrome-free. One exception exists.
# Format: <file>|<utility>. Keep the reason above the entry.
#
# OverlayView.jsx rounded-full on the "N / M" position chip (line 38). A
# bounded, data-bearing counter badge, not decorative furniture. It carries no
# shadow, no gradient and no backdrop filter, which are the three things that
# actually degrade through a projector and an H.264 encode. Removing it is a
# visual change on a live streaming surface and belongs in a deliberate design
# change, not in a gate.
OVERLAY_CHROME_ALLOWLIST=(
  "src/features/stage/components/OverlayView.jsx|rounded-full"
)

# Rule 04: the token palette may not silently grow. Every colour key that
# exists today is listed, so adding a fifth accent -- or renaming one -- fails
# the gate and becomes a deliberate, reviewable act. This is the current
# palette: 16 leaves (11 flat under cem, 5 under cem.stage).
TAILWIND_COLOUR_KEY_ALLOWLIST=(
  "cem.base"
  "cem.surface"
  "cem.elevated"
  "cem.hover"
  "cem.text"
  "cem.secondary"
  "cem.amber"
  "cem.coral"
  "cem.emerald"
  "cem.rose"
  "cem.sky"
  "cem.stage.bg"
  "cem.stage.chord"
  "cem.stage.lyric"
  "cem.stage.section"
  "cem.stage.dim"
)

# ---------------------------------------------------------------------------
# PATH RESOLUTION  -- independent of the caller's working directory
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(CDPATH='' cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(CDPATH='' cd -- "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

SRC_DIR="src"
TAILWIND_CONFIG="tailwind.config.js"
STAGEMODE_PAGE="src/features/stage/pages/StageMode.jsx"
OVERLAY_FILES=(
  "src/features/stage/pages/Overlay.jsx"
  "src/features/stage/components/OverlayView.jsx"
)

FINDINGS_MAX=10
SOURCE_INCLUDES=(--include='*.js' --include='*.jsx' --include='*.ts'
  --include='*.tsx' --include='*.css' --include='*.html')

TMP_DIR="$(mktemp -d)"
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

for required in "$SRC_DIR" "$TAILWIND_CONFIG"; do
  if [ ! -e "$required" ]; then
    printf 'FAIL  setup    expected path missing: %s\n' "$required" >&2
    printf 'FAIL  setup    run this from a CEMURM checkout, not a partial copy\n' >&2
    exit 1
  fi
done

FAILURES=0
PASSED=0

# ---------------------------------------------------------------------------
# OUTPUT
# ---------------------------------------------------------------------------
pass() { printf 'PASS  %-4s %-50s %s\n' "$1" "$2" "$3"; }
fail() { printf 'FAIL  %-4s %-50s %s\n' "$1" "$2" "$3"; }
warn() { printf 'WARN  %-4s %-50s %s\n' "$1" "$2" "$3"; }
note() { printf '        %s\n' "$1"; }

# show_findings <findings-file>
# A failing or warning check must name the offending file and line.
show_findings() {
  local file="$1" total shown
  total="$(grep -c '' "$file" 2>/dev/null || true)"
  [ "$total" -gt 0 ] || return 0
  shown=0
  while IFS= read -r hit; do
    shown=$((shown + 1))
    if [ "$shown" -le "$FINDINGS_MAX" ]; then
      note "$hit"
    fi
  done <"$file"
  if [ "$total" -gt "$FINDINGS_MAX" ]; then
    note "... and $((total - FINDINGS_MAX)) more"
  fi
}

# scan <pattern> <path> -> writes findings, echoes the match count
scan() {
  local pattern="$1" target="$2" count
  : >"$TMP_DIR/findings"
  grep -rnoE "${SOURCE_INCLUDES[@]}" -e "$pattern" "$target" 2>/dev/null \
    >"$TMP_DIR/findings" || true
  count="$(grep -c '' "$TMP_DIR/findings" 2>/dev/null || true)"
  printf '%s' "$count"
}

# verify <id> <mode> <label> <count> [ceiling] -> 0 if not failing, 1 if failing
# The single dispatch point that turns a mode into pass / fail / warn. It also
# owns the FAILURES/PASSED accounting, so changing a mode can never silently
# stop the gate from failing.
verify() {
  local id="$1" mode="$2" label="$3" count="$4" ceiling="${5:-}"
  local noun="occurrences"
  [ "$count" -eq 1 ] && noun="occurrence"

  case "$mode" in
    enforcing)
      if [ "$count" -eq 0 ]; then
        pass "$id" "$label" "0 $noun"
        PASSED=$((PASSED + 1))
        return 0
      fi
      fail "$id" "$label" "$count $noun"
      show_findings "$TMP_DIR/findings"
      FAILURES=$((FAILURES + 1))
      return 1
      ;;
    ratchet)
      if [ "$count" -le "$ceiling" ]; then
        warn "$id" "$label" "$count $noun (ceiling $ceiling)"
        PASSED=$((PASSED + 1))
        return 0
      fi
      fail "$id" "$label" "$count $noun, over ceiling $ceiling by $((count - ceiling))"
      show_findings "$TMP_DIR/findings"
      # A ratchet overage is a delta against a baseline, not a short list, so the
      # first N findings are usually pre-existing debt and hide the new one.
      note "the $((count - ceiling)) new occurrence(s) are mixed in with the $ceiling already tolerated."
      note "narrow it down with the rule's own pattern, or diff against the commit that set the ceiling."
      FAILURES=$((FAILURES + 1))
      return 1
      ;;
    report)
      warn "$id" "$label" "$count $noun (report-only, does not fail)"
      PASSED=$((PASSED + 1))
      return 0
      ;;
    *)
      fail "$id" "$label" "unknown mode '$mode' in the RULE MODES block"
      FAILURES=$((FAILURES + 1))
      return 1
      ;;
  esac
}

printf 'visual contract gate  repo: %s\n\n' "$REPO_ROOT"

# ---------------------------------------------------------------------------
# RULE 01A -- no raw colour literals in src/
# ---------------------------------------------------------------------------
# Hex: 4, 6 and 8 digits, plus 3 digits containing at least one a-f. The
# 3-digit form deliberately requires a letter. src/ carries ~200 "#NN" work
# item references in comments (Hito 4 #151, Hito 5 #66, PR#2b); a 3-digit
# all-numeric token is indistinguishable from a ticket number, and a gate that
# blocks CI on `issue #151` is a gate that gets bypassed. Every real colour
# literal in this repo is 6 digits.
# Functions: rgb/rgba/hsl/hsla/oklch/oklab/lab/lch/hwb/color-mix, anchored on a
# non-word preceding character so identifiers ending in those letters are not
# false positives -- `optimisticCollab(` in src/data/repositories/setlists.js
# is the case that forced the anchor.
HEX_PATTERN='#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{4}\b|#[a-fA-F][0-9a-fA-F]{2}\b|#[0-9][a-fA-F][0-9]\b|#[0-9]{2}[a-fA-F]\b'
FN_PATTERN='(^|[^A-Za-z0-9_-])(oklch|oklab|lab|lch|hwb|color-mix|rgba?|hsla?)\('
: >"$TMP_DIR/findings"
grep -rnoE "${SOURCE_INCLUDES[@]}" -e "$HEX_PATTERN" -e "$FN_PATTERN" \
  "$SRC_DIR" >"$TMP_DIR/findings" 2>/dev/null || true
count_01a="$(grep -c '' "$TMP_DIR/findings" 2>/dev/null || true)"
verify 01a "$RULE_01A_RAW_COLOUR_LITERALS" \
  "no raw colour literals in src/" "$count_01a" || true

# ---------------------------------------------------------------------------
# RULE 01B -- no Tailwind default-palette utilities in src/
# ---------------------------------------------------------------------------
# bg-black, text-white/70, border-white/20: hardcoded values wearing utility
# syntax. They bypass the token layer without tripping rule 01A.
PALETTE_PATTERN='(^|[^A-Za-z0-9_-])(bg|text|border|ring|fill|stroke|shadow|divide|outline|decoration|accent|caret|placeholder|from|via|to)-(black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(-[0-9]{2,3})?(/[0-9]{1,3})?\b'
count_01b="$(scan "$PALETTE_PATTERN" "$SRC_DIR")"
verify 01b "$RULE_01B_TAILWIND_PALETTE" \
  "no Tailwind default-palette utilities in src/" "$count_01b" \
  "$RATCHET_01B_MAX" || true

# ---------------------------------------------------------------------------
# RULE 02 -- the four dead accents
# ---------------------------------------------------------------------------
# Both syntaxes count, because both are "use of the accent": the JS object form
# `cem.rose` and the Tailwind class form `cem-rose`. The class form is the one
# that actually appears in JSX, and it is the one a future migration will have
# to find.
DEAD_ACCENT_PATTERN='\bcem[-.](coral|emerald|rose|sky)\b'
count_02="$(scan "$DEAD_ACCENT_PATTERN" "$SRC_DIR")"
verify 02 "$RULE_02_DEAD_ACCENTS" \
  "no use of the four dead accents in src/" "$count_02" \
  "$RATCHET_02_MAX" || true

# ---------------------------------------------------------------------------
# RULE 03 -- the projector surface stays chrome-free
# ---------------------------------------------------------------------------
# No rounded*, shadow*, backdrop-* or gradient* in the OBS overlay files.
# Comment lines are filtered out, and that is the whole reason the rule is
# written this way: these files are ABOUT being chrome-free, so a future
# maintainer will very plausibly write "no rounded corners here" in a comment,
# and a gate that blocks CI on its own documentation gets bypassed. Filtering
# comments instead of scoping to `className` also means a class name held in a
# variable, or a className spread over several lines, is still caught.
# Allowlisted hits are printed, not silently dropped, so an exception is always
# visible in the CI log.
CHROME_PATTERN='(rounded|shadow|backdrop|gradient)'
# The `^[^:]*:[0-9]+:` prefix is load-bearing. grep -nH emits
# "src/.../Overlay.jsx:53:// comment" before this filter runs, so an anchor that
# ignores the filename never matches and every comment line survives. Keep the
# prefix in step with the grep flags above.
COMMENT_PATTERN='^[^:]*:[0-9]+:[[:space:]]*(//|/\*|\*|<!--|\{/\*)'
: >"$TMP_DIR/findings"
: >"$TMP_DIR/unexcused"
: >"$TMP_DIR/allowlisted"
for overlay in "${OVERLAY_FILES[@]}"; do
  if [ ! -e "$overlay" ]; then
    fail 03 "projector surface stays chrome-free" "expected file missing: $overlay"
    FAILURES=$((FAILURES + 1))
    continue
  fi
  # -H forces the filename prefix; without it grep omits it for a single file.
  # -o is deliberately NOT used: it would truncate the finding to the matched
  # span (`className="rounded`), which loses the utility suffix the allowlist
  # match needs and shows the reviewer a useless fragment.
  grep -nHE -e "$CHROME_PATTERN" "$overlay" 2>/dev/null \
    | grep -vE -e "$COMMENT_PATTERN" >>"$TMP_DIR/findings" || true
done
while IFS= read -r hit; do
  [ -n "$hit" ] || continue
  hit_file="${hit%%:*}"
  hit_rest="${hit#*:}"
  hit_line="${hit_rest%%:*}"
  hit_text="${hit_rest#*:}"
  excused=0
  for entry in "${OVERLAY_CHROME_ALLOWLIST[@]}"; do
    entry_file="${entry%%|*}"
    entry_token="${entry##*|}"
    if [ "$hit_file" = "$entry_file" ] \
      && printf '%s' "$hit_text" | grep -q -- "$entry_token"; then
      excused=1
      break
    fi
  done
  if [ "$excused" -eq 1 ]; then
    printf 'allowlisted: %s:%s: %s\n' "$hit_file" "$hit_line" "$entry_token" \
      >>"$TMP_DIR/allowlisted"
  else
    printf '%s:%s: %s\n' "$hit_file" "$hit_line" "$hit_text" \
      >>"$TMP_DIR/unexcused"
  fi
done <"$TMP_DIR/findings"
count_03="$(grep -c '' "$TMP_DIR/unexcused" 2>/dev/null || true)"
raw_03="$(grep -c '' "$TMP_DIR/findings" 2>/dev/null || true)"
allowed_03="$(grep -c '' "$TMP_DIR/allowlisted" 2>/dev/null || true)"
# verify decides pass/fail from RULE_03_OVERLAY_CHROME, exactly like every other
# rule, so flipping that declaration to `report` genuinely downgrades rule 03.
# It reads $TMP_DIR/findings for the failure listing, so hand it the unexcused
# set; the allowlisted hits are printed separately below, never silently
# dropped.
cp "$TMP_DIR/unexcused" "$TMP_DIR/findings"
verify 03 "$RULE_03_OVERLAY_CHROME" \
  "projector surface stays chrome-free" "$count_03" || true
note "overlay chrome: $raw_03 hit(s) in the OBS files, $allowed_03 allowlisted, $count_03 unexcused"
if [ "$allowed_03" -gt 0 ]; then
  while IFS= read -r line; do note "$line"; done <"$TMP_DIR/allowlisted"
fi

# ---------------------------------------------------------------------------
# RULE 04 -- the token palette may not silently grow
# ---------------------------------------------------------------------------
# Every colour key declared in tailwind.config.js must be allowlisted. Only keys
# whose value is a hex literal are collected, which makes the scan immune to
# the nesting: in this config every hex is a colour token, and a new namespace
# (a fifth accent, or a second scale) is caught as reliably as a new leaf.
: >"$TMP_DIR/keys"
: >"$TMP_DIR/findings"
leaf_regex='^[[:space:]]*([A-Za-z0-9_]+)[[:space:]]*:[[:space:]]*["'"'"'`]#'
ns_regex='^[[:space:]]*([A-Za-z0-9_]+)[[:space:]]*:[[:space:]]*\{'

# The dotted key path is accumulated in a plain string ("cem.", then
# "cem.stage.") and popped a segment at a time, rather than tracked in a bash
# array. An array is the obvious choice and it is wrong here: reading the array
# from inside a function during this loop observes it as empty, so every key
# resolved to a bare leaf name and the allowlist never matched. A string is
# also one fewer moving part to reason about in a gate.
prefix=""
in_colors=0
lineno=0
while IFS= read -r line; do
  lineno=$((lineno + 1))
  if [ "$in_colors" -eq 0 ]; then
    if [[ "$line" =~ colors:[[:space:]]*\{ ]]; then in_colors=1; fi
    continue
  fi
  if [[ "$line" =~ $leaf_regex ]]; then
    leaf="${BASH_REMATCH[1]}"
    path="${prefix}${leaf}"
    printf '%s\n' "$path" >>"$TMP_DIR/keys"
    if ! printf '%s\n' "${TAILWIND_COLOUR_KEY_ALLOWLIST[@]}" | grep -qx -- "$path"; then
      printf '%s:%s: undeclared colour key "%s"\n' \
        "$TAILWIND_CONFIG" "$lineno" "$path" >>"$TMP_DIR/findings"
    fi
    continue
  fi
  if [[ "$line" =~ $ns_regex ]]; then
    prefix="${prefix}${BASH_REMATCH[1]}."
    continue
  fi
  if [ "${line//[^}]/}" != "$line" ] && [ -n "$prefix" ]; then
    prefix="${prefix%.*}."
  fi
done <"$TAILWIND_CONFIG"

count_04="$(grep -c '' "$TMP_DIR/findings" 2>/dev/null || true)"
verify 04 "$RULE_04_PALETTE_GROWTH" \
  "no undeclared colour keys in $TAILWIND_CONFIG" "$count_04" || true

# ---------------------------------------------------------------------------
# REPORT-ONLY -- StageMode.jsx chrome
# ---------------------------------------------------------------------------
# The musician's tablet surface. Rounded corners and shadows are legitimate
# there (it is a touch target, not a projection), so it is explicitly out of
# rule 03's scope. Tracked so the count stays visible and can be ratcheted down
# separately from the projector surface.
stagemode_rounded=0
stagemode_shadow=0
if [ -e "$STAGEMODE_PAGE" ]; then
  stagemode_rounded="$(grep -cE 'rounded' "$STAGEMODE_PAGE" 2>/dev/null || true)"
  stagemode_shadow="$(grep -cE 'shadow' "$STAGEMODE_PAGE" 2>/dev/null || true)"
else
  note "expected file missing: $STAGEMODE_PAGE"
fi
: >"$TMP_DIR/findings"
verify r1 "$REPORT_STAGEMODE_CHROME" \
  "StageMode.jsx rounded* lines (out of rule 03 scope by design)" \
  "$stagemode_rounded" || true
note "StageMode.jsx: $stagemode_rounded rounded* line(s), $stagemode_shadow shadow* line(s)"

# ---------------------------------------------------------------------------
# REPORT-ONLY -- declared token count
# ---------------------------------------------------------------------------
# Distinct colour keys declared in tailwind.config.js. Paired with rule 04:
# rule 04 blocks a key that is not allowlisted, this reports the size of the
# palette so growth is visible in the log even when it is legitimate.
total_tokens="$(grep -c '' "$TMP_DIR/keys" 2>/dev/null || true)"
: >"$TMP_DIR/findings"
verify r2 "$REPORT_CONFIG_TOKEN_COUNT" \
  "distinct colour tokens in $TAILWIND_CONFIG" "$total_tokens" || true
note "token inventory: $(tr '\n' ' ' <"$TMP_DIR/keys")"

# ---------------------------------------------------------------------------
# SUMMARY
# ---------------------------------------------------------------------------
printf '\n'
if [ "$FAILURES" -gt 0 ]; then
  printf 'visual contract: FAILED  (%s failing, %s non-failing)\n' \
    "$FAILURES" "$PASSED"
  exit 1
fi
printf 'visual contract: OK  (%s rules checked, 0 failing)\n' "$PASSED"
exit 0
