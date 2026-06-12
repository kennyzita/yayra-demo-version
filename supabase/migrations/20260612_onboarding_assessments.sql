-- Run this in Supabase SQL Editor to enable the onboarding forms feature.
-- Creates the assessments table and assessments storage bucket.

create table if not exists public.assessments (
  id uuid not null default gen_random_uuid() primary key,
  employee_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  assessment_type text not null default 'employee_onboarding',
  status text not null default 'pending',
  data jsonb not null default '{}'::jsonb,
  employee_signature text,
  employee_sign_date date,
  evaluator_signature text,
  evaluator_sign_date date,
  file_path text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assessments enable row level security;

-- Employees can read/write their own assessments
create policy "Employees manage own assessments"
  on public.assessments for all to authenticated
  using (auth.uid() = employee_id)
  with check (auth.uid() = employee_id);

-- Admins and HR can read/write all assessments
create policy "Admins manage all assessments"
  on public.assessments for all to authenticated
  using (
    exists (
      select 1 from public.users u
      join public.roles r on r.id = u.role_id
      where u.id = auth.uid() and r.name in ('Admin', 'HR')
    )
  );

-- Storage bucket for completed onboarding PDFs
insert into storage.buckets (id, name, public)
values ('assessments', 'assessments', false)
on conflict (id) do nothing;

-- Storage policies
create policy "Employees upload to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'assessments' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Employees read own files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'assessments' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Admins read all files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'assessments' and
    exists (
      select 1 from public.users u
      join public.roles r on r.id = u.role_id
      where u.id = auth.uid() and r.name in ('Admin', 'HR')
    )
  );

create policy "Admins upload all files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'assessments' and
    exists (
      select 1 from public.users u
      join public.roles r on r.id = u.role_id
      where u.id = auth.uid() and r.name in ('Admin', 'HR')
    )
  );
