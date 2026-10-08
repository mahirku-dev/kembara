-- Add notes column to places table for agenda notes
alter table places add column if not exists notes text;

