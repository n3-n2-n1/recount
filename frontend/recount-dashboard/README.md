# Recount Dashboard - Frontend Application

Angular-based financial management dashboard for tracking multi-currency transactions, accounts, and user management.

## Overview

Recount Dashboard is a single-page application (SPA) built with Angular 21 that provides a comprehensive interface for managing financial operations. The application supports multiple currencies, transaction types, and role-based access control.

## Technology Stack

- **Angular 21**: Modern web framework with TypeScript
- **TypeScript**: Type-safe development
- **RxJS**: Reactive programming for async operations
- **Tailwind CSS**: Utility-first CSS framework
- **Font Awesome**: Icon library
- **Angular Forms**: Template-driven forms with ngModel

## Architecture

### Project Structure

```
src/app/
├── components/          # Reusable UI components
│   ├── dashboard/      # Main layout component
│   ├── tables/         # Editable table component
│   └── footer/         # Footer component with exchange rates
├── pages/              # Feature pages
│   ├── auth/           # Authentication (login)
│   ├── users/          # Account management
│   ├── movements/      # Transaction creation
│   ├── history/        # Transaction history
│   └── settings/       # User settings
├── services/           # API communication layer
│   ├── api.service.ts           # Base HTTP service
│   ├── auth.service.ts         # Authentication & authorization
│   ├── accounts.service.ts      # Account CRUD operations
│   ├── transactions.service.ts  # Transaction operations
│   ├── exchange-rate.service.ts # Exchange rate management
│   ├── fee.service.ts           # Fee configuration
│   ├── settings.service.ts      # User preferences
│   └── theme.service.ts         # Dark mode management
├── guards/             # Route protection
│   ├── auth.guard.ts   # Authentication guard
│   └── role.guard.ts   # Role-based access control
├── models/             # TypeScript interfaces
│   ├── account.model.ts
│   ├── transaction.model.ts
│   ├── exchange-rate.model.ts
│   └── api.model.ts
└── utils/              # Utility functions
    ├── currency-converter.ts  # Currency conversion logic
    └── currency.pipe.ts       # Currency formatting pipe
```

## Core Features

### 1. Account Management (UsersList)

**Location**: `pages/users/users-list/`

**Functionality**:
- Display all accounts with multi-currency balances
- Create, edit, and delete accounts
- Search and filter accounts by name
- Pagination (10, 25, 50, 100 items per page)
- Sortable columns (name, creation date)
- Real-time balance updates without page refresh

**Key Logic**:
- Dynamic column generation based on unique currencies across all accounts
- Per-currency balance display in separate columns
- Toast notifications for user feedback
- Modal dialogs for delete confirmation
- Direct array manipulation for immediate UI updates

### 2. Account Detail (AccountDetail)

**Location**: `pages/users/account-detail/`

**Functionality**:
- View account balances by currency
- Create transactions (inflow/outflow)
- Currency swap operations (Compra Divisa)
- Internal transfers between accounts
- Transaction history with filtering
- Fee calculation and application

**Key Logic**:
- Balance calculation per currency from transaction history
- Exchange rate conversion for multi-currency display
- Transaction type handling (Entrada, Salida, Compra Divisa, Transferencia Interna)
- CABLE transaction details (Banco/Wallet, Titular/Originante)
- Exchange rate display for currency swaps
- Latin American number formatting (1.500,25)

**Transaction Types**:
- **Entrada**: Money inflow to account
- **Salida**: Money outflow from account
- **Compra Divisa**: Currency exchange with custom exchange rate
- **Transferencia Interna**: Transfer between accounts

### 3. Transaction Creation (Movements)

**Location**: `pages/movements/movements/`

**Functionality**:
- Create inflows (money added)
- Create outflows (money withdrawn)
- Execute currency swaps
- Perform internal transfers
- Account selection and balance display

**Key Logic**:
- Form validation before submission
- CABLE-specific fields (Banco/Wallet, Titular/Originante)
- Exchange rate calculation for currency swaps
- Real-time balance updates after transaction creation
- Latin American number input format support

### 4. Transaction History (HistoryList)

**Location**: `pages/history/history-list/`

**Functionality**:
- View all transactions across accounts
- Filter by account, type, currency, date range, amount
- Sort by date (ascending/descending)
- Pagination support
- CSV export with per-currency balances
- Clickable account names for navigation

**Key Logic**:
- Combines regular transactions with exchange rate history
- Chronological sorting with configurable order
- Balance calculation per currency after each transaction
- CSV export includes running balances for all currencies
- Date formatting: DD/MM/YY HH:MM AM/PM

### 5. User Management (PlatformUsers)

**Location**: `pages/users/platform-users/`

**Functionality**:
- Create new users (Super Admin only)
- Edit user roles
- Delete users
- Role-based access control

**User Roles**:
- **super_admin**: Full access including user management
- **reviewer**: Can edit transactions and accounts
- **viewer**: Read-only access

### 6. Settings (Settings)

**Location**: `pages/settings/`

**Functionality**:
- Manage exchange rates
- Configure fees (percentage or fixed)
- Set preferred currency for conversions
- Update user profile

## Business Logic

### Currency Conversion

**File**: `utils/currency-converter.ts`

The application uses a USD-based conversion system:

1. **Base Currency**: All conversions use USD as intermediary
2. **Conversion Formula**: 
   - Convert source currency to USD: `amount * sourceRateToUSD`
   - Convert USD to target currency: `usdAmount / targetRateToUSD`
3. **Total Balance Calculation**: Sums all currency balances converted to preferred currency

### Transaction Processing

**Currency Swap Logic**:
- User specifies source currency, target currency, amount, and exchange rate
- Special handling for CHEQUE to PESOS (division)
- Special handling for PESOS to DÓLAR (division)
- Other swaps use multiplication: `targetAmount = sourceAmount * exchangeRate`

**Fee Calculation**:
- Percentage fees: `feeAmount = (amount * percentage) / 100`
- Fixed fees: `feeAmount = fixedValue`
- Fees can be applied to transactions and affect final amount

### Number Formatting

**Latin American Format**:
- Thousands separator: dot (.)
- Decimal separator: comma (,)
- Example: 1.500,25 (one thousand five hundred and twenty-five cents)
- Applied to all currency displays and input fields

### Dark Mode

**Implementation**:
- Theme service manages dark mode state
- CSS variables and overrides in `dark-mode-override.css`
- Persistent storage via localStorage
- Toggle in dashboard sidebar

## Services Architecture

### API Service (Base)

**File**: `services/api.service.ts`

Centralized HTTP client that:
- Handles authentication tokens
- Manages base URL configuration
- Provides GET, POST, PUT, DELETE methods
- Handles error responses

### Authentication Service

**File**: `services/auth.service.ts`

Manages:
- User login/logout
- JWT token storage
- Role-based permission checks
- Current user state

### Accounts Service

**File**: `services/accounts.service.ts`

CRUD operations for accounts:
- `getAccounts()`: List all accounts
- `getAccountById(id)`: Get single account
- `createAccount(request)`: Create new account
- `updateAccount(id, request)`: Update account
- `deleteAccount(id)`: Delete account

### Transactions Service

**File**: `services/transactions.service.ts`

Transaction operations:
- `createTransaction(request)`: Create new transaction
- `getTransactionsByAccount(accountId, limit)`: Get account transactions
- `getAllTransactions(params)`: Get all transactions with filtering

## Routing

**File**: `app-routing-module.ts`

Protected routes with role-based access:
- `/users`: Account list (all roles)
- `/account/:id`: Account detail (all roles)
- `/movements`: Transaction creation (all roles)
- `/history`: Transaction history (all roles)
- `/team`: User management (super_admin only)
- `/settings`: Settings (authenticated users)

Route guards:
- `AuthGuard`: Ensures user is authenticated
- `RoleGuard`: Validates user role matches route requirements

## Components

### EditableTable

**Location**: `components/tables/editable-table/`

Reusable table component with:
- Dynamic column configuration
- Inline editing support
- Sortable headers
- Delete functionality
- Custom cell renderers
- Loading states

### DashboardLayout

**Location**: `components/dashboard/dashboard-layout/`

Main application layout:
- Fixed sidebar navigation
- User info display
- Dark mode toggle
- Logout functionality
- Active route highlighting

### Footer

**Location**: `components/footer/`

Displays:
- Current exchange rates
- Last update timestamp
- Cache indicator

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Angular CLI 21+

### Installation

```bash
npm install
```

### Development Server

```bash
ng serve
```

Navigate to `http://localhost:4200/`. The app will automatically reload on file changes.

### Build

```bash
ng build
```

Production build artifacts will be stored in `dist/` directory.

### Environment Configuration

**File**: `src/environments/environment.ts`

Configure:
- API base URL
- Production flags
- Feature toggles

## Code Generation

Angular CLI code generation:

```bash
# Generate component
ng generate component component-name

# Generate service
ng generate service service-name

# Generate guard
ng generate guard guard-name
```

## Testing

```bash
# Unit tests
ng test

# End-to-end tests
ng e2e
```

## Styling

- **Global Styles**: `src/styles.css`
- **Dark Mode Overrides**: `src/dark-mode-override.css`
- **Component Styles**: Component-specific CSS files
- **Tailwind CSS**: Utility classes for rapid styling

## Key Design Decisions

1. **Template-driven Forms**: Using ngModel for form handling
2. **Service-based Architecture**: Separation of concerns with dedicated services
3. **Reactive Programming**: RxJS Observables for async operations
4. **Type Safety**: TypeScript interfaces for all data models
5. **Component Reusability**: Shared components (EditableTable, Footer)
6. **Latin American Formatting**: Consistent number formatting across application
7. **Real-time Updates**: Direct array manipulation for immediate UI feedback
8. **Toast Notifications**: User-friendly feedback system
9. **Modal Dialogs**: Custom modals for confirmations
10. **Dark Mode**: Full theme support with persistent storage

## API Integration

All API calls go through the base `ApiService` which:
- Adds authentication headers
- Handles error responses
- Manages request/response transformation
- Provides type-safe methods

## Security

- JWT token-based authentication
- Role-based route protection
- Input validation on forms
- XSS protection via Angular's built-in sanitization
- CORS handled by backend

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Additional Resources

- [Angular Documentation](https://angular.dev)
- [Angular CLI Reference](https://angular.dev/tools/cli)
- [RxJS Documentation](https://rxjs.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
