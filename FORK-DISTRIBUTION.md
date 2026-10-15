# Windows Koffi compatibility packages

The source fix is commit `086b3d683076d83d90662269353b4cc30d2771f6`:
upgrade Koffi from 2.15.6 to 2.16.3. No native code changes are required.

This branch provides a registry-publication-free distribution of that fix.
Run `node scripts/pack-koffi-fork.mjs` to reproduce the two packages in
`.fork-packages`. The script downloads the existing MIT-licensed
`@jitl/opentui-core@0.4.0` and `@jitl/opentui-react@0.4.0` npm archives,
verifies their pinned SHA-512 integrity, and repacks their prebuilt files.
Original licenses are retained. No dependencies are bundled, build hooks run,
or npm packages published.

The packages use `@opentui/core` and `@opentui/react` as their canonical names.
Core changes only its package name, version, repository URL and Koffi pin.
All eight original `@jitl/opentui-core-*` platform dependencies remain pinned
to 0.4.0, so their already-published native binaries are installed normally.
React's core imports, declarations and dependency are redirected to the same
fork core archive to ensure exactly one core/Yoga instance, including
consumers such as `tui-md` that import `@opentui/core`.

Install the two archives from GitHub release
`opentui-0.4.0-koffi-2.16.3`. The release includes SHA-256 checksums.
Do not replace assets or move its tag; issue a new version for future changes.
Consumers should commit their package-manager lockfile with archive integrity.
The upstream PR intentionally excludes this downstream packaging branch.
