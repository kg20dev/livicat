# Branch Protection Setup Guide

Branch protection rules need to be configured manually in GitHub settings. The API approach has compatibility issues, so manual setup is recommended.

## Manual Setup Steps

1. **Navigate to Settings:**
   - Go to: https://github.com/kg20dev/livicat/settings/branches

2. **Create Branch Rule:**
   - Click "Add rule" for the `main` branch
   - In "Branch name pattern", type: `main`

3. **Configure Protection Settings:**

   **☑️ Require pull request reviews before merging**
   - ✅ Require at least one approval
   - ✅ Dismiss stale reviews when new commits are pushed

   **☑️ Require status checks to pass before merging**
   - ✅ Require branches to be up to date before merging
   - Required checks:
     - Type: `CI`
     - Click "Add check" and enter: `CI`

   **☑️ Restrict who can push to matching branches**
   - Click "Add access restriction"
   - Add: `migorengx`

   **☑️ Do not allow bypassing the above settings**
   - ✅ Enable this option

4. **Save Changes:**
   - Click "Create" or "Save changes"

## Verification

After setup, verify the rules are active:

```bash
# Check if branch protection is enabled
gh api repos/kg20dev/livicat/branches/main/protection
```

Expected response should include protection rules (not "Branch not protected").

## Current Workflow Protection

Our `.github/workflows/ci.yml` creates a `CI` status check that includes:
- **Lint:** ESLint and Prettier
- **Type Check:** TypeScript compilation
- **Tests:** Jest test suite
- **Build:** Production build verification

This ensures all PRs are quality-checked before merging to main.

## Important Notes

⚠️ **Setup Required:** Branch protection must be configured manually before main development begins.

⚠️ **CI Status Check:** The `CI` check will only be active after the first CI workflow runs successfully.

⚠️ **Review Requirements:** All PRs to main require at least 1 approval from migorengx.

## Troubleshooting

If branch protection isn't working:
1. Verify the `CI` status check exists (check recent commits/PRs)
2. Ensure you're using the correct branch name (`main`)
3. Check that migorengx has proper permissions
4. Verify GitHub Actions are enabled for the repository
