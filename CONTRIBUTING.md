# Contributing to HTR Dashboard

Thank you for your interest in contributing to HTR Dashboard! This document provides guidelines and information for contributors.

## Development Setup

### Prerequisites

- Node.js 18 or higher
- npm or bun
- Supabase CLI (for database migrations)
- Git

### Initial Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/yourusername/htr-dashboard.git
   cd htr-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## Code Quality

### Linting and Type Checking

Before submitting any changes, please ensure your code passes our quality checks:

```bash
# Check TypeScript types
npm run type-check

# Run linter (with relaxed warnings for development)
npm run lint:check

# Fix automatically fixable lint issues
npm run lint:fix

# Build the project to ensure it compiles
npm run build:prod
```

### Code Style Guidelines

- Use TypeScript for all new code
- Follow existing code formatting patterns
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Keep components small and focused
- Use proper TypeScript types instead of `any` when possible

### Component Guidelines

- Place reusable UI components in `src/components/ui/`
- Place feature-specific components in `src/components/`
- Use proper prop types and interfaces
- Export components as named exports
- Use React hooks following the rules of hooks

## Database Changes

### Making Database Changes

All database changes should be made through Supabase migrations:

1. **Create a new migration**
   ```bash
   supabase migration new your_migration_name
   ```

2. **Edit the migration file** in `supabase/migrations/`

3. **Test the migration locally**
   ```bash
   supabase db reset
   ```

4. **Include the migration in your pull request**

### Migration Guidelines

- Always use reversible migrations when possible
- Include proper indexes for performance
- Add appropriate RLS (Row Level Security) policies
- Test migrations thoroughly before submitting

## Testing

### Manual Testing

Before submitting a pull request:

1. Test all affected functionality
2. Test on different screen sizes (mobile, tablet, desktop)
3. Test with different user roles (admin, regular user)
4. Test error scenarios and edge cases

### Browser Testing

Ensure your changes work in:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Pull Request Process

### Before Submitting

1. **Update your branch** with the latest changes from main
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run quality checks**
   ```bash
   npm run type-check
   npm run lint:check
   npm run build:prod
   ```

3. **Test thoroughly** - see Testing section above

### Pull Request Guidelines

1. **Create a descriptive title** that summarizes your changes
2. **Provide a detailed description** including:
   - What changes were made
   - Why the changes were necessary
   - How to test the changes
   - Screenshots for UI changes

3. **Link related issues** using GitHub keywords (e.g., "Fixes #123")

4. **Keep changes focused** - one feature or fix per PR

5. **Update documentation** if your changes affect setup or usage

### Review Process

- All pull requests require review before merging
- Address reviewer feedback promptly
- Keep discussions professional and constructive
- Be open to suggestions and improvements

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components (shadcn/ui)
│   └── ...             # Feature-specific components
├── contexts/           # React contexts for state management
├── hooks/              # Custom React hooks
├── integrations/       # External service integrations
│   └── supabase/       # Supabase client and queries
├── lib/                # Utility functions and helpers
├── pages/              # Page-level components
└── assets/             # Static assets (images, etc.)

supabase/
├── migrations/         # Database migration files
└── config.toml        # Supabase configuration
```

## Environment Variables

The project uses the following environment variables:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

For local development with Supabase CLI, these will be automatically configured.

## Common Issues

### Development Server Won't Start

1. Ensure Node.js version is 18 or higher
2. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
3. Check that all environment variables are set correctly

### Build Failures

1. Run `npm run type-check` to see TypeScript errors
2. Check that all imports are correct
3. Ensure all dependencies are installed

### Database Connection Issues

1. Verify Supabase credentials in `.env.local`
2. Check if Supabase project is active
3. For local development, ensure `supabase start` has been run

## Getting Help

If you need help or have questions:

1. Check existing [GitHub Issues](https://github.com/aidenpinto/htr-dashboard/issues)
2. Create a new issue with detailed information
3. Include error messages, environment details, and steps to reproduce

## License

By contributing to HTR Dashboard, you agree that your contributions will be licensed under the MIT License.
