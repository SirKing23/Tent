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

## Monthly billing

The **Monthly Billing** tab reports one month at a time (`YYYY-MM`); amounts are stored in `monthly_bill_entries`.

- **Meter reading**: enter the previous and current meter readings plus the invoice amount. Consumption is `current − previous`; the previous reading is auto-filled from last month (or `0` when there is no entry). The rate is `invoice ÷ consumption`. Sub-metered units enter their own previous/current readings and are charged `consumption × rate`.
- **Total consumption**: enter the consumption and invoice amount. The rate is `invoice ÷ consumption`; sub-metered units enter consumption and are charged `consumption × rate`.
- **Sub-meter flag**: only units flagged as sub-metered for that bill are deducted. A negative owner share is displayed with a warning instead of being hidden.
- **Split across units**: the building invoice is divided equally across the units linked to that bill (cent-exact shares).
- **Per Person**: the building invoice is divided by the active tenants across the linked units, then multiplied by each unit's active tenant count.
- **Fixed amount per month**: the building amount defaults to the bill's Default amount and stays editable per month. A unit can be marked on its property setup as paying a fixed share of that bill; the share is deducted from the building amount every month.
- **Meter photo evidence**: any entered bill can include a camera/library photo stored in app-private storage; replacing or clearing it removes the previous file.
- **Payment tracking**: each building bill and unit bill can be marked as paid with a payment date, mode (Cash, GCash, Maya, Bank transfer, Other), an optional description, and an optional proof-of-payment photo. Payments are stored on the monthly entry and never change the computed shares; marking a bill unpaid clears the payment details and removes its proof file. The monthly summary shows the number of paid and unpaid bill lines.
- **One-off bills**: the **+ Bill** button at the top of Monthly Billing lets you pick a building or unit, then opens the normal bill form. The bill is saved only for that property and month, stays out of the Bills list, and is not carried into other months.

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
