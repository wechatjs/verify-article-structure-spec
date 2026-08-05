#!/usr/bin/env bash
# 把 packages/verify-article-structure-spec 当前内容作为新 commit 推送到独立仓 master 分支
#
# 工作方式：
#   1. clone 独立仓到临时目录
#   2. 用 rsync 把 spec 目录内容覆盖到临时目录（保留 .git）
#   3. commit + push（fast-forward，不 force）
#
# 用法：
#   pnpm run push:spec
#
# 独立仓：https://git.woa.com/daisyhhuang/verify-article-structure-spec

set -euo pipefail

REMOTE_URL="https://git.woa.com/daisyhhuang/verify-article-structure-spec.git"
REMOTE_BRANCH="master"

# 1. 定位主仓根目录与 spec 包目录
MAIN_REPO_ROOT="$(git rev-parse --show-toplevel)"
SPEC_DIR="${MAIN_REPO_ROOT}/packages/verify-article-structure-spec"

if [ ! -d "${SPEC_DIR}" ]; then
  echo "❌ 找不到 spec 包目录：${SPEC_DIR}"
  exit 1
fi

# 2. 收集主仓上下文
MAIN_COMMIT_SHA="$(git -C "${MAIN_REPO_ROOT}" rev-parse --short HEAD)"
MAIN_COMMIT_SUBJECT="$(git -C "${MAIN_REPO_ROOT}" log -1 --pretty=%s)"
MAIN_BRANCH="$(git -C "${MAIN_REPO_ROOT}" rev-parse --abbrev-ref HEAD)"

# 3. 准备临时目录
TMP_DIR="$(mktemp -d -t verify-spec-push-XXXXXX)"
trap 'rm -rf "${TMP_DIR}"' EXIT

echo "📦 同步 spec 包到独立仓"
echo "   源：${SPEC_DIR}"
echo "   目标：${REMOTE_URL} (${REMOTE_BRANCH})"
echo "   主仓 commit：${MAIN_COMMIT_SHA} on ${MAIN_BRANCH}"
echo ""

# 4. clone 独立仓（浅克隆，加速）
echo "→ Clone 独立仓..."
git clone --depth 1 --branch "${REMOTE_BRANCH}" "${REMOTE_URL}" "${TMP_DIR}/repo" 2>&1 | sed 's/^/    /'

# 5. 用 rsync 同步内容（--delete 让独立仓与 spec 目录完全一致，但保留 .git）
echo "→ 同步文件（rsync --delete）..."
rsync -a --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='*.log' \
  --exclude='.DS_Store' \
  "${SPEC_DIR}/" "${TMP_DIR}/repo/"

# 6. 检查是否有变更
cd "${TMP_DIR}/repo"
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  echo ""
  echo "✅ 内容已是最新，无需推送"
  exit 0
fi

# 7. commit + push
git add -A

# 继承主仓的 git 用户配置（工蜂会校验 committer 邮箱属于 push 用户）
GIT_USER_NAME="$(git -C "${MAIN_REPO_ROOT}" config user.name 2>/dev/null || git config --global user.name 2>/dev/null || echo "")"
GIT_USER_EMAIL="$(git -C "${MAIN_REPO_ROOT}" config user.email 2>/dev/null || git config --global user.email 2>/dev/null || echo "")"

if [ -z "${GIT_USER_NAME}" ] || [ -z "${GIT_USER_EMAIL}" ]; then
  echo "❌ 找不到 git user.name / user.email，请先在主仓配置："
  echo "   git config user.name <你的名字>"
  echo "   git config user.email <你的工蜂邮箱>"
  exit 1
fi

COMMIT_MSG="sync from mmbizwebnew @${MAIN_COMMIT_SHA}

${MAIN_COMMIT_SUBJECT}

Source: mmbizwebnew/${MAIN_BRANCH} @ ${MAIN_COMMIT_SHA}
Path:   packages/verify-article-structure-spec"

git -c "user.name=${GIT_USER_NAME}" \
    -c "user.email=${GIT_USER_EMAIL}" \
    commit -q -m "${COMMIT_MSG}"

echo "→ 推送到 ${REMOTE_BRANCH}..."
git push origin "${REMOTE_BRANCH}"

echo ""
echo "✅ 推送完成"
echo "   独立仓：${REMOTE_URL}"
echo "   分支：${REMOTE_BRANCH}"
echo "   关联主仓 commit：${MAIN_COMMIT_SHA}"
