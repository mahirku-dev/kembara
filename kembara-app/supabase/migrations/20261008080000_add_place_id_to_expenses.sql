-- Add place_id column to expenses table to link multiple expenses to a specific itinerary place/agenda
alter table expenses add column if not exists place_id uuid references places(id) on delete cascade;

-- Index for faster query of expenses by place_id
create index if not exists idx_expenses_place_id on expenses(place_id);

