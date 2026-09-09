-- Create current_affairs table
CREATE TABLE IF NOT EXISTS public.current_affairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    date_display TEXT NOT NULL,
    read_time TEXT DEFAULT '3 min read',
    title_bn TEXT NOT NULL,
    title_en TEXT NOT NULL,
    summary_bn TEXT NOT NULL,
    bullet_points JSONB DEFAULT '[]'::jsonb,
    exam_relevance TEXT DEFAULT 'WBCS, WBP, SSC',
    is_important BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.current_affairs ENABLE ROW LEVEL SECURITY;

-- Allow public read access to everyone
CREATE POLICY "Allow public read access for current affairs"
ON public.current_affairs
FOR SELECT
USING (true);

-- Allow admin full access
CREATE POLICY "Allow admin full access to current affairs"
ON public.current_affairs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin')
  )
);
