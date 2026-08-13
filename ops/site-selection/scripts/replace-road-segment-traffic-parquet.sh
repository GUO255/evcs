#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
用法：
  replace-road-segment-traffic-parquet.sh \
    --input /mnt/traffic-events/dt=2026-01-15/events.parquet \
    --traffic-date 2026-01-15 \
    --road-network-version henan-road-20260805-v1 \
    --matching-algorithm-version nearest-100m-v1 \
    [--host HOST] [--port PORT] [--user USER] [--database DATABASE] \
    [--cluster CLUSTER]

说明：
  1. 按 visit_id 去重并聚合新事件到 staging。
  2. 校验通过后，通过 REPLACE PARTITION 原子覆盖正式分区。
  3. 不会删除或覆盖其他日期、路网版本、匹配算法版本的数据。
  4. 密码沿用 clickhouse-client 配置文件；脚本不会额外传 --ask-password。
USAGE
}

die() {
  echo "错误：$*" >&2
  exit 1
}

input_file=""
traffic_date=""
road_network_version=""
matching_algorithm_version=""
clickhouse_host=""
clickhouse_port=""
clickhouse_user=""
clickhouse_database="traffic"
clickhouse_cluster="default"

while (( $# > 0 )); do
  case "$1" in
    --input)
      (( $# >= 2 )) || die "--input 缺少参数"
      input_file="$2"
      shift 2
      ;;
    --traffic-date)
      (( $# >= 2 )) || die "--traffic-date 缺少参数"
      traffic_date="$2"
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
    --host)
      (( $# >= 2 )) || die "--host 缺少参数"
      clickhouse_host="$2"
      shift 2
      ;;
    --port)
      (( $# >= 2 )) || die "--port 缺少参数"
      clickhouse_port="$2"
      shift 2
      ;;
    --user)
      (( $# >= 2 )) || die "--user 缺少参数"
      clickhouse_user="$2"
      shift 2
      ;;
    --database)
      (( $# >= 2 )) || die "--database 缺少参数"
      clickhouse_database="$2"
      shift 2
      ;;
    --cluster)
      (( $# >= 2 )) || die "--cluster 缺少参数"
      clickhouse_cluster="$2"
      shift 2
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

command -v clickhouse-client >/dev/null 2>&1 || die "未找到 clickhouse-client"
[[ -n "$input_file" ]] || die "必须提供 --input"
[[ -f "$input_file" ]] || die "Parquet 文件不存在：$input_file"
[[ "$traffic_date" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || die "--traffic-date 必须是 YYYY-MM-DD"
[[ "$road_network_version" =~ ^[A-Za-z0-9._-]+$ ]] || die "非法 road network version"
[[ "$matching_algorithm_version" =~ ^[A-Za-z0-9._-]+$ ]] || die "非法 matching algorithm version"
[[ "$clickhouse_database" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || die "非法 database"
[[ "$clickhouse_cluster" =~ ^[A-Za-z_][A-Za-z0-9_-]*$ ]] || die "非法 cluster"
[[ -z "$clickhouse_port" || "$clickhouse_port" =~ ^[0-9]+$ ]] || die "非法 port"

partition_date="${traffic_date//-/}"
stage_table="$clickhouse_database.traffic_route_segment_1d_stage"
formal_table="$clickhouse_database.traffic_route_segment_1d"

clickhouse=(clickhouse-client --database "$clickhouse_database")
[[ -z "$clickhouse_host" ]] || clickhouse+=(--host "$clickhouse_host")
[[ -z "$clickhouse_port" ]] || clickhouse+=(--port "$clickhouse_port")
[[ -z "$clickhouse_user" ]] || clickhouse+=(--user "$clickhouse_user")

event_schema="visit_id UInt64,
vehicle_key UInt64,
visited_at DateTime64(3, \'UTC\'),
traffic_date Date32,
segment_id String,
route_key String,
road_level String,
direction UInt8,
energy_type UInt8,
visit_source UInt8,
road_network_version String,
matching_algorithm_version String,
source_batch_id String"

echo "[1/6] 检查导入参数"
echo "Parquet：$input_file"
echo "日期：$traffic_date"
echo "路网版本：$road_network_version"
echo "匹配版本：$matching_algorithm_version"

echo "[2/6] 清理 staging 目标分区"
"${clickhouse[@]}" --query "
ALTER TABLE $stage_table
ON CLUSTER $clickhouse_cluster
DROP PARTITION tuple(
    '$road_network_version',
    '$matching_algorithm_version',
    $partition_date
)
"

echo "[3/6] 去重并聚合到 staging"
"${clickhouse[@]}" --query "
INSERT INTO $stage_table
(
    road_network_version,
    matching_algorithm_version,
    traffic_date,
    route_key,
    road_level,
    segment_id,
    segment_visit_count,
    forward_visit_count,
    reverse_visit_count,
    unknown_direction_visit_count,
    vehicle_state,
    new_energy_visit_count,
    new_energy_vehicle_state
)
SELECT
    road_network_version,
    matching_algorithm_version,
    toDate(traffic_date),
    route_key,
    road_level,
    segment_id,
    count() AS segment_visit_count,
    countIf(direction = 1) AS forward_visit_count,
    countIf(direction = 2) AS reverse_visit_count,
    countIf(direction = 0) AS unknown_direction_visit_count,
    uniqExactState(vehicle_key) AS vehicle_state,
    countIf(energy_type = 1) AS new_energy_visit_count,
    uniqExactIfState(vehicle_key, energy_type = 1) AS new_energy_vehicle_state
FROM
(
    SELECT *
    FROM input('$event_schema')
    WHERE traffic_date = toDate32('$traffic_date')
      AND road_network_version = '$road_network_version'
      AND matching_algorithm_version = '$matching_algorithm_version'
    ORDER BY visit_id, visited_at, vehicle_key, segment_id
    LIMIT 1 BY visit_id
)
GROUP BY
    road_network_version,
    matching_algorithm_version,
    traffic_date,
    route_key,
    road_level,
    segment_id
FORMAT Parquet
" < "$input_file"

echo "[4/6] 校验 staging"
stage_check="$(
  "${clickhouse[@]}" --format TSVRaw --query "
SELECT
    count() AS segment_rows,
    sum(segment_visit_count) AS total_visits
FROM $stage_table
WHERE road_network_version = '$road_network_version'
  AND matching_algorithm_version = '$matching_algorithm_version'
  AND traffic_date = toDate('$traffic_date')
"
)"
IFS=$'\t' read -r stage_segment_rows stage_total_visits <<< "$stage_check"
[[ "$stage_segment_rows" =~ ^[0-9]+$ && "$stage_segment_rows" -gt 0 ]] || die "staging 没有路段数据"
[[ "$stage_total_visits" =~ ^[0-9]+$ && "$stage_total_visits" -gt 0 ]] || die "staging 总访问数无效"

invalid_segments="$(
  "${clickhouse[@]}" --format TSVRaw --query "
SELECT count()
FROM
(
    SELECT
        segment_id,
        sum(segment_visit_count) AS total,
        sum(forward_visit_count) AS forward,
        sum(reverse_visit_count) AS reverse,
        sum(unknown_direction_visit_count) AS unknown
    FROM $stage_table
    WHERE road_network_version = '$road_network_version'
      AND matching_algorithm_version = '$matching_algorithm_version'
      AND traffic_date = toDate('$traffic_date')
    GROUP BY segment_id
    HAVING total != forward + reverse + unknown
)
"
)"
[[ "$invalid_segments" == "0" ]] || die "发现 $invalid_segments 个方向统计不一致的路段"

echo "staging 路段数：$stage_segment_rows"
echo "staging 总访问数：$stage_total_visits"

echo "[5/6] 原子覆盖正式分区"
"${clickhouse[@]}" --query "
ALTER TABLE $formal_table
ON CLUSTER $clickhouse_cluster
REPLACE PARTITION tuple(
    '$road_network_version',
    '$matching_algorithm_version',
    $partition_date
)
FROM $stage_table
"

echo "[6/6] 核验正式分区"
formal_check="$(
  "${clickhouse[@]}" --format TSVRaw --query "
SELECT
    count() AS segment_rows,
    sum(segment_visit_count) AS total_visits
FROM $formal_table
WHERE road_network_version = '$road_network_version'
  AND matching_algorithm_version = '$matching_algorithm_version'
  AND traffic_date = toDate('$traffic_date')
"
)"
IFS=$'\t' read -r formal_segment_rows formal_total_visits <<< "$formal_check"
[[ "$formal_segment_rows" == "$stage_segment_rows" ]] || \
  die "正式表路段数 $formal_segment_rows 与 staging $stage_segment_rows 不一致"
[[ "$formal_total_visits" == "$stage_total_visits" ]] || \
  die "正式表总访问数 $formal_total_visits 与 staging $stage_total_visits 不一致"

echo "覆盖完成："
echo "  日期：$traffic_date"
echo "  路网版本：$road_network_version"
echo "  匹配版本：$matching_algorithm_version"
echo "  路段数：$formal_segment_rows"
echo "  总访问数：$formal_total_visits"
