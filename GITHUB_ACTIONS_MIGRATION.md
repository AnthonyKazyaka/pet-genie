# Amplify to GitHub Actions Migration Guide

## Overview

This document explains the migration from AWS Amplify CI/CD to GitHub Actions for the Pet Genie project. The migration moves away from AWS Amplify backend to using Firestore/Firebase as a user-configured connection (similar to the Google Calendar integration). The frontend is built and deployed to **GitHub Pages** (free hosting).

## Current Amplify Pipeline Analysis

### Pipeline Structure (amplify.yml)

#### Backend Phase
```yaml
backend:
  phases:
    build:
      commands:
        - npm ci --cache .npm --prefer-offline
        - npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID
```

**Purpose:**
- Installs dependencies with npm ci (clean install)
- Deploys Amplify backend resources (Auth, Data API) using the Amplify Gen 2 pipeline deploy command
- **No longer needed** - Firebase/Firestore will be user-configured at runtime

#### Frontend Phase
```yaml
frontend:
  phases:
    preBuild:
      commands:
        - npx ng version
    build:
      commands:
        - npx ng build --configuration=production
  artifacts:
    baseDirectory: dist/amplify-angular-template/browser
    files:
      - '**/*'
  cache:
    paths:
      - .npm/**/*
      - node_modules/**/*
```

**Purpose:**
- Pre-build: Logs Angular CLI version for debugging
- Build: Creates production-optimized Angular build
- Artifacts: Specifies output directory for deployment
- Cache: Speeds up subsequent builds by caching npm and node_modules

#### Custom Headers
```yaml
customHeaders:
  - pattern: '**/*'
    headers:
      - key: 'Cross-Origin-Opener-Policy'
        value: 'same-origin-allow-popups'
      - key: 'Cross-Origin-Embedder-Policy'
        value: 'credentialless'
      - key: 'Permissions-Policy'
        value: 'unload=()'
```

**Purpose:**
- Sets security headers for CORS and permissions
- Required for Google Calendar API integration
- **Note:** GitHub Pages has limited header support (see workarounds below)

## GitHub Actions Migration

### Key Differences

| Aspect | AWS Amplify | GitHub Actions + Pages |
|--------|-------------|------------------------|
| **Triggers** | Automatic on git push | Configurable via `on:` (push, PR, manual) |
| **Environment** | Managed by AWS | Ubuntu runners |
| **Backend** | Amplify backend deployment | No backend - users configure Firebase |
| **Caching** | Built-in paths | Must configure cache actions |
| **Deployment** | Automatic to Amplify Hosting | Automatic to GitHub Pages (free!) |
| **Custom Headers** | Configured in amplify.yml | Limited support (see workarounds) |
| **Secrets** | Auto-injected | Only GITHUB_TOKEN needed |
| **Cost** | Varies by usage | **100% FREE** for public repos |

### Workflow Structure

The new GitHub Actions workflow ([.github/workflows/build-and-deploy.yml](.github/workflows/build-and-deploy.yml)) consists of two jobs:

#### 1. Build and Deploy Frontend (`build-frontend`)
- **Runs on:** Ubuntu latest
- **Steps:**
  1. Checkout code
  2. Setup Node.js 18 with npm caching
  3. Cache npm dependencies
  4. Install dependencies
  5. Display Angular version (matches Amplify pre-build)
  6. Build Angular application
  7. Upload build artifacts
  8. Deploy to GitHub Pages (only on main branch)

**Translation Notes:**
- Mirrors Amplify's preBuild and build phases
- No backend deployment - Firebase/Firestore configured by users at runtime (like Calendar)
- Artifacts are uploaded for potential use in other jobs
- Deploys to GitHub Pages automatically on main branch pushes using `gh-pages` branch

#### 2. Run Tests (`test`)
- **Runs on:** Ubuntu latest
- **Optional:** Runs in parallel with frontend build
- **Steps:**
  1. Checkout code
  2. Setup Node.js with npm caching
  3. Cache npm dependencies
  4. Install dependencies
  5. Run tests in headless Chrome

## Setup Requirements

### 1. GitHub Pages Configuration

1. Navigate to your repository → **Settings** → **Pages**
2. Under "Build and deployment":
   - **Source:** Deploy from a branch
   - **Branch:** Select `gh-pages` branch (will be created automatically by the workflow)
   - **Folder:** `/ (root)`
3. Save and wait for first deployment

Your site will be available at: `https://anthonykazyaka.github.io/pet-genie/`

**Optional: Custom Domain**

If using a custom domain, add it as a repository variable:
1. Settings → Secrets and variables → Actions → **Variables** tab
2. Add variable: `CUSTOM_DOMAIN` with your domain (e.g., `petgenie.yourdomain.com`)
3. Configure DNS CNAME record pointing to `anthonykazyaka.github.io`

### 2. GitHub Secrets

**No additional secrets required!** The workflow uses the built-in `GITHUB_TOKEN` for deployment.

### 3. Environment Variables

Update in workflow file if needed:
```yaml
env:
  NODE_VERSION: '18'          # Match your local development
```

### 4. Firebase/Firestore Configuration

Firebase connection is **configured by end users at runtime** (similar to Google Calendar):
- Users input their Firebase project details in the app settings UI
- No build-time configuration or secrets required
- Connection info stored locally in browser (localStorage or IndexedDB)
- Each user connects to their own Firebase project

**Implementation approach:**
- Add a Settings page with Firebase configuration fields:
  - API Key
  - Auth Domain
  - Project ID
  - Storage Bucket
  - Messaging Sender ID
  - App ID
- Initialize Firebase SDK dynamically with user-provided config
- Store configuration locally for persistence

### 5. Angular Base Href Configuration

For GitHub Pages deployment to `anthonykazyaka.github.io/pet-genie/`, update the base href:

**Update angular.json:**
```json
"configurations": {
  "production": {
    "baseHref": "/pet-genie/",
    "outputPath": "dist/amplify-angular-template",
    ...
  }
}
```

**Or update the workflow build command:**
```yaml
- name: Build Angular application
  run: npx ng build --configuration=production --base-href /pet-genie/
```

**If using a custom domain at root:**
- No base href changes needed (default `/` works)

### 6. Custom Headers Configuration

GitHub Pages has **limited support** for custom headers. Here are workarounds:

#### Option A: Meta Tags in HTML (Partial Support)
Add to [src/index.html](src/index.html) `<head>` section:
```html
<meta http-equiv="Cross-Origin-Opener-Policy" content="same-origin-allow-popups">
<meta http-equiv="Permissions-Policy" content="unload=()">
```

**Note:** HTTP-equiv meta tags have limited effectiveness. They work for some headers but not all.

#### Option B: Proxy Through CloudFlare (Recommended if headers are critical)
1. Set up a custom domain
2. Use CloudFlare DNS (free tier)
3. Enable CloudFlare proxy (orange cloud)
4. Add Transform Rules in CloudFlare dashboard:
   - Response Headers → Modify Response Header
   - Add headers:
     - `Cross-Origin-Opener-Policy: same-origin-allow-popups`
     - `Cross-Origin-Embedder-Policy: credentialless`
     - `Permissions-Policy: unload=()`

#### Option C: Migrate to CloudFlare Pages (Alternative to GitHub Pages)
CloudFlare Pages offers:
- Free hosting (similar to GitHub Pages)
- Full header support via `_headers` file
- GitHub integration
- Create `_headers` file in `dist/amplify-angular-template/browser`:
  ```
  /*
    Cross-Origin-Opener-Policy: same-origin-allow-popups
    Cross-Origin-Embedder-Policy: credentialless
    Permissions-Policy: unload=()
  ```

## Migration Steps

### Phase 1: Setup and Initial Testing
1. ✅ Review the generated workflow file
2. ⬜ Enable GitHub Pages in repository settings (Settings → Pages → Source: gh-pages)
3. ⬜ Update base href in [angular.json](angular.json) for `/pet-genie/` path
4. ⬜ Push to main branch and monitor workflow execution
5. ⬜ Verify deployment at `https://anthonykazyaka.github.io/pet-genie/`
6. ⬜ Test the deployed app functionality

### Phase 2: Firebase Configuration
1. ⬜ Create Settings UI for Firebase configuration
2. ⬜ Implement dynamic Firebase initialization
3. ⬜ Test Firebase/Firestore connection with user-provided credentials
4. ⬜ Add validation and error handling for configuration

### Phase 3: Headers and Optimization
1. ⬜ Test Google Calendar API with limited headers
2. ⬜ If headers cause issues, implement CloudFlare proxy solution
3. ⬜ Consider migrating to CloudFlare Pages if full header control is needed

### Phase 4: Complete Migration
1. ⬜ Disable Amplify build pipeline in AWS
2. ⬜ Remove/deprecate Amplify backend resources
3. ⬜ Update documentation and user guides
4. ⬜ Remove `amplify.yml` (optional - keep for reference)

## Caching Strategy

GitHub Actions caching is more explicit than Amplify:

```yaml
# Node modules cache (configured in workflow)
- uses: actions/cache@v3
  with:
    path: |
      .npm
      node_modules
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-npm-
```

**Benefits:**
- Faster builds (similar to Amplify)
- More control over cache invalidation
- Separate caches for different jobs
- Cache key based on package-lock.json hash

## Troubleshooting

### Frontend Build Fails
- Verify Node.js version matches local development (18)
- Check for missing environment variables
- Review build logs for Angular-specific errors
- Ensure all dependencies are in package.json
- Check base href configuration

### GitHub Pages Deployment Fails
- Ensure `gh-pages` branch deployment source is selected in Settings
- Verify GITHUB_TOKEN has proper permissions
- Check workflow logs for deployment errors
- Ensure build output path matches: `dist/amplify-angular-template/browser`

### Caching Issues
- Clear GitHub Actions cache in repository settings → Actions → Caches
- Update cache key if package-lock.json changes aren't detected
- Verify cache paths are correct
- Check cache size limits (10GB per repository)

### Headers Not Working
- Remember GitHub Pages has limited header support
- Test if functionality works without headers
- Implement CloudFlare proxy if headers are critical
- Consider CloudFlare Pages as alternative

### 404 on GitHub Pages
- Check base href is set correctly (`/pet-genie/`)
- Verify gh-pages branch has content
- Check GitHub Pages settings are correct
- Wait a few minutes after first deployment

## Cost Comparison

| Service | Amplify CI/CD | GitHub Actions + Pages |
|---------|---------------|------------------------|
| Build minutes | Included in Amplify pricing | **2,000 free/month** (public repos) |
| Backend | Amplify backend costs | **FREE** - users provide their own Firebase |
| Hosting | Amplify hosting included | **GitHub Pages: 100% FREE** |
| Storage | Varies | 1 GB repository storage |
| Bandwidth | Varies | 100 GB/month soft limit |
| Caching | Free | 500MB free, 10GB total |
| Concurrent builds | Limited by plan | Up to 20 (Free), 60+ (Teams) |
| **TOTAL COST** | **$$$** Variable | **$0 for public repos** |

## Next Steps

1. ✅ Review the generated workflow file
2. ✅ GitHub Pages deployment configured
3. ⬜ Enable GitHub Pages in repository settings (Settings → Pages → Source: gh-pages)
4. ⬜ Update base href in Angular build for `/pet-genie/` path
5. ⬜ Test workflow by pushing to main branch
6. ⬜ Verify deployment at `https://anthonykazyaka.github.io/pet-genie/`
7. ⬜ Implement Firebase configuration UI for users
8. ⬜ Test Google Calendar API functionality with current headers
9. ⬜ Implement CloudFlare proxy if headers are critical
10. ⬜ Update team documentation and deployment procedures

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Angular Build Configuration](https://angular.io/guide/build)
- [Firebase Web SDK Setup](https://firebase.google.com/docs/web/setup)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [CloudFlare Pages](https://pages.cloudflare.com/)
- [CloudFlare Transform Rules](https://developers.cloudflare.com/rules/transform/)
