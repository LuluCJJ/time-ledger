# Android release signing and data transition

The public repository contains no signing key. An installable release must be signed with a key held by the maintainer. Keep the keystore and passwords outside this repository, and retain a recoverable offline copy. The `app.personal.timeledger` package ID and `versionCode` must be reviewed before a formal release.

## Signing inputs

The Android Gradle project reads four environment variables at build time:

| Variable | Meaning |
| --- | --- |
| `TIME_LEDGER_KEYSTORE` | Absolute path to the private keystore file |
| `TIME_LEDGER_STORE_PASSWORD` | Keystore password |
| `TIME_LEDGER_KEY_ALIAS` | Signing key alias |
| `TIME_LEDGER_KEY_PASSWORD` | Signing key password |

If none are set, `assembleRelease` produces an **unsigned** APK. If only some are set, the build stops with an error. All four are required for a signed build. Do not put these values in `local.properties`, Gradle files, shell history, issues, screenshots, or CI logs.

From `shells/`, prepare the current web bundle and Android project with `npm ci` and `npm run android:sync`. With the four variables supplied through a private local mechanism, run `gradlew.bat assembleRelease` from `shells/android/` on Windows (or `./gradlew assembleRelease` there on other platforms). Verify the resulting APK with the Android SDK's `apksigner verify --verbose --print-certs`, then record its package ID, version, signer certificate digest, file hash and size privately. Build success alone does not prove that the correct key was used.

## Existing trial installation

The active phone trial was installed with the Android debug certificate. A new release key cannot over-install that package, even with the same package ID. Before any signing-identity change:

1. Export a complete JSON backup from the active phone and confirm its actual file location and size.
2. Copy it off-device, restore it into an isolated installation, and compare event/category/log/review counts and selected notes.
3. Compare a fresh legacy Excel export against records added since starting Time Ledger; do not replace the newer phone ledger blindly.
4. Rehearse the exact transition on a separate device or isolated profile. Do not uninstall or clear the active app until the restored copy has been checked.

The user installed the v37 debug-signed trial APK over the existing app: existing records remained, but export still crashed. The subsequent v38 debug-signed trial uses a direct Android 10+ Downloads write and has not yet been tested on that phone. Two earlier JSON exports were 0-byte files and cannot be restored. Keep the active app installed and its data intact. Before changing to a release signing identity, first obtain a nonempty backup and verify an isolated restore; see the [debug-data rescue procedure](ANDROID_DATA_RESCUE.md) if normal export remains broken. The repository does not publish a formally signed release APK yet. See [release readiness](RELEASE_READINESS.md) and [data boundary](DATA.md).
