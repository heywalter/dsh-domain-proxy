# Contributing to DSH Domain Proxy

Thank you for your interest in contributing! DSH Domain Proxy focuses on precise, domain-based API routing and lightweight, local call observability for DeepSeek Harness.

---

## Development Setup

### Requirements
- **Node.js**: `>=22.19.0`
- **OpenSSL**: with `-addext` support

### Getting Started
```sh
npm ci --ignore-scripts
npm run check
npm test
npm run pack:local
```

The `pack:local` command generates the installable package tarball (`.tgz`) and its `.sha256` checksum file under `artifacts/`.

### Host Integration Testing
To test against an actual DSH Desktop installation:
```sh
npm run test:dsh
```
> **Note**: This suite creates an isolated `DSH_HOME` and uses synthetic model adapters. It will never touch your personal profile or consume real API credentials. You can override test binaries using `DSH_TEST_EXECUTABLE` and `DSH_TEST_CLI`.

---

## Code and Contribution Guidelines

When submitting code changes, please ensure:
1. **Routing & Dispatch**:
   - Keep routing defaults conservative (exact domain matching by default).
   - Preserve untouched network paths for unmatched destinations.
   - Never disable TLS certificate verification or silently fallback on proxy failure.
2. **Privacy**:
   - Never log prompts, response bodies, headers, or API keys.
   - Keep observations strictly in memory; unknown values (e.g. usage, retries) must remain explicitly unknown.
3. **Lifecycle & Clean Shutdown**:
   - Ensure connections are drained gracefully (`drain()`) when configuration changes.
   - Clean up dispatchers on plugin disposal without closing inherited dispatchers.
4. **Documentation**:
   - Update both [README.zh-CN.md](README.zh-CN.md) and [README.md](README.md) for any user-facing changes.
   - Document any new features or behaviors in [CHANGELOG.md](CHANGELOG.md).
5. **Git Hygiene**:
   - Do not commit generated build files, `.DS_Store`, local profiles, or `.tgz` archives.

---

## Reporting Issues and Pull Requests

- **Bug Reports**: Please include your DSH version, OS, Node.js version, observed behavior, and expected behavior.
- **Sanitized Reproduction**: Use synthetic hostnames (e.g., `api.example.com`) and fixtures. Never include real API credentials, full user profiles, or proprietary session transcripts.
- **Security Vulnerabilities**: Do **not** open public issues for potential security vulnerabilities. Follow the reporting instructions in [SECURITY.md](SECURITY.md).

---

## Release Process

For maintainers publishing a new version:
1. Ensure all checks pass: `npm run check && npm test`.
2. Sync version numbers across `package.json`, `package-lock.json`, and [CHANGELOG.md](CHANGELOG.md).
3. Validate the distribution bundle with `npm run pack:check`.
4. Publish to npm (`npm publish`) using the `latest` tag.
5. Create a GitHub Release corresponding to the published version tag with release notes and checksums.
