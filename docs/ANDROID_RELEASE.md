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

The user installed the v37 debug-signed trial APK over the existing app: existing records remained, but export still crashed. The subsequent v38 trial writes directly to Android 10+ Downloads; the user reports a nonempty JSON file and a screenshot shows the app's successful read-back verification message. Two earlier JSON exports were 0-byte files and cannot be restored. The v38 file has not yet been transferred and restored in isolation. Keep the active app installed and its data intact. Before changing to a release signing identity, verify that isolated restore; see the [debug-data rescue procedure](ANDROID_DATA_RESCUE.md) if normal export breaks again. The v39 debug-signed preview adds a readable Excel export and a system file-picker entry near the Downloads folder, but those new interactions have not been tested on the user's phone. The repository does not publish a formally signed release APK yet. See [release readiness](RELEASE_READINESS.md) and [data boundary](DATA.md).

## Proposed first formal-install transition

The safest candidate is a **side-by-side first install** with a distinct formal package ID and a maintainer-held release key. This is a proposal, not a change already made to the build. It lets the existing debug-signed app remain installed and readable while a second installation imports the verified JSON backup. A new package ID means a separate local ledger: records will not appear automatically, and the user must stop editing the trial ledger only after the formal installation's records, categories, logs, reviews and recent notes have been checked. Any records added after the backup need a fresh export and a repeat import or an explicit reconciliation before cutover. The old installation should remain available until the owner confirms the transfer.

[Android's update rules](https://developer.android.com/google/play/app-updates) require a matching application ID and signing certificate (or a valid proof of rotation) for an update; a distinct application ID can coexist as a separate installation. This is the platform basis for the proposed route.

Keeping the current package ID with a new signing key requires uninstalling the debug-signed installation before the formal APK can be installed. That would put the only live copy of the ledger at risk, so it is **not** the proposed first transition. Signing the public release with the debug key would avoid this immediate install conflict but would make the temporary development credential the long-term update identity, so it is also not proposed.

Before implementing the side-by-side route, decide the permanent public package ID and display names, then test both installations together on a separate profile or device. Preserve the selected release key and increment `versionCode` for later updates under that same package ID. Do not build a public APK from this proposal until the active phone backup has passed independent restore and the exact transition has been rehearsed.
