#!/usr/bin/env bash
# Run the E2E suite repeatedly like a stream of real users.
#   scripts/e2e-loop.sh [RUNS] [GREP]
#   RUNS  number of iterations (default 10). Use "inf" to loop forever.
#   GREP  optional -g filter (e.g. "abuse" or "smoke")
#
# Each run's failures keep their video+trace+screenshot under tests/e2e/.artifacts
# and a per-run HTML report is copied to tests/e2e/report-runs/<n>/.
set -u
cd "$(dirname "$0")/.." || exit 1

RUNS="${1:-10}"
GREP="${2:-}"
STAMP="$(date +%Y%m%d-%H%M%S)"
LOG="tests/e2e/loop-$STAMP.log"
mkdir -p tests/e2e/report-runs
PASS=0; FAIL=0; i=0

echo "▶ E2E loop start ($STAMP) — RUNS=$RUNS GREP='${GREP:-<all>}'" | tee "$LOG"

while :; do
  i=$((i+1))
  [ "$RUNS" != "inf" ] && [ "$i" -gt "$RUNS" ] && break
  echo "── run $i ─────────────────────────────" | tee -a "$LOG"
  if [ -n "$GREP" ]; then
    npx playwright test -g "$GREP" >>"$LOG" 2>&1
  else
    npx playwright test >>"$LOG" 2>&1
  fi
  rc=$?
  if [ $rc -eq 0 ]; then
    PASS=$((PASS+1)); echo "  ✅ run $i passed" | tee -a "$LOG"
  else
    FAIL=$((FAIL+1)); echo "  ❌ run $i FAILED (rc=$rc) — artifacts kept" | tee -a "$LOG"
    [ -d tests/e2e/report ] && cp -R tests/e2e/report "tests/e2e/report-runs/$i" 2>/dev/null
  fi
done

echo "════════════════════════════════════════" | tee -a "$LOG"
echo "DONE: $PASS passed, $FAIL failed across $((i-1)) runs. Log: $LOG" | tee -a "$LOG"
echo "Replay a failure: npx playwright show-trace tests/e2e/.artifacts/**/trace.zip" | tee -a "$LOG"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
