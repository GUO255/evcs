#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
用法：
  import-traffic-parquet.sh --directory <Parquet目录>

参数：
  --directory  只导入指定目录第一层的 *.parquet 文件
  --keep-stage 跳过导入前的 staging 清空；同一数据重复导入会重复累计
  --help       显示帮助
USAGE
}

die() {
  echo "错误：$*" >&2
  exit 1
}

directory=""
keep_stage=false

while (( $# > 0 )); do
  case "$1" in
    --directory)
      (( $# >= 2 )) || die "--directory 缺少目录参数"
      directory="$2"
      shift 2
      ;;
    --keep-stage)
      keep_stage=true
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

[[ -n "$directory" ]] || { usage >&2; die "必须指定 --directory"; }
command -v clickhouse-client >/dev/null 2>&1 || die "未找到 clickhouse-client"
[[ -d "$directory" ]] || die "目录不存在：$directory"

shopt -s nullglob

temporary_files=()
for candidate in "$directory"/*.parquet.tmp; do
  [[ ! -f "$candidate" ]] || temporary_files+=("$candidate")
done
if (( ${#temporary_files[@]} > 0 )); then
  printf '错误：目录中存在未完成的临时文件：\n' >&2
  printf '  %s\n' "${temporary_files[@]}" >&2
  exit 1
fi

parquet_files=()
for candidate in "$directory"/*.parquet; do
  [[ ! -f "$candidate" ]] || parquet_files+=("$candidate")
done
(( ${#parquet_files[@]} > 0 )) || die "目录中没有 Parquet 文件：$directory"

echo "准备导入目录：$directory"
echo "文件数量：${#parquet_files[@]}"

if [[ "$keep_stage" == true ]]; then
  echo "警告：已指定 --keep-stage，将保留 staging 现有数据；重复导入会造成 gps_point_count 重复累计。"
else
  echo "正在清空 staging 表……"
  if ! clickhouse-client \
    --query "TRUNCATE TABLE traffic.traffic_grid_1h_stage ON CLUSTER default"; then
    die "清空 traffic.traffic_grid_1h_stage 失败，尚未开始导入"
  fi
fi

insert_query="
INSERT INTO traffic.traffic_grid_1h_stage
(
    grid_version,
    window_start,
    grid_x,
    grid_y,
    vehicle_state,
    small_new_energy_vehicle_state,
    large_new_energy_vehicle_state,
    gps_point_count
)
WITH
    upperUTF8(trim(vehicle_id)) AS plate,
    substringUTF8(plate, 3, 6) AS serial,
    match(substringUTF8(plate, 2, 1), '^[A-HJ-NP-Z]$') AS valid_authority,
    has(
        ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'],
        substringUTF8(serial, 1, 1)
    ) AS energy_first,
    has(
        ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'],
        substringUTF8(serial, 6, 1)
    ) AS energy_last,
    (
        lengthUTF8(plate) = 8
        AND valid_authority
        AND energy_first
        AND (
            match(substringUTF8(serial, 2, 5), '^[0-9]{5}$')
            OR (
                match(substringUTF8(serial, 2, 1), '^[A-HJ-NP-Z]$')
                AND match(substringUTF8(serial, 3, 4), '^[0-9]{4}$')
            )
        )
    ) AS is_small_new_energy,
    (
        lengthUTF8(plate) = 8
        AND valid_authority
        AND energy_last
        AND match(substringUTF8(serial, 1, 5), '^[0-9]{5}$')
    ) AS is_large_new_energy
SELECT
    'henan_mvp' AS grid_version,
    toStartOfHour(toTimeZone(gps_time, 'Asia/Shanghai')) AS window_start,
    toUInt16(floor((longitude - 110.00) / 0.01)) AS grid_x,
    toUInt16(floor((37.00 - latitude) / 0.01)) AS grid_y,
    uniqExactState(sipHash64(vehicle_id)) AS vehicle_state,
    uniqExactIfState(
        sipHash64(vehicle_id),
        is_small_new_energy
    ) AS small_new_energy_vehicle_state,
    uniqExactIfState(
        sipHash64(vehicle_id),
        is_large_new_energy
    ) AS large_new_energy_vehicle_state,
    count() AS gps_point_count
FROM input(
    'vehicle_id String,
     gps_time DateTime64(3, \\'UTC\\'),
     longitude Float64,
     latitude Float64,
     data_date Date32'
)
WHERE vehicle_id != ''
  AND longitude >= 110.00
  AND longitude <  117.00
  AND latitude  >   31.00
  AND latitude  <=  37.00
GROUP BY window_start, grid_x, grid_y
FORMAT Parquet
"

imported_count=0
for parquet_file in "${parquet_files[@]}"; do
  echo "[$((imported_count + 1))/${#parquet_files[@]}] 正在导入：$parquet_file"

  if ! clickhouse-client --query "$insert_query" <"$parquet_file"; then
    echo "错误：导入失败：$parquet_file" >&2
    if [[ "$keep_stage" == true ]]; then
      echo "当前 staging 已包含部分新增数据，不可发布或直接使用 --keep-stage 重跑。" >&2
      echo "最安全的恢复方式是不带 --keep-stage 重新执行，再按顺序重建所需日期。" >&2
    else
      echo "当前 staging 不可发布。修复问题后重新执行本脚本，脚本会清空 staging 并从第一个文件重跑。" >&2
    fi
    exit 1
  fi

  imported_count=$((imported_count + 1))
done

echo "成功导入 $imported_count 个 Parquet 文件。请继续执行 runbook 的完整日期校验。"
