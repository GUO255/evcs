#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
script="$script_dir/import-traffic-parquet.sh"
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
grep -q -- '--directory' <<<"$help_output" || fail "help should describe --directory"
grep -q -- '--keep-stage' <<<"$help_output" || fail "help should describe --keep-stage"
if grep -q -- '--date' <<<"$help_output"; then
  fail "help should not require --date"
fi

mock_bin="$test_root/bin"
mock_log="$test_root/client-log"
parquet_dir="$test_root/parquet"
mkdir -p "$mock_bin" "$parquet_dir"

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
cat >"$MOCK_CLICKHOUSE_LOG/call-$count.stdin"
MOCK
chmod +x "$mock_bin/clickhouse-client"

touch "$parquet_dir/unfinished.parquet.tmp"
expect_failure env PATH="$mock_bin:$PATH" MOCK_CLICKHOUSE_LOG="$mock_log" \
  bash "$script" --directory "$parquet_dir"
[[ ! -e "$mock_log/count" ]] || fail "temporary files should block ClickHouse calls"
rm "$parquet_dir/unfinished.parquet.tmp"

expect_failure env PATH="$mock_bin:$PATH" MOCK_CLICKHOUSE_LOG="$mock_log" \
  bash "$script" --directory "$parquet_dir"
[[ ! -e "$mock_log/count" ]] || fail "an empty directory should block ClickHouse calls"

printf 'second parquet\n' >"$parquet_dir/b.parquet"
printf 'first parquet\n' >"$parquet_dir/a.parquet"

env PATH="$mock_bin:$PATH" MOCK_CLICKHOUSE_LOG="$mock_log" \
  bash "$script" --directory "$parquet_dir" \
  >"$test_root/import.stdout" 2>"$test_root/import.stderr"

[[ "$(<"$mock_log/count")" == "3" ]] || fail "expected one truncate and two import calls"
for args_file in "$mock_log"/call-*.args; do
  if grep -q -- '--ask-password' "$args_file"; then
    fail "batch ClickHouse calls should reuse the configured password without prompting"
  fi
done
grep -q 'TRUNCATE TABLE traffic.traffic_grid_1h_stage' "$mock_log/call-1.args" || \
  fail "the first ClickHouse call should truncate staging"
cmp "$parquet_dir/a.parquet" "$mock_log/call-2.stdin" || fail "a.parquet should be imported first"
cmp "$parquet_dir/b.parquet" "$mock_log/call-3.stdin" || fail "b.parquet should be imported second"
grep -q "toStartOfHour(toTimeZone(gps_time, 'Asia/Shanghai'))" "$mock_log/call-2.args" || \
  fail "the import should derive the time window from gps_time"
import_args="$mock_log/call-2.args"
grep -q 'INSERT INTO traffic.traffic_grid_1h_stage' "$import_args" || \
  fail "the import should target the staging table"
grep -q 'small_new_energy_vehicle_state' "$import_args" || \
  fail "the import should target the small new-energy state column"
grep -q 'large_new_energy_vehicle_state' "$import_args" || \
  fail "the import should target the large new-energy state column"
grep -q 'uniqExactIfState' "$import_args" || \
  fail "the import should build conditional exact states"
grep -q 'is_small_new_energy' "$import_args" || \
  fail "the import should classify small new-energy plates"
grep -q 'is_large_new_energy' "$import_args" || \
  fail "the import should classify large new-energy plates"
grep -Fq "match(substringUTF8(serial, 2, 5), '^[0-9]{5}$')" "$import_args" || \
  fail "small new-energy plates should allow energy letter plus five digits"
grep -Fq "match(substringUTF8(serial, 3, 4), '^[0-9]{4}$')" "$import_args" || \
  fail "small new-energy plates should allow a second letter plus four digits"
grep -Fq "match(substringUTF8(serial, 1, 5), '^[0-9]{5}$')" "$import_args" || \
  fail "large new-energy plates should require five leading digits"
if grep -q 'valid_province' "$import_args"; then
  fail "the import should not maintain a province abbreviation allowlist"
fi
if grep -q 'WHERE data_date' "$mock_log/call-2.args"; then
  fail "the import should not filter a command-line date"
fi
grep -q '成功导入 2 个 Parquet 文件' "$test_root/import.stdout" || fail "success summary is missing"

rm -rf "$mock_log"
env PATH="$mock_bin:$PATH" MOCK_CLICKHOUSE_LOG="$mock_log" \
  bash "$script" --directory "$parquet_dir" --keep-stage \
  >"$test_root/keep-stage.stdout" 2>"$test_root/keep-stage.stderr"

[[ "$(<"$mock_log/count")" == "2" ]] || fail "--keep-stage should skip the truncate call"
if grep -q 'TRUNCATE TABLE' "$mock_log"/call-*.args; then
  fail "--keep-stage should not truncate staging"
fi
cmp "$parquet_dir/a.parquet" "$mock_log/call-1.stdin" || fail "--keep-stage should import a.parquet first"
cmp "$parquet_dir/b.parquet" "$mock_log/call-2.stdin" || fail "--keep-stage should import b.parquet second"
grep -q '保留 staging' "$test_root/keep-stage.stdout" || fail "--keep-stage warning is missing"

echo "PASS: import-traffic-parquet.sh"
