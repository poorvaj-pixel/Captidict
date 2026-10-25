# Captidict – frontend completion

## Changed
- components/captidict/spend-check-sheet.tsx: "Can I spend this?" now asks for an amount, a planned date (limited to the forecast window) and an optional description. It uses the existing checkSpend() forecast and reserve rules to show Safe / Risky / Not now, the lowest projected balance and its date, the reserve impact, and a safer date when the forecast supports one. Amount and date are validated. Without forecast data it shows the existing "needs forecast" message and invents no numbers.
- lib/forecast/forecast-provider.tsx: added a "received" follow-up status. It is session-only: kept in memory and cleared on reload or demo toggle.
- lib/forecast/lists.ts: added the outstandingItems() helper.
- components/captidict/receivables-panel.tsx: Receivables and Chase totals leave out items marked Received and show a "₹X received" badge. The overdue total leaves them out too. No records are duplicated, and forecast balances stay the same.
- lib/export/datasets.ts: CSV and PDF exports show the Received status, an outstanding total that matches the screen, and a session-only note.
- locales/en.json, hi.json, kn.json: new keys for the Received status, its notes and the outstanding total. All three languages have the same set of keys.

## Tested
- TypeScript check (tsc --noEmit): passed.
- Production build (next build): passed, with all 7 routes prerendered.
- Browser check (390px phone width, demo data): the spending check returned "Not now" with the lowest balance, its date and a "no safer date" note. Marking a Chase item Received lowered the total to ₹51,200 and showed a "₹18,500 received" badge. No page errors.
- The project has no automated test suite, so no tests were run.

## Limitations
- The forecast engine is still disconnected (ENGINE_CONNECTED = false), so all figures are demo data.
- Received and follow-up statuses are session-only and are not saved.
- Kannada and Hindi screens were not checked visually. A script confirmed that every English key also exists in both languages.

# Login and Signup UI (frontend only)

## Added
- app/login/page.tsx, app/signup/page.tsx: new /login and /signup pages.
- components/captidict/auth/auth-ui.tsx: shared layout (Captidict BrandMark, SurfaceCard), password field with show/hide, password-strength guide, "not connected yet" notice.
- components/captidict/auth/login-form.tsx and signup-form.tsx: the two forms with validation and links to each other.

## Changed
- components/captidict/app-shell.tsx: /login and /signup render without app navigation, the language gate, or any forecast/demo financial data.

## Security
- No authentication is performed. Valid details only show a "not connected yet" message; no session is created, nothing is sent, passwords are cleared and never written to local/session storage. "Remember me" is UI only. Real authentication must be connected later.

## Tested
- tsc --noEmit passed; next build passed (all routes prerendered).
- Browser at 1280px and 390px: required-field errors, show/hide toggle, password mismatch, strength meter, Login/Signup links, storage empty, no page errors.

## Limitations
- Auth page text is English only (not yet in hi/kn locale files).

# Light and Dark Mode

## Already existed
- A full dark color palette in app/globals.css, but it only followed the device setting; there was no switch and no saved choice.

## Added / changed
- components/captidict/theme-toggle.tsx (new): sun/moon button with label and tooltip, keyboard usable.
- lib/theme.ts (new): saved theme preference using the existing local-preference store (key captidict.theme).
- lib/theme-script.ts (new): small script run before first paint so the saved theme (or device setting) applies without a flash.
- app/globals.css: dark palette now switches on a `dark` class instead of the device setting; Tailwind `dark:` uses the same class. Light palette untouched.
- app/layout.tsx: runs the pre-paint script.
- components/captidict/app-header.tsx: toggle next to the language button (on every dashboard screen).
- components/captidict/auth/auth-ui.tsx: toggle on Login/Signup.
- components/captidict/brand.tsx: logo sprout was invisible in dark mode (gold on gold); now readable.

## Tested
- tsc --noEmit and next build passed.
- Browser: light -> dark by click, reload keeps dark, dark stays on Transactions, Forecast, What-if, Receivables, Warnings and Login; dark -> light by keyboard (Enter), reload keeps light. No page errors.
- Not checked visually: charts and dialogs with demo data in dark mode. The PDF export keeps fixed print colors on purpose.

# Final frontend audit

## Passed (checked in a real browser, production build)
- All 11 screens (Home, Transactions, Forecast, What-if, Bills, Receivables, Chase, Warnings, Profile, Login, Signup) load with status 200, in light and dark, at 1280px and 390px, with no sideways scrolling and exactly one theme switch each (44 checks).
- Demo data views (Home, Forecast, What-if, Receivables, Warnings) fit at both widths in both themes; "Demo data" banners and badges are shown.
- "Can I spend this?" sheet opens in all 4 combinations.
- Transactions: empty-form errors, add income and expense, net total updates, edit updates totals, search filters, delete with confirmation.
- Theme saves across refresh and navigation; Login/Signup checks from the earlier rounds; no passwords in browser storage (only the language and theme choices are saved).
- tsc --noEmit and next build passed. No page errors.

## Fixed
- No new problems found in this audit; nothing changed beyond this note. (Dark-mode logo fix is in the section above.)

## Not verified
- Hindi and Kannada screens, real phones/tablets, screen readers, printed PDF export in dark mode.
- Console shows a 404 for /_vercel/insights/script.js: Vercel Analytics only loads when hosted on Vercel. Expected, not an app bug.

## Backend required
- Real sign-in/sign-up, password reset and user-specific data access.
- Saving transactions (currently session-only) and bills/received statuses.
- Live forecast engine (ENGINE_CONNECTED = false). Entered transactions dated inside the forecast window are added to the demo forecast, warnings and spending check; with no forecast they are history only.
