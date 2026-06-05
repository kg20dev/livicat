# Branch Protection Setup Guide

The branch protection rules couldn't be set up automatically via API due to GitHub's complex schema. Please configure them manually in the GitHub repository settings.

## Manual Setup Steps

1. Go to: https://github.com/kg20dev/livicat/settings/branches
2. Click "Add rule" for the `main` branch
3. Configure the following settings:

### Branch Protection Settings for `main`

**Require pull request reviews before merging**
- ✅ Require at least one approval
- Dismiss stale reviews when new commits are pushed

**Require status checks to pass before merging**
- ✅ Require branches to be up to date before merging
- Required checks:
  - `CI` (from our workflow)

**Restrict who can push to matching branches**
- ✅ Only allow: `migorengx`

**Do not allow bypassing the above settings**
- ✅ Enable this option

## Alternative: GitHub CLI Setup

If you prefer command-line setup, try this simplified version:

```bash
gh api repos/kg20dev/livicat/branches/main/protection \
  --method PUT \
  --field required_pull_request_reviews='{"required_approving_review_count":1}' \
  --field enforce_admins=false \
  --field required_status_checks='{"strict":true,"checks":[{"context":"CI"}]}' \
  --field restrictions=null
```

## Verification

After setup, verify with:
```bash
gh api repos/kg20dev/livicat/branches/main/protection
```

## Current Workflow Protection

Our `.github/workflows/ci.yml` creates a `CI` status check that includes:
- Lint (ESLint)
- Type Check (TypeScript)
- Tests
- Build verification

This ensures all PRs are quality-checked before merging to main.
