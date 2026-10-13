# 2S Egypt — Odoo Sales Mobile Application

An enterprise-grade React Native mobile application engineered for **2S Egypt** field sales representatives and sales managers. Connects directly to **Odoo ERP** with an offline-first architecture, resilient sync queueing, dual-transport protocols (JSON-RPC & XML-RPC), and role-governed quotation confirmation.

---

## 1. Executive Summary & Problem Solved

Field sales operations require rapid, reliable access to customer contact details and sales quotations while visiting retail stores and client facilities across Egypt. Field agents frequently encounter intermittent cellular coverage and building dead zones.

This application provides:
1. **Uninterrupted Field Access**: Real-time customer search and profile retrieval backed by local offline caching.
2. **Resilient Phone Number Updates**: In-field customer phone edits that work seamlessly offline, queue safely, and automatically synchronize upon network reconnection with conflict detection.
3. **Role-Protected Quotation Confirmation**: Enterprise sales order visibility and quotation approval restricted to authorized internal sales personnel.
4. **Zero-Configuration Reviewer Experience**: Pre-configured server connection to the dedicated persistent Odoo Cloud instance (`2s-task.odoo.com`), eliminating manual setup friction during evaluation.

---

## 2. Implemented Features

### 🔐 Secure Authentication & Reviewer UX (`src/features/auth`)
* **Odoo Credential Login**: Authenticates directly against Odoo ERP using employee username and password.
* **Dual-Transport Handshake**: Supports web-client session authentication (`/web/session/authenticate`) and Odoo external API authentication (`/xmlrpc/2/common`).
* **Pre-Configured Server Settings**: Includes an expandable "Server Settings" accordion pre-filled with the active target host (`https://2s-task.odoo.com`) and database (`2s-task`). Reviewers can sign in immediately without manual setup.
* **Automatic Role Discovery**: Detects employee roles (`sales_manager`, `sales_user`, `portal`) and enforces application-level authorization.

### 👥 Customer Directory & In-Field Updates (`src/features/customers`)
* **Customer Listing**: Queries `res.partner` records (`customer_rank > 0`), displaying company/individual indicators, contact numbers, and cities.
* **Instant Search**: Real-time multi-field text search matching name, phone, or city.
* **Customer Profile**: Detailed view displaying contact information, address details, and account metadata.
* **Phone Editor Modal**: Validates international and local phone numbers, updates the local cache optimistically, submits changes to Odoo, and performs read-back verification before confirming success.

### 📊 Sales Orders & Quotation Management (`src/features/sales-orders`)
* **Sales Order Listing**: Lists `sale.order` records with currency formatting (USD/EGP) and status badges (`Quotation`, `Quotation Sent`, `Sales Order`, `Cancelled`).
* **Filter Tabs**: Instant filtering by `All`, `Quotations`, and `Confirmed Orders`.
* **Order Line Item Breakdown**: Order detail screen displaying individual line products, ordered quantities, unit prices, discounts, line subtotals, and tax/total breakdown.
* **Quotation Confirmation**: Interactive modal enabling sales representatives to confirm draft quotations into confirmed Sales Orders (`action_confirm`).
* **Role-Based Guards**: Application-level `RoleGuard` component ensures non-internal users (e.g., portal contacts) cannot view sales orders or confirm quotations.

### 📡 Offline Cache & Synchronization Subsystem (`src/services/offline`)
* **Isolated Local Cache**: Backed by `@react-native-async-storage/async-storage` with tenant-scoped cache keys (`odoo_${userId}_${database}`) to prevent data leakage between sessions.
* **Offline Directory Search**: Seamlessly queries cached customers when internet is unavailable, displaying an informative `OfflineBanner` with cache timestamp.
* **Pending Edit Queue**: Offline phone number edits are saved to an persistent local queue with status tracking (`pending`, `failed`, `conflict`).
* **Automatic & Manual Synchronization**: Detects network reconnection via `@react-native-community/netinfo` to trigger batch synchronization. Users can also tap "Sync Now" manually.
* **Remote Conflict Detection**: Compares expected remote baseline phone number before applying edits. If changed remotely, marks the item as `'conflict'` without silently overwriting server data.
* **Safe Logout Protection**: Warns users before logging out if unsynchronized offline edits are pending in the queue.

---

## 3. Technology Stack & Verified Versions

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | Expo SDK | `~57.0.27` | Universal mobile framework |
| **Core Runtime** | React Native | `0.86.3` | Mobile platform engine |
| **UI Library** | React Core | `19.2.3` | Reactive component rendering |
| **Navigation** | Expo Router | `~57.0.25` | File-based typed routing |
| **Language** | TypeScript | `~6.0.3` | Strict static type safety |
| **Local Storage** | AsyncStorage | `2.2.0` | Encrypted/isolated persistent storage |
| **Network State** | NetInfo | `12.0.1` | Cellular/Wi-Fi connectivity monitoring |
| **Icons** | `@expo/vector-icons` | `^15.0.2` | Ionicons icon set |
| **Code Quality** | ESLint | `^9.0.0` | Static linting with `eslint-config-expo` |

---

## 4. Architecture & Repository Structure

```text
.
├── .github/workflows/ci.yml          # Automated CI workflow (lint, typecheck, tests)
├── .editorconfig                     # Code formatting and editor standards
├── .gitattributes                    # Git line-ending normalization
├── .gitignore                        # Repository-level ignore definitions
├── .env.example                      # Safe environment configuration template
├── app.json                          # Expo application configuration & metadata
├── package.json                      # Project dependencies and verification scripts
├── tsconfig.json                     # Strict TypeScript compiler configuration
├── handoff.md                        # Master architecture & technical handoff reference
├── README.md                         # This comprehensive documentation file
├── assets/                           # Application branding and icon assets
├── scripts/                          # Automated verification suites & test fixtures
│   ├── fixtures/mock/                # Isolated test fixtures (excluded from app bundle)
│   ├── provision-demo-instance.ts    # Standalone script for temporary demo instances
│   ├── test-odoo-unit.ts             # JSON-RPC adapter unit tests (34 tests)
│   ├── test-offline-sync.ts          # Offline cache & synchronization tests (44 tests)
│   ├── test-xmlrpc-unit.ts           # XML-RPC serializer & adapter tests (68 tests)
│   ├── verify-mock-workflow.ts       # Anti-fallback boundary test suite (52 tests)
│   └── verify-odoo-integration.ts    # Live Odoo integration test script
└── src/
    ├── app/                          # Expo Router file-based screens
    │   ├── _layout.tsx               # Root layout with AuthProvider & SafeAreaProvider
    │   ├── index.tsx                 # Dynamic auth redirect gate
    │   ├── (auth)/login.tsx          # Login screen
    │   └── (app)/
    │       ├── _layout.tsx           # Authenticated session boundary
    │       ├── (tabs)/               # Bottom tab navigation
    │       │   ├── _layout.tsx       # Tab bar configuration
    │       │   ├── customers.tsx     # Customers directory tab
    │       │   ├── orders.tsx        # Sales orders tab with RoleGuard
    │       │   └── profile.tsx       # User profile, role info & safe logout
    │       ├── customer/[id].tsx     # Customer details & phone editor screen
    │       └── order/[id].tsx        # Sales order details & quotation modal
    ├── components/                   # Reusable atomic UI design system
    │   ├── Badge.tsx                 # Status indicator badges
    │   ├── Button.tsx                # Accessible touchable buttons with variants
    │   ├── Card.tsx                  # Elevated surface cards
    │   ├── EmptyState.tsx            # Clean empty directory/order views
    │   ├── Input.tsx                 # Form inputs with inline validation & password visibility
    │   ├── LoadingSpinner.tsx        # Branded loading indicators
    │   ├── OfflineBanner.tsx         # Network & pending synchronization banner
    │   ├── RoleGuard.tsx             # Role-based component permission guard
    │   └── SearchBar.tsx             # Debounced text search input
    ├── constants/
    │   ├── colors.ts                 # 2S Egypt enterprise color tokens
    │   └── config.ts                 # App configuration & URL path sanitization
    ├── features/                     # Feature domain modules (UI + hooks)
    │   ├── auth/                     # LoginForm, AuthContext, useAuth
    │   ├── customers/                # CustomerList, CustomerCard, CustomerPhoneModal
    │   └── sales-orders/             # SalesOrderList, SalesOrderCard, QuotationConfirmModal
    ├── lib/
    │   ├── formatters.ts             # Currency, date, and phone formatting
    │   ├── logger.ts                 # Redacting logger (masks passwords and tokens)
    │   └── validation.ts             # Username, password, and phone number validators
    ├── services/                     # Service container & protocol adapters
    │   ├── index.ts                  # Enterprise service container & transport selector
    │   ├── odoo/                     # JSON-RPC 2.0 adapters (active default)
    │   │   ├── odoo-client.ts        # Session-aware HTTP JSON-RPC client
    │   │   ├── odoo-auth.service.ts
    │   │   ├── odoo-customer.service.ts
    │   │   └── odoo-sales-order.service.ts
    │   ├── odoo/xmlrpc/              # Standard XML-RPC adapters (switchable)
    │   │   ├── xmlrpc-serializer.ts  # Zero-dependency XML-RPC parser/serializer
    │   │   ├── odoo-xmlrpc-client.ts # Stateless XML-RPC client
    │   │   ├── odoo-xmlrpc-auth.service.ts
    │   │   ├── odoo-xmlrpc-customer.service.ts
    │   │   └── odoo-xmlrpc-sales-order.service.ts
    │   ├── offline/                  # Offline caching and synchronization
    │   │   ├── customer-cache.ts     # Scoped AsyncStorage repository
    │   │   ├── network-service.ts    # NetInfo connectivity listener
    │   │   ├── offline-customer.service.ts
    │   │   └── sync-service.ts       # Batch synchronization with conflict checks
    │   └── storage/                  # Storage adapter abstraction
    └── types/                        # Strongly-typed TypeScript interfaces
```

---

## 5. Prerequisites & Environment Setup

### Prerequisites
* **Node.js**: `v20.x` or higher recommended (compatible with `v18.x`+).
* **Package Manager**: `npm` (uses clean-install lockfile `package-lock.json`).
* **Mobile Environment**:
  * Physical device with **Expo Go** app installed, OR
  * Android Studio with an Android Emulator (API 34/35 recommended).

### Environment Configuration

Copy `.env.example` to create your active `.env`:

```bash
cp .env.example .env
```

Configure `.env` using generic placeholder values or your target instance:

```env
# Service mode: 'odoo' for production ERP integration
EXPO_PUBLIC_SERVICE_MODE=odoo

# Odoo Server Base URL
EXPO_PUBLIC_ODOO_URL=https://your-odoo-instance.odoo.com

# Target Odoo Database Name
EXPO_PUBLIC_ODOO_DB=your-database-name

# Transport Protocol Selection: 'jsonrpc' or 'xmlrpc'
EXPO_PUBLIC_ODOO_TRANSPORT=jsonrpc
```

> **Base URL Routing Protection**: The application automatically normalizes `EXPO_PUBLIC_ODOO_URL` with `sanitizeOdooBaseUrl()`. Any trailing slashes or path suffixes like `/odoo` or `/web` copied from browser address bars are trimmed automatically, avoiding duplicate path 404 errors.

---

## 6. Running the Application Locally

```bash
# 1. Install dependencies reproducibly
npm ci

# 2. Start Expo Metro bundler
npm start

# 3. Launch on Android emulator or connected device
npm run android

# 4. Launch on iOS simulator (macOS only)
npm run ios

# 5. Launch in Web browser (for layout inspection)
npm run web
```

---

## 7. Verification & Automated Test Commands

The repository provides 4 automated test suites covering 198 assertions without requiring external network connectivity or live credentials:

| Command | Suite Description | Assertions |
| :--- | :--- | :--- |
| `npm run typecheck` | Strict TypeScript compilation (`tsc --noEmit`) | **0 errors** |
| `npm run lint` | ESLint project-wide code style check | **0 errors, 0 warnings** |
| `npm run test:xmlrpc-unit` | XML-RPC serializer, fault parsing, and adapter tests | **68 passed, 0 failed** |
| `npm run test:odoo-unit` | JSON-RPC client, error handling, and role guard tests | **34 passed, 0 failed** |
| `npm run test:offline` | Offline caching, edit queue, conflict detection, and sync tests | **44 passed, 0 failed** |
| `npm run test:mock` | Anti-fallback boundary and service container tests | **52 passed, 0 failed** |
| **`npm run test:all`** | **Executes all four automated suites sequentially** | **198 passed, 0 failed** |
| `npm test` | Alias for `npm run test:all` | **198 passed, 0 failed** |

---

## 8. Odoo Integration Protocols & Security

### Dual Transport Support
1. **JSON-RPC 2.0 (Active Default)**:
   * **Authentication**: `POST /web/session/authenticate`
   * **Model Operations**: `POST /web/dataset/call_kw`
   * **Session Management**: Session cookie stored ephemerally in memory; forwarded on subsequent requests.
2. **XML-RPC (Switchable Fallback)**:
   * **Authentication**: `POST /xmlrpc/2/common` (method: `authenticate`)
   * **Model Operations**: `POST /xmlrpc/2/object` (method: `execute_kw`)
   * **Credential Handling**: Password token held in memory only during the active session; never written to persistent disk storage.

### Security Guarantees
* **No Hardcoded Credentials**: No passwords, private tokens, or administrative keys exist in the repository or bundle.
* **Redacting Logger**: `safeLogger` automatically filters and redacts fields matching `password`, `token`, `secret`, `access_token`, and `authorization`.
* **Sanitized Error Messaging**: Network errors, database connection strings, and backend tracebacks are caught and presented as user-friendly guidance.
* **Bundle Public Disclosure**: All `EXPO_PUBLIC_*` variables are acknowledged as public bundle constants, not private secrets.

---

## 9. Known Limitations & Scope Boundaries

1. **Read/Update Scope**: The application supports reading customer data, updating existing customer phone numbers, viewing sales orders/lines, and confirming quotations. Creating brand-new customer records or authoring new quotations from scratch is out of current assessment scope.
2. **Push Notifications**: Background push notifications are not configured; offline synchronization triggers on active app reconnection or manual user action.
3. **Transport Selection**: While both JSON-RPC and XML-RPC have been non-mutatingly verified against the persistent instance, `jsonrpc` remains the default production transport due to broad cloud proxy compatibility.

---

## 10. Project Status

* **TypeScript Build**: Verified clean (`0 errors`).
* **ESLint Compliance**: Verified clean (`0 warnings`).
* **Automated Suites**: **198 / 198 automated test assertions pass** with 0 failures.
* **Target Instance**: Configured and verified against dedicated persistent cloud instance `https://2s-task.odoo.com` (Database: `2s-task`).
