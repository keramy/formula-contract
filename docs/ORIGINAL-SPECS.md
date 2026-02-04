# Original Specification Documents

The Formula Contract application was built from detailed specification documents
that existed in a separate planning directory (FC CONTRACT).

## What was used to build the app:

- **00-Master-Document.md** - Project overview and goals
- **01-Design-System.md** - Design tokens (key colors/typography extracted to CLAUDE.md)
- **02-Component-Library.md** - Component specifications
- **03-Page-Specifications.md** - Page layouts and user flows
- **04-Implementation-Order.md** - 10-phase build sequence
- **05-File-Structure.md** - Directory organization
- **06-Supabase-Setup.md** - Database configuration guide
- **07-Database-Schema.md** - Initial schema design
- **10-MVP-Scope.md** - MVP feature boundaries

## Preserved Diagrams

The following visual assets have been moved to `docs/diagrams/`:
- `FC_ERD_Diagram.svg` - Entity Relationship Diagram
- `FC_PM_System_Infographic.svg` - System overview infographic

## Why they're not actively referenced:

These were **planning documents** used during initial development (late 2025 - early 2026).
The app has evolved significantly beyond the original specs:

- Component implementations differ from initial specs
- Database schema has evolved through 32+ migrations
- New features added that weren't in original scope
- UI patterns refined based on real usage

## Source of truth is now:

- `CLAUDE.md` - Current project intelligence (updated Feb 2026)
- `CODEBASE.md` - Technical reference
- `docs/DATABASE.md` - Current schema documentation
- `docs/ARCHITECTURE.md` - Architecture decisions
- `docs/ROADMAP.md` - Future plans

## Archive Location

The original specification documents are preserved in:
```
docs/archive/original-specs/
```

This archive is kept for historical reference only. When implementing new features
or fixing bugs, always refer to the current documentation and codebase patterns,
not the archived specs.
