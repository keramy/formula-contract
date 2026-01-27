# Formula Contract

![Version](https://img.shields.io/badge/version-1.0.0-violet)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

A modern Project Management System for furniture manufacturing operations. Built with Next.js, Supabase, and shadcn/ui.

## Overview

Formula Contract helps Formula International manage the complete project lifecycle:
- **Tendering:** Track potential projects
- **Scope Management:** Define and manage furniture items with dual-path workflow (Production/Procurement)
- **Approval Workflows:** Drawing and material approval cycles with client collaboration
- **Production Tracking:** Monitor production progress percentages
- **Reporting:** Generate and share progress reports with stakeholders

## Tech Stack

- **Frontend:** Next.js 14+ (App Router), React, TypeScript
- **Styling:** Tailwind CSS v4, shadcn/ui
- **Database:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **State Management:** React Query (server), Zustand (client)
- **Forms:** react-hook-form + zod
- **Tables:** @tanstack/react-table

## Getting Started

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm
- Supabase project

### Environment Variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Build

```bash
# Production build
npm run build

# Start production server
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Authentication pages
│   └── (dashboard)/        # Protected dashboard pages
├── components/             # React components
│   ├── ui/                 # shadcn/ui components
│   └── [feature]/          # Feature-specific components
├── lib/
│   ├── actions/            # Server actions
│   ├── supabase/           # Supabase clients
│   └── react-query/        # React Query hooks
├── hooks/                  # Custom React hooks
└── types/                  # TypeScript definitions
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) - AI/Developer context file
- [docs/DATABASE.md](./docs/DATABASE.md) - Database schema
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Technical architecture
- [docs/ROADMAP.md](./docs/ROADMAP.md) - Future plans

## User Roles

| Role | Description |
|------|-------------|
| Admin | Full system access, user management |
| PM | Project management, scope items, drawings, reports |
| Production | Update production progress |
| Procurement | Manage procurement items |
| Management | Read-only overview |
| Client | View projects, approve drawings/materials |

## Key Features

- **Dual-Path Workflow:** Items follow either Production (requires drawing approval) or Procurement (order tracking) paths
- **Drawing Revisions:** Track drawing versions (A, B, C...) with client feedback
- **Material Approval:** Client approval workflow for material selections
- **Progress Reports:** Generate and share reports with photos
- **Activity Logging:** Full audit trail of all actions
- **Role-Based Access:** Row Level Security with Supabase RLS

## Scripts

```bash
# Development
npm run dev           # Development server
npm run build         # Production build
npm run start         # Start production
npm run lint          # Run ESLint
npm run test          # Run tests

# Versioning (creates git tag and pushes)
npm run version:patch # 1.0.0 → 1.0.1 (bug fixes)
npm run version:minor # 1.0.0 → 1.1.0 (new features)
npm run version:major # 1.0.0 → 2.0.0 (breaking changes)
```

## Deployment

The app is configured for deployment on Vercel. Connect your GitHub repository to Vercel for automatic deployments.

## Contributing

1. Create a feature branch
2. Make changes following existing patterns
3. Test all user roles
4. Submit pull request

## License

Proprietary - Formula International
