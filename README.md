# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Project structure

The app is organised by feature with a strict dependency direction:

```
src/app/                     Expo Router screens (presentation only)
src/features/<feature>/
  components/                Feature UI (cards, rows, modals, fields)
  hooks/                     State + orchestration (loads, saves, deletes)
  logic/                     Pure rules and calculations (no React, no DB)
  services/                  SQLite access and row mapping
  types/                     Feature models
components/                  Shared app-wide components
src/hooks/                   Reusable hooks (selection, focus reload, image picker)
src/services/                Database, photo storage, legacy migration
src/utils/                   Currency/date/number/text/id helpers
src/constants/               Enumerations and UI constants
src/types/                   Shared type definitions
assets/psgc/                 Bundled PSGC address lists (generated)
scripts/                     Maintenance scripts (address data, project reset)
```

Screens render data from feature hooks; hooks call pure logic and repositories. Business rules live in `logic/`, and SQL stays inside `services/`.

## Tests

```bash
npm test           # run the Jest suite once
npm run test:watch # watch mode
```

Pure business rules are unit-tested in `src/features/*/logic/__tests__`.

## Onboarding, PIN, and app lock

A fresh install opens a five-screen onboarding flow before any app screen is reachable:

1. **Welcome** — app intro and an offline notice.
2. **Your details** — required full name and email, validated and normalized locally (no verification email).
3. **Security** — mandatory 4-digit PIN entered twice, plus optional biometric unlock.
4. **Privacy** — the notice must be accepted explicitly; acceptance version and timestamp are stored.
5. **Complete** — personalized greeting, "Go to Dashboard", and a first-cashbook shortcut when none exist.

Routing uses Expo Router's `Stack.Protected` groups in [`src/app/_layout.tsx`](src/app/_layout.tsx). The root layout renders a loading screen until SQLite is open and the onboarding/lock state is known, so the dashboard is never shown to a new or locked user. The app group stays mounted while `locked`: [`LockScreen.tsx`](src/features/auth/components/LockScreen.tsx) is a full-screen modal window, so unlocking returns to the exact screen the user left instead of the dashboard.

### Where the data lives

SQLite remains the single source of truth (`src/services/database.ts`, schema version 15):

| Table | Purpose |
| --- | --- |
| `user_profile` | One local profile row (`id = 'local'`) with name, email, and a currency code/symbol kept for schema compatibility (always read back as PHP). Existing profiles are migrated from the old `meta` JSON row. |
| `app_security` | One local row with the PBKDF2 hash, salt, algorithm, iteration count, PIN length, biometric flag, failed attempts, and `locked_until`. |
| `app_settings` | `onboarding_completed`, `app_lock_enabled`, `privacy_notice_version`, `privacy_accepted_at`. |

Onboarding saves the profile, security row, and settings inside a single transaction. `onboarding_completed` is written last, so a failed or interrupted save leaves the app in onboarding instead of a half-configured state.

### Authentication model

- The PIN is never persisted or logged. [`pinService.ts`](src/features/auth/services/pinService.ts) derives a PBKDF2-HMAC-SHA256 hash (10,000 iterations, 32-byte key, random 16-byte salt) with `@noble/hashes`. The count is stored per row: pure-JS PBKDF2 runs on the JS thread, and 100,000 iterations made Android unlocks take several seconds, so the work factor was lowered and the lockout policy carries the guessing defence. Accounts saved with the old count are re-derived at the current one after their next successful unlock.
- [`pinPolicy.ts`](src/features/auth/logic/pinPolicy.ts) applies escalating lockouts after 5, 6, and 7+ failed attempts (30 s, 2 min, 15 min). The lockout is checked against SQLite before hashing, so it cannot be bypassed from the UI.
- Optional biometric unlock uses `expo-local-authentication` with the device passcode fallback disabled. Enabling it requires a successful biometric check; the PIN remains mandatory. No biometric data is collected or stored.
- [`AuthProvider.tsx`](src/features/auth/providers/AuthProvider.tsx) keeps the in-memory status (`initializing`, `onboarding`, `locked`, `authenticated`). The lock policy is bank-app style: the app relocks after 60 s in the background (React Native cannot separate a device lock from an app switch, so the absence length is the signal) or 2 minutes untouched in the foreground. Share sheets, permission prompts, the camera and the photo picker run inside `runWithoutAutoLock` so they never count as leaving. The windows live in [`lockPolicy.ts`](src/features/auth/logic/lockPolicy.ts).
- Manage → Security ([`security-settings.tsx`](src/app/security-settings.tsx)) can turn the app lock on or off, enable/disable biometric unlock, and change the PIN. Changing the PIN also migrates an older six-digit PIN to four digits. Tent is single-currency in PHP (`₱`); every amount goes through [`currency.ts`](src/utils/currency.ts), and currency values saved by older builds resolve back to the default.
- **Delete my account** at the bottom of account settings wipes every SQLite table (`user_profile`, `app_security`, `app_settings`, cashbooks, bills, properties, tenants, reminders, and `meta`), deletes the app-private `photos` folder, cancels scheduled reminder alerts, and clears legacy AsyncStorage. The database is vacuumed so freed pages do not retain old rows, and the app returns to the welcome screen. Invoice images saved to the device gallery are outside the app sandbox and are left untouched.

### Security limitations

- The biometric prompt unlocks the app; it does **not** encrypt the SQLite file. Anyone with access to an unlocked device, a debug build, or an unencrypted device backup can read the database. Add SQLCipher if at-rest encryption is required.
- A 4-digit PIN has only ten thousand combinations (six digits for accounts that have not changed it yet), so a leaked database could be brute-forced offline even with PBKDF2. The hash protects against casual disclosure, not against a full device compromise; the on-device lockout only slows someone typing at the lock screen.
- `expo-secure-store` is intentionally not used: per the spec the only authentication secret is the PIN hash + salt, which is stored in SQLite. There are no tokens or plaintext PINs to place in the keychain.
- The profile is local and unverified; it is not a cloud account. Future sync must be added separately (repositories and `deleted_at` columns are ready for it).

### Testing the flow

```bash
npx expo start        # Expo Go works for PIN + fingerprint/Android biometrics
npx expo run:ios      # Face ID requires a development build, not Expo Go
npm test              # validation, PIN hashing, lockout, and transaction tests
```

To replay onboarding, uninstall the app (Android clears the database) or delete the app's SQLite file, then relaunch. On iOS the Face ID prompt only appears in a development/production build because Expo Go does not include `NSFaceIDUsageDescription`.

## Monthly billing

The **Monthly Billing** tab reports one month at a time (`YYYY-MM`); amounts are stored in `monthly_bill_entries`.

- **Meter reading**: enter the previous and current meter readings plus the invoice amount. Consumption is `current − previous`; the previous reading is auto-filled from last month (or `0` when there is no entry). The rate is `invoice ÷ consumption`. Sub-metered units enter their own previous/current readings and are charged `consumption × rate`.
- **Total consumption**: enter the consumption and invoice amount. The rate is `invoice ÷ consumption`; sub-metered units enter consumption and are charged `consumption × rate`.
- **Unit bills page**: the Monthly Billing overview lists each building and its own utilities only. Tapping a building name, or its unit row, opens the unit bills page (with the same month) where every unit's utilities are recorded and marked paid.
- **Attention Needed cards**: tapping one on Home opens Monthly Billing for that month and pulses the card that owns the unit's bills (its building, or the standalone unit itself).
- **Sub-meter flag**: only units flagged as sub-metered for that bill are deducted. A negative owner share is displayed with a warning instead of being hidden.
- **Split across units**: the building invoice is divided equally across the units linked to that bill (cent-exact shares).
- **Per Person**: the building invoice is divided by the active tenants across the linked units, then multiplied by each unit's active tenant count.
- **Fixed amount per month**: the building amount defaults to the bill's Default amount and stays editable per month. A unit can be marked on its property setup as paying a fixed share of that bill; the share is deducted from the building amount every month.
- **Meter photo evidence**: any entered bill can include a camera/library photo stored in app-private storage; replacing or clearing it removes the previous file.
- **Home camera shortcut**: the **Camera** quick action on Home opens the camera directly. After the photo is taken, a sheet asks for the month, then the property and one of its bills (including that month's one-off bills), then opens the usual Entry dialog with the photo already attached. Saving tags the photo to that bill.
- **Payment tracking**: tapping any utility opens one drawer with two tabs — **Entry** (reading/amount and meter photo) and **Payment** (date paid, mode of payment, optional description, optional proof photo). Computed lines (fixed share, split, per person) open straight on the Payment tab. Each tab saves only its own section through the drawer's pinned action row, so **Save** / **Mark paid** / **Cancel** stay on screen; the photo field is a compact camera button until a photo is attached. The drawer measures the keyboard height itself rather than using `KeyboardAvoidingView` (inside a modal it re-padded the layout mid-animation and dropped focus), lifts the sheet above the keyboard, and scrolls the focused field into view once the keyboard has opened. Payments never change the computed shares; marking a bill unpaid clears the payment details and removes its proof file. Paid rows show a read-only `Paid <date>` label, and the monthly summary counts paid and unpaid bills.
- **Invoice template**: sharing a building or unit opens a full-screen image invoice ([`BillInvoiceModal.tsx`](src/features/monthlyBilling/components/BillInvoiceModal.tsx)). Every bill prints its details one per line in the invoice's black ink — utility type, due date, meter reading, consumption, and the building's computed rate per unit (so a tenant can check `consumption × rate`). The optional footer image (for example a GCash QR code) spans the invoice content width and keeps the uploaded image's own aspect ratio.
- **One-off bills**: the **+ Bill** button at the top of Monthly Billing lets you pick a building or unit, then opens the normal bill form. The bill is saved only for that property and month, stays out of the Bills list, and is not carried into other months.

## Properties and addresses

The **New Property** form's address step cascades like a postal form: **Country → Province → City/Municipality → Barangay → Address line 1/2 → ZIP**.

- **Country** is a dropdown of ISO 3166 countries (default Philippines). Choosing the Philippines switches the next three fields to searchable pickers; any other country keeps them as free-text inputs.
- **Province / City / Barangay** come from the PSA **PSGC** (Philippine Standard Geographic Code): 84 province-level options (81 provinces plus Metro Manila, SOCCSKSARGEN and Zamboanga Peninsula, which own cities directly), 1,634 cities/municipalities and 42,046 barangays. Picking a value clears the levels below it, and each picker has a **"Use “…”"** row so a new or renamed place can still be typed.
- **Data source**: everything is offline. `assets/psgc/ph-addresses.psgc` (~635 KB) is trimmed from the PSGC API and shipped as a bundled asset, then read lazily the first time a picker opens (`loadPhAddresses()` caches it for the session). Regenerate it with `node scripts/build-ph-addresses.mjs` when PSA publishes a new release. The lists are resolved from the stored names, so properties saved before the pickers existed keep their address and gain the cascade.
- **Storage**: address fields stay plain text on the property row — `street` (address line 1), `street2` (address line 2, added in schema v15), `barangay`, `city`, `province`, `zip_code`, `country` — so invoices and summaries need no lookup to render. Address lines 1 and 2 are optional; `getPropertyAddress()` joins whichever parts exist.

## Gallery

**Options → Gallery** (also a Home quick action) collects every record photo the app saved into app-private storage and groups them by the day they were saved, newest first.

- **Sources**: property photos, tenant profile and ID photos, cashbook entry receipts, monthly bill meter readings, and payment proofs. Profile avatars and invoice branding stay out of the gallery.
- **Dates**: `persistPhoto()` embeds a millisecond timestamp in each file name, so photos can be sorted by save date without a database column; older files fall back to the file-system timestamp or the owning record's date.
- **Photo viewer**: tap a tile to open a zoomable preview with its tag, the record it belongs to, the save time, and record-specific details (tenant status, billing period and reading, payment mode, and so on).
- **Open record**: the viewer links back to the property summary, tenants list, cashbook entries, or the matching monthly billing page for building and unit bills.
- **Delete**: after confirmation, removing a photo clears the field that referenced it (property photo, tenant photo/ID, cashbook receipt, meter photo, or payment proof) and deletes the file.

## Reminders

**Options → Reminders** opens a month calendar; days with reminders show a dot and the selected day lists its reminders below.

- **Add / edit / delete**: the **New** button or the empty-state button opens the editor sheet (title, notes, date, time, repeat). Tap a reminder to edit it, or use its trash button to delete it after confirming.
- **Repeat**: `Never`, `Daily`, `Weekly`, or `Monthly`. Repeating reminders start on their selected date and show on every matching day; monthly reminders skip months that do not have the selected day (for example the 31st).
- **Device alerts**: saving a reminder asks for notification permission and schedules local notifications with sound and vibration, so the phone alerts even when the app is closed. The app keeps the next 60 occurrences scheduled and re-syncs them whenever the Reminders screen opens. Tapping an alert opens this screen.
- **Home bell**: today’s reminders are listed in the Home notification bell, count toward its red badge, and open this screen when tapped.
- **Platform notes**: alerts follow the device's silent / Do Not Disturb settings. On Android, battery optimisation can delay inexact alarms by a few minutes; web has no scheduled device alerts, so the calendar works but does not sound.
- **Android channels**: the `reminders` channel is created once per app launch. Some Android builds reject that call even though the channel is created (expo/expo#53907); the failure is logged and reminders still alert through Expo's built-in fallback channel.

## Building for a device (EAS)

App name, icon, splash screen, and permission prompts live in `app.json`, so they are baked into the native binary at build time — changing them requires a new build (an OTA update is not enough).

```bash
npx eas-cli build --platform android --profile preview   # installable .apk
npx eas-cli build --platform android --profile production # .aab for Play Store
npx eas-cli build --platform ios --profile preview        # internal distribution
```

`eas.json` defines three profiles: `development` (dev client), `preview` (internal distribution, Android APK you can sideload), and `production` (store build).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **example** directory and create a blank **src/app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
