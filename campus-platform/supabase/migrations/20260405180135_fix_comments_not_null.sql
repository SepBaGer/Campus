-- Fix comments table to allow general wall posts (lesson_id can be null)
ALTER TABLE public.comments ALTER COLUMN lesson_id DROP NOT NULL;
