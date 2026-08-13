#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat <<'USAGE'
用法：
  process-road-segment-traffic-day.sh \
    --date YYYY-MM-DD \
    --expressway <高速路段GeoJSON> \
    --ordinary <普通道路段GeoJSON> \
    --road-network-version <版本> \
    --matching-algorithm-version <版本> \
    [--gps-root /mnt/gps-output] \
    [--work-root /mnt/gps-road-traffic-work] \
    [--event-root /mnt/traffic-events] \
    [--duckdb-threads 16] \
    [--duckdb-memory-limit 48GB] \
    [--duckdb-temp-size 1TB] \
    [--gps-road-traffic-bin <程序路径>] \
    [--replace-script <发布脚本路径>] \
    [--clickhouse-host HOST] [--clickhouse-port PORT] \
    [--clickhouse-user USER] [--clickhouse-database traffic] \
    [--clickhouse-cluster default] \
    [--restart]

说明：
  一次只处理一个上海自然日，依次完成 GPS 检查、DuckDB 全局排序、
  道路匹配、事件校验、ClickHouse staging 聚合、正式分区发布和验收。

恢复策略：
  - 已存在且校验通过的排序 Parquet 会被复用。
  - 已存在且校验通过的事件 Parquet 会被复用。
  - ClickHouse 目标分区始终重新聚合并通过 REPLACE PARTITION 发布。
  - --restart 只删除目标日期的本地排序和事件产物，不删除正式表分区。
USAGE
}

die() {
  echo "错误：$*" >&2
  exit 1
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "$script_dir/../../.." && pwd)"

traffic_date=""
gps_root="/mnt/gps-output"
work_root="/mnt/gps-road-traffic-work"
event_root="/mnt/traffic-events"
expressway_path=""
ordinary_path=""
road_network_version=""
matching_algorithm_version=""
duckdb_threads="16"
duckdb_memory_limit="48GB"
duckdb_temp_size="1TB"
gps_road_traffic_bin="$repository_root/apps/gps-gray-service/gps-road-traffic"
replace_script="$script_dir/replace-road-segment-traffic-parquet.sh"
clickhouse_host=""
clickhouse_port=""
clickhouse_user=""
clickhouse_database="traffic"
clickhouse_cluster="default"
restart=false

while (( $# > 0 )); do
  case "$1" in
    --date)
      (( $# >= 2 )) || die "--date 缺少参数"
      traffic_date="$2"
      shift 2
      ;;
    --gps-root)
      (( $# >= 2 )) || die "--gps-root 缺少参数"
      gps_root="$2"
      shift 2
      ;;
    --work-root)
      (( $# >= 2 )) || die "--work-root 缺少参数"
      work_root="$2"
      shift 2
      ;;
    --event-root)
      (( $# >= 2 )) || die "--event-root 缺少参数"
      event_root="$2"
      shift 2
      ;;
    --expressway)
      (( $# >= 2 )) || die "--expressway 缺少参数"
      expressway_path="$2"
      shift 2
      ;;
    --ordinary)
      (( $# >= 2 )) || die "--ordinary 缺少参数"
      ordinary_path="$2"
      shift 2
      ;;
    --road-network-version)
      (( $# >= 2 )) || die "--road-network-version 缺少参数"
      road_network_version="$2"
      shift 2
      ;;
    --matching-algorithm-version)
      (( $# >= 2 )) || die "--matching-algorithm-version 缺少参数"
      matching_algorithm_version="$2"
      shift 2
      ;;
    --duckdb-threads)
      (( $# >= 2 )) || die "--duckdb-threads 缺少参数"
      duckdb_threads="$2"
      shift 2
      ;;
    --duckdb-memory-limit)
      (( $# >= 2 )) || die "--duckdb-memory-limit 缺少参数"
      duckdb_memory_limit="$2"
      shift 2
      ;;
    --duckdb-temp-size)
      (( $# >= 2 )) || die "--duckdb-temp-size 缺少参数"
      duckdb_temp_size="$2"
      shift 2
      ;;
    --gps-road-traffic-bin)
      (( $# >= 2 )) || die "--gps-road-traffic-bin 缺少参数"
      gps_road_traffic_bin="$2"
      shift 2
      ;;
    --replace-script)
      (( $# >= 2 )) || die "--replace-script 缺少参数"
      replace_script="$2"
      shift 2
      ;;
    --clickhouse-host)
      (( $# >= 2 )) || die "--clickhouse-host 缺少参数"
      clickhouse_host="$2"
      shift 2
      ;;
    --clickhouse-port)
      (( $# >= 2 )) || die "--clickhouse-port 缺少参数"
      clickhouse_port="$2"
      shift 2
      ;;
    --clickhouse-user)
      (( $# >= 2 )) || die "--clickhouse-user 缺少参数"
      clickhouse_user="$2"
      shift 2
      ;;
    --clickhouse-database)
      (( $# >= 2 )) || die "--clickhouse-database 缺少参数"
      clickhouse_database="$2"
      shift 2
      ;;
    --clickhouse-cluster)
      (( $# >= 2 )) || die "--clickhouse-cluster 缺少参数"
      clickhouse_cluster="$2"
      shift 2
      ;;
    --restart)
      restart=true
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      usage >&2
      die "未知参数：$1"
      ;;
  esac
done

[[ "$traffic_date" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || die "--date 必须是 YYYY-MM-DD"
[[ -n "$expressway_path" ]] || die "必须提供 --expressway"
[[ -n "$ordinary_path" ]] || die "必须提供 --ordinary"
[[ "$road_network_version" =~ ^[A-Za-z0-9._-]+$ ]] || die "非法 road network version"
[[ "$matching_algorithm_version" =~ ^[A-Za-z0-9._-]+$ ]] || die "非法 matching algorithm version"
[[ "$duckdb_threads" =~ ^[1-9][0-9]*$ ]] || die "--duckdb-threads 必须是正整数"
[[ "$duckdb_memory_limit" =~ ^[1-9][0-9]*(KB|MB|GB|TB|KiB|MiB|GiB|TiB)$ ]] || \
  die "--duckdb-memory-limit 必须是 48GB、768MiB 等容量值"
[[ "$duckdb_temp_size" =~ ^[1-9][0-9]*(KB|MB|GB|TB|KiB|MiB|GiB|TiB)$ ]] || \
  die "--duckdb-temp-size 必须是 1TB、512GiB 等容量值"
[[ "$clickhouse_database" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || die "非法 ClickHouse database"
[[ "$clickhouse_cluster" =~ ^[A-Za-z_][A-Za-z0-9_-]*$ ]] || die "非法 ClickHouse cluster"
[[ -z "$clickhouse_port" || "$clickhouse_port" =~ ^[0-9]+$ ]] || die "非法 ClickHouse port"

for absolute_path in "$gps_root" "$work_root" "$event_root" "$expressway_path" "$ordinary_path" "$gps_road_traffic_bin" "$replace_script"; do
  [[ "$absolute_path" = /* ]] || die "路径必须是绝对路径：$absolute_path"
  [[ "$absolute_path" != *"'"* && "$absolute_path" != *$'\n'* ]] || die "路径包含不支持的字符：$absolute_path"
done

input_dir="$gps_root/dt=$traffic_date"
sorted_dir="$work_root/sorted"
duckdb_temp_dir="$work_root/duckdb-temp"
lock_dir="$work_root/locks/$traffic_date.lock"
sorted_file="$sorted_dir/$traffic_date.parquet"
sorted_tmp="$sorted_file.tmp"
event_file="$event_root/$traffic_date.parquet"
event_tmp="$event_file.tmp"
sorted_provenance_file="$sorted_file.provenance"
event_provenance_file="$event_file.provenance"
source_batch_id="gps-$traffic_date"

current_stage="初始化"
script_started_at="$(date +%s)"
lock_acquired=false

cleanup() {
  local status=$?
  if [[ "$lock_acquired" == true ]]; then
    rmdir "$lock_dir" 2>/dev/null || true
  fi
  if (( status != 0 )); then
    echo "处理失败：日期=$traffic_date，阶段=$current_stage，退出码=$status" >&2
  fi
}
trap cleanup EXIT

stage_started_at=0
start_stage() {
  local number="$1"
  local name="$2"
  current_stage="$name"
  stage_started_at="$(date +%s)"
  echo
  echo "[阶段 $number/7] $name"
}

finish_stage() {
  local elapsed=$(( $(date +%s) - stage_started_at ))
  echo "阶段完成：$current_stage，耗时 ${elapsed}s"
}

file_stat_signature() {
  local path="$1"
  if stat -c '%s|%Y' "$path" >/dev/null 2>&1; then
    stat -c '%s|%Y' "$path"
  else
    stat -f '%z|%m' "$path"
  fi
}

hash_file() {
  local path="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$path" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$path" | awk '{print $1}'
  else
    die "未找到 sha256sum 或 shasum"
  fi
}

publish_provenance() {
  local path="$1"
  local content="$2"
  local temporary_path="$path.tmp"
  printf '%s\n' "$content" >"$temporary_path"
  mv "$temporary_path" "$path"
}

assert_provenance() {
  local artifact="$1"
  local provenance_path="$2"
  local expected="$3"
  [[ -f "$provenance_path" ]] || \
    die "已有产物缺少来源清单：$artifact；请使用 --restart 重建"
  local actual
  actual="$(<"$provenance_path")"
  [[ "$actual" == "$expected" ]] || \
    die "已有产物来源已变化：$artifact；请使用 --restart 重建"
}

clickhouse=(clickhouse-client --database "$clickhouse_database")
[[ -z "$clickhouse_host" ]] || clickhouse+=(--host "$clickhouse_host")
[[ -z "$clickhouse_port" ]] || clickhouse+=(--port "$clickhouse_port")
[[ -z "$clickhouse_user" ]] || clickhouse+=(--user "$clickhouse_user")

start_stage 0 "前置检查"
command -v duckdb >/dev/null 2>&1 || die "未找到 duckdb"
command -v clickhouse-client >/dev/null 2>&1 || die "未找到 clickhouse-client"
[[ -f "$expressway_path" ]] || die "高速路段 GeoJSON 不存在：$expressway_path"
[[ -f "$ordinary_path" ]] || die "普通道路段 GeoJSON 不存在：$ordinary_path"
[[ -f "$replace_script" ]] || die "ClickHouse 发布脚本不存在：$replace_script"
[[ -d "$input_dir" ]] || die "GPS 日期目录不存在：$input_dir"
mkdir -p "$sorted_dir" "$duckdb_temp_dir" "$event_root" "$(dirname "$lock_dir")"
if ! mkdir "$lock_dir"; then
  die "该日期已有处理任务运行，或存在未清理的锁：$lock_dir"
fi
lock_acquired=true

if [[ ! -x "$gps_road_traffic_bin" ]]; then
  command -v go >/dev/null 2>&1 || die "未找到 go，且 gps-road-traffic 尚未构建"
  echo "构建 gps-road-traffic：$gps_road_traffic_bin"
  (
    cd "$repository_root/apps/gps-gray-service"
    go build -o "$gps_road_traffic_bin" ./cmd/gps-road-traffic
  )
fi

"${clickhouse[@]}" --query "DESCRIBE TABLE $clickhouse_database.traffic_route_segment_1d_stage" >/dev/null
"${clickhouse[@]}" --query "DESCRIBE TABLE $clickhouse_database.traffic_route_segment_1d" >/dev/null
echo "日期：$traffic_date"
echo "GPS 输入：$input_dir"
echo "排序输出：$sorted_file"
echo "事件输出：$event_file"
echo "路网版本：$road_network_version"
echo "匹配版本：$matching_algorithm_version"
finish_stage

start_stage 1 "检查 GPS 源文件"
shopt -s nullglob
source_temporary_files=("$input_dir"/*.parquet.tmp)
(( ${#source_temporary_files[@]} == 0 )) || die "存在未完成的 GPS Parquet 临时文件：${source_temporary_files[0]}"
source_files=("$input_dir"/*.parquet)
(( ${#source_files[@]} > 0 )) || die "GPS 日期目录没有 Parquet：$input_dir"
source_markers=()
for source_file in "${source_files[@]}"; do
  source_name="${source_file##*/}"
  source_id="${source_name%-part-*.parquet}"
  [[ "$source_id" != "$source_name" ]] || die "GPS Parquet 文件名不符合 source-part-NNNNN.parquet 契约：$source_name"
  source_marker="$gps_root/.state/$source_id.success.json"
  [[ -f "$source_marker" ]] || die "缺少 GPS 转换完成标记：$source_marker"
  marker_seen=false
  for existing_marker in "${source_markers[@]}"; do
    if [[ "$existing_marker" == "$source_marker" ]]; then
      marker_seen=true
      break
    fi
  done
  [[ "$marker_seen" == true ]] || source_markers+=("$source_marker")
done
for source_marker in "${source_markers[@]}"; do
  source_id="${source_marker##*/}"
  source_id="${source_id%.success.json}"
  marker_rows="$(duckdb -noheader -list <<SQL
-- stage:success-marker
SELECT
    marker.source.id,
    marker.status,
    marker.stats.outputFiles,
    declared.file_path
FROM read_json_auto('$source_marker') AS marker,
     UNNEST(marker.files) AS declared(file_path)
WHERE marker.status = 'success'
  AND marker.completed_at IS NOT NULL
  AND marker.stats.outputFiles = array_length(marker.files)
ORDER BY declared.file_path;
SQL
)"
  [[ -n "$marker_rows" ]] || die "GPS 转换完成标记无效或没有声明输出：$source_marker"

  declared_current_names=""
  marker_line_count=0
  marker_output_files=""
  while IFS='|' read -r declared_source_id declared_status declared_output_files declared_path; do
    [[ "$declared_source_id" == "$source_id" ]] || \
      die "GPS 完成标记 source.id 不匹配：$source_marker"
    [[ "$declared_status" == "success" ]] || die "GPS 完成标记状态不是 success：$source_marker"
    [[ "$declared_output_files" =~ ^[0-9]+$ && "$declared_output_files" -gt 0 ]] || \
      die "GPS 完成标记 outputFiles 无效：$source_marker"
    marker_output_files="$declared_output_files"
    marker_line_count=$((marker_line_count + 1))
    if [[ "$declared_path" == "dt=$traffic_date/"* ]]; then
      declared_name="${declared_path#dt=$traffic_date/}"
      [[ "$declared_name" != */* && -n "$declared_name" ]] || \
        die "GPS 完成标记包含非法目标日期路径：$declared_path"
      declared_current_names+="$declared_name"$'\n'
    fi
  done <<<"$marker_rows"
  [[ "$marker_line_count" == "$marker_output_files" ]] || \
    die "GPS 完成标记声明数量不一致：$source_marker"

  actual_current_names="$({
    for source_file in "${source_files[@]}"; do
      source_name="${source_file##*/}"
      [[ "$source_name" != "$source_id-part-"*.parquet ]] || printf '%s\n' "$source_name"
    done
  } | sort)"
  declared_current_names="$(printf '%s' "$declared_current_names" | sed '/^$/d' | sort)"
  [[ -n "$actual_current_names" && "$actual_current_names" == "$declared_current_names" ]] || \
    die "GPS 完成标记分片与目录不一致：source=$source_id, date=$traffic_date"
done
input_size="$(du -sh "$input_dir" | awk '{print $1}')"
source_profile="$(duckdb -noheader -list <<SQL
-- stage:source-profile
SELECT
    count(DISTINCT filename) AS file_count,
    count(*) AS source_rows,
    min(data_date) AS min_date,
    max(data_date) AS max_date,
    min(gps_time) AS min_gps_time,
    max(gps_time) AS max_gps_time,
    count(*) FILTER (WHERE vehicle_id IS NULL OR vehicle_id = '') AS empty_vehicle_rows,
    count(*) FILTER (
        WHERE CAST(timezone('Asia/Shanghai', gps_time) AS DATE) != DATE '$traffic_date'
    ) AS out_of_day_rows
FROM read_parquet('$input_dir/*.parquet', filename = true);
SQL
)"
IFS='|' read -r source_file_count source_rows source_min_date source_max_date source_min_time source_max_time source_empty_vehicles source_out_of_day <<<"$source_profile"
[[ "$source_file_count" =~ ^[0-9]+$ && "$source_file_count" -gt 0 ]] || die "无法读取 GPS Parquet 文件数"
[[ "$source_rows" =~ ^[0-9]+$ && "$source_rows" -gt 0 ]] || die "GPS 源数据行数无效"
[[ "$source_min_date" == "$traffic_date" && "$source_max_date" == "$traffic_date" ]] || \
  die "GPS 目录混入其他日期：min=$source_min_date, max=$source_max_date"
[[ "$source_empty_vehicles" == "0" ]] || die "GPS 源数据包含 $source_empty_vehicles 行空车辆标识"
[[ "$source_out_of_day" == "0" ]] || die "GPS 时间超出目标上海自然日：$source_out_of_day 行"
source_provenance="$({
  printf 'date=%s\n' "$traffic_date"
  printf 'rows=%s\n' "$source_rows"
  for source_file in "${source_files[@]}"; do
    printf 'source=%s|%s\n' "$source_file" "$(file_stat_signature "$source_file")"
  done
  for source_marker in "${source_markers[@]}"; do
    printf 'marker=%s|%s\n' "$source_marker" "$(hash_file "$source_marker")"
  done
})"
event_provenance="$({
  printf '%s\n' "$source_provenance"
  printf 'expressway=%s|%s\n' "$expressway_path" "$(hash_file "$expressway_path")"
  printf 'ordinary=%s|%s\n' "$ordinary_path" "$(hash_file "$ordinary_path")"
  printf 'matcher=%s|%s\n' "$gps_road_traffic_bin" "$(hash_file "$gps_road_traffic_bin")"
  printf 'road_network_version=%s\n' "$road_network_version"
  printf 'matching_algorithm_version=%s\n' "$matching_algorithm_version"
})"
echo "Parquet 文件数：$source_file_count"
echo "目录大小：$input_size"
echo "GPS 行数：$source_rows"
echo "GPS 时间范围：$source_min_time ～ $source_max_time"
finish_stage

if [[ "$restart" == true ]]; then
  echo "--restart：清理目标日期的本地排序和事件产物"
  rm -f "$sorted_tmp" "$sorted_file" "$sorted_provenance_file" \
    "$event_tmp" "$event_file" "$event_provenance_file"
fi

start_stage 2 "DuckDB 全局排序"
if [[ -f "$sorted_file" ]]; then
  assert_provenance "$sorted_file" "$sorted_provenance_file" "$source_provenance"
  echo "复用已有排序文件：$sorted_file"
else
  rm -f "$sorted_tmp"
  echo "排序键：vehicle_id ASC, gps_time ASC"
  echo "DuckDB：threads=$duckdb_threads, memory_limit=$duckdb_memory_limit, temp_limit=$duckdb_temp_size"
  duckdb <<SQL
-- stage:sort
PRAGMA enable_progress_bar;
SET progress_bar_time = 1000;
SET threads = $duckdb_threads;
SET memory_limit = '$duckdb_memory_limit';
SET temp_directory = '$duckdb_temp_dir';
SET max_temp_directory_size = '$duckdb_temp_size';

COPY (
    SELECT
        vehicle_id,
        gps_time,
        longitude,
        latitude,
        data_date
    FROM read_parquet('$input_dir/*.parquet')
    WHERE data_date = DATE '$traffic_date'
    ORDER BY vehicle_id, gps_time
)
TO '$sorted_tmp'
(FORMAT PARQUET, COMPRESSION ZSTD);
SQL
  [[ -f "$sorted_tmp" ]] || die "DuckDB 未生成排序临时文件：$sorted_tmp"
fi
finish_stage

start_stage 3 "校验排序结果"
sorted_candidate="$sorted_file"
[[ -f "$sorted_candidate" ]] || sorted_candidate="$sorted_tmp"
sorted_profile="$(duckdb -noheader -list <<SQL
-- stage:sorted-profile
SELECT
    count(*) AS sorted_rows,
    min(data_date) AS min_date,
    max(data_date) AS max_date,
    min(gps_time) AS min_gps_time,
    max(gps_time) AS max_gps_time,
    count(*) FILTER (WHERE vehicle_id IS NULL OR vehicle_id = '') AS empty_vehicle_rows,
    count(*) FILTER (
        WHERE CAST(timezone('Asia/Shanghai', gps_time) AS DATE) != DATE '$traffic_date'
    ) AS out_of_day_rows
FROM read_parquet('$sorted_candidate');
SQL
)"
IFS='|' read -r sorted_rows sorted_min_date sorted_max_date sorted_min_time sorted_max_time sorted_empty_vehicles sorted_out_of_day <<<"$sorted_profile"
[[ "$sorted_rows" == "$source_rows" ]] || die "排序前后行数不一致：source=$source_rows, sorted=$sorted_rows"
[[ "$sorted_min_date" == "$traffic_date" && "$sorted_max_date" == "$traffic_date" ]] || \
  die "排序结果日期不正确：min=$sorted_min_date, max=$sorted_max_date"
[[ "$sorted_empty_vehicles" == "0" ]] || die "排序结果包含 $sorted_empty_vehicles 行空车辆标识"
[[ "$sorted_out_of_day" == "0" ]] || die "排序结果 GPS 时间超出目标上海自然日：$sorted_out_of_day 行"
[[ "$sorted_min_time" == "$source_min_time" && "$sorted_max_time" == "$source_max_time" ]] || \
  die "排序前后 GPS 时间范围不一致"
if [[ "$sorted_candidate" == "$sorted_tmp" ]]; then
  mv "$sorted_tmp" "$sorted_file"
  publish_provenance "$sorted_provenance_file" "$source_provenance"
  echo "发布排序文件：$sorted_file"
fi
echo "排序行数：$sorted_rows"
echo "排序时间范围：$sorted_min_time ～ $sorted_max_time"
finish_stage

start_stage 4 "GPS 道路匹配"
if [[ -f "$event_file" ]]; then
  assert_provenance "$event_file" "$event_provenance_file" "$event_provenance"
  echo "复用已有事件文件：$event_file"
else
  rm -f "$event_tmp"
  "$gps_road_traffic_bin" \
    --input "$sorted_file" \
    --expressway "$expressway_path" \
    --ordinary "$ordinary_path" \
    --output "$event_tmp" \
    --traffic-date "$traffic_date" \
    --road-network-version "$road_network_version" \
    --matching-algorithm-version "$matching_algorithm_version" \
    --source-batch-id "$source_batch_id" \
    --progress-interval 5s
  [[ -f "$event_tmp" ]] || die "道路匹配未生成事件临时文件：$event_tmp"
fi
finish_stage

start_stage 5 "校验事件 Parquet"
event_candidate="$event_file"
[[ -f "$event_candidate" ]] || event_candidate="$event_tmp"
event_profile="$(duckdb -noheader -list <<SQL
-- stage:event-profile
SELECT
    count(*) AS event_rows,
    count(DISTINCT visit_id) AS unique_visit_ids,
    count(DISTINCT segment_id) AS segment_count,
    min(traffic_date) AS min_date,
    max(traffic_date) AS max_date,
    min(visited_at) AS min_visited_at,
    max(visited_at) AS max_visited_at,
    count(*) FILTER (
        WHERE road_network_version != '$road_network_version'
           OR matching_algorithm_version != '$matching_algorithm_version'
           OR source_batch_id != '$source_batch_id'
    ) AS invalid_version_rows,
    count(*) FILTER (
        WHERE CAST(timezone('Asia/Shanghai', visited_at) AS DATE) != DATE '$traffic_date'
    ) AS out_of_day_rows
FROM read_parquet('$event_candidate');
SQL
)"
IFS='|' read -r event_rows unique_visit_ids segment_count event_min_date event_max_date event_min_time event_max_time invalid_version_rows event_out_of_day <<<"$event_profile"
[[ "$event_rows" =~ ^[0-9]+$ && "$event_rows" -gt 0 ]] || die "事件 Parquet 没有有效事件"
[[ "$segment_count" =~ ^[0-9]+$ && "$segment_count" -gt 0 ]] || die "事件 Parquet 没有匹配路段"
[[ "$event_min_date" == "$traffic_date" && "$event_max_date" == "$traffic_date" ]] || \
  die "事件日期不正确：min=$event_min_date, max=$event_max_date"
[[ "$invalid_version_rows" == "0" ]] || die "事件 Parquet 包含 $invalid_version_rows 行错误版本"
[[ "$event_out_of_day" == "0" ]] || die "事件访问时间超出目标上海自然日：$event_out_of_day 行"
if [[ "$event_candidate" == "$event_tmp" ]]; then
  mv "$event_tmp" "$event_file"
  publish_provenance "$event_provenance_file" "$event_provenance"
  echo "发布事件文件：$event_file"
fi
echo "事件数：$event_rows"
echo "唯一 visit_id：$unique_visit_ids"
echo "匹配路段数：$segment_count"
echo "事件时间范围：$event_min_time ～ $event_max_time"
finish_stage

start_stage 6 "写入 staging 并发布正式分区"
replace_args=(
  --input "$event_file"
  --traffic-date "$traffic_date"
  --road-network-version "$road_network_version"
  --matching-algorithm-version "$matching_algorithm_version"
  --database "$clickhouse_database"
  --cluster "$clickhouse_cluster"
)
[[ -z "$clickhouse_host" ]] || replace_args+=(--host "$clickhouse_host")
[[ -z "$clickhouse_port" ]] || replace_args+=(--port "$clickhouse_port")
[[ -z "$clickhouse_user" ]] || replace_args+=(--user "$clickhouse_user")
bash "$replace_script" "${replace_args[@]}"
finish_stage

start_stage 7 "正式表验收"
formal_profile="$("${clickhouse[@]}" --format TSVRaw --query "
SELECT
    toString(traffic_date),
    count() AS segment_rows,
    sum(segment_visit_count) AS total_visits,
    uniqExactMerge(vehicle_state) AS unique_vehicles,
    sum(new_energy_visit_count) AS new_energy_visits,
    uniqExactIfMerge(new_energy_vehicle_state) AS new_energy_unique_vehicles
FROM $clickhouse_database.traffic_route_segment_1d
WHERE road_network_version = '$road_network_version'
  AND matching_algorithm_version = '$matching_algorithm_version'
  AND traffic_date = toDate('$traffic_date')
GROUP BY traffic_date
")"
IFS=$'\t' read -r formal_date formal_segment_rows formal_total_visits formal_unique_vehicles formal_energy_visits formal_energy_vehicles <<<"$formal_profile"
[[ "$formal_date" == "$traffic_date" ]] || die "正式表没有目标日期分区：$traffic_date"
[[ "$formal_segment_rows" =~ ^[0-9]+$ && "$formal_segment_rows" -gt 0 ]] || die "正式表路段数无效"
[[ "$formal_total_visits" =~ ^[0-9]+$ && "$formal_total_visits" -gt 0 ]] || die "正式表访问数无效"
echo "正式表日期：$formal_date"
echo "正式表路段数：$formal_segment_rows"
echo "正式表总访问数：$formal_total_visits"
echo "正式表唯一车辆数：$formal_unique_vehicles"
echo "正式表新能源访问数：$formal_energy_visits"
echo "正式表新能源唯一车辆数：$formal_energy_vehicles"
finish_stage

total_elapsed=$(( $(date +%s) - script_started_at ))
echo
echo "单日道路车流处理完成：日期=$traffic_date，总耗时 ${total_elapsed}s"
