#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/docs-deploy.sh commit "docs: update"
#   scripts/docs-deploy.sh build
#   scripts/docs-deploy.sh publish
#   scripts/docs-deploy.sh setup-actions

REPO_SLUG="empowerID/empowernow_docs"

case "${1:-}" in
  commit)
    git add -A
    git commit -m "${2:-docs: update}" || echo "Nothing to commit"
    git push github main
    ;;
  build)
    npm ci --no-audit --fund=false
    npm run build
    ;;
  publish)
    npm run build
    TMPDIR="$(mktemp -d)"
    cp -R build/* "$TMPDIR"/
    pushd "$TMPDIR" >/dev/null
    git init
    git checkout -b gh-pages
    touch .nojekyll
    git add -A
    git commit -m "publish"
    GITHUB_TOKEN=$(gh auth token)
    git remote add origin "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO_SLUG}.git"
    git push origin gh-pages -f
    popd >/dev/null
    rm -rf "$TMPDIR"
    ;;
  setup-actions)
    mkdir -p .github/workflows
    cat > .github/workflows/deploy.yml <<'YAML'
name: Deploy Docusaurus to GitHub Pages
on:
  push: { branches: [ main ] }
permissions: { contents: write }
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 18 }
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: build
          force_orphan: true
YAML
    git add .github/workflows/deploy.yml
    git commit -m "ci: add gh-pages deploy workflow" || true
    git push github main
    echo "Enable Actions and set Pages to gh-pages/(root) in repo settings."
    ;;
  *)
    echo "Usage: $0 {commit|build|publish|setup-actions}"
    exit 1
    ;;
esac


