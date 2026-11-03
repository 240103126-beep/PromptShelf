# Deployment guide

## What the repository provides

- A multi-stage Dockerfile builds React once and serves its static files through FastAPI.
- `docker-compose.yaml` runs the app and PostgreSQL, with the database ready before the app starts.
- `deploy/compose.aws.yaml` adds restart policies, bounded logs and an application health check to that same Compose stack.
- `deploy/cloudformation.yaml` creates one `t3.micro` EC2 instance, an 8 GiB encrypted root disk, a public subnet and HTTP access. PostgreSQL is reachable only inside Compose. Administration uses Systems Manager, with no SSH port.
- By default, a systemd timer checks the public successful `main` push workflow every two minutes and deploys its full SHA through the existing healthchecked Compose script. This uses no GitHub token, OIDC provider or additional AWS resource.
- Optional GitHub OIDC permits only this repository's `main` branch to invoke a specific deployment document on the one instance. It is disabled by default (`EnableGitHubDeployment=false`) so the app can deploy on accounts that restrict identity providers. When enabled, the role cannot create infrastructure or grant IAM permissions. No permanent AWS keys are stored in GitHub.
- `deploy/aws-deploy.sh` updates an existing stack to a tested commit and verifies its public health endpoint.
- `render.yaml` is an optional free-plan Docker preview with a managed PostgreSQL database.

## Important distinction for the assignment

Render deploys a Dockerfile or registry image and manages the database as its own service; this Blueprint does **not** execute Docker Compose. Vercel's existing static frontend preview also does not run this stack. If the marker requires Compose literally, use the local/CI Compose evidence and the AWS deployment, and clarify whether the initial managed-host preview is accepted. [Render Docker deployment documentation](https://render.com/docs/docker).

## 1. Optional Render preview

1. Push the verified repository to GitHub.
2. Sign in at <https://dashboard.render.com>, connect the repository, select **New → Blueprint**, and use `render.yaml`.
3. Confirm both the web service and PostgreSQL show the **Free** plan. Leave `GEMINI_API_KEY` empty to use local fallback, or set it in the dashboard rather than Git.
4. Wait for the database and Docker service to become healthy. Open the `onrender.com` URL and `/api/health`.
5. Create an item, reload the page and confirm it persists. Record the URL and deployment logs in the deployment issue.

Free Render databases currently expire after 30 days and do not include backups. Free web services can sleep; export sample data before expiration. Do not upgrade either resource to a paid plan for this assignment. [Render free-plan limits](https://render.com/docs/free).

## 2. AWS account preparation — owner action

Do not run the creation command below until the owner has checked the account plan and authorized the exact resources. Select AWS's **Free account plan** and keep it on that plan. Never choose **Upgrade to Paid** to make this template work.

AWS eligibility depends on account age and region. For newer accounts, the free plan is credit-based and ends after six months or credit exhaustion, whichever comes first. EC2, EBS, network transfer and public IPv4 usage consume allowances/credits; the template cannot guarantee a zero bill on a paid account. Verify Free Tier availability and remaining credits in the Billing console before deployment. If a required service is unavailable in the Free Plan, stop. [AWS EC2 Free Tier documentation](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html).

AWS's new sign-up experience assigns each project to one Region. For a Kazakhstan contact address this is normally Sydney (`ap-southeast-2`); verify the project's actual Region in **AWS Settings → Project → Overview → Additional Info** before launch. The example below uses Sydney, not a cross-Region deployment. Do not activate advanced features or switch to a paid plan to change the Region. [AWS project Regions](https://docs.aws.amazon.com/accounts/latest/reference/project-regions.html).

New-experience Free and Paid projects also apply a policy denying `iam:*Provider*`, which can prevent creating the GitHub OIDC provider. Keep `EnableGitHubDeployment=false` for the initial deployment unless the account's supported permissions have been confirmed. EC2's SSM role and deployment document remain part of the stack; application startup does not depend on the GitHub identity resources. The GitHub-to-AWS OIDC push job remains disabled; the default pull timer provides automatic deployment without an identity provider. Do not upgrade or remove account protections to enable it. [AWS project policies](https://docs.aws.amazon.com/accounts/latest/reference/scps-and-rcps-for-projects.html).

An optional `DomainName` parameter enables the Caddy HTTPS overlay without adding AWS services; the domain itself must already belong to the owner. The template deliberately has no NAT Gateway, load balancer, RDS, Elastic IP or automatic scaling. It fixes the instance type to `t3.micro` with standard CPU credits to avoid surplus CPU-credit charging. A small prebuilt image is pulled from GHCR, so no Node build runs on the micro instance.

## 3. Publish the tested image

The GitHub workflow should publish `ghcr.io/240103126-beep/promptshelf:<full-commit-sha>` for `linux/amd64` after tests pass. In GitHub **Packages → promptshelf → Package settings**, set the package visibility to **Public** so EC2 can pull it without storing a registry password. The source repository must also remain public for revision downloads.

Use the exact passing 40-character SHA, not `latest`. Review the CloudFormation template locally:

```sh
cfn-lint deploy/cloudformation.yaml
```

## 4. Create the stack after account-owner approval

Use an authenticated AWS CLI profile for the initial creation only. When optional GitHub deployment is enabled, its deployment role is deliberately unable to create or update infrastructure.

```sh
export AWS_REGION=ap-southeast-2
export AWS_STACK_NAME=promptshelf-course
revision=$(git rev-parse HEAD)
aws cloudformation deploy \
  --region "$AWS_REGION" \
  --stack-name "$AWS_STACK_NAME" \
  --template-file deploy/cloudformation.yaml \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides InitialRevision="$revision" EnablePullDeployment=true EnableGitHubDeployment=false
aws cloudformation describe-stacks \
  --region "$AWS_REGION" --stack-name "$AWS_STACK_NAME" \
  --query 'Stacks[0].Outputs'
```

Only after confirming supported permissions and obtaining the owner's approval, enable GitHub deployment by setting `EnableGitHubDeployment=true` in a stack update. If the account already contains `token.actions.githubusercontent.com` in IAM → Identity providers, also pass `ExistingGitHubOidcProviderArn=arn:aws:iam::<account-id>:oidc-provider/token.actions.githubusercontent.com`; an account cannot create that provider twice. That ARN is ignored while GitHub deployment is disabled. If provider access is denied, retain the default disabled OIDC setting and use the pull timer; do not activate advanced features or upgrade the plan.

The stack waits for the instance to install Docker, pull the tested image, start app + PostgreSQL with Compose and pass `/api/health`. A failed bootstrap fails creation instead of presenting a working deployment. The database password is generated on the instance and stored in a root-readable file, not in the template, Git, workflow logs or parameters.

`AppUrl` is a temporary public IPv4 HTTP URL. The instance address can change after stopping/starting it. To enable HTTPS with an existing domain, pass `DomainName=your-domain.example` during creation and point its DNS A record to the `InstancePublicIp` output as soon as the instance starts. Caddy obtains a certificate and redirects HTTP to HTTPS; public health verification will wait for DNS/certificate readiness. The domain mode requires public HTTP/HTTPS access for certificate issuance. Use only synthetic coursework data. A real shared service additionally needs authentication, external backups and a managed database.

## 5. Automatic deployment on a Free project

`EnablePullDeployment=true` is the default. After the initial Compose deployment passes its health checks, CloudFormation installs `deploy/install-autodeploy.sh` from that exact `InitialRevision`. **Choose an initial revision that contains the installer and poller and has completed CI successfully**; an older revision without those files cannot enable the timer.

The timer starts three minutes after boot and checks every two minutes. Each check makes one anonymous request to the public `ci.yml` workflow endpoint (about 30 requests/hour). It accepts only a completed successful `push` run on `main` for `240103126-beep/PromptShelf`, the expected workflow path and a full 40-character SHA. Failed runs, PRs, other branches, other repositories and the current revision are skipped. The existing `/opt/promptshelf/deploy.sh` serializes deployment with `flock`, pulls the immutable image, waits for Compose health and records the revision only after the final health check succeeds. No new AWS resources, credentials or IAM provider permissions are needed.

For an existing host, first deploy a tested revision containing the installer through the existing owner-approved SSM path, then install its timer as root:

```sh
/opt/promptshelf/releases/<passing-full-sha>/deploy/install-autodeploy.sh
systemctl list-timers promptshelf-autodeploy.timer
journalctl -u promptshelf-autodeploy.service --since '15 minutes ago'
cat /opt/promptshelf/current-revision
```

Verify automatic delivery by pushing a change, waiting for its entire CI workflow to succeed, and confirming that `current-revision` changes to that full SHA within the next timer cycle. Keep the GitHub repository, CI run metadata and SHA image public; private repositories require a different authentication design. To pause automatic updates for maintenance or rollback, run `systemctl stop promptshelf-autodeploy.timer` and re-enable it with `systemctl start promptshelf-autodeploy.timer` afterward. `EnablePullDeployment=false` skips installing the timer on a new host; changing that parameter on an existing instance alone does not remove an already-installed timer.

### Optional OIDC push deployment

Use only one deployment method. To switch to the optional OIDC method, disable the pull timer on the host and set `EnablePullDeployment=false` in the template. The following setup applies only after `EnableGitHubDeployment=true` was approved and successfully deployed. The `GitHubDeployRoleArn` output is absent while the option is false. Do not enable `AWS_DEPLOY_ENABLED` in GitHub for a stack without that role.

In GitHub **Settings → Secrets and variables → Actions → Variables**, configure:

| Variable | Value |
| --- | --- |
| `AWS_REGION` | The region used for the stack |
| `AWS_STACK_NAME` | `promptshelf-course` or the chosen name |
| `AWS_ROLE_ARN` | The `GitHubDeployRoleArn` stack output |
| `AWS_DEPLOY_ENABLED` | `true` only after the owner has approved and created the stack |

The deployment job requires `id-token: write` and should use `aws-actions/configure-aws-credentials` with that role. It must run only on pushes to `main`, after all tests and image publication succeed. Its final step is:

```sh
bash deploy/aws-deploy.sh "$GITHUB_SHA"
```

Do not add a GitHub job `environment:` without also changing the OIDC subject policy: environment jobs have a different subject claim. The supplied trust policy is restricted to `repo:240103126-beep/PromptShelf:ref:refs/heads/main`. [AWS GitHub OIDC trust guidance](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html).

## 6. Verify and roll back

After deployment, open the URL, create an item, reload and confirm it remains. Check `/api/health`, the GitHub workflow and the SSM command result. A healthy endpoint alone is not a full user-flow check.

Pause the pull timer before a rollback so it does not automatically return to the latest passing build. To roll back the app, run the same deployment script with an earlier tested full SHA whose GHCR image is still available. Database schema changes require a separate migration/backup plan; do not assume an image rollback restores old data.

```sh
bash deploy/aws-deploy.sh <earlier-passing-40-character-sha>
```

On the EC2 instance, Systems Manager Session Manager can inspect:

```sh
cat /opt/promptshelf/current-revision
docker ps
docker logs --tail=100 promptshelf-app-1
```

Do not print `/opt/promptshelf/.env` into logs.

## 7. Export data and remove all resources

First export the app's sample collections or take an explicit database backup if needed. Deleting this stack deletes the EC2 root disk and the database volume on it. Do not leave resources running after marking.

```sh
aws cloudformation delete-stack --region "$AWS_REGION" --stack-name "$AWS_STACK_NAME"
aws cloudformation wait stack-delete-complete --region "$AWS_REGION" --stack-name "$AWS_STACK_NAME"
```

Inspect the console to confirm EC2, EBS and network resources are gone, then remove the GitHub deployment variables. If optional GitHub deployment was enabled, an OIDC provider supplied through `ExistingGitHubOidcProviderArn` is shared and is retained. A provider created by this stack is deleted with it. With the default disabled setting, neither GitHub identity resource is created. Remove any Render preview resources separately from its dashboard.


## Existing SQLite data

New Compose installations use PostgreSQL automatically. To transfer an existing
SQLite library, take a copy of its database first and use
`backend/migrate_data.py` against an **empty** target database with `SEED=0`.
The utility preserves item IDs and relationships, imports in a transaction,
refuses nonempty destinations and resets PostgreSQL sequences. It reads the
source SQLite file without changing it. Set `DATABASE_URL` through the process
environment, not a committed file or a public issue comment.

```sh
# With Python dependencies installed, from backend/:
# Set DATABASE_URL to the empty PostgreSQL destination in your private shell.
../.venv/bin/python migrate_data.py --source /path/to/backup.db
```

After migration, start the app against that destination and confirm item,
collection, tag and category counts before retiring the source backup.
