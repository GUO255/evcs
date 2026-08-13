#!/bin/sh
set -eu

if [ "$#" -lt 2 ]; then
  echo "usage: container-entrypoint.sh ROLE COMMAND..." >&2
  exit 64
fi

role="$1"
shift
profile="${EVCS_ENVIRONMENT_PROFILE:-production}"
env_file="/app/runtime-env/${profile}.${role}.env"

bun --no-env-file --env-file="$env_file" \
  /app/ops/environment/scripts/validate-runtime-env.ts "$profile" "$role"
exec bun --no-env-file --env-file="$env_file" "$@"
