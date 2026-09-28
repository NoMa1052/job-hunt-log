-- Add ownership column to every table, defaulting to whoever is signed in
alter table applications add column user_id uuid references auth.users(id) default auth.uid();
alter table people add column user_id uuid references auth.users(id) default auth.uid();
alter table conversation_entries add column user_id uuid references auth.users(id) default auth.uid();
alter table companies add column user_id uuid references auth.users(id) default auth.uid();
alter table company_notes add column user_id uuid references auth.users(id) default auth.uid();

-- Turn on row-level security
alter table applications enable row level security;
alter table people enable row level security;
alter table conversation_entries enable row level security;
alter table companies enable row level security;
alter table company_notes enable row level security;

-- Each person can only see/edit/delete their own rows
create policy "own applications" on applications for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own people" on people for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own conversation_entries" on conversation_entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own companies" on companies for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own company_notes" on company_notes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
