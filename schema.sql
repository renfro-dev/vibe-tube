-- Create the videos table
create table if not exists videos (
  id text primary key, -- YouTube ID
  title text not null,
  description text,
  channel text,
  published_at timestamp with time zone,
  shared_at timestamp with time zone,
  vibe text,
  reason text,
  url text not null,
  metadata jsonb, -- Stores tags, thumbnails, stats, etc
  created_at timestamp with time zone default now()
);

-- Create an index on Vibe for faster filtering
create index if not exists videos_vibe_idx on videos (vibe);
create index if not exists videos_shared_at_idx on videos (shared_at desc);

-- Enable RLS (Optional, but good practice. Since we use Service Role we bypass it, but this assumes public read if you want frontend to read directly later)
alter table videos enable row level security;

-- Allow public read access (if you want client-side fetching later)
create policy "Allow public read access"
  on videos for select
  to anon
  using (true);
