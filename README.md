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
3. **Security** — mandatory 6-digit PIN entered twice, plus optional biometric unlock.
4. **Privacy** — the notice must be accepted explicitly; acceptance version and timestamp are stored.
5. **Complete** — personalized greeting, "Go to Dashboard", and a first-cashbook shortcut when none exist.

Routing uses Expo Router's `Stack.Protected` groups in [`src/app/_layout.tsx`](src/app/_layout.tsx). The root layout renders a loading screen until SQLite is open and the onboarding/lock state is known, so the dashboard is never shown to a new or locked user.

### Where the data lives

SQLite remains the single source of truth (`src/services/database.ts`, schema version 12):

| Table | Purpose |
| --- | --- |
| `user_profile` | One local profile row (`id = 'local'`) with name, email, ISO currency code, and symbol. Existing profiles are migrated from the old `meta` JSON row. |
| `app_security` | One local row with the PBKDF2 hash, salt, algorithm, iteration count, biometric flag, failed attempts, and `locked_until`. |
| `app_settings` | `onboarding_completed`, `app_lock_enabled`, `privacy_notice_version`, `privacy_accepted_at`. |

Onboarding saves the profile, security row, and settings inside a single transaction. `onboarding_completed` is written last, so a failed or interrupted save leaves the app in onboarding instead of a half-configured state.

### Authentication model

- The PIN is never persisted or logged. [`pinService.ts`](src/features/auth/services/pinService.ts) derives a PBKDF2-HMAC-SHA256 hash (100,000 iterations, 32-byte key, random 16-byte salt) with `@noble/hashes`. The iteration count is stored per row so it can be raised later.
- [`pinPolicy.ts`](src/features/auth/logic/pinPolicy.ts) applies escalating lockouts after 5, 6, and 7+ failed attempts (30 s, 2 min, 15 min). The lockout is checked against SQLite before hashing, so it cannot be bypassed from the UI.
- Optional biometric unlock uses `expo-local-authentication` with the device passcode fallback disabled. Enabling it requires a successful biometric check; the PIN remains mandatory. No biometric data is collected or stored.
- [`AuthProvider.tsx`](src/features/auth/providers/AuthProvider.tsx) keeps the in-memory status (`initializing`, `onboarding`, `locked`, `authenticated`). The lock policy is immediate: leaving the foreground locks the app. The grace period constant lives in [`lockPolicy.ts`](src/features/auth/logic/lockPolicy.ts).
- Account settings (Manage tab → profile card) can turn the launch PIN on or off, enable/disable biometric unlock, and change the default currency. PHP (`₱`) is the default and all amounts go through [`currency.ts`](src/utils/currency.ts).
- **Delete my account** at the bottom of account settings wipes every SQLite table (`user_profile`, `app_security`, `app_settings`, cashbooks, bills, properties, tenants, reminders, and `meta`), deletes the app-private `photos` folder, cancels scheduled reminder alerts, and clears legacy AsyncStorage. The database is vacuumed so freed pages do not retain old rows, and the app returns to the welcome screen. Invoice images saved to the device gallery are outside the app sandbox and are left untouched.

### Security limitations

- The biometric prompt unlocks the app; it does **not** encrypt the SQLite file. Anyone with access to an unlocked device, a debug build, or an unencrypted device backup can read the database. Add SQLCipher if at-rest encryption is required.
- A 6-digit PIN has only one million combinations, so a leaked database could be brute-forced offline even with PBKDF2. The hash protects against casual disclosure, not against a full device compromise.
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
- **Sub-meter flag**: only units flagged as sub-metered for that bill are deducted. A negative owner share is displayed with a warning instead of being hidden.
- **Split across units**: the building invoice is divided equally across the units linked to that bill (cent-exact shares).
- **Per Person**: the building invoice is divided by the active tenants across the linked units, then multiplied by each unit's active tenant count.
- **Fixed amount per month**: the building amount defaults to the bill's Default amount and stays editable per month. A unit can be marked on its property setup as paying a fixed share of that bill; the share is deducted from the building amount every month.
- **Meter photo evidence**: any entered bill can include a camera/library photo stored in app-private storage; replacing or clearing it removes the previous file.
- **Payment tracking**: tapping any utility opens one dialog with two tabs — **Entry** (reading/amount and meter photo) and **Payment** (date paid, mode of payment, optional description, optional proof photo). Computed lines (fixed share, split, per person) open straight on the Payment tab. Each tab saves only its own section, and payments never change the computed shares; marking a bill unpaid clears the payment details and removes its proof file. Paid rows show a read-only `Paid <date>` label, and the monthly summary counts paid and unpaid bills.
- **One-off bills**: the **+ Bill** button at the top of Monthly Billing lets you pick a building or unit, then opens the normal bill form. The bill is saved only for that property and month, stays out of the Bills list, and is not carried into other months.

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
