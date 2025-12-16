-- Create forum_topics table
CREATE TABLE public.forum_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create forum_comments table
CREATE TABLE public.forum_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;

-- Forum Topics Policies
CREATE POLICY "Anyone can view approved topics"
ON public.forum_topics FOR SELECT
USING (status = 'approved');

CREATE POLICY "Authenticated users can view their own topics"
ON public.forum_topics FOR SELECT
USING (auth.uid() = author_id);

CREATE POLICY "Admins can view all topics"
ON public.forum_topics FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create topics"
ON public.forum_topics FOR INSERT
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own pending topics"
ON public.forum_topics FOR UPDATE
USING (auth.uid() = author_id AND status = 'pending');

CREATE POLICY "Admins can update any topic"
ON public.forum_topics FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any topic"
ON public.forum_topics FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Forum Comments Policies
CREATE POLICY "Anyone can view comments on approved topics"
ON public.forum_comments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.forum_topics 
  WHERE id = forum_comments.topic_id AND status = 'approved'
));

CREATE POLICY "Admins can view all comments"
ON public.forum_comments FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create comments on approved topics"
ON public.forum_comments FOR INSERT
WITH CHECK (
  auth.uid() = author_id AND 
  EXISTS (
    SELECT 1 FROM public.forum_topics 
    WHERE id = forum_comments.topic_id AND status = 'approved'
  )
);

CREATE POLICY "Users can delete their own comments"
ON public.forum_comments FOR DELETE
USING (auth.uid() = author_id);

CREATE POLICY "Admins can delete any comment"
ON public.forum_comments FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Update trigger for forum_topics
CREATE TRIGGER update_forum_topics_updated_at
BEFORE UPDATE ON public.forum_topics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();