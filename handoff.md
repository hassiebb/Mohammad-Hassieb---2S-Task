# Handoff Documentation: Odoo Sales Mobile (2S Egypt)

> **Document Purpose**: This document serves as the single source of truth for the Odoo Sales Mobile application developed for the **2S Egypt** technical assessment. Any AI coding agent or engineer reading this file should be able to understand the full system architecture, implementation history, verified test results, operational constraints, and pending decisions without referring to prior conversational transcripts.

---

## 1. Project Overview and Purpose

* **Client / Context**: Internal sales mobile application for **2S Egypt** ([www.2segypt.com](https://www.2segypt.com/) / [www.sys.2segypt.com](https://www.sys.2segypt.com/)).
* **Project Type**: 2-day technical assessment demonstrating enterprise integration with Odoo ERP.
* **Core Functionality**:
  1. Secure authentication against Odoo ERP using employee credentials.
  2. Customer listing, name/phone/city search, and detailed profile viewing.
  3. Reversible customer phone number updates with server read-back verification.
  4. Resilient offline customer caching and queued pending update synchronization.
  5. Role-based sales order management with quotation confirmation for internal users.
* **Branding & Theme**: Enterprise 2S Egypt brand palette:
  * Primary Midnight Slate: `#0E1926`
  * Warm Amber Accent: `#FF8622`
  * Forest Emerald Verification: `#008669`
  * Neutral Surface Background: `#F8FAFC`
  * Geometric "2S" brand monogram logo.

---

## 2. Assessment Requirements and Acceptance Criteria

| Requirement | Implementation Details | Code Evidence | Test Coverage | Current Status | Remaining Work |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Authentication** | Odoo username and password login. Web JSON-RPC active default; XML-RPC client implemented as switchable transport. | `LoginForm.tsx`<br>`odoo-auth.service.ts`<br>`odoo-xmlrpc-auth.service.ts` | `test-odoo-unit.ts`<br>`test-xmlrpc-unit.ts` | **Fully Implemented** | Live test XML-RPC on a persistent host that routes `/xmlrpc`. |
| **2. Customer List & Search** | Queries `res.partner` where `customer_rank > 0`. Name, phone, city display with real-time text filter. | `CustomerList.tsx`<br>`CustomerCard.tsx`<br>`odoo-customer.service.ts`<br>`odoo-xmlrpc-customer.service.ts` | `test-odoo-unit.ts`<br>`test-xmlrpc-unit.ts`<br>`verify-odoo-integration.ts` | **Fully Implemented** | Live-verified via mobile UI with real Odoo records. |
| **3. Customer Details & Phone Edit** | Full contact details. Modal phone editor. Server write with read-back verification before confirming success. | `customer/[id].tsx`<br>`CustomerPhoneModal.tsx`<br>`odoo-customer.service.ts`<br>`odoo-xmlrpc-customer.service.ts` | `test-odoo-unit.ts`<br>`test-xmlrpc-unit.ts`<br>`test-offline-sync.ts` | **Fully Implemented** | Live-verified via mobile UI; phone updates confirmed in Odoo database. |
| **4. Offline Caching & Sync** | Scoped local caching, offline directory search, queued phone edits, conflict detection, auto/manual sync on reconnect. | `offline-customer.service.ts`<br>`customer-cache.ts`<br>`sync-service.ts`<br>`OfflineBanner.tsx` | `test-offline-sync.ts` (44 assertions) | **Fully Implemented** | Live UI testing in airplane mode on physical/emulator device. |
| **5. Sales Orders & Quotations** | Role-guarded (`base.group_user`). Lists `sale.order` with status badges. Order lines/products in details. Quotation confirmation (`action_confirm`). | `SalesOrderList.tsx`<br>`SalesOrderCard.tsx`<br>`order/[id].tsx`<br>`odoo-sales-order.service.ts`<br>`odoo-xmlrpc-sales-order.service.ts` | `test-odoo-unit.ts`<br>`test-xmlrpc-unit.ts` | **Fully Implemented** | Preserved from mutating test scripts to prevent accidental order state changes. |

---

## 3. Technology Stack and Repository Structure

### Verified Dependencies (`package.json`)
* **Framework**: React Native `0.86.3` with Expo SDK `~57.0.27`
* **Routing**: Expo Router `~57.0.25` (file-based navigation in `src/app`)
* **React Core**: React `19.2.3` / React DOM `19.2.3`
* **Language & Types**: TypeScript `~6.0.3`
* **Local Storage**: `@react-native-async-storage/async-storage` `2.2.0`
* **Connectivity Detection**: `@react-native-community/netinfo` `12.0.1`
* **Icons**: `@expo/vector-icons` `^15.0.2`
* **Linter**: `eslint` `^9.0.0` with `eslint-config-expo` `~57.0.2`

### Repository Layout
```text
.
├── .github/workflows/ci.yml          # Automated CI workflow
├── .editorconfig                     # Editor standards
├── .gitattributes                    # Line ending normalization
├── .gitignore                        # Git ignore definitions
├── .env                              # Active non-secret environment variables (EXPO_PUBLIC_*)
├── .env.example                      # Template configuration reference
├── app.json                          # Expo project configuration
├── package.json                      # Project dependencies and test scripts
├── tsconfig.json                     # TypeScript strict configuration
├── handoff.md                        # Master handoff and architecture documentation (this file)
├── scripts/
│   ├── fixtures/
│   │   └── mock/                     # Isolated mock test data and services (excluded from client bundle)
│   ├── provision-demo-instance.ts    # Standalone script to request temporary Odoo demo instance
│   ├── reset-project.js              # Expo template reset utility
│   ├── test-odoo-unit.ts             # Unit test suite for JSON-RPC adapters & guards (34 tests)
│   ├── test-offline-sync.ts          # Unit test suite for offline cache, queue, & sync (44 tests)
│   ├── test-xmlrpc-unit.ts           # Unit test suite for XML-RPC serializer & adapters (68 tests)
│   ├── verify-mock-workflow.ts       # Service boundary & anti-fallback audit test suite (52 tests)
│   └── verify-odoo-integration.ts    # End-to-end integration test against live Odoo ERP (33 tests)
└── src/
    ├── app/                          # Expo Router routes
    │   ├── _layout.tsx               # Root layout with AuthProvider & SafeAreaProvider
    │   ├── (auth)/
    │   │   ├── _layout.tsx
    │   │   └── login.tsx             # Login route
    │   └── (app)/
    │       ├── _layout.tsx           # Authenticated layout with redirect guard
    │       ├── (tabs)/
    │       │   ├── _layout.tsx       # Bottom tab navigation (Customers, Orders, Profile)
    │       │   ├── customers.tsx     # Customers directory tab
    │       │   ├── orders.tsx        # Sales orders tab with RoleGuard
    │       │   └── profile.tsx       # Profile tab with safe logout dialog
    │       ├── customer/
    │       │   └── [id].tsx          # Customer profile & phone editor screen
    │       └── order/
    │           └── [id].tsx          # Sales order details & quotation confirmation modal
    ├── components/                   # Reusable UI design system components
    │   ├── Badge.tsx                 # Status indicator badges
    │   ├── Button.tsx                # Accessible touchable buttons
    │   ├── Card.tsx                  # Elevated surface cards
    │   ├── EmptyState.tsx            # Clean empty directory/order states
    │   ├── Input.tsx                 # Form inputs with inline validation & password toggles
    │   ├── LoadingSpinner.tsx        # Branded loading indicators
    │   ├── OfflineBanner.tsx         # Network & pending synchronization banner
    │   ├── RoleGuard.tsx             # Role-based component rendering guard
    │   └── SearchBar.tsx             # Debounced directory search input
    ├── constants/
    │   ├── colors.ts                 # 2S Egypt enterprise color tokens
    │   └── config.ts                 # APP_CONFIG and transport selector
    ├── features/                     # Feature domain components and React hooks
    │   ├── auth/                     # LoginForm, AuthContext, useAuth
    │   ├── customers/                # CustomerList, CustomerCard, CustomerPhoneModal, useCustomers
    │   └── sales-orders/             # SalesOrderList, SalesOrderCard, QuotationConfirmModal, useSalesOrders
    ├── lib/                          # Utility functions
    │   ├── formatters.ts             # Currency and date formatters
    │   ├── logger.ts                 # Safe redaction logger
    │   └── validation.ts             # Username, password, and phone number validators
    ├── services/                     # Service layer & backend adapters
    │   ├── index.ts                  # Service container exporting authService, customerService, salesOrderService
    │   ├── odoo/                     # JSON-RPC (Web Client) implementation
    │   │   ├── odoo-client.ts        # /web/session/authenticate & /web/dataset/call_kw
    │   │   ├── odoo-auth.service.ts  # IAuthService via JSON-RPC
    │   │   ├── odoo-customer.service.ts
    │   │   ├── odoo-sales-order.service.ts
    │   │   └── xmlrpc/               # XML-RPC external API implementation
    │   │       ├── xmlrpc-serializer.ts # Pure TypeScript XML encoder/decoder & fault parser
    │   │       ├── odoo-xmlrpc-client.ts # /xmlrpc/2/common & /xmlrpc/2/object gateway
    │   │       ├── odoo-xmlrpc-auth.service.ts
    │   │       ├── odoo-xmlrpc-customer.service.ts
    │   │       └── odoo-xmlrpc-sales-order.service.ts
    │   ├── offline/                  # Offline persistence & synchronization
    │   │   ├── customer-cache.ts     # User/database scoped cache repository
    │   │   ├── network-service.ts    # NetInfo listener & connectivity checker
    │   │   ├── offline-customer.service.ts # Offline delegate wrapper for ICustomerService
    │   │   └── sync-service.ts       # Pending update batch processor & conflict resolver
    │   └── storage/
    │       └── storage-adapter.ts    # AsyncStorage adapter with memory fallback for tests
    └── types/                        # Core TypeScript domain definitions
        ├── auth.ts                   # User, Session, LoginCredentials, IAuthService
        ├── customer.ts               # Customer, CustomerUpdateInput, ICustomerService
        ├── offline.ts                # PendingPhoneUpdate, CachedCustomerDirectory, SyncResult
        └── sales-order.ts            # SalesOrder, SalesOrderLine, SalesOrderStatus, ISalesOrderService
```

---

## 4. Architecture and Service Responsibilities

### Service Layer Design
All application UI screens and hooks interact exclusively with three clean interfaces defined in `src/types/`:
* `authService: IAuthService`
* `customerService: ICustomerService`
* `salesOrderService: ISalesOrderService`

### Transport Delegation (`src/services/index.ts`)
The application supports dual-transport delegation controlled by `APP_CONFIG.transport`:
* **JSON-RPC (Production Default)**:
  * Uses `odooAuth`, `odooCustomers`, `odooSalesOrders` (via `defaultOdooClient`).
  * Endpoints: `/web/session/authenticate` and `/web/dataset/call_kw`.
* **XML-RPC (Compliance Transport)**:
  * Uses `odooXmlRpcAuth`, `odooXmlRpcCustomers`, `odooXmlRpcSalesOrders` (via `defaultOdooXmlRpcClient`).
  * Endpoints: `/xmlrpc/2/common` and `/xmlrpc/2/object`.
* **Dynamic Resolution**:
  Helper functions `getActiveAuthService()`, `getActiveCustomerService()`, and `getActiveSalesOrderService()` dynamically route requests based on configuration.
* **Offline Wrapper**:
  `customerService` is wrapped by `offlineCustomerService`, which transparently delegates to the active customer service when online, caches responses locally, returns cached data when offline, and queues phone edits when disconnected.

---

## 5. API Protocols, Authentication, and Compatibility

### The Protocol Requirement Mismatch
The assessment email explicitly specifies:
> *"Authenticate using Odoo username and password. Prefer REST API, with XML-RPC as fallback."*

#### Key Technical Realities:
1. **Core Odoo Has No Built-in REST API**:
   Standard Odoo (Community and Enterprise) does not ship a native REST API without third-party community modules (such as OCA's `base_rest` or `fastapi`). Because these require custom server addons, candidates cannot assume REST availability on standard Odoo instances. Recruiters mention "XML-RPC as fallback" precisely for this reason.
2. **Current JSON-RPC Implementation**:
   * Uses Odoo's internal web-client controllers (`/web/session/authenticate` and `/web/dataset/call_kw`).
   * Authenticates with username and password, managing state via Werkzeug session cookies (`Set-Cookie: session_id=...`).
   * **Limitation**: While completely functional and verified on live Odoo mobile sessions, it is JSON-RPC 2.0, not REST and not XML-RPC.
3. **Official JSON-2 API (Odoo 19+) Limitation**:
   * Modern Odoo 19+ introduces the JSON-2 external API specification.
   * **Limitation**: JSON-2 requires an API Key (Personal Access Token / Bearer token). It **does not support direct username/password login**. Hardcoding an administrative API key into a mobile client APK violates mobile security standards.
4. **Official XML-RPC Implementation**:
   * Implemented in `src/services/odoo/xmlrpc/` without external packages.
   * Uses `/xmlrpc/2/common` (`authenticate`) and `/xmlrpc/2/object` (`execute_kw`).
   * Authenticates directly with username and password, returning an integer `uid`.
   * Passes `[db, uid, password, model, method, args, kwargs]` on every model call.
   * Holds the password token ephemerally in memory during the active session; never persists it to disk.

### Live Compatibility Status
* **Unit Tests**: The XML-RPC serializer, client, authentication, customer service, and sales order service pass **68/68 unit tests** in isolation.
* **Live Integration Caveat**: On Odoo's public demo cluster (`https://demo1.odoo.com`), the Nginx reverse proxy returns **HTTP 404** for `/xmlrpc/2/common` and `/xmlrpc/2/object`.
* **Default Setting**: For this reason, `APP_CONFIG.transport` remains configured to `'jsonrpc'` by default in production. XML-RPC should not be made the default until live-verified against a server that routes external XML-RPC traffic.

---

## 6. Offline Cache and Synchronization Subsystem

### Persistent Local Storage
Implemented via `src/services/offline/` and `@react-native-async-storage/async-storage`:
1. **Cache Namespace Scoping**:
   All cache keys are prefixed by tenant context: `odoo_${userId}_${database}`. This prevents data leakage if multiple users log in on the same physical device.
2. **Customer Directory Caching**:
   Successful fetches cache the full customer directory and individual customer details.
   When offline, `CustomerList` and `CustomerDetails` transparently display cached data with an `OfflineBanner` showing `(saved HH:MM)`.
3. **Offline Edit Queue (`PendingPhoneUpdate`)**:
   When a user updates a customer phone number without internet:
   * The local cache updates optimistically.
   * A queue entry is created with status `'pending'`, storing `originalPhone`, `newPhone`, `queuedAt`, and `attempts`.
   * The UI displays a "Pending Sync" badge on customer cards.
4. **Synchronization Triggering (`SyncService`)**:
   Sync executes automatically on:
   * Network reconnection (detected via `@react-native-community/netinfo`).
   * Manual user tap on "Sync Now" in `OfflineBanner`.
5. **Conflict Detection**:
   Before updating Odoo, `SyncService` fetches the latest remote partner record:
   * If remote phone equals `originalPhone`, the update proceeds.
   * If remote phone has been changed remotely to something different, a conflict is detected: the queue item is flagged `'conflict'`, and the remote value is preserved without silent overwriting.
6. **Read-Back Verification**:
   The update is only marked `'synced'` and removed from the queue after writing to Odoo and reading back the record to confirm the database contains the new number.
7. **Session Expiry Protection**:
   If the session expires during sync, the sync process halts immediately, safely preserving all queued edits in local storage.
8. **Logout Safety Dialog**:
   If unsynchronized edits exist when a user attempts to log out on `profile.tsx`, a warning dialog informs the user of pending items to prevent accidental data loss.

---

## 7. Hosting History and Target Environment Migration

### Active Target Environment: Dedicated Persistent Odoo Cloud (`2s-task`)
The project has successfully transitioned from temporary demo databases to our dedicated persistent Odoo Cloud instance:
* **Host URL**: `https://2s-task.odoo.com`
* **Database Name**: `2s-task`
* **Odoo Version**: `20.0+e` (Enterprise Cloud)
* **Status**: **Verified Persistent & Reachable**
* **Transport Support**: Both **JSON-RPC** (`/web/session/authenticate`, `/web/dataset/call_kw`) and **XML-RPC** (`/xmlrpc/2/common`, `/xmlrpc/2/object`) are fully supported and non-mutatingly verified.
* **Base URL Sanitization**: Routing is protected by `sanitizeOdooBaseUrl()` across `APP_CONFIG`, `OdooClient`, and `OdooXmlRpcClient`, safely stripping any trailing `/odoo`, `/web`, or `/xmlrpc` path suffixes entered by users.

### Historical Context of Temporary Demo Clusters (Replaced)
The project previously relied on ephemeral demo databases generated via `https://demo.odoo.com/start`.

#### Recorded Historical Pairs (Deprecated / Expired):
* `https://demo1.odoo.com` + `demo_200_ee764e72a7aa_1791831423` (Expired)
* `https://demo2.odoo.com` + `demo_200_1c4df2bb5714_1791836761` (Expired)
* `https://demo1.odoo.com` + `demo_200_239c49faa86c_1791836763` (Expired)
* `https://demo1.odoo.com` + `demo_200_afb363063df1_1791837593` (Expired)
* `https://demo1.odoo.com` + `demo_200_e43804688927_1791841628` (Expired / Dropped)

#### Why Temporary Demo Instances Were Deprecated:
1. **Automated Deletion**:
   Odoo S.A.'s public demo clusters run an automated janitor process that **physically drops the PostgreSQL database after 3 to 4 hours**.
2. **Reviewer Evaluation Delay**:
   Evaluating an APK 1–2 days after build would result in immediate connection failures on ephemeral demo instances.
3. **Dedicated Cloud Resolution**:
   By configuring `https://2s-task.odoo.com`, reviewers have 24/7 uninterrupted access without manual provisioning or risk of database expiration.

#### Non-Mutating Verification Probe Protocol:
```javascript
// Protocol Probe against https://2s-task.odoo.com
fetch(`${host}/web/session/authenticate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'call',
    params: { db, login: 'probe_user', password: 'probe_password' }
  })
})
```
* **Database exists & active**: Returns RPC error `odoo.exceptions.AccessDenied` (HTTP 200). Verified on `2s-task`.
* **Database expired**: Returns `FATAL: database "<db>" does not exist` or `KeyError`.

---

## 8. Proposed Local Odoo Community Approach

### Investigation Overview
The candidate investigated hosting **Odoo 18.0 Community** locally with persistent storage and exposing it to external reviewers at zero cost.

### Proposed Architecture:
* **Backend**: Docker Compose running `odoo:18.0` and `postgres:15` with a named Docker volume for permanent storage.
* **Modules**: `contacts`, `sale_management`.
* **API Compatibility**:
  * Unlike `demo1.odoo.com`, local Odoo Community natively exposes both **XML-RPC** (`/xmlrpc/2/*`) and **JSON-RPC** on port `8069`.
  * Allows testing and demonstrating both transports.
* **Reviewer Exposure ($0 Cost)**:
  * Using **Cloudflare Tunnel (`cloudflared`)**: `cloudflared tunnel --url http://localhost:8069`.
  * Generates a stable public HTTPS URL with valid TLS certificates.

### Critical Operational Risks:
1. **PC Uptime Requirement**: The host machine must remain powered on, awake, and connected to the internet with Docker and the tunnel process active throughout the reviewer's evaluation window.
2. **Reviewer Accounts**: A dedicated sales rep account (`sales` / password) should be provisioned for reviewers rather than exposing master `admin` credentials.
3. **Current Status**: **Unapproved and uninstalled**. The project remains in a clean, read-only state pending the user's hosting decision.

---

## 9. Configuration and Secret-Handling Rules

### Environment Variables
Managed via `.env`:
* `EXPO_PUBLIC_SERVICE_MODE=odoo`
* `EXPO_PUBLIC_ODOO_URL=https://demo1.odoo.com`
* `EXPO_PUBLIC_ODOO_DB=demo_200_e43804688927_1791841628`
* `EXPO_PUBLIC_ODOO_TRANSPORT=jsonrpc` (optional override: `xmlrpc`)

### Client Security Rules:
1. **Never Commit Secrets to `.env`**:
   `EXPO_PUBLIC_*` variables are **inlined into the JavaScript bundle at build time**. They are readable by anyone decompiling the APK. Never store passwords, private keys, or API tokens in `EXPO_PUBLIC_*`.
2. **No Persistent Password Storage**:
   User passwords must never be stored in `AsyncStorage`. The XML-RPC client keeps the password token in an in-memory session variable for the duration of the authenticated session only.
3. **Sanitized Client Errors**:
   Error messages must never reveal raw database names, PostgreSQL connection sockets (`/var/run/postgresql/.s.PGSQL.5432`), or stack traces in the UI.

---

## 10. Testing History and Verification Status

### Automated Test Suite Status (198 Total Passing Assertions)

```bash
npm run test:all
```

| Suite | Command | Test File | Assertions | Status |
| :--- | :--- | :--- | :--- | :--- |
| **XML-RPC Unit Tests** | `npm run test:xmlrpc-unit` | `scripts/test-xmlrpc-unit.ts` | **68 passed, 0 failed** | **Verified** |
| **JSON-RPC Unit Tests** | `npm run test:odoo-unit` | `scripts/test-odoo-unit.ts` | **34 passed, 0 failed** | **Verified** |
| **Offline Cache & Sync Tests** | `npm run test:offline` | `scripts/test-offline-sync.ts` | **44 passed, 0 failed** | **Verified** |
| **Mock Workflow & Boundary Tests** | `npm run test:mock` | `scripts/verify-mock-workflow.ts` | **52 passed, 0 failed** | **Verified** |
| **TypeScript Compilation** | `npx tsc --noEmit` | Project-wide | **0 errors** | **Verified** |
| **ESLint Quality Check** | `npm run lint` | Project-wide | **0 errors, 0 warnings** | **Verified** |
| **Expo Doctor Health Check** | `npx expo-doctor` | Project-wide | **21/21 checks passed** | **Verified** |

### Live Target Integration Probes (`https://2s-task.odoo.com`)
* **JSON-RPC Version Probe**: `POST /web/webclient/version_info` → HTTP 200 (`server_version: 20.0+e`).
* **JSON-RPC Session Probe**: `POST /web/session/authenticate` (db: `2s-task`) → HTTP 200 (`odoo.exceptions.AccessDenied` on bad credentials, confirming active database).
* **XML-RPC Common Version Probe**: `POST /xmlrpc/2/common` (method `version`) → HTTP 200 (`server_version: 20.0+e`).
* **XML-RPC Authenticate Probe**: `POST /xmlrpc/2/common` (method `authenticate`, db: `2s-task`) → HTTP 200 (`<boolean>0</boolean>`).
* **Protocol Findings**: Unlike ephemeral demo clusters that 404 on XML-RPC, `https://2s-task.odoo.com` supports both JSON-RPC and XML-RPC natively.

### Live Mobile UI Verification History
* **Verified**: Live sign-in on Android (`admin` / password).
* **Verified**: Live customer directory retrieval (real partners loaded from Odoo).
* **Verified**: Live customer phone edit on ID `10` with read-back verification confirmed.
* **UX Verification**: `LoginForm.tsx` provides an expandable "Server Settings" accordion pre-filled with `https://2s-task.odoo.com` and `2s-task`, requiring zero manual setup by reviewers.
* **Side-Effect Warning**: **Never run mutating tests against live sales orders or customers without explicit authorization.**

---

## 11. Known Issues and Unresolved Decisions

1. **Hosting Persistence for Final APK**:
   * *Issue*: Current demo database will expire and be deleted by Odoo's garbage collector.
   * *Decision Needed*: Select either **Odoo Online ("One App Free" - Sales)** for 24/7 cloud persistence, or **Local Odoo Community via Docker + Cloudflare Tunnel**.
2. **XML-RPC Live Validation**:
   * *Issue*: XML-RPC client is unit-tested and fully implemented, but cannot be tested against `demo1.odoo.com` because Nginx returns 404.
   * *Next Step*: Live-verify XML-RPC as soon as the persistent Odoo target is ready, then switch `EXPO_PUBLIC_ODOO_TRANSPORT=xmlrpc`.
3. **Android Emulator Environment**:
   * The Android 16 Developer Preview emulator (`Pixel_6_Pro_API_Baklava`) exhibited system crashes. Recommended: use a stable API 34/35 emulator or a physical Android device.

---

## 12. Recommended Next Steps (Priority Order)

1. **Finalize Hosting Decision**:
   Confirm whether to use **Odoo Online Free Tier** (`https://<company>.odoo.com`) or **Local Docker Community 18 + Cloudflare Tunnel**.
2. **Update Environment Configuration**:
   Update `.env` with the permanent `EXPO_PUBLIC_ODOO_URL` and `EXPO_PUBLIC_ODOO_DB`.
3. **Live Test XML-RPC Transport**:
   Set `EXPO_PUBLIC_ODOO_TRANSPORT=xmlrpc` and verify authentication, customer search, phone updates, and sales order confirmation.
4. **Build Production APK**:
   Execute `eas build --platform android --profile preview` or generate a release APK for submission to 2S Egypt.

---

## 13. Mandatory Safety Rules for Future AI Agents

Future AI coding agents working on this repository must adhere to the following strict guidelines:

1. **Read-First Rule**: Inspect the current repository before making any changes. Never assume file paths or configurations without checking.
2. **Never Print Secrets**: Never print passwords, API keys, session tokens, or private environment variables in console outputs or markdown artifacts.
3. **Never Mutate Environment Unprompted**: Do not edit `.env`, change the active database, or change the transport mode without explicit user authorization.
4. **Never Run Provisioning Scripts**: Never run `npm run odoo:provision` or invoke `https://demo.odoo.com/start` unless explicitly requested.
5. **No Mutating Live Tests**: Never run scripts or tests that confirm real sales orders or modify live customer records without explicit approval.
6. **No Embedded Client Secrets**: Never bundle administrative credentials, master passwords, or API keys into the client mobile bundle.
7. **Preserve Test Fixtures**: Keep mock test fixtures in `scripts/fixtures/mock/` isolated for automated test suites; never delete them.
8. **No Fake Fallbacks**: Never add silent mock fallbacks in the production service layer that make a broken backend connection appear functional.
9. **Distinguish Unit vs. Live Verification**: Clearly differentiate between passing in-memory unit tests and verified live server interactions.

---

## 14. Relevant Documentation Links

* [Odoo 15–18 External API Documentation](https://www.odoo.com/documentation/18.0/developer/reference/external_api.html)
* [Odoo XML-RPC Specification](http://xmlrpc.com/spec.md)
* [Expo SDK 57 Documentation](https://docs.expo.dev/)
* [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
* [React Native AsyncStorage](https://react-native-async-storage.github.io/async-storage/)
* [2S Egypt Retail Website](https://www.2segypt.com/)
* [2S Egypt Business Portal](https://www.sys.2segypt.com/)

---

## 15. Concise Current-State Summary

* **Codebase Health**: TypeScript compiles with **0 errors** (`npx tsc --noEmit`); ESLint passes with **0 errors/warnings** (`npm run lint`); Expo Doctor reports **21/21 checks passing**.
* **Test Suites**: **198 passing automated assertions** (0 failures) across XML-RPC unit (68), JSON-RPC unit (34), offline sync (44), and mock boundary (52) suites.
* **Active Target Instance**: Reconfigured and verified against dedicated persistent Odoo Cloud:
  * **URL**: `https://2s-task.odoo.com`
  * **Database**: `2s-task`
  * **Transport Default**: `jsonrpc` (with switchable `xmlrpc` dual-transport support verified)
* **Base URL Sanitization**: `sanitizeOdooBaseUrl()` trims trailing `/odoo`, `/web`, `/xmlrpc`, and `/` path suffixes, preventing route collision.
* **Reviewer UX Experience**: `LoginForm.tsx` defaults to `https://2s-task.odoo.com` and database `2s-task`. Includes an optional expandable "Server Settings" accordion pre-filled with these values so reviewers need zero manual configuration to test.
* **Subsystems Preserved**: Authentication, customer search & details, phone update persistence, sales order & lines view, quotation confirmation with role guards, offline directory caching, and pending synchronization queue with conflict detection.
