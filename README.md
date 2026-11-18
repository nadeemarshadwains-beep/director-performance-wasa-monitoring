# Director Performance & WASA Monitoring System

A React, TypeScript, Vite and Supabase web application for secure monthly WASA reporting, field-visit tracking, targets and administrative review. The application contains no sample organizational data; the first dashboard stays empty until authorized users enter or import records.

## Requirements

- Node.js 20.19+ or 22.12+ and npm
- A Supabase project
- Supabase CLI for migrations and Edge Function deployment
- A Vercel account (or another static Vite host)

## Local development

1. Copy `.env.example` to `.env` and set the Supabase project URL and **publishable/anon** key:

   ```text
   VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_KEY
   ```

   These are public client values. Never use a Supabase `service_role` key in a `VITE_` variable or browser code.

2. Install and start:

   ```powershell
   npm install
   npm run dev
   ```

3. Before signing in, apply the database migration and create the first Admin as described below.

## Supabase setup

1. Create a Supabase project and keep its database password and service-role key private.
2. Apply `supabase/migrations/202611180001_initial_schema.sql` using the Supabase CLI:

   ```powershell
   supabase login
   supabase link --project-ref YOUR_PROJECT_ID
   supabase db push
   ```

   Alternatively, run the migration once in the Supabase SQL Editor as the project owner. Do not run both methods on the same project.
3. In **Authentication → URL Configuration**, set the local callback URL (for example `http://localhost:5173`) and later add the deployed HTTPS origin.
4. Disable public self-registration in **Authentication → Settings**. Admin invitations are the supported Director account workflow.
5. Create the first user in **Authentication → Users**. Copy its UUID and run `supabase/bootstrap_admin.sql` after replacing the placeholder UUID and administrator name. The bootstrap SQL must be run by the database owner.
6. Add `.env` values locally. In the hosting provider, configure the same two public Vite variables as build-time environment variables.
7. Deploy the protected Director invitation function:

   ```powershell
   supabase functions deploy admin-create-user
   ```

   The function validates the caller's authenticated Admin profile and uses the server-only Supabase service-role key to send invitations. Configure `APP_ORIGIN` as a Supabase Function secret to restrict browser origins. Supabase's runtime service-role secret must remain server-side.

## Initial data and account workflow

- Sign in as Admin, add the Directors and WASAs, and assign each active WASA to a Director. The schema does not invent the real roster.
- Admin invitations are sent through Supabase Auth. Directors set their password from the invitation email.
- Admin sets period-specific targets in **Targets & achievement**.
- Directors create monthly reports and field visits only for currently assigned WASAs. Admin reviews submissions, records a correction comment when returning a report, and approves or reopens reports. Approved reports are read-only to Directors.
- The existing workbook covers one year, but its actual column/sheet layout has not yet been provided. Inspect and map it before import; do not bulk-import it until its columns, dates, status and WASA names have been reconciled. The current UI does not claim that a workbook import has been completed.

## Database and security

The migration creates normalized records for profiles, Directors, WASAs, effective-dated WASA assignments, monthly reports, visits, targets, approval events and audit history. Monthly reports are unique by WASA/year/month. Derived balances are PostgreSQL generated columns, with constraints against negative closing balances. Amounts are stored as decimal PKR values.

Row Level Security is enabled for every exposed application table. Admins can manage organization records and review data. Director access is filtered to the Director's own profile and current WASA assignments. The service-role key is used only by the invitation Edge Function and is never part of the Vite bundle.

Important calculations:

- Current-demand recovery = current-month collection ÷ current-month demand; it is `NULL` when demand is zero.
- Outstanding current demand = monthly demand − monthly collection.
- Closing arrears = opening arrears + additional arrears − arrears recovered − approved adjustments.
- Closing surveys = opening surveys + new surveys − removed surveys. Corrections are count-neutral.
- Closing water/sewer connections = opening connections + new connections − removals.
- Arrears recovery is displayed separately from current-demand collection.

## Deploy to Vercel

1. Put the source in a private or organization-approved GitHub repository.
2. Import that repository into Vercel with the Vite framework preset.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build environment variables. These must contain only the public project URL and public anon/publishable key.
4. Deploy, then add the resulting HTTPS domain to Supabase Auth's allowed redirect URLs and set the `APP_ORIGIN` Supabase Function secret to the exact application origin.
5. Redeploy after changing build-time environment variables.

The app includes a web manifest and service worker for installability. Browser-based data entry requires a network connection; pending form data is not stored offline.

## Validation and exports

Run the production type-check/build with:

```powershell
npm run build
```

Run the focused workbook export checks with:

```powershell
npm test
```

Monthly report exports are generated in the browser as `.xlsx` and PDF files. They include actual records visible to the signed-in user and do not manufacture missing submissions.

## Operational considerations

- Keep at least one separately controlled Admin account and periodically review Admin access.
- Use Supabase's managed backups/point-in-time recovery according to the selected plan; periodically export approved reports as an additional operational copy.
- Deactivating a Director or WASA prevents new account use/assignments but retains historical records.
- When changing WASA ownership, use the assignment form; it closes the previous current assignment and records the effective date.
- The one-year Excel workbook must be reviewed before import to map its actual sheets/columns, handle duplicate periods and establish opening balances safely.
