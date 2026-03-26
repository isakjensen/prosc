# ProSC - SaaS Dashboard Application

A comprehensive SvelteKit 5 dashboard application with Prisma backend, featuring CRM capabilities, contract management, and business features.

## Features Implemented

### ✅ Core Features
- **Authentication System** - Login/logout with session management
- **Dashboard Home** - Overview with stats and quick actions
- **Layout Components** - Sidebar navigation and top bar

### ✅ CRM Features
- **Prospects Management** - Full prospect pipeline with 7 stages:
  - Found / Lead
  - Qualified
  - Proposal
  - Negotiation
  - Won
  - Implementation
  - Implemented Customer
- **Customers Management** - Customer database with project overview
- **Contacts Management** - Contact database linked to companies

### ✅ Sales Features
- **Quotes** - Quote listing and management
- **Tasks** - Kanban board view with status tracking

### 🔄 Placeholder Pages (Ready for Implementation)
- Contracts
- Invoices
- Time Tracking
- Meetings
- Support Tickets
- Reports & Analytics
- Settings

## Tech Stack

- **SvelteKit 5** - Framework
- **TypeScript** - Type safety
- **Prisma v6** - Database ORM
- **SQLite** - Development database
- **TailwindCSS** - Styling
- **Bits UI** - Component library
- **Hero Icons** - Icons
- **date-fns** - Date formatting
- **zod** - Validation

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up the database:
```bash
npx prisma migrate dev
```

3. Seed the database (creates default user and prospect stages):
```bash
npm run db:seed
```

4. Start the development server:
```bash
npm run dev
```

### Default Login Credentials

- **Email:** admin@prosc.com
- **Password:** password123

## Database Schema

The application includes comprehensive Prisma models for:
- Users & Authentication
- Companies (Prospects/Customers)
- Contacts
- Projects
- Quotes & Contracts
- Tasks
- Invoices & Payments
- Support Tickets
- Time Tracking
- Meetings
- Documents
- Notifications
- Reports
- Integrations
- Team Management
- Milestones
- Expenses
- Campaigns
- Knowledge Base
- Email Templates

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── ui/          # UI components (Button, Input, Card, etc.)
│   │   └── layout/      # Layout components (Sidebar, TopBar, MainLayout)
│   ├── db/              # Prisma client
│   └── utils/           # Utility functions (auth, session)
├── routes/
│   ├── (auth)/           # Authentication routes
│   │   └── login/
│   ├── (dashboard)/      # Protected dashboard routes
│   │   ├── prospects/   # Prospect management
│   │   ├── customers/   # Customer management
│   │   ├── contacts/    # Contact management
│   │   ├── quotes/      # Quote management
│   │   ├── tasks/       # Task management
│   │   └── ...          # Other features
│   └── +page.svelte     # Root page (redirects to dashboard)
└── hooks.server.ts      # Server hooks for auth
```

## Next Steps

The following features are ready to be implemented:
1. File Storage System
2. Contract Templates & Management
3. Invoice Generation & Tracking
4. Payment Tracking
5. Support Ticket System
6. Time Entry & Timesheets
7. Meeting Scheduler
8. Document Management
9. Notification System
10. Analytics & Reporting
11. Integration Management
12. Team Management
13. Milestone Tracking
14. Expense Management
15. Marketing Campaigns
16. Knowledge Base
17. Email UI (compose, templates)

## Development

- Run type checking: `npm run check`
- Build for production: `npm run build`
- Preview production build: `npm run preview`

## License

Private project
