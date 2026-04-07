# Releasing `dashscope-sdk-official`

Keep **npm package version**, **Git tag**, and **GitHub Release** on the same semver (e.g. `1.26.0` / `v1.26.0`).

## Before you publish

1. On `main`, set the version in `package.json` (and lockfile if you bump deps).
2. Update `CHANGELOG.md`: move items from `[Unreleased]` into a dated section `[x.y.z]` with compare links.
3. Run locally: `npm run lint`, `npm run typecheck`, `npm run build`, `npm test` (mocked HTTP via nock; no API key required). Optional smoke: `npm run test:live` with `DASHSCOPE_API_KEY` set (billable).

## Publish to npm

```bash
npm publish --access public
```

Use an account with publish rights for this package on npm. Prefer [Trusted Publishing](https://docs.npmjs.com/trusted-publishers) or a short-lived automation token from npm, not a long-lived personal token in plaintext.

## Git tag and GitHub Release

1. After the npm tarball matches what you intend to ship:

   ```bash
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin vX.Y.Z
   ```

2. Pushing tag `v*` triggers [`.github/workflows/release.yml`](../.github/workflows/release.yml), which creates a **GitHub Release** for that tag (with auto-generated notes). Edit the release description to paste the matching **CHANGELOG** section if you want richer notes.

## Checklist

- [ ] `CHANGELOG.md` updated for `X.Y.Z`
- [ ] `npm run lint` / `npm run build` OK
- [ ] `npm publish` succeeded
- [ ] Tag `vX.Y.Z` pushed; Release appears under GitHub **Releases**
