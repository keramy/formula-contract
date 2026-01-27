# Financial Module Implementation Plan

## Overview
A comprehensive financial analytics module for admin and management roles, providing win rate tracking, profitability analysis, time-based filtering, and multi-currency support.

---

## 1. Database Changes

### Migration 020: Tender Tracking Fields
Add to `projects` table:
```sql
tender_started_at TIMESTAMPTZ      -- When project entered tender
tender_won_at TIMESTAMPTZ          -- When tender was won (→ active)
tender_lost_at TIMESTAMPTZ         -- When tender was lost (→ cancelled)
tender_outcome TEXT ('won'|'lost'|'pending')
```
Backfill existing projects based on current status.

### Migration 021: Exchange Rates Table
```sql
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY,
  rate_date DATE NOT NULL,
  base_currency currency NOT NULL,
  target_currency currency NOT NULL,
  rate DECIMAL(15,6) NOT NULL,
  UNIQUE(rate_date, base_currency, target_currency)
);
```
Seed with default rates for TRY/USD/EUR.

### Update Types
- Add new fields to `projects` type in `src/types/database.ts`
- Add `exchange_rates` table type

---

## 2. File Structure

```
src/app/(dashboard)/financials/
├── page.tsx                    # Main page (server component)
├── loading.tsx                 # Skeleton loader
├── financials-header.tsx       # Page header component
├── financials-filters.tsx      # Client: date range + currency picker
├── financials-overview.tsx     # KPI cards grid
├── win-rate-chart.tsx          # Bar chart: won/lost by month
├── revenue-trend-chart.tsx     # Area chart: revenue over time
├── profitability-table.tsx     # Project-level margins table

src/lib/actions/financials.ts   # All financial server actions
src/lib/utils/currency.ts       # Currency formatting helpers
```

---

## 3. Key Features

### 3.1 Win Rate Tracking
- **Metric**: `(won / (won + lost)) × 100`
- **Chart**: Monthly bar chart showing won vs lost counts
- **Trend line**: Win rate percentage over time

### 3.2 Profitability Metrics
| Metric | Formula |
|--------|---------|
| Expected Margin | Sales - Initial Cost |
| Real Margin | Sales - Actual Cost |
| Expected Margin % | (Expected Margin / Sales) × 100 |
| Real Margin % | (Real Margin / Sales) × 100 |

### 3.3 Revenue by Status
- **Tender** (pipeline): Potential revenue
- **Active**: Work in progress
- **On Hold** = At Risk: Flagged separately
- **Completed**: Recognized revenue

### 3.4 Time-Based Filtering
Presets:
- This Month
- This Quarter
- Year to Date
- Last 12 Months
- Custom Range

### 3.5 Currency Selection
- User picks display currency (TRY, USD, EUR)
- All values converted using exchange_rates table
- Stored rates with manual update capability

---

## 4. Server Actions (`src/lib/actions/financials.ts`)

```typescript
// Core Types
interface FinancialFilters {
  dateRange?: { from: Date; to: Date };
  displayCurrency: Currency;
}

// Main Functions
getWinRateData(filters) → WinRateData
getRevenueByStatus(filters) → RevenueByStatus
getProfitabilityMetrics(filters) → ProfitabilityMetrics
getProjectProfitability(filters) → ProjectProfitability[]
getRevenueTrend(filters) → RevenueTrend[]
getFinancialData(filters) → FinancialOverviewData  // Combines all

// Helpers
getExchangeRate(from, to, date?) → number
convertCurrency(amount, from, to) → number
```

---

## 5. UI Components

### KPI Cards (financials-overview.tsx)
| Card | Value | Icon | Color |
|------|-------|------|-------|
| Win Rate | XX% | Trophy | Emerald |
| Total Revenue | ₺X.XM | TrendingUp | Violet |
| At Risk Value | ₺X.XM | AlertTriangle | Amber |
| Expected Margin | XX% | Wallet | Teal |
| Real Margin | XX% | CheckCircle | Green/Red |

### Charts (using recharts)
1. **Win Rate Chart**: Grouped bar (won/lost) + line (rate %)
2. **Revenue Trend**: Stacked area by status over time
3. **Status Breakdown**: Horizontal bar showing value distribution

### Profitability Table
Columns: Project Code | Name | Client | Status | Sales | Initial Cost | Actual Cost | Expected Margin | Real Margin
- Sortable columns
- At-risk rows highlighted (on_hold)
- Negative margins in red

---

## 6. Navigation Update

**File: `src/components/app-sidebar.tsx`**

```typescript
// Add to routePermissions
"/financials": ["admin", "management"],

// Add to navItemColors
"/financials": "emerald",

// Add to managementNavItems (before Reports)
{ title: "Financials", href: "/financials", icon: BanknoteIcon },
```

---

## 7. Implementation Order

### Phase 1: Foundation
1. Create migration 020 (tender tracking)
2. Create migration 021 (exchange rates)
3. Update database types
4. Create currency utility functions

### Phase 2: Server Actions
1. Create `financials.ts` with all functions
2. Implement currency conversion
3. Implement win rate calculation
4. Implement profitability calculations

### Phase 3: Page Structure
1. Create `/financials` page with role check
2. Create header component
3. Create filters component (client)
4. Add loading skeleton

### Phase 4: KPI & Charts
1. Create KPI overview cards
2. Create win rate chart
3. Create revenue trend chart

### Phase 5: Table & Polish
1. Create profitability table
2. Update sidebar navigation
3. Test role-based access
4. Responsive design testing

---

## 8. Critical Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/020_*.sql` | NEW - Tender tracking |
| `supabase/migrations/021_*.sql` | NEW - Exchange rates |
| `src/types/database.ts` | Add new types |
| `src/lib/actions/financials.ts` | NEW - All financial logic |
| `src/lib/utils/currency.ts` | NEW - Formatting helpers |
| `src/app/(dashboard)/financials/*` | NEW - All page components |
| `src/components/app-sidebar.tsx` | Add navigation entry |

---

## 9. Verification Plan

1. **Role Access**: Login as PM → should redirect away from /financials
2. **Role Access**: Login as Admin/Management → should see page
3. **Win Rate**: Create tender, change to active → win rate increases
4. **Win Rate**: Create tender, change to cancelled → lost count increases
5. **Currency Conversion**: Change display currency → values update
6. **Date Filter**: Select "This Quarter" → only recent projects shown
7. **Profitability**: Verify Expected Margin = Sales - Initial Cost
8. **Profitability**: Verify Real Margin = Sales - Actual Cost
9. **At Risk**: On-hold projects appear in at-risk value and highlighted in table

---

## Notes

- **On Hold = At Risk**: These projects are flagged but not excluded from revenue
- **Tender Backfill**: Existing projects get `tender_outcome` based on current status
- **Exchange Rates**: Start with manual entry; can add API integration later
- **Caching**: Use `unstable_cache` for expensive aggregations (60s TTL)

---

*Plan created: January 2026*
*To implement: Run `claude` and say "implement the financial module plan"*
