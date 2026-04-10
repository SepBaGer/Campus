SELECT 
    schemaname, tablename, policyname, roles, cmd, qual
FROM 
    pg_policies
WHERE 
    tablename = 'lessons';
