# Release readiness

Status: source-only preview published at [`LuluCJJ/time-ledger`](https://github.com/LuluCJJ/time-ledger) on 2026-10-23. No installable release exists.

## Source candidate

- [x] Separate repository with Chinese and English README, product principles, data boundary and third-party notice.
- [x] One future source location declared in `PROJECT_GOVERNANCE.md`.
- [x] Single local source preflight entry point: `node scripts/verify-source.mjs` runs web tests, tracked-file scan, history scan and diff formatting; passed on 2026-10-23. It intentionally does not assert real-phone or signing safety.
- [x] GitHub Actions source checks run on pushes and pull requests with full history, read-only token and Node 24. The clean public snapshot and its follow-up check both passed: [source check run](https://github.com/LuluCJJ/time-ledger/actions/runs/39917189683). Recheck each later release commit.
- [x] Automated model and portability checks: 27 passing on 2026-10-23.
- [x] Repeatable tracked-tree sensitive-file and secret-pattern check: `node scripts/check-public-tree.mjs` (current tree only).
- [x] Repeatable Git history check: `node scripts/check-history.mjs` found no forbidden private-data paths or sensitive-pattern text in the current public branch history on 2026-10-23. It also reports the number of commits with non-GitHub-private author or committer emails without printing them; the current branch reports zero. Older detached GitHub cache views require separate cleanup. This does not replace human review of product wording and images.
- [x] Compare unique historical Wiki scripts: both changed smoke scripts only point to the renamed `legacy_xls_converter.py`; the old `xls_to_demo.py` and README remain in the private Wiki as historical evidence. No older directory was deleted.
- [x] Remove Capacitor's unused sample unit/instrumented tests; the latter asserted the scaffold package name rather than this app. `assembleDebug assembleRelease` still succeeded afterward.
- [ ] Complete manual review of every tracked file and image. Current-tree and history scans found no sensitive filename or matching private secret; only the deliberately fake Flomo URL appears in test text. Launcher and landscape splash were visually checked as original clock shapes. All 26 PNGs have no PNG metadata chunks and byte-for-byte regenerate from the committed drawing script (`py -3 shells/scripts/verify-brand-assets.py` passed on 2026-10-23). Historical prose and code still need final editorial review.
- [x] Select Apache-2.0 for original project code and documentation and add the full official text in root `LICENSE`. The redistributed SheetJS bundle exactly matches the official 0.20.3 standalone file by SHA-256; its own notice and attribution are in `THIRD_PARTY.md`.
- [x] Check direct build/runtime package licenses from installed files and pinned versions; `THIRD_PARTY.md` now distinguishes source publication from later binary notice review.
- [x] Rebuild from a fresh public GitHub clone on Windows: `node scripts/verify-source.mjs` passed 27 tests, `npm ci` completed, `assembleDebug assembleRelease` succeeded, and `npm run desktop:package` produced the Windows package. A hidden packaged-app smoke launch then reported title `时间账`, a populated timeline and `ledger://bundle` origin. The build used an existing local Android SDK through environment variables; no private SDK path was added to the clone. The transitive build-tool `uuid` advisory was addressed with a tested lockfile override, and `npm audit` then reported zero findings. This does not replace real-device or separate-machine validation.
- [x] Verify the committed Gradle 8.14.3 wrapper JAR against the checksum published by Gradle: both SHA-256 values are `7d3a4ac4de1c32b59bc6a4eb8ecb8e612ccd0cf1ae1e99f66902da64df296172`.
- [x] The owner confirmed `LuluCJJ/time-ledger` for public source; the repository was created. Its current branch starts from a clean snapshot and contains only GitHub private author/committer email metadata. Earlier detached GitHub commit views may remain accessible after rewriting history; removal is a separate GitHub Support matter.

The repository tracks source, documents and generated original icons; no APK, private data directory or signing key is tracked. Older local review archives are snapshots of earlier commits, not installable releases or evidence for the current branch.

## Android trial-to-release path

- [ ] Confirm a complete backup file from the user's active phone and restore it in isolation.
- [ ] Verify over-install of the latest candidate preserves records, categories and reviews; inspect export, small-screen data page and focus display on a phone.
- [ ] Compare a fresh legacy XLS export with entries added to this app before any replacement import.
- [ ] Choose versionCode/versionName, release signing and an upgrade path from the existing debug-signed installation. The active debug package uses an Android Debug certificate; a separately signed public package cannot over-install it. Preserve a verified full backup and rehearse transfer before changing signing identity or package ID.
- [x] Build the release configuration separately: `assembleRelease` succeeded on 2026-10-23 and produced `app-release-unsigned.apk` (3,646,347 bytes). Signature verification correctly rejects this unsigned artifact. Formal signing, installation and real-phone verification remain pending; do not distribute it.
- [x] Add opt-in signing from four environment variables, without a key or password in the repository. An incomplete set fails configuration; no variables still produces an unsigned release. A disposable local key produced a signed APK and `apksigner verify` returned 0 with v2 signing on 2026-10-23. Its signer differs from the installed debug APK, proving that a formal-key transition requires data transfer. The disposable key and APK are not release artifacts; the real key and phone transition remain pending. See [Android release process](ANDROID_RELEASE.md).

The latest local trial build is v28, SHA-256 `DD251ACB46EEA1473B4B7D4853BDE3FCC91EFE43199E96D2308C4AAAC375F22C`. Its embedded HTML references web version 38 and includes the split category picker; its embedded JavaScript includes the trailing-gap action. APK signature verification passed, and its certificate SHA-256 matches v27. Actual phone interaction and data preservation still require a phone check. No APK is included in this source repository.

The Windows x64 desktop package rebuilt successfully on 2026-10-23 and contains `TimeLedger.exe`. A hidden smoke launch exited with code 0 and reported title `时间账`, a populated timeline, and `ledger://bundle` origin. The package is local build output, not a public release; data portability on a separate Windows installation remains unverified. Web tests: 27 passing.

Source publication and APK publication may be separate milestones. If source is published first, describe the remaining Android verification plainly in `STATUS.md` and the release notes.

## Decisions for the owner

1. Public name and GitHub account: `LuluCJJ/time-ledger` selected.
2. License: Apache-2.0 selected on 2026-10-23.
3. First scope: source-only preview selected, then a signed APK after real-phone backup and upgrade checks.
