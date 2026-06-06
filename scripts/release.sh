#!/bin/bash

# Release Helper Script for Livicat
# Creates a release branch and triggers GitHub Actions build

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Livicat Release Helper${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}Current version: ${YELLOW}v${VERSION}${NC}"

# Check if git is clean
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}Error: Working directory is not clean${NC}"
    echo "Please commit or stash changes first"
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${GREEN}Current branch: ${YELLOW}${CURRENT_BRANCH}${NC}"

# Check if we're on main or a release branch
if [[ "$CURRENT_BRANCH" != "main" ]] && [[ ! "$CURRENT_BRANCH" =~ ^release/ ]]; then
    echo -e "${YELLOW}Warning: You're not on main or a release branch${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create release branch
BRANCH_NAME="release/app"
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
echo -e "${BLUE}Ready to push and trigger release build${NC}"
echo -e "${YELLOW}Version: v${VERSION}${NC}"
echo -e "${YELLOW}Branch: ${BRANCH_NAME}${NC}"
echo ""
read -p "Push to GitHub and create release? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborted${NC}"
    git checkout "$CURRENT_BRANCH"
    exit 1
fi

# Push to GitHub
echo -e "${GREEN}Pushing to GitHub...${NC}"
git push -u origin "$BRANCH_NAME"
echo -e "${GREEN}✓ Pushed to GitHub${NC}"

# Monitor the workflow
echo ""
echo -e "${BLUE}GitHub Actions workflow triggered!${NC}"
echo -e "${GREEN}Watch the build at:${NC}"
echo "https://github.com/kg20dev/livicat/actions"

# Open in browser (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    sleep 2
    open "https://github.com/kg20dev/livicat/actions"
fi

echo ""
echo -e "${GREEN}✓ Release build started!${NC}"
echo -e "${YELLOW}The release will be automatically created when the build completes${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Monitor the build on GitHub Actions"
echo "2. Once complete, check the release at:"
echo "   https://github.com/kg20dev/livicat/releases"
echo "3. Download and test the installers"
echo ""
echo -e "${GREEN}Happy releasing! 🎉${NC}"
