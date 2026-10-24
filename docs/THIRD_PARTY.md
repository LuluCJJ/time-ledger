# Third-party components

The bundled Excel parser `web/vendor/xlsx.full.min.js` is **SheetJS Community Edition 0.20.3**. It is redistributed without modifications. Copyright © SheetJS LLC. It is licensed under Apache License 2.0; the full text is included at [`web/vendor/SHEETJS-LICENSE.txt`](../web/vendor/SHEETJS-LICENSE.txt). Source and distribution information: [SheetJS standalone browser scripts](https://docs.sheetjs.com/docs/getting-started/installation/standalone/) and [license](https://docs.sheetjs.com/docs/miscellany/license/).

Attribution: SheetJS Community Edition — https://sheetjs.com/ · Copyright (C) 2012–present SheetJS LLC · Apache License 2.0. The vendored script is byte-for-byte identical to the official 0.20.3 standalone CDN file checked on 2026-10-23 (SHA-256 `CC015130AA8521E7F088F88898EBA949CCDCBFB38DF0BD129B44B7273C3A6F41`).

The Android and desktop dependencies are declared in `shells/package.json` and pinned by `shells/package-lock.json`. Their installed packages are not copied into this source repository. Direct dependencies and their installed license files were checked on 2026-10-23:

The source repository does include Gradle's generated wrapper scripts and `gradle-wrapper.jar` (Gradle 8.14.3; Apache-2.0). The JAR's SHA-256 matches [Gradle's published wrapper checksum](https://gradle.org/release-checksums/). The wrapper's distribution URL now has Gradle's published `-all` ZIP SHA-256 pinned in `gradle-wrapper.properties`. Gradle's [project license](https://github.com/gradle/gradle/blob/master/LICENSE) applies to this redistributed build tool; the repository root contains the Apache-2.0 text.

| Dependency | Version | Installed license | Role |
| --- | --- | --- | --- |
| `@capacitor/core`, `@capacitor/android` | 8.5.3 | MIT | Android application runtime |
| `@capacitor/cli` | 8.5.3 | MIT | Build tool |
| `electron` | 44.9.1 | MIT | Windows desktop runtime |
| `@electron/packager` | 20.3.0 | BSD-2-Clause | Build tool |

These rows cover direct packages only. Before distributing a compiled APK or EXE, review the complete dependency and binary notices for that artifact; the current source-only proposal does not include `node_modules` or a compiled installer.

The Android and Windows packaging preparation now copies the project's Apache-2.0 license and the SheetJS license into `web/legal/` inside each build. The v33 debug APK and rebuilt Windows `app.asar` were checked against the source license files byte for byte on 2026-10-23. This covers those two notices in the local artifacts; it does not complete the remaining compiled-dependency notice review required before a public binary release. The Windows package also retains Electron's `LICENSE` and `LICENSES.chromium.html` files.

The pinned Capacitor CLI brings in `xcode`, a development tool that previously resolved `uuid` 7.0.3. GitHub's [uuid advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq) concerns the `v3`, `v5` and `v6` APIs with caller-supplied output buffers; this `xcode` version calls `uuid.v4()`. The lockfile now overrides that nested package to patched `uuid` 11.1.1. A fresh `npm ci` reported zero audit findings, `xcode` still loaded its UUID API, and clean-clone Android and Windows builds succeeded on 2026-10-23. This is a build-tool dependency, not code bundled into the web page.

The committed Gradle 8.14.3 wrapper JAR in `shells/android/gradle/wrapper/gradle-wrapper.jar` has SHA-256 `7d3a4ac4de1c32b59bc6a4eb8ecb8e612ccd0cf1ae1e99f66902da64df296172`, matching the checksum published at `https://services.gradle.org/distributions/gradle-8.14.3-wrapper.jar.sha256` on 2026-10-23. This verifies the wrapper file's provenance; the full Gradle distribution is downloaded at build time.

## Android resolved runtime metadata audit

On 2026-10-23, the local Gradle `debugRuntimeClasspath` and `releaseRuntimeClasspath` reports resolved to the same 50 unique Maven coordinates. This count includes metadata-only modules and is **not** a count of files or libraries inside the APK. The cached POM for 49 coordinates directly declares an Apache-2.0 license name. The remaining coordinate, `com.google.guava:listenablefuture:1.0`, declares `com.google.guava:guava-parent:26.0-android` as its parent; that cached parent POM declares Apache-2.0. The [Guava project's own repository](https://github.com/google/guava) also identifies Apache-2.0. Four resolved coordinates had no cached AAR/JAR in this check: `androidx.annotation:annotation:1.8.1`, `androidx.collection:collection:1.4.2`, `org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.1`, and `org.jetbrains.kotlinx:kotlinx-coroutines-bom:1.8.1`; platform or variant metadata may account for them. Eight cached AndroidX archives contained their own `META-INF/.../LICENSE.txt` files.

This audit establishes the license metadata visible to this build, but it does not prove that every notice or attribution required by each compiled artifact is present in the final APK. Before a public binary release, inspect the final release dependency graph and APK contents together, retain any upstream `NOTICE` obligations, and repeat the audit after dependency upgrades. Do not treat the shared Apache-2.0 license copy as a substitute for that artifact-level check.
