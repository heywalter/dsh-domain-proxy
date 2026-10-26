# Contributing

DSH Domain Proxy focuses on explicit API hostname routing and small, local request observations. Keep defaults conservative and describe what is observed versus inferred.

## Develop

Use Node >=22.19 and OpenSSL with -addext support.

    npm ci --ignore-scripts
    npm run check
    npm test
    npm run pack:local

The pack command produces the ready-to-install .tgz and its .sha256 file under artifacts/. End users install the package through Desktop; they do not need to run the source-build commands above. Dependencies are resolved by DSH during installation, so the tarball is not a fully offline installer.

For a real DSH host test, install the tested Desktop version and run npm run test:dsh. DSH_TEST_EXECUTABLE and DSH_TEST_CLI override the macOS defaults. This test creates a unique isolated DSH_HOME and uses synthetic model adapters; it must never use your daily profile or real model credentials.

scripts/run-dsh-preview.mjs is an optional local development helper. Its isolated profile lives under artifacts/dsh-home; install/link this package into that profile before starting it. It is not a Desktop installer.

## Changes

- Add meaningful tests for routing, privacy, concurrency or stream lifecycle changes.
- Preserve exact stream chunks, cancellation, TLS verification and unrelated routes.
- Unknown usage, paths and retries must remain unknown.
- Do not add prompt/body/key logging, automatic paid tests or silent node switching.
- Update both READMEs and CHANGELOG for user-visible behavior.
- Keep artifacts, local profiles, credentials, personal screenshots and dependencies out of Git.
- The package and lockfile versions must match. Verify the npm tarball before release.

## Issues and pull requests

Use synthetic hostnames and minimal reproductions. Include DSH version, OS, Node version, observed behavior and expected behavior. Do not attach complete profiles, session logs, API keys or internal hostnames.

A useful PR explains the user problem, resulting behavior, validation performed and any remaining coverage limits. Documentation or CI configuration alone does not prove runtime compatibility.

Security-sensitive details should not be posted in public issues. See SECURITY.md; a private reporting channel must be configured when the repository is published.

## Release checklist

Confirm the repository owner and registry name, run CI and the isolated host test, inspect the tarball contents, and attach its checksum to the release. Re-test runtime changes on the supported Desktop version. Never publish artifacts/ or a zip of the entire development folder; publish Git-tracked source and the audited npm package. Keep compatibility claims limited to tested versions and platforms.

Repository-dependent steps remain pending until publication: add repository/homepage/bugs URLs to package metadata, enable a private vulnerability-reporting channel and link it from SECURITY.md, provide release assets/checksums, and confirm the first remote CI run. Do not replace these with placeholder URLs or claims that a release already exists.
