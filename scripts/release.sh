#!/bin/bash

# Release Helper Script for Livicat
# Creates a release branch, increments version, and triggers GitHub Actions build

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Livicat Release Helper${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}Current version: ${YELLOW}v${CURRENT_VERSION}${NC}"

# Check if git is clean
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}Error: Working directory is not clean${NC}"
    echo "Please commit or stash changes first"
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${GREEN}Current branch: ${YELLOW}${CURRENT_BRANCH}${NC}"

# Check if we're on main
if [[ "$CURRENT_BRANCH" != "main" ]]; then
    echo -e "${RED}Error: Please switch to main branch first${NC}"
    echo "Run: git checkout main"
    exit 1
fi

# Ask for version increment type
echo ""
echo -e "${CYAN}Select version increment:${NC}"
echo "1) patch (${YELLOW}0.5.0${NC} → ${YELLOW}0.5.1${NC}) - Bug fixes"
echo "2) minor (${YELLOW}0.5.0${NC} → ${YELLOW}0.6.0${NC}) - New features"
echo "3) major (${YELLOW}0.5.0${NC} → ${YELLOW}1.0.0${NC}) - Breaking changes"
echo ""

read -p "Choose increment type (1/2/3, default: 1): " INCREMENT_TYPE
INCREMENT_TYPE=${INCREMENT_TYPE:-1}

case $INCREMENT_TYPE in
    1)
        INCREMENT="patch"
        ;;
    2)
        INCREMENT="minor"
        ;;
    3)
        INCREMENT="major"
        ;;
    *)
        echo -e "${RED}Invalid choice. Defaulting to patch.${NC}"
        INCREMENT="patch"
        ;;
esac

echo ""
echo -e "${GREEN}Selected: ${YELLOW}${INCREMENT}${NC} ${GREEN}version increment${NC}"

# Increment version
echo ""
echo -e "${GREEN}Incrementing version...${NC}"
npm version $INCREMENT --no-git-tag-version > /dev/null

NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}✓ Version bumped to: ${YELLOW}v${NEW_VERSION}${NC}"

# Commit the version change
git add package.json package-lock.json
git commit -m "chore: bump version to v${NEW_VERSION}"
echo -e "${GREEN}✓ Committed version bump${NC}"

# Create release branch
BRANCH_NAME="release/app"
echo ""
echo -e "${GREEN}Creating release branch: ${YELLOW}${BRANCH_NAME}${NC}"

# Check if branch already exists
if git show-ref --verify --quiet refs/heads/"$BRANCH_NAME"; then
    echo -e "${YELLOW}Branch ${BRANCH_NAME} already exists${NC}"
    read -p "Delete and recreate? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git branch -D "$BRANCH_NAME"
    else
        echo -e "${RED}Aborting${NC}"
        exit 1
    fi
fi

git checkout -b "$BRANCH_NAME"
echo -e "${GREEN}✓ Created branch ${BRANCH_NAME}${NC}"

# Ask for confirmation
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Ready to Release${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Old version: ${YELLOW}v${CURRENT_VERSION}${NC}"
echo -e "${GREEN}New version: ${YELLOW}v${NEW_VERSION}${NC}"
echo -e "${GREEN}Branch: ${YELLOW}${BRANCH_NAME}${NC}"
echo ""
echo -e "${CYAN}This will:${NC}"
echo "  1. Push release branch to GitHub"
echo "  2. Trigger Electron app builds (macOS + Windows)"
echo "  3. Create GitHub Release v${NEW_VERSION}"
echo "  4. Attach DMG and EXE installers"
echo ""
read -p "Continue with release? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborted${NC}"
    git checkout main
    git branch -D "$BRANCH_NAME" 2>/dev/null || true
    # Reset the version commit
    git reset --hard HEAD~1
    exit 1
fi

# Push to GitHub
echo ""
echo -e "${GREEN}Pushing to GitHub...${NC}"
git push -u origin "$BRANCH_NAME"
echo -e "${GREEN}✓ Pushed to GitHub${NC}"

# Monitor the workflow
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  GitHub Actions Build Started${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Watch the build:${NC}"
echo "https://github.com/kg20dev/livicat/actions"
echo ""
echo -e "${CYAN}Expected wait time:${NC} 3-5 minutes"
echo ""

# Open in browser (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    sleep 2
    open "https://github.com/kg20dev/livicat/actions"
fi

echo -e "${GREEN}✓ Release build started!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Monitor the build on GitHub Actions (~3 min)"
echo "2. Check the release at:"
echo "   https://github.com/kg20dev/livicat/releases"
echo "3. Download and test the installers"
echo "4. Merge release branch to main"
echo ""
echo -e "${GREEN}Happy releasing! 🎉${NC}"
