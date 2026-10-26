#!/usr/bin/env bash
# Manual alternative to the GitHub Actions workflow: build locally and push the
# result to the `gh-pages` branch (Settings > Pages > Deploy from a branch).
#
#   bash scripts/deploy-gh-pages.sh
#
# It never touches DNS and never force-pushes anything but the gh-pages branch.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -n "$(git status --porcelain)" ]; then
    echo "Working tree has uncommitted changes. Commit or stash them first." >&2
    exit 1
fi

pnpm install --frozen-lockfile
pnpm run check
pnpm run build

# GitHub needs these two files in the branch root:
#   CNAME      keeps the custom domain (also copied from public/)
#   .nojekyll  stops GitHub from running Jekyll over the output
test -f dist/CNAME || echo "franle.blog" > dist/CNAME
touch dist/.nojekyll

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
cp -R dist/. "$tmp/"

cd "$tmp"
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git push --force "$OLDPWD" gh-pages:gh-pages
cd "$OLDPWD"

echo "Local gh-pages branch updated. Push it with:  git push origin gh-pages --force"
