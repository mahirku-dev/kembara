-- Add columns to trips table for SAR budget, category allocations, and money exchange records
alter table trips add column if not exists budget_sar numeric default 0;
alter table trips add column if not exists category_budgets_json jsonb default '{}'::jsonb;
alter table trips add column if not exists exchange_records_json jsonb default '[]'::jsonb;

