SELECT table_name, count(*) as cols
FROM information_schema.columns
WHERE table_schema='public'
GROUP BY table_name
ORDER BY table_name;
