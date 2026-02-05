# Formula Contract - Project Management System
## Master Implementation Document

**Version:** 1.0  
**Date:** January 2026  
**Status:** Ready for Development

---

## Project Overview

A project management system for Formula Contract (furniture manufacturing division) to manage projects from tender through installation.

### Key Stats
- **12 Modules** (11 in MVP)
- **6 User Roles** (Admin, PM, Production, Procurement, Management, Client)
- **17 Database Tables**
- **Target Timeline:** 4-8 weeks

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 + React 18 |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Hosting | Vercel (frontend) + Supabase (backend) |
| Version Control | GitHub |

---

## Documentation Index

### Setup & Configuration
| # | Document | Description |
|---|----------|-------------|
| 01 | [Design-System.md](./01-Design-System.md) | Colors, typography, spacing, all design tokens |
| 02 | [Component-Library.md](./02-Component-Library.md) | Every component spec with variants |
| 03 | [Page-Specifications.md](./03-Page-Specifications.md) | All page layouts and data bindings |
| 04 | [Implementation-Order.md](./04-Implementation-Order.md) | Build sequence with dependencies |
| 05 | [File-Structure.md](./05-File-Structure.md) | Folder organization, naming conventions |
| 06 | [Supabase-Setup.md](./06-Supabase-Setup.md) | Database, RLS policies, storage |
| 07 | [Database-Schema.md](./07-Database-Schema.md) | All tables, relationships, SQL |

### Reference Documents
| # | Document | Description |
|---|----------|-------------|
| 08 | [Requirements-Summary.md](./08-Requirements-Summary.md) | All requirements by module |
| 09 | [API-Endpoints.md](./09-API-Endpoints.md) | All Supabase queries/functions |
| 10 | [MVP-Scope.md](./10-MVP-Scope.md) | What's in/out of MVP |

---

## MVP Scope Summary

### In MVP (Weeks 1-4)
- ✅ Auth (login, logout, password reset)
- ✅ User management (create, roles, deactivate)
- ✅ Projects (create, edit, status, assign PM)
- ✅ Scope items (add, dual path, status)
- ✅ Drawings (upload, revisions, approval workflow)
- ✅ Materials (add, images, approval)
- ✅ Client portal (view, approve/reject)
- ✅ Installation (mark installed, snagging)
- ✅ Reports (create, lines, photos, publish)
- ✅ PM Dashboard
- ✅ In-app notifications

### Post-MVP (Weeks 5-8)
- ❌ Excel import/export
- ❌ Email notifications
- ❌ PDF export
- ❌ Client markup upload
- ❌ Drawing analytics
- ❌ Management/Client dashboards
- ❌ Calendar view
- ❌ PWA setup

### Future (Month 3+)
- ❌ iOS App (Expo)
- ❌ Custom production steps
- ❌ Multi-language (TR/EN)

---

## User Roles & Access

| Role | Access Level |
|------|--------------|
| **Admin** | Full system access, user management |
| **PM** | Full control on assigned projects |
| **Production** | Update production % on assigned items |
| **Procurement** | Update order status on assigned items |
| **Management** | View-only all projects (not in MVP) |
| **Client** | Own project only, approve/reject |

---

## Quick Start for Claude Code

### Step 1: Project Setup
Follow: `04-Implementation-Order.md` → Phase 0

### Step 2: Database Setup  
Follow: `06-Supabase-Setup.md`

### Step 3: Design System
Follow: `01-Design-System.md`

### Step 4: Build Components
Follow: `02-Component-Library.md`

### Step 5: Build Pages
Follow: `03-Page-Specifications.md`

---

## Important Rules for Claude Code

1. **Follow specs exactly** - Don't add features not in docs
2. **Use shadcn/ui components** - Don't create custom components unless specified
3. **Notion-style UI** - Clean, minimal, lots of whitespace
4. **Collapsible sidebar** - Can minimize to icons
5. **Light mode only** - No dark mode in MVP
6. **TypeScript strict** - Full type safety
7. **File naming** - kebab-case for files, PascalCase for components
8. **One thing at a time** - Complete each phase before moving to next

---

## Contact & Notes

- **Project:** Formula Contract PM System
- **Owner:** Kerem
- **Method:** Claude Code execution from these specs

---

*This is the master document. All implementation details are in the linked documents.*
