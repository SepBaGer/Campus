SELECT 
    (SELECT count(*) FROM public.lessons) as total_lessons,
    (SELECT count(*) FROM public.levels) as total_levels;
