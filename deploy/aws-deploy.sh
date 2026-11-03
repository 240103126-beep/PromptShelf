#!/usr/bin/env bash
# Updates an EXISTING, explicitly approved AWS stack; does not create resources.
set -euo pipefail
: "${AWS_REGION:?Set AWS_REGION}"
: "${AWS_STACK_NAME:?Set AWS_STACK_NAME}"
revision="${1:-${GITHUB_SHA:-}}"
if [[ ! "$revision" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'Pass the complete 40-character Git commit SHA.' >&2
  exit 2
fi
outputs=$(aws cloudformation describe-stacks --stack-name "$AWS_STACK_NAME" --region "$AWS_REGION" --query 'Stacks[0].Outputs' --output json)
instance=$(jq -er '.[] | select(.OutputKey == "InstanceId") | .OutputValue' <<<"$outputs")
document=$(jq -er '.[] | select(.OutputKey == "DeployDocument") | .OutputValue' <<<"$outputs")
url=$(jq -er '.[] | select(.OutputKey == "AppUrl") | .OutputValue' <<<"$outputs")
parameters=$(jq -cn --arg sha "$revision" '{Revision:[$sha]}')
command=$(aws ssm send-command --region "$AWS_REGION" --instance-ids "$instance" --document-name "$document" --parameters "$parameters" --timeout-seconds 600 --query Command.CommandId --output text)
# The standard CLI waiter times out after ~100 seconds; allow slow image pulls.
for attempt in $(seq 1 120); do
  status=$(aws ssm get-command-invocation --region "$AWS_REGION" --command-id "$command" --instance-id "$instance" --query Status --output text 2>/dev/null || true)
  case "$status" in
    Success) break ;;
    Failed|Cancelled|TimedOut|Cancelling)
      aws ssm get-command-invocation --region "$AWS_REGION" --command-id "$command" --instance-id "$instance" --query '{Status:Status,Error:StandardErrorContent,Output:StandardOutputContent}'
      exit 1 ;;
  esac
  sleep 5
done
if [[ "$status" != Success ]]; then
  echo "Deployment did not finish in 10 minutes (SSM command $command)." >&2
  exit 1
fi
curl --fail --silent --show-error --retry 8 --retry-delay 5 "$url/api/health"
echo
echo "Deployed $revision to $url"
