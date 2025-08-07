# HTR Dashboard

A comprehensive management dashboard built with React, TypeScript, Vite, and Supabase. This dashboard provides user management, team administration, notifications, and real-time functionality.

## Features

- 🔐 **Authentication** - Secure user authentication with Supabase Auth
- 👥 **User Management** - Admin panel for managing users and registrations
- 📊 **Analytics Dashboard** - Real-time data visualization with charts
- 🔔 **Notifications** - Real-time notification system
- 👨‍👩‍👧‍👦 **Team Management** - Team creation, invitations, and management
- 📱 **Responsive Design** - Mobile-first responsive design with Tailwind CSS
- 🎨 **Modern UI** - Beautiful UI components with shadcn/ui and Radix UI

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (Database, Auth, Real-time)
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router DOM
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts
- **Icons**: Lucide React

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (version 18 or higher)
- [npm](https://www.npmjs.com/) or [bun](https://bun.sh/)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local development)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/aidenpinto/htr-dashboard.git
cd htr-dashboard
```

### 2. Install dependencies

```bash
npm install
# or
bun install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Supabase Setup

#### Option 1: Use existing Supabase project
1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key to the `.env.local` file
3. Run the migrations:
   ```bash
   supabase db reset
   ```

#### Option 2: Local development with Supabase CLI
1. Start Supabase locally:
   ```bash
   supabase start
   ```
2. The local Supabase instance will provide you with the URL and keys needed for `.env.local`

### 5. Database Migrations

Run the database migrations to set up the required tables:

```bash
supabase db reset
```

### 6. Start the development server

```bash
npm run dev
# or
bun dev
```

The application will be available at `http://localhost:5173`

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   └── ...             # Feature-specific components
├── contexts/           # React contexts
├── hooks/              # Custom React hooks
├── integrations/       # External service integrations
│   └── supabase/       # Supabase client and queries
├── lib/                # Utility functions
├── pages/              # Page components
└── assets/             # Static assets

supabase/
├── migrations/         # Database migrations
└── config.toml        # Supabase configuration
```

## Database Schema

The application uses the following main tables:
- `profiles` - User profile information
- `user_notifications` - User notification system
- `global_notifications` - System-wide notifications
- `teams` - Team management
- `team_invites` - Team invitation system

See the migration files in `supabase/migrations/` for detailed schema definitions.

## Deployment

### Vercel (Recommended)

1. Fork this repository
2. Connect your GitHub account to [Vercel](https://vercel.com)
3. Import your repository
4. Add environment variables in Vercel dashboard
5. Deploy

### Netlify

1. Build the project: `npm run build`
2. Deploy the `dist` folder to Netlify
3. Set up environment variables in Netlify dashboard

### Other Platforms

The application can be deployed to any static hosting service that supports SPA routing:
- Build: `npm run build`
- Deploy the `dist` folder
- Configure environment variables
- Set up SPA redirects (redirect all routes to `index.html`)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you have any questions or need help setting up the project, please:
1. Check the [Issues](https://github.com/aidenpinto/htr-dashboard/issues) page
2. Create a new issue if your problem isn't already addressed
3. Provide as much detail as possible including error messages and environment information
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/761e34ca-7825-4199-ada8-81124413d16c) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
