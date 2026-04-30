# Monitoring Architecture

## Purpose

This document defines a practical monitoring and logging architecture for the Formula Contract codebase.

The goal is not “more logs.” The goal is to make production issues understandable:

- What failed
- Where it failed
- Which user, project, or entity was involved
- Whether it is isolated or widespread
- Whether it is frontend, API, server action, cron, or database-related
- What should alert immediately vs what should only be recorded

This architecture is designed for the current stack:

- Next.js App Router
- Supabase
- Server Actions
- Route Handlers
- React client components
- Cron jobs

## Problems in the Current State

Based on the audit, the current system has these observability gaps:

- Logging is mostly ad hoc `console.log` and `console.error`
- There is no centralized logger abstraction
- There is no consistent structured log format
- There is no request correlation ID
- There is no obvious centralized error tracking pipeline
- Some failures are swallowed or only logged locally
- Profiling logs are mixed with operational logs
- There is no explicit alerting policy for critical failures

This means production debugging will often depend on:

- user reports
- manual log searching
- guesswork across unrelated log lines

## Monitoring Goals

The monitoring system must answer these questions for every important failure:

1. Which route, action, or job failed?
2. Which user and role were involved?
3. Which entity was being processed?
4. What operation was attempted?
5. What was the exact error class or code?
6. Is it happening repeatedly?
7. Should someone be alerted immediately?

## Monitoring Layers

The recommended architecture has five layers.

### 1. Structured Logging

All important server-side logging should go through one shared logger.

Suggested file:
- `src/lib/platform/logger.ts`

Responsibilities:
- normalize log format
- enforce metadata fields
- separate debug/info/warn/error/audit levels
- avoid free-form noisy logs in production

Every log event should be structured, not plain text only.

Minimum fields:
- `timestamp`
- `level`
- `area`
- `action`
- `message`
- `requestId`
- `route`
- `userId`
- `role`
- `projectId`
- `entityType`
- `entityId`
- `errorName`
- `errorMessage`
- `errorCode`

Optional fields:
- `durationMs`
- `status`
- `attempt`
- `jobName`
- `cron`
- `queryName`

#### Logger Contract (concrete)

The logger is implemented in `src/lib/platform/logger.ts` and is the only logging surface used in production code paths.

```ts
export type LogLevel = "debug" | "info" | "warn" | "error" | "audit";

export interface LogMeta {
  // Identity
  area?: string;            // "auth" | "users" | "cron" | ...
  action?: string;          // "login" | "invite_user" | ...
  event?: string;           // dotted form, e.g. "auth.login.failure"

  // Request context (auto-populated by request-context helper)
  requestId?: string;
  route?: string;
  method?: string;

  // Identity
  userId?: string;
  role?: string;

  // Domain
  projectId?: string;
  entityType?: string;
  entityId?: string;

  // Outcome
  durationMs?: number;
  status?: number | string;
  attempt?: number;

  // Error
  errorName?: string;
  errorMessage?: string;
  errorCode?: string;       // PG SQLSTATE, HTTP status, internal code
  errorClass?: ErrorClass;  // see Error Classification Model

  // Free-form additional metadata (stringifiable only)
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta): void;
  audit(message: string, meta?: LogMeta): void;
}
```

Transport
- Output is structured JSON written to `stdout` (Vercel log drains pick this up automatically).
- `error` and `audit` levels also call `Sentry.captureMessage` / `Sentry.captureException` with the meta as `extra`.
- `debug` is a no-op when `process.env.LOG_LEVEL !== "debug"`. Default level is `info`.

Sensitive-key redaction
- Before serialization, the logger strips keys matching `/password|token|secret|authorization|cookie|code/i` from any nested object — defense in depth against accidental inclusion.

### 2. Error Tracking

Use a centralized error tracking system such as Sentry.

Recommended scope:
- Next.js server runtime
- route handlers
- server actions
- React error boundary
- cron jobs

What should go to error tracking:
- unhandled exceptions
- handled exceptions that cause user-visible failure
- authorization failures only when unusual or suspicious
- repeated external integration failures
- cron failures

What should usually stay as logs only:
- expected validation errors
- denied access with normal business behavior
- debug timing output

### 3. Request Correlation

Every request should carry a request correlation ID.

Suggested generation point:
- `src/lib/supabase/middleware.ts`

Behavior:
- generate a `requestId` if one does not exist
- attach it to request headers for downstream use
- include it in all logs emitted during that request

Why this matters:
- one production issue becomes one searchable chain
- route handler, server action, and downstream logs can be tied together
- support can report a single ID instead of a vague timestamp

#### Mechanics (Edge ↔ Node runtime split)

Next.js App Router runs middleware on the Edge runtime and route handlers / server actions on the Node runtime. They do not share an in-process store, so correlation must travel via headers:

1. **Middleware (Edge)** — `src/lib/supabase/middleware.ts`
   - Read incoming `x-request-id` header. If absent, generate one with `crypto.randomUUID()`.
   - Set the header on the forwarded request and on the outgoing response so the browser can echo it back if needed.

2. **Node-side handlers** — `src/lib/platform/request-context.ts`
   - `getRequestId()` reads `headers().get('x-request-id')` from `next/headers`.
   - In long-running server work (e.g. cron handlers), wrap the work in `runWithRequestContext({ requestId, route }, fn)` which uses `AsyncLocalStorage` so the logger can pick up `requestId` automatically without each call site passing it.

3. **Logger integration**
   - `logger.info(msg, meta)` calls `getRequestContext()` from `AsyncLocalStorage` and merges its fields into `meta` before output. Caller never has to thread `requestId` manually inside a request boundary.

The response also includes `x-request-id` so users can quote it in support requests and we can grep one chain end-to-end.

### 4. Domain Event Logging

Important business events should be logged explicitly, not only when errors happen.

Examples:
- user invited
- user role changed
- user deactivated
- project created
- user assigned to project
- invoice approved
- payment recorded
- cron digest triggered
- timeline dependency propagation run

This is different from the activity log shown to end users. This is operational telemetry for maintainers.

These events should use:
- `logger.audit(...)` for security-sensitive and admin actions
- `logger.info(...)` for normal successful operations
- `logger.warn(...)` for degraded but recoverable paths
- `logger.error(...)` for failed operations

### 5. Alerting

Not every error should wake someone up.

Define explicit alert classes.

Concrete vendors for this codebase:
- **Sentry** — exception capture + new-issue/regression/spike alerts via email and (optional) Slack webhook. Free tier covers our volume.
- **Vercel Cron** — built-in failure detection on scheduled invocations; alerts go to project owners by default.

This is the lowest-friction stack: Sentry's auto-alerting on first occurrence of a new issue is what makes "see errors before users" real — the email arrives within seconds of the first capture, before most users have refreshed.

Immediate alerts:
- cron job failures
- auth callback failures above a threshold
- repeated Supabase permission or RLS failures
- service-role/admin mutation failures
- email delivery pipeline failures for critical flows
- dashboard-wide or payments-wide server failures

Daily summary alerts:
- recurring validation failures
- degraded external integrations
- repeated client-side crashes
- noisy but non-critical warning patterns

No alerts, logs only:
- expected denied access
- user input validation failures
- debug profiling

## Proposed File-Level Architecture

### Core Platform Files

- `src/lib/platform/logger.ts`
  - shared structured logger

- `src/lib/platform/monitoring.ts`
  - helper wrappers for error capture and context enrichment

- `src/lib/platform/request-context.ts`
  - request ID, route, and caller metadata resolution

- `src/lib/platform/error-utils.ts`
  - normalize unknown errors into stable shapes

### Existing Files to Extend

- `src/lib/supabase/middleware.ts`
  - request ID generation
  - route metadata attachment

- `src/lib/supabase/server.ts`
  - expose request metadata with user context

- `src/components/error-boundary.tsx`
  - capture client render errors into error tracking

- `src/app/api/**`
  - wrap handlers with structured logging and error capture

- `src/lib/actions/**`
  - add structured logs around privileged actions and important failures

- `src/app/api/cron/**`
  - add job start, job success, job failure, duration, and alerting hooks

## Log Taxonomy

To keep logs searchable, use consistent `area` and `action` fields.

Suggested `area` values:
- `auth`
- `users`
- `projects`
- `assignments`
- `finance`
- `timeline`
- `reports`
- `drawings`
- `notifications`
- `cron`
- `middleware`
- `supabase`

Note: `crm` is intentionally not listed. The CRM module's UI was removed (Apr 2026); only DB tables remain. Do not introduce new `crm` log entries — if CRM functionality returns, decide at that point whether to restore from git or rebuild.

Suggested action patterns:
- `login`
- `password_reset_request`
- `invite_user`
- `update_user_role`
- `toggle_user_active`
- `create_project`
- `assign_user_to_project`
- `approve_invoice`
- `record_payment`
- `send_weekly_digest`
- `propagate_timeline_dependencies`

## Error Classification Model

Every captured error should be classified.

Suggested classes:

- `validation_error`
  - bad input, expected user-correctable failure

- `authorization_error`
  - caller lacks permission

- `authentication_error`
  - missing/invalid session

- `integration_error`
  - Resend, third-party, external service issue

- `database_error`
  - Supabase query failure, constraint failure, RPC failure

- `rls_error`
  - denied by policy or security misconfiguration

- `logic_error`
  - broken internal assumption, null path, invariant violation

- `job_error`
  - cron/background job failure

- `ui_error`
  - client rendering/runtime issue

This classification should be included in logs and error tracking metadata.

## Request Context Model

The request context should be available anywhere server-side logging happens.

Suggested shape:

- `requestId`
- `pathname`
- `method`
- `userId`
- `role`
- `ip`
- `userAgent`

Extended per-domain context:
- `projectId`
- `invoiceId`
- `reportId`
- `timelineId`
- `targetUserId`

This context should be attached automatically where possible, and explicitly added where the action already knows the entity ID.

## What to Instrument First

These are the highest-value instrumentation targets for this codebase.

### 1. Authentication Flows

Files:
- `src/app/auth/callback/route.ts`
- `src/app/auth/confirm/route.ts`
- `src/lib/actions/auth.ts`
- `src/lib/supabase/middleware.ts`

Capture:
- login success/failure
- password reset requests
- callback exchange failure
- forced password change redirects
- missing or stale JWT metadata fallback

Important note:
- never log raw tokens, auth codes, or full callback URLs with secrets

### 2. User Administration

Files:
- `src/lib/actions/users.ts`
- `src/app/api/admin/sync-user-metadata/route.ts`

Capture:
- who invited whom
- role changes
- activation/deactivation
- metadata sync job results
- service-role failures

This area should also emit audit-grade logs.

### 3. Project Assignment and Access

Files:
- `src/lib/actions/project-assignments.ts`
- related project pages/components

Capture:
- assignment attempts
- removals
- unauthorized mutation attempts
- notification/email send failures

### 4. Finance Module

Files:
- `src/lib/actions/finance/*.ts` (decomposed modules — see commit `10b4391`, finance.ts was split Apr 2026)
- `src/app/api/cron/finance-digest/route.ts`

Capture:
- approval flow
- payment recording
- digest send attempts
- mail failures
- export generation failures
- recurring processing

Finance should have the strongest operational telemetry after auth.

### 5. Timeline / Gantt

Files:
- `src/lib/actions/timelines.ts`

Capture:
- dependency propagation runs
- project working-days changes
- scheduling failures
- mutation authorization failures
- large reschedule operations with duration metrics

### 6. Cron Jobs

Files:
- `src/app/api/cron/check-milestones/route.ts`
- `src/app/api/cron/finance-digest/route.ts`

Capture:
- job started
- job finished
- duration
- records processed
- emails attempted
- emails failed
- notifications created
- authorization/config failure

Every cron route should log one start event and one completion event.

## Log Level Policy

### `debug`
- profiling
- cache timings
- branch selection details
- development-only investigation output

### `info`
- successful important operations
- cron job start/finish
- normal business actions

### `warn`
- recoverable degraded behavior
- fallback path used
- partial success
- suspicious but non-fatal authorization pattern

### `error`
- failed user-visible operation
- failed server action
- query failure
- third-party failure
- unexpected exception

### `audit`
- admin actions
- role changes
- access changes
- sensitive finance approvals
- security-relevant state changes

## Metrics to Track

Even without full distributed tracing, these counters are valuable:

- auth failures per minute
- password reset requests per hour
- privileged mutation failures per area
- cron success/failure counts
- email send failure rate
- route handler 500 count by path
- server action failure count by action name
- repeated Supabase/RLS errors by query
- client render errors by page

Useful durations:
- auth callback exchange time
- dashboard page data load time
- finance digest job duration
- timeline propagation duration
- PDF/export generation time

## Alert Policy

### Critical Alerts

Send immediate alert when:
- a cron job fails
- a privileged admin action consistently fails
- auth callback or login failures spike suddenly
- repeated RLS or database permission errors appear
- finance email digest fails in production
- route handler 500s spike for core surfaces like `/dashboard`, `/payments`, `/projects`

### Warning Alerts

Send non-paging alert when:
- client-side crashes exceed threshold
- payment exports fail repeatedly
- assignment emails or report emails degrade
- JWT metadata fallback query frequency rises

### No-Alert Logging

Only record:
- normal validation failures
- normal access denials
- optional debug timings

## Data Hygiene Rules

Never log:
- passwords
- temp passwords
- auth tokens
- callback codes
- token hashes
- service role keys
- full secrets from env
- raw email attachments or full PDF payloads

Redact or hash where needed:
- user emails in some audit contexts if required by policy
- phone numbers
- financial free-text notes if not necessary for debugging

## Lessons From Recent Incidents

Apr 3, 2026 — RLS recursion outage (multi-hour). Root cause: missing `SECURITY DEFINER` on `get_user_role()` and `is_assigned_to_project()` caused recursive RLS evaluation, surfacing as Postgres `stack depth limit exceeded` (SQLSTATE `54001`). Symptoms in the app were misleading — IO budget depletion, gateway timeouts, empty pages — and the fix took hours because the actual error was only visible in `Supabase Dashboard → Observability → Logs → Postgres`.

Implications for monitoring design:

- **Always include `errorCode`** (PG SQLSTATE for DB errors, HTTP status for fetch errors). The string `54001` would have pointed at the cause directly.
- **Treat `stack depth limit exceeded` and `statement timeout` (SQLSTATE `57014`) as immediate-page alerts.** They are categorical — never expected, always indicative of a broken assumption.
- **Surface Postgres ERROR-level entries** in the same view as app errors. The lesson from CLAUDE.md gotcha #43 ("Check Postgres error logs FIRST when debugging") only works if those logs are visible without leaving the dashboard.
- The `database_error` and `rls_error` classes in §Error Classification Model exist specifically to make this category greppable.

## Rollout Plan

### Phase 1: Foundation

- add `logger.ts`
- add request ID generation in middleware
- add error normalization utilities
- add client/server error tracking integration

### Phase 2: Critical Surfaces

- instrument auth
- instrument user admin
- instrument cron jobs
- instrument finance mutations

### Phase 3: Domain Coverage

- instrument project assignments
- instrument timeline propagation
- instrument reports and drawings

### Phase 4: Alerting and Cleanup

- connect alerts for critical failures
- remove raw `console.log/error` from core paths
- move profiling output behind debug flag

## Acceptance Criteria

This monitoring architecture is considered successfully implemented when:

- every protected request response carries an `x-request-id` header (verifiable: curl any dashboard route, header is present)
- privileged server actions emit structured logs (verifiable: grep `logger.audit\|logger.error` in `src/lib/actions/`)
- auth and cron errors are captured centrally (verifiable: trigger a synthetic error, see it in Sentry within seconds)
- client render errors are visible in error tracking (verifiable: throw from a button click, see it in Sentry)
- critical failures have an alert path (verifiable: Sentry alert rules listed and pointed at the team email/Slack)
- raw sensitive callback/token data is never logged (verifiable: CI grep step — no `request.url`, `code`, or `token_hash` literal in logger calls under `auth/**`)
- no `console.log` in `src/app/api/**` or `src/lib/actions/**` after Phase 4 (verifiable: lint rule)
- logger redacts known sensitive keys (verifiable: unit test feeds `{ password: "x" }` into meta and asserts it is absent from output)

## Recommended First Deliverables

If implementation starts soon, the first concrete deliverables should be:

1. `src/lib/platform/logger.ts`
2. request ID support in `src/lib/supabase/middleware.ts`
3. error capture in `src/components/error-boundary.tsx`
4. structured logging in:
   - `src/lib/actions/users.ts`
   - `src/lib/actions/project-assignments.ts`
   - `src/app/api/cron/finance-digest/route.ts`
   - `src/app/api/cron/check-milestones/route.ts`
   - `src/lib/actions/auth.ts`

These five steps would already make production failures much easier to understand.

## Agent Implementation Brief

Purpose
- This section is a direct handoff for agents implementing monitoring.
- Goal: build observability in controlled layers instead of sprinkling logs across the repo.
- Rule: do not start by mass-replacing `console.log`. Build the platform first, then migrate critical paths.

Global Constraints
- Never log secrets, tokens, passwords, auth codes, token hashes, or service role keys.
- Prefer structured logs over free-form strings.
- Monitoring changes must not silently change business behavior.
- Error tracking and logging should be additive and safe to roll out incrementally.
- Critical auth and cron paths should be instrumented before low-value UI flows.

Execution Order
1. Core logging platform
2. Request correlation IDs
3. Error tracking integration
4. Critical-surface instrumentation
5. Alerting rules
6. Broader domain migration
7. Cleanup of ad hoc logging

### Agent M1: Core Logging Platform

Mission
- Create the shared logging foundation used by all later work.

Primary ownership
- New: `src/lib/platform/logger.ts`
- New: `src/lib/platform/error-utils.ts`
- New: `src/lib/platform/request-context.ts`
- Optional: `src/lib/platform/monitoring.ts`

Dependencies
- None. This agent should go first.

Tasks
- Define structured log interfaces and log levels.
- Normalize unknown errors into stable shapes.
- Provide logger methods such as `debug`, `info`, `warn`, `error`, and `audit`.
- Ensure production logging can be filtered by level and area.

Acceptance criteria
- A single shared logger exists and can be imported anywhere server-side.
- Log payloads accept structured metadata instead of only strings.
- Unknown thrown values are normalized consistently.
- Debug logging can be centrally enabled or disabled.

Out of scope
- Instrumenting every feature file.
- Integrating external vendors directly unless needed for the logger contract.

### Agent M2: Request Correlation and Context Propagation

Mission
- Make every server-side failure traceable through a request ID.

Primary ownership
- `src/lib/supabase/middleware.ts`
- `src/lib/supabase/server.ts`
- New shared request metadata helpers from Agent M1

Dependencies
- Starts after Agent M1 defines request-context helpers.

Tasks
- Generate or propagate a `requestId` in middleware.
- Attach correlation metadata to request/server context.
- Expose request metadata alongside existing auth context where practical.
- Ensure downstream logs can include `requestId`, route, and method.

Acceptance criteria
- All protected requests have a request correlation ID.
- Server-side logging can include request ID and route metadata.
- Request ID propagation works for middleware, route handlers, and server-rendered paths.

Out of scope
- Full distributed tracing.

### Agent M3: Error Tracking Integration

Mission
- Add centralized exception capture for client and server failures.

Primary ownership
- `src/components/error-boundary.tsx`
- `src/app/api/**`
- `src/app/auth/**`
- `src/app/global-error.tsx` if present/used
- new monitoring integration helper files if needed

Dependencies
- Best started after M1 and M2.

Tasks
- Integrate a centralized error tracking system such as Sentry.
- Capture unhandled route-handler failures.
- Capture client render errors from React boundaries.
- Enrich captured exceptions with request and user metadata where safe.

Acceptance criteria
- Client render crashes are visible in one error tracking system.
- Route handler and auth callback failures are centrally captured.
- Error events include useful metadata such as route, requestId, userId, and area when available.

Out of scope
- Instrumenting every expected validation error as an exception.

### Agent M4: Critical Surface Instrumentation

Mission
- Instrument the most important flows first.

Primary ownership
- `src/lib/actions/auth.ts`
- `src/lib/actions/users.ts`
- `src/lib/actions/project-assignments.ts`
- `src/app/api/cron/finance-digest/route.ts`
- `src/app/api/cron/check-milestones/route.ts`
- `src/app/auth/callback/route.ts`
- `src/app/auth/confirm/route.ts`

Dependencies
- Starts after M1 to M3 define the logging and error-capture platform.

Tasks
- Add structured logs for auth attempts, auth failures, callback failures, and forced password flows.
- Add audit logs for admin actions in users.
- Add operation logs for project assignment attempts and failures.
- Add job start, completion, counts, and duration logs for cron routes.
- Remove raw sensitive logging and replace it with safe structured metadata.

Acceptance criteria
- Auth, user admin, project assignments, and cron jobs emit structured logs.
- Critical flows capture both success and failure states where operationally useful.
- No raw token-bearing URL or sensitive auth data is logged.
- Cron logs show start, finish, processed counts, and failure reason.

Out of scope
- Full instrumentation of all domain modules.

### Agent M5: Alerting and Severity Policy

Mission
- Convert the most critical monitored failures into actionable alerts.

Primary ownership
- Sentry project configuration (alert rules, integrations: email + Slack)
- Vercel Cron failure notifications (project settings)
- alert helper modules if stored in repo
- cron and auth instrumentation touchpoints as needed

Dependencies
- Starts after M3 and M4.

Tasks
- Define alert thresholds for cron failures, auth spikes, admin mutation failures, and major route 500 spikes.
- Route critical failures to the chosen alerting destination.
- Distinguish paging alerts from non-paging warnings.

Acceptance criteria
- Critical failures have a clear alert path.
- Noise-prone events remain logs-only or warning-level.
- Alert rules are documented and tied to concrete event names or categories.

Out of scope
- Alerting on every validation or access-denied event.

### Agent M6: Domain Expansion

Mission
- Extend monitoring into the remaining high-value domains after the platform is stable.

Primary ownership
- `src/lib/actions/finance.ts` or decomposed finance modules
- `src/lib/actions/timelines.ts`
- `src/lib/actions/reports.ts`
- `src/lib/actions/drawings.ts`
- `src/lib/actions/dashboard.ts`

Dependencies
- Best started after architecture agents stabilize module boundaries, especially finance decomposition.

Tasks
- Add structured logs to finance workflows such as approvals, payments, recurring jobs, and exports.
- Add logs to timeline propagation and working-days changes.
- Add monitoring for report publish/send flows and drawing approval flows.
- Add timing metrics to selected expensive operations.

Acceptance criteria
- Finance and timeline operations expose actionable operational logs.
- Repeated domain failures can be grouped by action, entity, and error class.
- Expensive domain operations include duration metrics where useful.

Out of scope
- Blanket logging of every UI interaction.

### Agent M7: Cleanup and Standardization

Mission
- Remove or gate old ad hoc logging once the new system is in place.

Primary ownership
- `src/lib/cache.ts`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/projects/[id]/page.tsx`
- any remaining high-noise files identified during rollout

Dependencies
- Must go after M1 through M6 establish the new monitoring path.

Tasks
- Replace free-form profiling logs with debug-only structured logs.
- Remove duplicated `console.log/error` patterns from critical surfaces.
- Standardize metadata fields and area/action naming.

Acceptance criteria
- Core production paths no longer rely on raw console logging.
- Debug timing output is centrally gated.
- Logs across modules use a consistent vocabulary.

Out of scope
- Removing useful development logs before replacements are proven.

## Cross-Agent Coordination Rules

- M1 defines the logger contract. Other agents must reuse it rather than invent their own logging helper.
- M2 defines request correlation semantics. Other agents should consume `requestId`, not regenerate their own IDs.
- M3 defines how errors are sent to the tracking vendor. Other agents should capture through that integration instead of calling the vendor directly.
- M4 owns the first production-critical instrumentation pass.
- M6 should align with any parallel architecture refactors, especially finance module decomposition.
- M7 should only remove legacy logs after equivalent structured logs exist.

## Suggested Repo-Level Event Naming

Use stable names so alerts and dashboards stay consistent.

- `auth.login.success`
- `auth.login.failure`
- `auth.callback.failure`
- `auth.password_reset.requested`
- `users.invite.success`
- `users.invite.failure`
- `users.role_change`
- `users.activation_change`
- `assignments.add.success`
- `assignments.add.failure`
- `assignments.remove.success`
- `cron.finance_digest.started`
- `cron.finance_digest.completed`
- `cron.finance_digest.failed`
- `cron.milestone_check.started`
- `cron.milestone_check.completed`
- `cron.milestone_check.failed`
- `finance.invoice.approved`
- `finance.payment.recorded`
- `timeline.propagation.started`
- `timeline.propagation.completed`
- `timeline.propagation.failed`

## Suggested Whole-Program Acceptance Checklist

- Shared structured logger exists and is used on critical server paths.
- Request IDs are generated and propagated consistently.
- Centralized error tracking captures client and server failures.
- Auth, admin, cron, and project assignment flows are instrumented first.
- Critical failures alert the team without flooding them.
- Sensitive values are never logged.
- Legacy noisy logging is reduced only after structured replacements are live.
