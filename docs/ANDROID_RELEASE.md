# Android release signing and data transition

The public repository contains no signing key. An installable release must be signed with a key held by the maintainer. Keep the keystore and passwords outside this repository, and retain a recoverable offline copy. The owner selected `app.personal.timeledger.official` and launcher label `时间账 正式版` for the formal app. The existing debug trial remains `app.personal.timeledger` / `时间账`. The first formal build currently uses `versionCode 1` / `versionName 1.0`; increment the code for subsequent updates.

On Windows, after attaching a private removable drive, run `shells/scripts/backup-signing.ps1 -SourceDirectory <private-signing-directory> -DestinationDirectory <removable-drive-directory>`. The script copies the keystore and its credential file to a new timestamped folder, refuses a destination inside this public repository, and compares SHA-256 hashes after copying. It never prints credential contents. Disconnect and store the drive separately afterward. A copy on another folder of the same computer does not satisfy the offline-backup requirement. A fictional-file rehearsal passed locally; the real signing material has **not** yet been copied to an offline drive.

## Signing inputs

The Android Gradle project reads four environment variables at build time:

| Variable | Meaning |
| --- | --- |
| `TIME_LEDGER_KEYSTORE` | Absolute path to the private keystore file |
| `TIME_LEDGER_STORE_PASSWORD` | Keystore password |
| `TIME_LEDGER_KEY_ALIAS` | Signing key alias |
| `TIME_LEDGER_KEY_PASSWORD` | Signing key password |

If none are set, `assembleRelease` produces an **unsigned** APK. If only some are set, the build stops with an error. All four are required for a signed build. Do not put these values in `local.properties`, Gradle files, shell history, issues, screenshots, or CI logs.

From `shells/`, prepare the current web bundle and Android project with `npm ci` and `npm run android:sync`. With the four variables supplied through a private local mechanism, run `gradlew.bat assembleRelease` from `shells/android/` on Windows (or `./gradlew assembleRelease` there on other platforms). Capture `gradlew.bat :app:dependencies --configuration releaseRuntimeClasspath` for that same checkout in a local report file. On Windows, run `shells/scripts/verify-android-release.ps1` with the signed APK, Android SDK path, independently recorded certificate SHA-256 digest and `-DependencyReport` pointing to that graph. If the script lives in a different checkout from the APK, pass `-SourceRoot` for the checkout that produced it. It verifies the APK signature, approved package/version/labels, signer identity, exact packaged legal texts and the bundled dependency list against the graph; it prints the APK size and SHA-256. Build success alone does not prove that the correct key was used. Recheck upstream notices after dependency changes, and perform a separate phone restore test.

## Existing trial installation

The active phone trial was installed with the Android debug certificate. A new release key cannot over-install that package, even with the same package ID. Before any signing-identity change:

1. Export a complete JSON backup from the active phone and confirm its actual file location and size.
2. Copy it off-device, restore it into an isolated installation, and compare event/category/log/review counts and selected notes.
3. Compare a fresh legacy Excel export against records added since starting Time Ledger; do not replace the newer phone ledger blindly.
4. Rehearse the exact transition on a separate device or isolated profile. Do not uninstall or clear the active app until the restored copy has been checked.

The user installed the v37 debug-signed trial APK over the existing app: existing records remained, but export still crashed. The subsequent v38 trial writes directly to Android 10+ Downloads and checks the saved bytes. Two earlier JSON exports were 0-byte files and cannot be restored. One later complete phone backup has now been imported into a separate empty browser ledger and its record counts persisted after reload. This validates that snapshot, while comparison with the current phone and an Android restore rehearsal remain open. Keep the active app installed and its data intact; see the [debug-data rescue procedure](ANDROID_DATA_RESCUE.md) if normal export breaks again. The user reports that v39 exports a readable Excel workbook which opens from the phone file manager. Its in-app document picker returned to Time Ledger instead of opening or sharing the file. The v40 trial replaces that picker with native open and share actions for the latest export. The owner reports that the v41 phone checks for opening, sharing and importing a readable Excel workbook preview appear normal; live replacement import and full Android restore remain untested. A signed formal candidate has passed local artifact verification but has not been published. See [release readiness](RELEASE_READINESS.md) and [data boundary](DATA.md).

## First formal-install transition

The owner selected a **side-by-side first install** with a distinct formal package ID and a maintainer-held release key. The build now fixes that identity for release builds. This lets the existing debug-signed app remain installed and readable while a second installation imports the verified JSON backup. A new package ID means a separate local ledger: records will not appear automatically, and the user must stop editing the trial ledger only after the formal installation's records, categories, logs, reviews and recent notes have been checked. Any records added after the backup need a fresh export and a repeat import or an explicit reconciliation before cutover. The old installation should remain available until the owner confirms the transfer.

A complete JSON backup preserves a running event with `end: null`. Restoring an old snapshot days later makes that event appear to have been running since its original start time. For an isolated rehearsal, treat this as expected snapshot behavior and do not edit that old event. For the actual cutover, finish the current activity in the trial app, export a fresh complete backup at that boundary, and then restore it in the formal app. Do not silently invent an end time while importing.

[Android's update rules](https://developer.android.com/google/play/app-updates) require a matching application ID and signing certificate (or a valid proof of rotation) for an update; a distinct application ID can coexist as a separate installation. This is the platform basis for the proposed route.

Keeping the current package ID with a new signing key requires uninstalling the debug-signed installation before the formal APK can be installed. That would put the only live copy of the ledger at risk, so it is **not** the proposed first transition. Signing the public release with the debug key would avoid this immediate install conflict but would make the temporary development credential the long-term update identity, so it is also not proposed.

The release build fixes the `.official` suffix and `时间账 正式版` label; the debug build keeps its existing ID and label. Check both `application-label` and `launchable-activity` in `aapt dump badging`: an earlier rehearsal changed only the former, leaving two identical launcher names until the Activity label was corrected. A correctly labeled **unsigned** release build is still not installable. Preserve the selected release key and increment `versionCode` for later updates under the same package ID. Do not distribute a public APK until the current phone data is reconciled, an Android restore has been rehearsed, the exact transition is verified, and the final signed artifact is reviewed.
