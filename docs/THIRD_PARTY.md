# Third-party components

Time Ledger's original source is licensed under [Apache-2.0](../LICENSE). Dependencies retain their own licenses.

| Component | Version | License | Role |
| --- | --- | --- | --- |
| [SheetJS Community Edition](https://docs.sheetjs.com/docs/getting-started/installation/standalone/) | 0.20.3 | Apache-2.0 | Excel reading and writing; vendored at `web/vendor/xlsx.full.min.js` |
| `@capacitor/core`, `@capacitor/android`, `@capacitor/cli` | 8.5.3 | MIT | Android runtime and build tooling |
| `electron` | 44.9.1 | MIT | Windows runtime |
| `@electron/packager` | 20.3.0 | BSD-2-Clause | Windows build tooling |
| Gradle wrapper | 8.14.3 | Apache-2.0 | Android build tooling |

The full SheetJS license is included at [`web/vendor/SHEETJS-LICENSE.txt`](../web/vendor/SHEETJS-LICENSE.txt). The vendored file's SHA-256 is `CC015130AA8521E7F088F88898EBA949CCDCBFB38DF0BD129B44B7273C3A6F41`. Node dependencies are pinned in `shells/package-lock.json`; installed packages are not committed to the source repository.

The Android build packages the project, SheetJS and Capacitor license texts and the resolved dependency list. [`ANDROID_DEPENDENCIES.txt`](ANDROID_DEPENDENCIES.txt) lists the Android release runtime coordinates and license metadata for the published preview build. `shells/scripts/verify-android-release.ps1` compares these bundled texts with the source and dependency report. The published [Android preview](https://github.com/LuluCJJ/time-ledger/releases/tag/v1.0.0-preview.1) has SHA-256 `2447E5C92696630E67C3FB1EC1B8A163FED1E193DAE337C520977BF771C43EE8`.

The Windows distribution includes Electron's `LICENSE` and Chromium's generated `LICENSES.chromium.html`. A Windows installer has not been published. Repeat the artifact and notice review when dependencies or packaged binaries change.
