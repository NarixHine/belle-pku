# Releasing Belle PKU

Release flow: tag → GitHub Actions builds both extensions, signs the Firefox build with AMO (unlisted channel), publishes the signed XPI + `updates.json` to R2 for Firefox auto-updates, and attaches the signed XPI to the GitHub Release.

PRs and pushes to `main` only build and typecheck — they never contact AMO or R2.

## One-time setup

### 1. AMO credentials

1. Sign in at [addons.mozilla.org](https://addons.mozilla.org) and open the [API key page](https://addons.mozilla.org/developers/addon/api/key/).
2. Generate a credential. You get a **JWT issuer** (looks like `user:12345:678`) and a **JWT secret** (hex, shown once — copy it immediately).
3. Add both as GitHub Actions secrets on this repository:
    - `AMO_JWT_ISSUER`
    - `AMO_JWT_SECRET`

> AMO credentials are account-wide. Treat them as production secrets; rotate at the API key page if exposed.

### 2. R2 bucket

1. Create (or reuse) the bucket `belle-pku-assets` in the Cloudflare dashboard.
2. Bind the custom domain `belle-pku-assets.time.florist` to it (bucket → Settings → Custom Domains).
3. Enable public access for reads on that domain.

### 3. R2 credentials

1. Cloudflare dashboard → R2 → Manage API Tokens → create a token with **Object Read & Write**, scoped to the `belle-pku-assets` bucket only.
2. Note the **Access Key ID**, **Secret Access Key**, and your **account ID** (for the S3 endpoint).
3. Add these GitHub Actions secrets:
    - `R2_ACCESS_KEY_ID`
    - `R2_SECRET_ACCESS_KEY`
    - `R2_S3_ENDPOINT` — `https://<account_id>.r2.cloudflarestorage.com`
    - `R2_BUCKET` — `belle-pku-assets`
    - `R2_PUBLIC_BASE` — optional; defaults to `https://belle-pku-assets.time.florist`

### 4. Bucket CORS + caching

Firefox's update checker fetches cross-origin from the extension, so the bucket needs CORS for `GET`/`HEAD` on `/updates.json` and `/xpi/*`. Suggested rule:

- **Allowed origins:** `*`
- **Allowed methods:** `GET`, `HEAD`
- **Allowed headers:** `Range`, `If-None-Match`, `If-Modified-Since` (plus defaults)
- Cache: short TTL for `updates.json` (update checks should see fresh data), long/immutable for versioned XPIs.

## Per release

1. Bump `version` in `package.json` (semver, strictly increasing — the publisher rejects regressions).
2. Commit and tag:
    ```sh
    git tag vX.Y.Z && git push origin vX.Y.Z
    ```
3. The workflow then:
    - builds both extensions and typechecks;
    - lints the Firefox build (`web-ext lint --self-hosted`);
    - signs it via `web-ext sign --channel=unlisted` (AMO may take a few minutes; the workflow waits);
    - uploads `xpi/belle-pku-X.Y.Z.xpi` and the regenerated `updates.json` to R2;
    - attaches the signed XPI and the Chrome ZIP to the GitHub Release.
4. Verify:
    - `https://belle-pku-assets.time.florist/updates.json` lists the new version with a `sha256:` hash;
    - the GitHub Release has the signed XPI;
    - a clean Firefox profile accepts the XPI (drag onto `about:addons` or Install Add-on From File), with ID `belle-pku-timetable@narixhine`.

## Notes

- **Unlisted** means the add-on is signed and installable but has no public AMO listing. Mozilla review still applies to unlisted submissions.
- **Auto-update bootstrap:** Firefox reads `update_url` from the *installed* build. Builds before the `update_url` change cannot auto-update; installs made from the first release carrying it onward will.
- Never overwrite a shipped XPI object in R2; versions are append-only. To yank a bad build, remove its entry from `updates.json` (and contact Mozilla about the AMO version if needed).
- The unsigned `*-firefox.zip` and Chrome ZIP remain attached for diagnostics/Chromium users respectively; the Chrome build is unaffected by all of this (`browser_specific_settings` is ignored by Chromium).
