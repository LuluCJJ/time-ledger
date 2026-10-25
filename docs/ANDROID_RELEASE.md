# Android builds and releases

The public source contains no signing key. A release APK must be signed with a maintainer-controlled key stored outside Git, with a recoverable offline copy. The release application ID is `app.personal.timeledger.official`; the debug build uses `app.personal.timeledger`. Android treats these as separate apps with separate local records.

## Build

From `shells/`, run `npm ci` and `npm run android:sync`. Then use `shells/android/gradlew.bat assembleRelease` on Windows, or `./gradlew assembleRelease` on other platforms. Java and the Android SDK are required.

The Android Gradle project reads these environment variables for a signed release:

| Variable | Purpose |
| --- | --- |
| `TIME_LEDGER_KEYSTORE` | Private keystore path |
| `TIME_LEDGER_STORE_PASSWORD` | Keystore password |
| `TIME_LEDGER_KEY_ALIAS` | Key alias |
| `TIME_LEDGER_KEY_PASSWORD` | Key password |

With none of these variables set, the release APK is unsigned. A partial set stops the build. Never commit values, keystores or local SDK paths. For a removable-drive backup, `shells/scripts/backup-signing.ps1` checks that the destination is outside this repository and verifies the copied bytes.

For the exact artifact intended for distribution, record its version, package ID, signature certificate and SHA-256. `shells/scripts/verify-android-release.ps1` checks the signed APK, packaged legal texts and resolved Android dependency list. Build success alone is insufficient; check the installer and restoration flow separately on Android.

## Moving an existing ledger

A different package ID or signing certificate does not inherit an installed app's local data. Export a nonempty complete JSON backup, keep a copy outside the phone, restore it in an isolated installation, and compare record, category, log, review and recent-note counts before switching. Keep the old app installed until the new copy has been checked. If the backup contains a running event, finish that event and make a fresh export before the final move; otherwise its original start time continues after import.

The [Android preview release](https://github.com/LuluCJJ/time-ledger/releases/tag/v1.0.0-preview.1) has not undergone an independent Android migration rehearsal from the earlier trial package. This limitation is also listed in [current status](STATUS.md).
