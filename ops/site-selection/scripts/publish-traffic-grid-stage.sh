#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
用法：
  publish-traffic-grid-stage.sh

自动发布 traffic.traffic_grid_1h_stage 中 grid_version = henan_mvp
的全部日期分区到 traffic.traffic_grid_1h。

参数：
  --help  显示帮助
USAGE
}

die() {
  echo "错误：$*" >&2
  exit 1
}

if (( $# > 0 )); then
  case "$1" in
    --help|-h)
      (( $# == 1 )) || die "--help 不接受其他参数"
      usage
      exit 0
      ;;
    *)
      usage >&2
      die "未知参数：$1"
      ;;
  esac
fi

command -v clickhouse-client >/dev/null 2>&1 || die "未找到 clickhouse-client"

grid_version="henan_mvp"
publish_lock="${TMPDIR:-/tmp}/evcs-traffic-grid-publish-$grid_version.lock"

if ! mkdir "$publish_lock"; then
  die "已有 traffic 分区发布任务正在运行，或存在未清理的发布锁：$publish_lock"
fi

cleanup_publish_lock() {
  local exit_status=$?
  if ! rmdir "$publish_lock"; then
    echo "错误：无法释放 traffic 分区发布锁：$publish_lock" >&2
    exit 1
  fi
  exit "$exit_status"
}
trap cleanup_publish_lock EXIT

if ! partition_dates="$(
  clickhouse-client --format TSVRaw --query "
SELECT DISTINCT toYYYYMMDD(window_start)
FROM traffic.traffic_grid_1h_stage
WHERE grid_version = '$grid_version'
ORDER BY toYYYYMMDD(window_start)
"
)"; then
  die "读取 staging 日期分区失败"
fi

[[ -n "$partition_dates" ]] || die "staging 中没有可发布的分区"

echo "即将发布以下 staging 日期分区："
printf '%s\n' "$partition_dates"

published_count=0
while IFS= read -r partition_date; do
  [[ -n "$partition_date" ]] || continue
  [[ "$partition_date" =~ ^[0-9]{8}$ ]] || die "发现非法分区日期：$partition_date"

  echo "正在发布：grid_version=$grid_version, partition=$partition_date"

  if ! clickhouse-client --query "
ALTER TABLE traffic.traffic_grid_1h ON CLUSTER default
REPLACE PARTITION tuple('$grid_version', $partition_date)
FROM traffic.traffic_grid_1h_stage
"; then
    die "发布分区失败：$partition_date；已成功发布的分区不会回滚，可修复后重新执行本脚本"
  fi

  published_count=$((published_count + 1))
  echo "发布完成：$partition_date"
done <<< "$partition_dates"

echo "所有 staging 日期分区均已发布，共 $published_count 个分区。"
