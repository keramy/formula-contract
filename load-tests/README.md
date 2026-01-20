# Formula Contract - Load Testing Guide

## Quick Start

### 1. Install k6

**Windows (winget):**
```bash
winget install k6 --source winget
```

**Windows (Chocolatey):**
```bash
choco install k6
```

**Or download directly from:** https://k6.io/docs/get-started/installation/

### 2. Run Tests

```bash
# Navigate to load-tests directory
cd load-tests

# Create results directory
mkdir results

# Run with 10 users (light load)
k6 run -e SCENARIO=light full-flow-test.js

# Run with 25 users (medium load - default)
k6 run full-flow-test.js

# Run with 50 users (heavy load)
k6 run -e SCENARIO=heavy full-flow-test.js

# Run with 100 users (stress test)
k6 run -e SCENARIO=stress full-flow-test.js
```

## Test Scenarios

| Scenario | Users | Duration | Purpose |
|----------|-------|----------|---------|
| `light` | 10 | ~2 min | Baseline performance |
| `medium` | 25 | ~3 min | Normal load |
| `heavy` | 50 | ~5 min | Peak load simulation |
| `stress` | 100 | ~10 min | Find breaking point |

## What Gets Tested

Each virtual user performs this flow:
1. **Login** - Authenticate with Supabase
2. **Dashboard** - Load user profile
3. **Projects List** - Fetch all projects with client data
4. **Project Details** - Load single project
5. **Scope Items** - Fetch scope items (heaviest query)
6. **Materials** - Load project materials
7. **Drawings** - Fetch drawings with revisions

## Performance Thresholds

| Metric | Target | Description |
|--------|--------|-------------|
| Error Rate | < 5% | HTTP failures |
| Login | < 1000ms | p95 response time |
| Dashboard | < 1500ms | p95 response time |
| Projects Page | < 1500ms | p95 response time |
| Scope Items API | < 500ms | p95 response time |

## Understanding Results

```
╔══════════════════════════════════════════════════════════════════╗
║  RESPONSE TIMES                                                  ║
║  Login:              p95 = 245ms    ✓ Good (< 1000ms)           ║
║  Scope Items API:    p95 = 380ms    ✓ Good (< 500ms)            ║
╠══════════════════════════════════════════════════════════════════╣
║  RELIABILITY                                                     ║
║  Total Requests:     1,250                                       ║
║  Error Rate:         0.5%           ✓ Good (< 5%)               ║
╚══════════════════════════════════════════════════════════════════╝
```

### Key Metrics Explained:

- **p95 (95th percentile)**: 95% of requests completed within this time
- **p99 (99th percentile)**: 99% of requests completed within this time
- **Error Rate**: Percentage of failed requests

## Recommended Testing Order

1. **Start with `light` (10 users)** - Establish baseline
2. **Run `medium` (25 users)** - Verify normal operation
3. **Run `heavy` (50 users)** - Test peak load
4. **Run `stress` (100 users)** - Find limits

## Troubleshooting

### "Login failed" errors
- Check if the test user credentials are correct
- Verify Supabase URL and anon key in the test file

### High error rates
- Check if your dev server is running (`npm run dev`)
- Check Supabase dashboard for rate limiting

### Slow response times
- Check your internet connection
- Consider testing against production instead of localhost

## Testing Against Production

```bash
# Test against your Vercel deployment
k6 run -e BASE_URL=https://your-app.vercel.app full-flow-test.js
```

## Save Results to File

```bash
k6 run --out json=results/test-results.json full-flow-test.js
```

## Compare Results

After running tests at different load levels, compare:
- Response time degradation as load increases
- Error rate changes
- At what point does the system start failing?
