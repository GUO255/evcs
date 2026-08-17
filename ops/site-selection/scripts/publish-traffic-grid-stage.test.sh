#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
script="$script_dir/publish-traffic-grid-stage.sh"
test_root="$(mktemp -d)"
trap 'rm -rf "$test_root"' EXIT

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

expect_failure() {
  if "$@" >"$test_root/stdout" 2>"$test_root/stderr"; then
    fail "command unexpectedly succeeded: $*"
  fi
}

help_output="$(bash "$script" --help)" || fail "--help should succeed"
grep -q '自动发布' <<<"$help_output" || fail "help should describe automatic publishing"

mock_bin="$test_root/bin"
mock_log="$test_root/client-log"
mkdir -p "$mock_bin"

cat >"$mock_bin/clickhouse-client" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$MOCK_CLICKHOUSE_LOG"
count_file="$MOCK_CLICKHOUSE_LOG/count"
count=0
[[ ! -f "$count_file" ]] || count="$(<"$count_file")"
count=$((count + 1))
printf '%s' "$count" >"$count_file"
printf '%s\n' "$*" >"$MOCK_CLICKHOUSE_LOG/call-$count.args"

if [[ "$*" == *"SELECT DISTINCT toYYYYMMDD(window_start)"* ]]; then
  printf '%s' "${MOCK_PARTITIONS-20260115
20260116
}"
fi

if [[ -n "${MOCK_FAIL_PARTITION-}" ]] &&
  [[ "$*" == *"REPLACE PARTITION tuple('henan_mvp', $MOCK_FAIL_PARTITION)"* ]]; then
  exit 1
fi
MOCK
chmod +x "$mock_bin/clickhouse-client"

locked_tmp="$test_root/locked-tmp"
locked_log="$test_root/locked-log"
mkdir -p "$locked_tmp/evcs-traffic-grid-publish-henan_mvp.lock"
expect_failure env PATH="$mock_bin:$PATH" MOCK_CLICKHOUSE_LOG="$locked_log" TMPDIR="$locked_tmp" \
  bash "$script"
[[ ! -e "$locked_log/count" ]] || fail "an existing publisher lock should prevent ClickHouse calls"

runtime_tmp="$test_root/runtime-tmp"
mkdir -p "$runtime_tmp"
env PATH="$mock_bin:$PATH" MOCK_CLICKHOUSE_LOG="$mock_log" TMPDIR="$runtime_tmp" \
  bash "$script" >"$test_root/publish.stdout" 2>"$test_root/publish.stderr"

[[ "$(<"$mock_log/count")" == "3" ]] || fail "expected one discovery query and two replacements"
grep -q "REPLACE PARTITION tuple('henan_mvp', 20260115)" "$mock_log/call-2.args" || \
  fail "the first discovered partition should be published"
grep -q "REPLACE PARTITION tuple('henan_mvp', 20260116)" "$mock_log/call-3.args" || \
  fail "the second discovered partition should be published"
grep -q '所有 staging 日期分区均已发布' "$test_root/publish.stdout" || \
  fail "success summary is missing"
[[ ! -e "$runtime_tmp/evcs-traffic-grid-publish-henan_mvp.lock" ]] || \
  fail "a successful publisher should release its lock"

failure_log="$test_root/failure-log"
expect_failure env PATH="$mock_bin:$PATH" MOCK_CLICKHOUSE_LOG="$failure_log" \
  MOCK_FAIL_PARTITION="20260116" TMPDIR="$runtime_tmp" bash "$script"
[[ "$(<"$failure_log/count")" == "3" ]] || fail "publisher should stop at the failed replacement"
grep -q '发布分区失败：20260116' "$test_root/stderr" || fail "partition failure should be explicit"

empty_log="$test_root/empty-log"
expect_failure env PATH="$mock_bin:$PATH" MOCK_CLICKHOUSE_LOG="$empty_log" MOCK_PARTITIONS="" \
  TMPDIR="$runtime_tmp" bash "$script"
[[ "$(<"$empty_log/count")" == "1" ]] || fail "empty staging should not issue replacements"
grep -q '没有可发布的分区' "$test_root/stderr" || fail "empty staging error is missing"

echo "PASS: publish-traffic-grid-stage.sh"
