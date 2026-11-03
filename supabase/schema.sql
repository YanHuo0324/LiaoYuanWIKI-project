-- Run this in Supabase Dashboard > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text not null default '',
  content text not null default '',
  category text not null default '随笔',
  cover_url text not null default '',
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_blog_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

alter table public.admin_users enable row level security;
alter table public.posts enable row level security;

create policy "admins can read admin list"
on public.admin_users for select to authenticated
using (public.is_blog_admin());

create policy "public can read published posts"
on public.posts for select to anon, authenticated
using (published = true or public.is_blog_admin());

create policy "admins can insert posts"
on public.posts for insert to authenticated
with check (public.is_blog_admin());

create policy "admins can update posts"
on public.posts for update to authenticated
using (public.is_blog_admin())
with check (public.is_blog_admin());

create policy "admins can delete posts"
on public.posts for delete to authenticated
using (public.is_blog_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('article-images', 'article-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

create policy "public can view article images"
on storage.objects for select
using (bucket_id = 'article-images');

create policy "admins can upload article images"
on storage.objects for insert to authenticated
with check (bucket_id = 'article-images' and public.is_blog_admin());

create policy "admins can update article images"
on storage.objects for update to authenticated
using (bucket_id = 'article-images' and public.is_blog_admin())
with check (bucket_id = 'article-images' and public.is_blog_admin());

create policy "admins can delete article images"
on storage.objects for delete to authenticated
using (bucket_id = 'article-images' and public.is_blog_admin());
