#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
script="$script_dir/process-road-segment-traffic-day.sh"
test_root="$(mktemp -d)"
cleanup() {
  local status=$?
  if (( status != 0 )); then
    [[ ! -f "$test_root/run.stdout" ]] || { echo "--- run.stdout" >&2; cat "$test_root/run.stdout" >&2; }
    [[ ! -f "$test_root/run.stderr" ]] || { echo "--- run.stderr" >&2; cat "$test_root/run.stderr" >&2; }
  fi
  rm -rf "$test_root"
}
trap cleanup EXIT

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

expect_failure() {
  if "$@" >"$test_root/failure.stdout" 2>"$test_root/failure.stderr"; then
    fail "command unexpectedly succeeded: $*"
  fi
}

help_output="$(bash "$script" --help)" || fail "--help should succeed"
grep -q -- '--date' <<<"$help_output" || fail "help should describe --date"
grep -q -- '--gps-root' <<<"$help_output" || fail "help should describe --gps-root"
grep -q -- '--restart' <<<"$help_output" || fail "help should describe --restart"

mock_bin="$test_root/bin"
mock_log="$test_root/log"
gps_root="$test_root/gps-output"
work_root="$test_root/work"
event_root="$test_root/events"
road_root="$test_root/roads"
traffic_date="2026-01-16"
input_dir="$gps_root/dt=$traffic_date"
mkdir -p "$mock_bin" "$mock_log" "$input_dir" "$road_root"
mkdir -p "$gps_root/.state"
touch "$input_dir/source-a-part-00001.parquet" "$input_dir/source-a-part-00002.parquet"
cat >"$gps_root/.state/source-a.success.json" <<'JSON'
{"source":{"id":"source-a"},"status":"success","completed_at":"2026-01-22T00:00:00Z","stats":{"outputFiles":2},"files":["dt=2026-01-16/source-a-part-00001.parquet","dt=2026-01-16/source-a-part-00002.parquet"]}
JSON
touch "$road_root/expressway.geojson" "$road_root/ordinary.geojson"

cat >"$mock_bin/duckdb" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
sql="$(cat)"
mkdir -p "$MOCK_LOG"
count_file="$MOCK_LOG/duckdb-count"
count=0
[[ ! -f "$count_file" ]] || count="$(<"$count_file")"
count=$((count + 1))
printf '%s' "$count" >"$count_file"
printf '%s\n' "$sql" >"$MOCK_LOG/duckdb-$count.sql"
case "$sql" in
  *"stage:success-marker"*)
    printf 'source-a|success|2|dt=2026-01-16/source-a-part-00001.parquet\n'
    printf 'source-a|success|2|dt=2026-01-16/source-a-part-00002.parquet\n'
    ;;
  *"stage:source-profile"*)
    printf '2|200|2026-01-16|2026-01-16|2026-01-15 16:00:00+00|2026-01-16 15:59:59+00|0|%s\n' "${MOCK_SOURCE_OUT_OF_DAY-0}"
    ;;
  *"stage:sorted-profile"*)
    printf '200|2026-01-16|2026-01-16|2026-01-15 16:00:00+00|2026-01-16 15:59:59+00|0|0\n'
    ;;
  *"stage:sort"*)
    output="$(sed -n "s/^TO '\([^']*\)'.*/\1/p" <<<"$sql" | head -n 1)"
    [[ -n "$output" ]] || exit 20
    mkdir -p "$(dirname "$output")"
    touch "$output"
    ;;
  *"stage:event-profile"*)
    printf '120|120|15|2026-01-16|2026-01-16|2026-01-15 16:00:00+00|2026-01-16 15:59:59+00|0|0\n'
    ;;
  *)
    exit 21
    ;;
esac
MOCK
chmod +x "$mock_bin/duckdb"

cat >"$mock_bin/clickhouse-client" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$MOCK_LOG"
printf '%s\n' "$*" >>"$MOCK_LOG/clickhouse.calls"
if [[ "$*" == *"FROM traffic.traffic_route_segment_1d"* ]]; then
  printf '2026-01-16\t15\t120\t80\t20\t12\n'
fi
MOCK
chmod +x "$mock_bin/clickhouse-client"

cat >"$mock_bin/gps-road-traffic" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$MOCK_LOG"
printf '%s\n' "$*" >>"$MOCK_LOG/gps-road.calls"
output=""
while (( $# > 0 )); do
  if [[ "$1" == "--output" ]]; then
    output="$2"
    break
  fi
  shift
done
[[ -n "$output" ]] || exit 30
mkdir -p "$(dirname "$output")"
touch "$output"
MOCK
chmod +x "$mock_bin/gps-road-traffic"

cat >"$mock_bin/replace-road" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$MOCK_LOG"
printf '%s\n' "$*" >>"$MOCK_LOG/replace.calls"
MOCK
chmod +x "$mock_bin/replace-road"

common_args=(
  --date "$traffic_date"
  --gps-root "$gps_root"
  --work-root "$work_root"
  --event-root "$event_root"
  --expressway "$road_root/expressway.geojson"
  --ordinary "$road_root/ordinary.geojson"
  --road-network-version henan-road-v1
  --matching-algorithm-version nearest-100m-v1
  --gps-road-traffic-bin "$mock_bin/gps-road-traffic"
  --replace-script "$mock_bin/replace-road"
)

env PATH="$mock_bin:$PATH" MOCK_LOG="$mock_log" \
  bash "$script" "${common_args[@]}" \
  >"$test_root/run.stdout" 2>"$test_root/run.stderr"

for stage in 0 1 2 3 4 5 6 7; do
  grep -q "阶段 $stage/7" "$test_root/run.stdout" || fail "stage $stage progress is missing"
done
sort_sql="$(grep -l 'ORDER BY vehicle_id, gps_time' "$mock_log"/duckdb-*.sql | head -n 1)"
[[ -n "$sort_sql" ]] || fail "DuckDB sort SQL was not recorded"
grep -q 'ORDER BY vehicle_id, gps_time' "$sort_sql" || \
  fail "DuckDB should globally sort by vehicle_id,gps_time"
grep -q "read_parquet('$input_dir/\*.parquet')" "$sort_sql" || \
  fail "DuckDB should read the selected date directory"
grep -q -- "--input $work_root/sorted/$traffic_date.parquet" "$mock_log/gps-road.calls" || \
  fail "road matching should read the sorted parquet"
grep -q -- "--output $event_root/$traffic_date.parquet.tmp" "$mock_log/gps-road.calls" || \
  fail "road matching should publish through a temporary event file"
grep -q -- "--input $event_root/$traffic_date.parquet" "$mock_log/replace.calls" || \
  fail "ClickHouse replacement should read the published event parquet"
grep -q -- "--traffic-date $traffic_date" "$mock_log/replace.calls" || \
  fail "ClickHouse replacement should target the selected day"
grep -q '单日道路车流处理完成' "$test_root/run.stdout" || fail "completion summary is missing"
[[ -f "$work_root/sorted/$traffic_date.parquet" ]] || fail "sorted parquet should be published"
[[ -f "$event_root/$traffic_date.parquet" ]] || fail "event parquet should be published"

# A rerun revalidates and reuses expensive local artifacts, then safely replaces
# the ClickHouse partition again.
duckdb_calls_before="$(<"$mock_log/duckdb-count")"
gps_calls_before="$(wc -l <"$mock_log/gps-road.calls" | tr -d ' ')"
env PATH="$mock_bin:$PATH" MOCK_LOG="$mock_log" \
  bash "$script" "${common_args[@]}" \
  >"$test_root/resume.stdout" 2>"$test_root/resume.stderr"
duckdb_calls_after="$(<"$mock_log/duckdb-count")"
gps_calls_after="$(wc -l <"$mock_log/gps-road.calls" | tr -d ' ')"
[[ "$((duckdb_calls_after - duckdb_calls_before))" == "4" ]] || \
  fail "a rerun should validate marker, source, sorted output, and events without sorting again"
[[ "$gps_calls_after" == "$gps_calls_before" ]] || fail "a rerun should reuse the event parquet"
grep -q '复用已有排序文件' "$test_root/resume.stdout" || fail "sorted reuse should be reported"
grep -q '复用已有事件文件' "$test_root/resume.stdout" || fail "event reuse should be reported"

# An unfinished GPS source blocks all expensive or external work.
touch "$input_dir/unfinished.parquet.tmp"
blocked_log="$test_root/blocked-log"
expect_failure env PATH="$mock_bin:$PATH" MOCK_LOG="$blocked_log" \
  bash "$script" "${common_args[@]}"
grep -q '存在未完成的 GPS Parquet 临时文件' "$test_root/failure.stderr" || \
  fail "temporary source failure should be explicit"
[[ ! -e "$blocked_log/duckdb-count" ]] || fail "blocked input should stop before DuckDB"
[[ ! -e "$blocked_log/replace.calls" ]] || fail "blocked input should stop before ClickHouse publication"
rm "$input_dir/unfinished.parquet.tmp"

# Missing converter completion markers block an otherwise readable date.
rm "$gps_root/.state/source-a.success.json"
marker_log="$test_root/marker-log"
expect_failure env PATH="$mock_bin:$PATH" MOCK_LOG="$marker_log" \
  bash "$script" "${common_args[@]}"
grep -q '缺少 GPS 转换完成标记' "$test_root/failure.stderr" || \
  fail "missing source completion marker should be explicit"
[[ ! -e "$marker_log/duckdb-count" ]] || fail "missing source marker should stop before DuckDB"
cat >"$gps_root/.state/source-a.success.json" <<'JSON'
{"source":{"id":"source-a"},"status":"success","completed_at":"2026-01-22T00:00:00Z","stats":{"outputFiles":2},"files":["dt=2026-01-16/source-a-part-00001.parquet","dt=2026-01-16/source-a-part-00002.parquet"]}
JSON

# The marker's declared shards must exactly match the actual date directory.
rm "$input_dir/source-a-part-00002.parquet"
shard_log="$test_root/shard-log"
expect_failure env PATH="$mock_bin:$PATH" MOCK_LOG="$shard_log" \
  bash "$script" "${common_args[@]}"
grep -q 'GPS 完成标记分片与目录不一致' "$test_root/failure.stderr" || \
  fail "missing declared shard should be explicit"
[[ ! -e "$shard_log/replace.calls" ]] || fail "incomplete source shards should stop before publication"
touch "$input_dir/source-a-part-00002.parquet"

# A source timestamp outside the requested Shanghai day is rejected before sorting.
time_log="$test_root/time-log"
expect_failure env PATH="$mock_bin:$PATH" MOCK_LOG="$time_log" MOCK_SOURCE_OUT_OF_DAY=1 \
  bash "$script" "${common_args[@]}" --restart
grep -q 'GPS 时间超出目标上海自然日' "$test_root/failure.stderr" || \
  fail "out-of-day source timestamps should be rejected"
[[ ! -e "$time_log/replace.calls" ]] || fail "out-of-day source should stop before publication"

# Reusing an event generated by another matcher version requires an explicit restart.
stale_log="$test_root/stale-log"
expect_failure env PATH="$mock_bin:$PATH" MOCK_LOG="$stale_log" \
  bash "$script" "${common_args[@]/nearest-100m-v1/nearest-100m-v2}"
grep -q -- '--restart' "$test_root/failure.stderr" || \
  fail "stale artifact failures should explain how to rebuild"
[[ ! -e "$stale_log/replace.calls" ]] || fail "stale events should not be published"

# --restart rebuilds only the selected day's local artifacts and forwards the
# ClickHouse connection/topology options to the partition replacement script.
touch "$work_root/sorted/2026-01-17.parquet" "$event_root/2026-01-17.parquet"
restart_log="$test_root/restart-log"
env PATH="$mock_bin:$PATH" MOCK_LOG="$restart_log" \
  bash "$script" "${common_args[@]}" --restart \
    --clickhouse-host clickhouse.internal \
    --clickhouse-port 9440 \
    --clickhouse-user traffic_writer \
    --clickhouse-database traffic \
    --clickhouse-cluster default \
  >"$test_root/restart.stdout" 2>"$test_root/restart.stderr"
[[ -f "$work_root/sorted/2026-01-17.parquet" ]] || fail "--restart must preserve other dates' sorted files"
[[ -f "$event_root/2026-01-17.parquet" ]] || fail "--restart must preserve other dates' event files"
[[ "$(wc -l <"$restart_log/gps-road.calls" | tr -d ' ')" == "1" ]] || \
  fail "--restart should rerun road matching for the selected date"
grep -q -- '--host clickhouse.internal' "$restart_log/replace.calls" || fail "ClickHouse host was not forwarded"
grep -q -- '--port 9440' "$restart_log/replace.calls" || fail "ClickHouse port was not forwarded"
grep -q -- '--user traffic_writer' "$restart_log/replace.calls" || fail "ClickHouse user was not forwarded"
grep -q -- '--database traffic' "$restart_log/replace.calls" || fail "ClickHouse database was not forwarded"
grep -q -- '--cluster default' "$restart_log/replace.calls" || fail "ClickHouse cluster was not forwarded"

echo "PASS: process-road-segment-traffic-day.sh"
