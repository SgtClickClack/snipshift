# Vercel Ignored Build Step Configuration Guide

## Overview
This guide configures Vercel to only build projects when files in their specific directories change, preventing redundant builds when lockfiles or unrelated files are updated.

## Project Structure
- **Frontend (snipshift-web)**: Root directory (`.`) - contains `src/`, `package.json`, `vite.config.ts`, etc.
- **Backend (snipshift-api)**: `api/` directory - contains `api/_src/`, `api/package.json`, etc.

## Configuration Steps

### Option 1: Separate Vercel Projects (Recommended)

If you have two separate Vercel projects:

#### Frontend Project (snipshift-web)
1. Go to Vercel Dashboard → Your Frontend Project → **Settings** → **Git**
2. Ensure **Root Directory** is set to `.` (repository root)
3. Scroll to **Ignored Build Step**
4. Enter the following command:
   ```bash
   git diff HEAD^ HEAD --quiet -- . ':!api' ':!api/**'
   ```
   **Explanation**: This checks if anything changed in the root directory, excluding the `api/` folder entirely.

#### Backend Project (snipshift-api)
1. Go to Vercel Dashboard → Your Backend Project → **Settings** → **Git**
2. Ensure **Root Directory** is set to `api/`
3. Scroll to **Ignored Build Step**
4. Enter the following command:
   ```bash
   git diff HEAD^ HEAD --quiet .
   ```
   **Explanation**: Since the root directory is `api/`, `.` refers to the `api/` directory. This checks if anything changed within `api/`.

---

### Option 2: Single Vercel Project with Monorepo Support

If you're using a single Vercel project with monorepo configuration:

#### Frontend Build
1. Go to Vercel Dashboard → Your Project → **Settings** → **Git**
2. Ensure **Root Directory** is set to `.`
3. Scroll to **Ignored Build Step**
4. Enter:
   ```bash
   git diff HEAD^ HEAD --quiet -- . ':!api' ':!api/**'
   ```

#### Backend Build (if configured separately)
1. If you have a separate build configuration for the API:
   - Root Directory: `api/`
   - Ignored Build Step:
     ```bash
     git diff HEAD^ HEAD --quiet .
     ```

---

## Command Breakdown

### Frontend Command
```bash
git diff HEAD^ HEAD --quiet -- . ':!api' ':!api/**'
```
- `git diff HEAD^ HEAD`: Compare previous commit to current commit
- `--quiet`: Exit with status 0 if no changes, 1 if changes found
- `-- .`: Check changes in current directory (repo root)
- `':!api'`: Exclude `api/` directory
- `':!api/**'`: Exclude all files under `api/`

**Result**: Returns 0 (skip build) if no changes in root (excluding api/), 1 (build) if changes detected.

### Backend Command
```bash
git diff HEAD^ HEAD --quiet .
```
- `git diff HEAD^ HEAD`: Compare previous commit to current commit
- `--quiet`: Exit with status 0 if no changes, 1 if changes found
- `.`: Check changes in current directory (which is `api/` when root is set to `api/`)

**Result**: Returns 0 (skip build) if no changes in `api/`, 1 (build) if changes detected.

---

## Testing the Configuration

### Test Frontend Command Locally
```bash
# Simulate a change in root directory (should trigger build)
git diff HEAD^ HEAD --quiet -- . ':!api' ':!api/**'
echo $?  # Should output 1 (build needed)

# Simulate only api/ changes (should skip build)
# (Make a change only in api/, then run)
git diff HEAD^ HEAD --quiet -- . ':!api' ':!api/**'
echo $?  # Should output 0 (skip build)
```

### Test Backend Command Locally
```bash
cd api
# Simulate a change in api/ directory (should trigger build)
git diff HEAD^ HEAD --quiet .
echo $?  # Should output 1 (build needed)

# Simulate only root changes (should skip build)
# (Make a change only in root, then run)
git diff HEAD^ HEAD --quiet .
echo $?  # Should output 0 (skip build)
```

---

## Alternative: Simpler Commands (If Git Pathspec Not Supported)

If Vercel's environment doesn't support the `:!api` pathspec syntax, use these alternatives:

### Frontend (Root Directory: `.`)
```bash
git diff HEAD^ HEAD --name-only -- . | grep -qvE '^(api/|\.github/)' || exit 1
```
**Explanation**: Lists changed files, filters out `api/` and `.github/`, exits with 1 (build) if any remain.

### Backend (Root Directory: `api/`)
```bash
git diff HEAD^ HEAD --name-only -- api/ | grep -q . || exit 1
```
**Explanation**: Lists changed files in `api/`, exits with 1 (build) if any found.

---

## Verification Checklist

After configuration:
- [ ] Frontend project root directory is set to `.`
- [ ] Backend project root directory is set to `api/`
- [ ] Frontend Ignored Build Step command is configured
- [ ] Backend Ignored Build Step command is configured
- [ ] Test by making a change only in `src/` → Frontend should build, Backend should skip
- [ ] Test by making a change only in `api/_src/` → Backend should build, Frontend should skip
- [ ] Test by changing root `package-lock.json` → Both should skip (if lockfiles are excluded)

---

## Notes

1. **Lockfiles**: If you want to exclude `package-lock.json` changes from triggering builds, you can modify the commands to exclude them:
   ```bash
   # Frontend
   git diff HEAD^ HEAD --quiet -- . ':!api' ':!api/**' ':!package-lock.json'
   ```

2. **GitHub Actions/CI**: These commands work in Vercel's build environment which has git access.

3. **First Deploy**: The first deployment after configuring this will always build (no previous commit to compare).

4. **Empty Commits**: If you need to trigger a build without code changes, you can temporarily disable the Ignored Build Step or make an empty commit.

---

## Troubleshooting

### Build Always Skipping
- Check that the command returns exit code 1 when changes are present
- Verify the root directory setting matches the command's path context

### Build Always Running
- Verify the command syntax is correct
- Check that git is available in Vercel's build environment
- Ensure the paths in the command match your root directory setting

### Command Not Found
- Vercel's build environment includes git by default
- If issues persist, try the alternative commands using `grep`

