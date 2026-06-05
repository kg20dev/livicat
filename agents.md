# Livicat Project - Development Workflow

## Project Overview

**Livicat** is a desktop local web-based React application designed as a YouTube Live Chat editor for OBS (Open Broadcaster Software). The app provides a customizable interface for managing and displaying live chat overlays.

## Workflow Pattern

For every feature, bugfix, or change:

```
Issue → Branch → Pull Request → Merge to Main
```

## Process Steps

### 1. Create Issue
- Always start with a GitHub issue
- Use descriptive titles and clear descriptions
- Label with appropriate tags:
  - `feature` - New features
  - `bug` - Bug fixes
  - `enhancement` - Improvements to existing features
  - `refactor` - Code refactoring
  - `docs` - Documentation changes
  - `style` - Styling changes
  - `test` - Adding or updating tests
- Reference issue number in commits and branches
- Use the issue template: `.github/ISSUE_TEMPLATE/feature_request.md` or `.github/ISSUE_TEMPLATE/bug_report.md`

### 2. Create Branch
- Create feature branch from `main`
- **Naming convention:** `TYPE/ISSUE-NUMBER-short-description`
- Examples:
  - `feature/42-add-chat-customization`
  - `fix/13-fix-emoji-rendering`
  - `refactor/28-cleanup-chat-component`
- Use `gh issue develop` to automatically create and checkout branch

### 3. Development
- Work on your feature branch
- Make atomic, logical commits (one logical change per commit)
- Commit message format: `TYPE: brief description (Refs #ISSUE-NUMBER)`
- Examples:
  - `feat: add theme selector (Refs #42)`
  - `fix: prevent emoji overflow (Refs #13)`
  - `refactor: extract chat logic to custom hook (Refs #28)`
- Follow project coding standards and React best practices
- Write/update tests for new features
- Run tests locally before pushing

### 4. Create Pull Request
- Push branch to GitHub: `git push -u origin feature/42-add-chat-customization`
- Create pull request using `gh pr create` or GitHub UI
- PR should include:
  - Clear title: `[#42] Add chat customization options`
  - Description with:
    - Summary of changes
    - Related issue link: `Closes #42`
    - Screenshots (if UI changes)
    - Testing notes
  - Fill in the PR template
- Link automatically closes issue when merged: `Closes #42`

### 5. Review & Merge
- **CI Requirements:**
  - All tests must pass
  - Linting must pass
  - No TypeScript errors
- **Review Requirements:**
  - At least 1 reviewer approval required
  - Address review feedback
  - Ensure no merge conflicts
- **Merge Strategy:**
  - Use **squash merge** to keep main clean
  - Delete branch after merge

## Branch Naming Convention

| Type | Prefix | Example |
|------|--------|---------|
| New Features | `feature/` | `feature/42-add-dark-mode` |
| Bug Fixes | `fix/` | `fix/13-fix-scroll-bug` |
| Hotfix (urgent) | `hotfix/` | `hotfix/99-security-patch` |
| Refactoring | `refactor/` | `refactor/28-improve-performance` |
| Documentation | `docs/` | `docs/35-update-readme` |
| Styling | `style/` | `style/19-update-chat-bubble` |
| Tests | `test/` | `test/07-add-component-tests` |

## Git Configuration

This project uses GitHub account: **migorengx**

Ensure your local git config is set correctly:
```bash
git config user.name "migorengx"
git config user.email "your-email@example.com"
```

To switch to migorengx account:
```bash
gh auth switch --username migorengx
```

## GitHub CLI Workflow

```bash
# Switch to project account
gh auth switch --username migorengx

# Create feature issue
gh issue create --title "Add dark mode toggle" --body "Add dark mode for better OBS visibility" --label feature

# Create and checkout feature branch from issue
gh issue list
gh issue develop 42  # Creates and checks out feature/42-branch-name

# Work on changes...
git add .
git commit -m "feat: add dark mode toggle (Refs #42)"
git push -u origin feature/42-add-dark-mode-toggle

# Create PR
gh pr create --title "[#42] Add dark mode toggle" --body "Closes #42" --base main

# View PR status
gh pr checks 42  # Replace with PR number
gh pr view 42

# Merge PR (after approval)
gh pr merge 42 --squash --delete-branch
```

## Branch Protection Rules (GitHub Settings)

The `main` branch has the following protection rules:

1. **Require pull request reviews before merging**
   - Require approval from: 1 reviewer
   - Dismiss stale reviews when new commits are pushed

2. **Require status checks to pass before merging**
   - Require branches to be up to date before merging
   - Required checks:
     - CI (Tests)
     - Lint
     - TypeScript Check

3. **Restrict who can push to main**
   - Only allow: migorengx (and admins)

4. **Do not allow bypassing the above settings**

## Technology Stack

- **Frontend:** React, TypeScript
- **Desktop:** Electron (for local desktop app)
- **Streaming:** YouTube Live Chat API integration
- **OBS:** Browser source integration
- **Testing:** Jest, React Testing Library
- **Linting:** ESLint, Prettier
- **Build:** Vite or webpack

## Development Guidelines

### Component Structure
- Organize components by feature
- Keep components small and focused
- Use TypeScript for all new components
- Write tests for UI components

### State Management
- Use React hooks (useState, useEffect, useContext)
- Consider Zustand or Redux for complex state if needed

### Styling
- Use CSS Modules or styled-components
- Ensure OBS compatibility (dark backgrounds, high contrast)
- Test in different OBS scene sizes

### YouTube Chat Integration
- Handle chat connection errors gracefully
- Implement rate limiting for API calls
- Filter and display messages efficiently

### Performance
- Virtualize long chat lists (react-window)
- Debounce chat input/filtering
- Monitor memory usage for long-running OBS sessions

## CI/CD Pipeline

- **Trigger:** On every pull request to `main`
- **Jobs:**
  1. **Lint:** Run ESLint and Prettier
  2. **Type Check:** TypeScript compilation check
  3. **Tests:** Run Jest tests
  4. **Build:** Verify production build succeeds

## Resources

- **GitHub Repository:** https://github.com/kg20dev/livicat
- **GitHub Issues:** https://github.com/kg20dev/livicat/issues
- **GitHub Pull Requests:** https://github.com/kg20dev/livicat/pulls
- **OBS Studio:** https://obsproject.com/
- **YouTube Live Chat API:** https://developers.google.com/youtube/v3/live

## First-Time Setup

1. **Clone repository:**
   ```bash
   git clone https://github.com/kg20dev/livicat.git
   cd livicat
   ```

2. **Configure git:**
   ```bash
   git config user.name "migorengx"
   git config user.email "your-email@example.com"
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Set up GitHub CLI:**
   ```bash
   gh auth login
   # Select GitHub.com
   # Select SSH or HTTPS
   # Select login with browser
   # Authorize migorengx account
   ```

5. **Create first issue:**
   ```bash
   gh issue create --title "Initial setup" --body "Set up project structure and basic components" --label feature
   gh issue develop 1
   ```

## ⚠️ Critical Lessons Learned

### Pre-Flight Checklist (MANDATORY)

**Before ANY git work, ALWAYS verify:**

```bash
# 1. Check git config is correct
git config user.name    # Must be: migorengx
git config user.email   # Must be: 144900892+migorengx@users.noreply.github.com

# 2. Verify GitHub auth account
gh auth status           # Active account must be: migorengx

# 3. Switch to correct account if needed
gh auth switch -u migorengx

# 4. Verify before committing
git log --format='%an %ae' -1   # Last commit must show migorengx
```

### Workflow Discipline

**ALWAYS follow this order:**
1. **Understand** - What needs to be done
2. **Verify** - Check git config, GitHub auth, environment
3. **Plan** - Design the approach
4. **Execute** - Implement with verified setup
5. **Verify Results** - Ensure correctness before pushing

**NEVER skip verification steps.**

### Critical Rules

1. **Never assume configuration is correct** - Always verify before work
2. **Never rush into execution** - Check prerequisites first
3. **Never commit without verification** - Check git log before pushing
4. **Always use migorengx account** - For all GitHub operations
5. **Test before executing** - Ensure setup works properly

### Common Mistakes to Avoid

- ❌ Assuming git config is correct without checking
- ❌ Making commits before verifying authorship
- ❌ Pushing without reviewing commit history
- ❌ Skipping pre-flight checks
- ❌ Rushing execution without proper planning

### Recovery Procedures

**If wrong author detected:**

```bash
# Stop immediately, do not push
# Fix git config:
git config user.name "migorengx"
git config user.email "144900892+migorengx@users.noreply.github.com"

# Amend commit if not pushed:
git commit --amend --reset-author

# If already pushed, create new branch with correct commits
# Better to be safe than create cleanup work
```

**Key Principle:** Prevention over correction. 1 minute of verification saves hours of cleanup.

Happy coding! 🚀
