#!/usr/bin/env bash
# Deploys the Mirador demo site (demo/*.html, including stitching.html and layers-open.html)
# to S3 + CloudFront. One CloudFormation stack per environment.
#
# Usage:
#   deploy/deploy.sh test|prod [--skip-tests] [--yes]
#
# Environment variables:
#   AWS_PROFILE        AWS CLI profile to use (optional; otherwise the default credential chain)
#   AWS_REGION         region for the stack and bucket (default: us-east-1)
#   STACK_PREFIX       stack name prefix (default: mirador-demo), giving e.g. mirador-demo-test
#   DOMAIN_NAME        optional custom domain for this environment
#   CERTIFICATE_ARN    ACM certificate in us-east-1 for DOMAIN_NAME
#
# prod refuses to deploy uncommitted changes or anything other than the main branch,
# always runs the full test suite, and asks for confirmation unless --yes is given.
set -euo pipefail

ENVIRONMENT="${1:-}"
shift || true
SKIP_TESTS=false
ASSUME_YES=false
for arg in "$@"; do
  case "$arg" in
    --skip-tests) SKIP_TESTS=true ;;
    --yes) ASSUME_YES=true ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

if [[ "$ENVIRONMENT" != "test" && "$ENVIRONMENT" != "prod" ]]; then
  echo "Usage: $0 test|prod [--skip-tests] [--yes]" >&2
  exit 2
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export AWS_REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="${STACK_PREFIX:-mirador-demo}-${ENVIRONMENT}"
DOMAIN_NAME="${DOMAIN_NAME:-}"
CERTIFICATE_ARN="${CERTIFICATE_ARN:-}"
GIT_SHA="$(git rev-parse --short HEAD)"

step() { printf '\n==> %s\n' "$*"; }

if [[ -n "$DOMAIN_NAME" && -z "$CERTIFICATE_ARN" ]]; then
  echo "DOMAIN_NAME is set, so CERTIFICATE_ARN (an ACM certificate in us-east-1) is required." >&2
  exit 2
fi

if [[ "$ENVIRONMENT" == "prod" ]]; then
  if [[ "$SKIP_TESTS" == true ]]; then
    echo "--skip-tests is not allowed for prod." >&2
    exit 2
  fi
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "Working tree has uncommitted changes; commit or stash them before deploying to prod." >&2
    exit 1
  fi
  BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  if [[ "$BRANCH" != "main" ]]; then
    echo "prod deploys from main only (current branch: $BRANCH)." >&2
    exit 1
  fi
fi

step "Checking AWS credentials"
aws sts get-caller-identity --query 'Arn' --output text

if [[ "$ENVIRONMENT" == "prod" && "$ASSUME_YES" != true ]]; then
  read -r -p "Deploy $GIT_SHA to PROD ($STACK_NAME in $AWS_REGION)? [y/N] " answer
  [[ "$answer" == "y" || "$answer" == "Y" ]] || { echo "Aborted."; exit 1; }
fi

step "Installing dependencies"
npm ci

if [[ "$SKIP_TESTS" == true ]]; then
  step "Skipping tests (--skip-tests)"
else
  step "Running tests (build, lint, size, vitest)"
  npm test
fi

step "Building the demo site"
# NETLIFY switches vite.config.js to its site build: every demo/*.html page plus the test fixtures
rm -rf dist
NETLIFY=true npx vite build --config vite.config.js
echo "$GIT_SHA" > dist/version.txt

step "Deploying CloudFormation stack $STACK_NAME"
aws cloudformation deploy \
  --stack-name "$STACK_NAME" \
  --template-file deploy/site.yaml \
  --no-fail-on-empty-changeset \
  --parameter-overrides \
    "Environment=$ENVIRONMENT" \
    "DomainName=$DOMAIN_NAME" \
    "CertificateArn=$CERTIFICATE_ARN" \
  --tags "Environment=$ENVIRONMENT" "Application=mirador-demo"

output() {
  aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
BUCKET="$(output BucketName)"
DISTRIBUTION_ID="$(output DistributionId)"
SITE_URL="$(output SiteUrl)"

step "Uploading to s3://$BUCKET"
# hashed bundles never change, so browsers may cache them for a year
aws s3 sync dist/assets "s3://$BUCKET/assets" --delete \
  --cache-control "public, max-age=31536000, immutable"
# pages, fixtures and everything else must be re-fetched after each deploy
aws s3 sync dist "s3://$BUCKET" --delete --exclude "assets/*" \
  --cache-control "public, max-age=0, must-revalidate"

step "Invalidating CloudFront cache"
INVALIDATION_ID="$(aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" \
  --paths '/*' --query 'Invalidation.Id' --output text)"
aws cloudfront wait invalidation-completed --distribution-id "$DISTRIBUTION_ID" --id "$INVALIDATION_ID"

step "Smoke test"
for path in /version.txt /demo/stitching.html /layers-open; do
  status="$(curl -s -o /dev/null -w '%{http_code}' "$SITE_URL$path")"
  echo "$status $SITE_URL$path"
  [[ "$status" == "200" ]] || { echo "Smoke test failed for $path" >&2; exit 1; }
done
deployed="$(curl -s "$SITE_URL/version.txt")"
[[ "$deployed" == "$GIT_SHA" ]] || { echo "Site reports version $deployed, expected $GIT_SHA" >&2; exit 1; }

step "Deployed $GIT_SHA to $ENVIRONMENT"
echo "$SITE_URL/demo/stitching.html"
echo "$SITE_URL/demo/layers-open.html?manifest=<manifest URL>"
