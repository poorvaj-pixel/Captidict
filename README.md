# FlowSetu

**Know your cash before it gets tight.**

FlowSetu is a compact, offline-first cash-flow planning prototype for Indian small businesses. It turns upcoming receipts and obligations into an explainable 30-day view, highlights the lowest projected cash point, and lets an owner compare a late-payment stress case with a practical response.

## Requirements

- Node.js 20 or newer
- Docker Desktop / Docker Engine (recommended) or a PostgreSQL database
## Problem fit

This prototype addresses Finance problem F-03 from the supplied challenge statements: help small businesses anticipate cash-flow shortfalls and compare responses when customer payments, sales, or costs shift.

The app is intentionally a focused cash-flow decision tool rather than a general ledger or a bank-connected product.

## Run the prototype

1. Open **index.html** in a current desktop browser.
2. Select **Open demo workspace** on the login screen. It is a local demo gate, not production authentication.
3. Overview, Forecast, Transactions, and Private AI are separate pages in the sidebar.
4. In Overview, compare the base forecast, late-customer stress, and supplier-extension cases.
5. In Forecast, type a scenario such as **Aster pays 20 days late and sales drop 10%**, choose **Preview scenario**, check the parsed assumptions, and select **Apply to forecast**. The parser runs locally; there is no AI/API request. You can also use **Customer pays late** or the sliders, then select **Compare this move** for a 14-day supplier-extension line.
6. In Forecast → **Forecast backtest**, download the template and add one row per historical forecast checkpoint. The required columns are `forecast_date`, `target_date`, `predicted_low_inr`, `predicted_high_inr`, and `actual_cash_inr`; use `YYYY-MM-DD` dates and plain signed INR numbers without thousands separators. Import the CSV to calculate how often actual balances fell inside the recorded range. Data is read in memory only and is not uploaded or saved.
7. In Transactions → **All transactions**, add a forecast item or mark one received/paid. Open **Receivables** to see the ranked Smart Chase List, select a customer, choose a reminder tone, edit the draft, and copy it manually. Use **Edit** beside current cash on Overview to update the opening balance.
8. Choose **Import CSV** in Transactions to inspect a local file, review invalid/duplicate rows, then add valid rows. **Download CSV template** provides the supported format. No file is uploaded.
9. Use **Export** to download the current forecast and transaction inputs as a CSV. In Forecast, review the severity warning and work through the prioritized action checklist.
10. At the bottom of Forecast, review **Cash-flow funding brief** for the model-based P95 reserve buffer. Select **Export PDF brief**, then choose **Save as PDF** in the browser print dialog. The report is assembled locally and includes current pending transaction inputs and the active scenario.

The app saves its sample workspace and edits in browser local storage. **Next 30 days** restores the original demonstration data.

## The demonstration workspace

All company and transaction data are fictional.

- Opening cash: ₹5,00,000
- Safety reserve: ₹1,50,000
- Expected inflows: ₹5,35,000 nominal, weighted by confidence to ₹4,42,250
- Scheduled outflows: ₹4,78,000
- Base forecast low: ₹1,70,250 on 1 November
- Late-payment scenario: Aster Retail pays 10 days late; a ₹2,00,000 surprise cost lands on 6 November; projected sales are 40% lower
- Supplier response: move the ₹1,55,000 supplier payment 14 days, from 30 October to 13 November
- In the supplied scenario, the projected low moves from −₹87,750 to ₹67,250. It remains ₹82,750 below the safety reserve, so the response improves the timing gap but does not make the forecast fully comfortable.
- The unexpected-cost date can be selected anywhere in the 30-day forecast.

Same-day inflows and outflows are netted together because the prototype has dates but no intraday timing. A real business should review the timing and likelihood of each item before acting.

## Features and modules

### 1. Login and Overview

- Local demo-access page with no password collection or account server
- Five summary cards for current cash, projected 30-day available cash, net movement, shortfall horizon, and reserve alerts
- Cash bridge from opening cash through expected receipts and committed payments to projected ending cash
- Scenario tabs for the base case, late-customer stress, and supplier-extension comparison
- Cash-health details and upcoming transaction snapshot
- A dynamic healthy/watch/high/critical alert with the modeled low, date, and distance from reserve

### 2. Forecast

- 30-day SVG forecast showing expected balance, what-if balance, reserve line, and optional supplier-extension comparison
- Adjustable delay for the largest pending receipt, surprise expense, and sales-drop assumptions
- Local natural-language what-if parser for a named pending-receipt delay, sales reduction, and unexpected expense; parsed assumptions must be previewed and confirmed before they change the chart
- Customer-specific delays are applied only to matching pending inflows. If a customer name does not match, the parser asks for a listed name instead of substituting another receipt.
- Scenario text is processed in the browser with simple deterministic rules. It is not sent to a hosted AI model or external API.
- Live slider updates: the forecast chart, projected low, reserve warning, and scenario summary react while an assumption is being dragged
- Selectable date for the unexpected expense
- Ranked three-step local action plan with scenario impact context and a saved completion checklist
- Pay-order planner directly below the forecast controls: ranks payments by owner-entered delay cost per ₹1,000 per week, and when the modeled low is below the reserve, compares 14-day shifts for bills the owner marks negotiable
- The planner applies a proposed shift to the forecast scenario only; it never changes the transaction due date or marks a payment complete
- Forecast backtest panel below the chart: imports historical forecast bounds and actual balances locally, reports in-band coverage and median band width, and identifies whether the file meets the 20-observation/six-month freshness threshold
- The current demo chart is an expected line, not a prediction band. Backtest bounds must come from historical snapshots supplied in the CSV; the panel does not fabricate past results, persist imported history, or claim the demo is already calibrated
- Cash-flow funding brief at the end of Forecast: estimates the extra buffer needed to keep simulated daily lows above reserve in 95% of 500 repeatable paths, and shows the P05 low, expected-path low, and observed coverage after the estimate
- Local, print-ready funding report includes the current scenario, pending transaction inputs, method, limitations, and backtest results only when the user has loaded them. Use the browser print dialog to save it as PDF.
- The P95 buffer is an indicative cash-flow scenario estimate, not a bank-ready credit decision, eligibility assessment, loan offer, or real-world safety guarantee
- Explicit explanation of confidence-weighted receipts and same-day netting

### 3. Transactions

- Fictional starting transactions with dates and receipt-confidence assumptions
- Add an inflow or outflow with a date and confidence
- Edit the opening available cash and recalculate the outlook
- Mark a receipt received or payment paid; the app updates opening cash and excludes that item from future projection
- Receivables view ranks pending customer receipts using `amount × receipt confidence × timing factor`; the factor is 1.50 when the expected date has passed, 1.35 within 3 days, 1.20 within 4–7 days, 1.10 within 8–14 days, and 1.00 after 14 days. It uses the forecast date and does not infer contractual due dates or likelihood of lateness. The Overview shows the top two follow-ups
- Friendly, firm, and final reminder templates can be edited and copied locally. No email, WhatsApp, AI, or other message is sent; projected sales are excluded from the chase list
- For outflows, the Pay-order planner stores an optional weekly delay-cost estimate and a user-controlled “Can discuss date” flag
- Import CSV files locally with header matching, date/amount/confidence validation, duplicate detection, and a review preview before applying rows
- Optional CSV columns “Delay cost per week INR” and “Can discuss date” preserve these planner inputs on import/export
- Download a supported CSV template; completed rows in an exported CSV are skipped during re-import
- Export the daily scenario balance and transaction list to CSV

### 4. Private assistant

- Answers a small set of cash-flow questions using local forecast calculations and transparent rules
- No hosted AI model, AI API key, prompt upload, analytics, or third-party request is used
- Chat text is not saved; answers are built in the browser from the visible workspace state
- The interface states that this is a local rules-based prototype, not a remote generative model or financial advice

### 5. Scenario planner

- Customer receipt delay: 0–14 days
- Natural-language receipt delay for a named pending customer: up to 90 days; the 30-day chart excludes receipts delayed beyond its visible window
- One-off unexpected expense: ₹0–₹2,50,000
- Projected sales reduction: 0–80%
- Natural-language expense amount: up to ₹1 crore; accepted examples include “unexpected expense ₹50,000” or “extra cost 1.5 lakh”
- Natural-language sales reduction: 0–100%; customer and sales scenarios are previewed before applying
- Preset late-customer stress case
- Compare a 14-day supplier-payment extension against the same stress case

### 6. Local persistence and calculation

- app.js keeps the sample state in one explicit data model and persists edits in browser local storage.
- Forecast receipts are multiplied by their confidence percentage; forecast outflows count at full value.
- Events are applied by date to a daily closing balance. A receipt marked received changes opening cash by its full amount.
- Payment priority is based on delay cost divided by amount, expressed per ₹1,000 per week. Higher ratios rank earlier. Only bills with both an entered cost and an owner-selected negotiable flag can be considered for a 14-day what-if shift; the planner tries lower-cost ratios first until the reserve is recovered or no eligible bills remain.
- Sample delay costs are fictional demo estimates, not rates from law, contracts, or lenders. The planner assumes a 14-day delay costs twice the entered weekly estimate; it does not model compounding or other penalties.
- No network requests or financial-account connections are made by this prototype.
- The natural-language scenario parser supports specific patterns rather than open-ended language; use a customer name from a pending inflow and verify the previewed assumptions.
- The calculation is visible in the source and has no hidden model or external service.

## Codebase structure

- **index.html** — application layout, labels, data-entry dialog, and dashboard sections
- **styles.css** — responsive dashboard styling, charts, tables, and dialog states
- **app.js** — sample data, local persistence, cash-flow calculation, scenario controls, transactions, CSV import/export, Smart Chase List and reminder drafts, local assistant, risk alerts, and action planner
- **README.md** — overview, run guide, modules, calculation notes, and known limitations
- The in-app **User guide** page explains setup, features, forecast math, Safe-to-Spend, and privacy limits.

## 48-hour handoff

Suggested repository name from the event brief: **Srujana_hackathon2026_flowsetu**.

For submission, create the GitHub repository with that name, add these project files, and include the one-minute demo video in the repository (for example, under a demo folder). Keep the recorded video to the working product flow rather than slides.

## Known limitations

- The prototype uses synthetic transactions and does not connect to bank feeds, UPI, accounting software, or live invoices.
- Confidence is entered by the user; it is not learned from historical payment data.
- The 30-day window, reserve, sample dates, and one-off stress-event date are fixed for this event demo.
- Same-day transactions are aggregated; there is no intraday ordering, tax calculation, credit recommendation, or guarantee that an expected receipt will arrive.
- The login screen is a visual demo gate, not real authentication. Do not use it to protect real accounts.
- Local storage is not encrypted. It is appropriate for fictional hackathon data only; someone with access to the same browser profile may be able to read it.
- The private assistant is a transparent local rules engine, not a generative AI model. It avoids sending financial data to an AI provider but offers a limited set of explanations.
- The funding brief uses 500 deterministic sample paths with independent receipt outcomes based on user-entered confidence. It does not size lender-approved credit, assess eligibility, or establish a real-world probability of safety.
- CSV import is limited to `.csv` files up to 2 MB and 500 rows, with transaction dates inside the 30-day forecast. Excel workbook parsing, invoice/OCR extraction, bank feeds, reconciliation, and automatic payment-history learning are not implemented.
- Forecasts are planning estimates. The app does not provide investment, lending, tax, or legal advice.

## Feature scope against the larger idea list

The supplied idea list describes many possible modules and explicitly recommends focusing the 48-hour build on an explainable cash-flow MVP. The prototype implements that recommended slice: dashboard, daily 30-day forecast, risk warning, scenario simulator, action planner, local CSV import, chart, and fictional business data. It also includes local transaction management, CSV export, and a private rules-based assistant.

The following remain future work and are not represented as live integrations: 7/60/90-day prediction bands; invoice/document extraction; bank/UPI/accounting connections and reconciliation; automated email/SMS reminders and scheduled reports; multi-business, multi-currency, or collaborator access; audit logs and encrypted storage; GST/India-specific compliance insights; inventory analytics; and lender eligibility, underwriting, or approved credit-line sizing. The funding brief is only a scenario-based reserve-buffer estimate. The backtest panel requires user-provided historical forecast bounds and actual balances; FlowSetu does not yet save forecast snapshots or generate prediction bands. The chase list is a lightweight follow-up aid, not a complete collections or accounts-receivable system. The current demo login is not authentication, and browser local storage is not encrypted.

## Suggested next steps after judging

1. Add CSV transaction import with a review step and duplicate detection.
2. Learn confidence from a user-approved payment history and show the number of observations behind each estimate.
3. Add weekly forecast views and named scenarios.
4. Add encrypted workspace storage, access controls, and an audit log before handling real business data.
5. Add optional bank or accounting integrations only after consent, security, and reconciliation are designed.

