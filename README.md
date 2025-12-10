# Employee GM - Green Dog Dental Edition

> 🎮 **Madden for Vets** - A gamified Veterinary Hospital Management System

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account

### Setup

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Configure Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy `.env.example` to `.env`
   - Fill in your Supabase URL and anon key

   ```bash
   cp .env.example .env
   ```

3. **Run database migrations**
   - Go to your Supabase project's SQL Editor
   - Run the SQL from `supabase/migrations/001_initial_schema.sql`

4. **Create your first admin user**
   - Sign up through the app
   - Manually update the user's role in Supabase:
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@example.com';
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open browser**
   Navigate to `http://localhost:3000`

## 🏗️ Tech Stack

- **Framework:** Nuxt 3 (Vue 3 + TypeScript)
- **UI Library:** Vuetify 3 (Material Design)
- **State Management:** Pinia
- **Backend/DB:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (Email/Password)
- **Hosting:** Vercel (recommended)

## 👥 User Roles

### Admin
- Full access to all features
- Manage employees, skills, and schedules
- Approve/deny time off requests
- Access marketing and settings

### User
- View-only profile access
- Request time off
- View personal schedule
- Track own skill progression

## ⭐ Skill Rating System (The "Madden" Logic)

Skills are rated 0-5:

| Level | Category | Description |
|-------|----------|-------------|
| 0-2 | 🟠 Learning | Still developing proficiency |
| 3-4 | 🔵 Competent | Can perform independently |
| 5 | 🟢 Mentor | Master level, can teach others |

## 🃏 The Baseball Card

The employee profile is designed as a "Baseball Card" - a visual, at-a-glance view of:
- Employee photo and name
- Role and department
- Overall skill stats
- Top skills with ratings
- Tenure and position

## 📁 Project Structure

```
├── assets/css/          # Global styles
├── components/          # Vue components
│   ├── employee/        # Employee-related components
│   ├── layout/          # Layout components
│   ├── schedule/        # Scheduling components
│   └── skill/           # Skill-related components
├── layouts/             # Page layouts
├── middleware/          # Route middleware
├── pages/               # Application pages
├── plugins/             # Nuxt plugins (Vuetify)
├── stores/              # Pinia stores
├── supabase/            # Database migrations
└── types/               # TypeScript types
```

## 🔐 Security

- Row Level Security (RLS) enabled on ALL tables
- Profile sync via database trigger (1:1 with auth.users)
- Role-based access control (admin/user)
- Strict TypeScript typing

## 📱 Mobile First

- Touch-friendly UI
- Responsive design
- Large tap targets
- Optimized for on-the-go use

## 🛠️ Available Commands

```bash
# Development
npm run dev          # Start dev server

# Build
npm run build        # Build for production
npm run preview      # Preview production build

# Type checking
npm run typecheck    # Run TypeScript checks
```

## 🚀 Deployment (Vercel)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
4. Deploy!

## 📄 License

MIT License - Green Dog Dental
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
