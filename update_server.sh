#!/usr/bin/env bash
set -euo pipefail

PROJECT="swardle-compute-engine"
ZONE="us-west1-b"
INSTANCE="instance-1"

gcloud compute scp \
  --project="${PROJECT}" \
  --zone="${ZONE}" \
  cloudscript-boot-server.sh "${INSTANCE}:~/cloudscript-boot-server.sh"

echo "Running cloudscript-boot-server.sh on ${INSTANCE}..."
gcloud compute ssh "${INSTANCE}" \
  --project="${PROJECT}" \
  --zone="${ZONE}" \
  --command="bash ~/cloudscript-boot-server.sh"
