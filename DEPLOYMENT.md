# LanIMS Deployment Guide

## Supabase Backend Integration

This document provides step-by-step instructions for deploying LanIMS with Supabase backend integration.

### Prerequisites

1. **Supabase Project**: Create a project at [supabase.com](https://supabase.com)
2. **Environment Variables**: Set up your `.env` file with:
   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   ```

### Database Setup

1. **Run the Schema**: Execute the following SQL files in your Supabase SQL editor:
   - `supabase-schema.sql` - Main database schema with tables, RLS policies, and triggers
   - `supabase-additional-functions.sql` - Additional functions for the service layer

2. **Initialize Data**: After deployment, visit `/setup` to:
   - Test database connection
   - Create default admin user (admin@lanims.com / admin123)
   - Optionally seed sample data

### Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Environment Setup**:
   - Copy `.env.example` to `.env`
   - Add your Supabase credentials

### Production Deployment (Cloudflare Pages)

1. **Build Configuration**:
   ```bash
   npm run build
   ```

2. **Cloudflare Pages Settings**:
   - Framework preset: Vite
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/`

3. **Environment Variables** (in Cloudflare Pages dashboard):
   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   ```

4. **Custom Configurations**:
   - `_headers` - Security and CORS headers
   - `_redirects` - SPA routing support

### Authentication Flow

1. **Default Admin Account**:
   - Email: `admin@lanims.com`
   - Password: `admin123`
   - Role: `admin`

2. **Creating New Users**:
   - Admin users can create cashier accounts
   - Email/password authentication through Supabase Auth
   - Role-based access control (admin/cashier)

3. **Security Features**:
   - Account lockout after failed attempts
   - Session management via Supabase
   - Row Level Security (RLS) policies

### Database Schema Overview

- **user_profiles**: User roles and metadata
- **products**: Inventory items with stock tracking
- **invoices**: Sales transactions
- **invoice_items**: Line items for invoices
- **business_settings**: Application configuration
- **activities**: Audit log for all actions

### Troubleshooting

1. **Connection Issues**:
   - Check environment variables
   - Verify Supabase project status
   - Test connection via `/setup` page

2. **Authentication Problems**:
   - Ensure RLS policies are enabled
   - Verify user_profiles table exists
   - Check if default admin was created

3. **Build Failures**:
   - Clear node_modules and reinstall
   - Check for TypeScript errors
   - Verify all imports are correct

### Monitoring and Maintenance

1. **Database Health**: Use the `/setup` page to monitor connection status
2. **User Management**: Admin users can manage roles via `/users`
3. **Data Backup**: Regular exports via Supabase dashboard
4. **Logs**: Monitor via Cloudflare Pages and Supabase dashboards

### Security Considerations

1. **Environment Variables**: Never commit secrets to git
2. **RLS Policies**: All tables have appropriate security policies
3. **CORS**: Configured for Supabase domains only
4. **Headers**: Security headers configured in `_headers`

### Support

For issues or questions:
1. Check the database setup via `/setup`
2. Review browser console for errors
3. Verify Supabase project configuration
4. Check environment variable configuration