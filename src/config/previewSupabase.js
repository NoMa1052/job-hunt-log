// Vercel Preview deployments always use the dev Supabase project,
// never production (see README, Environments). Applied in vite.config.js when
// VERCEL_ENV is "preview", so a missing or wrong Preview env var in Vercel
// can't point a preview at live user data.
// The anon key is public by design: it ships in the browser bundle and RLS
// protects the data.
export const previewSupabase = {
  url: 'https://yceqxpjcarboaztjhxdc.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZXF4cGpjYXJib2F6dGpoeGRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MzM3MTMsImV4cCI6MjEwNjEwOTcxM30.BTMDbRbIG28xVIC7KmiJBETuRVlOdYcG23Ank9JgH7Y',
}
