# Privacy Policy — Belle PKU Timetable

Last updated: September 4, 2026

Belle PKU Timetable ("the extension") is a browser extension that improves the
interface of Peking University's elective course platform
(`https://elective.pku.edu.cn`). This policy explains what data the extension
handles.

## Data collection

The extension collects, transmits, and shares **no user data**. Specifically:

- It makes **no network requests**. All computation is performed locally in
  your browser.
- It contains **no analytics, tracking, or telemetry** of any kind.
- It does not read or alter pages other than `https://elective.pku.edu.cn/*`.

## Data storage

To avoid re-parsing the same page repeatedly, the extension caches a copy of
your already-selected course list using your browser's built-in web storage
(`localStorage` / `sessionStorage`). This cache:

- stays **on your device only**, scoped to the PKU elective site's own origin;
- is never sent anywhere, by the extension or by anyone else;
- is deleted automatically if you clear your browser data for that site, or by
  uninstalling the extension.

## Permissions

The extension requests **no permissions**. Its only access is a content script
scoped to `https://elective.pku.edu.cn/elective2008/*`, which lets it read the
course tables on that page and insert the timetable preview UI.

## Third parties

The extension does not sell, transfer, or disclose any data to third parties.
There are no third-party services embedded in it.

## Changes

If a future version changes any of the above, this policy will be updated and
the extension's store listing will be revised accordingly.

## Contact

Questions about this policy: open an issue at
[github.com/NarixHine/belle-pku/issues](https://github.com/NarixHine/belle-pku/issues).
