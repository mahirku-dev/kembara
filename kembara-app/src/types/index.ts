// =============================================
// Kembara App — Central TypeScript Types
// =============================================

export interface ExchangeRecord {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  date: string;
  notes?: string;
}

export type TripRole = "host" | "owner" | "editor" | "viewer";

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_url: string | null;
  total_budget: number; // IDR Budget
  budget_sar?: number; // SAR Budget
  category_budgets_json?: Record<string, any>;
  exchange_records_json?: ExchangeRecord[];
  invite_code?: string | null;
  current_user_role?: TripRole;
  members_count?: number;
  trip_members?: TripMember[];
  created_at: string;
}

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string | null;
  name: string;
  role: TripRole;
  avatar_url: string | null;
  created_at: string;
}

export function canEditTrip(role?: TripRole | string): boolean {
  return role === "host" || role === "owner" || role === "editor";
}

export function isTripHost(role?: TripRole | string, userId?: string, tripOwnerId?: string): boolean {
  if (role === "host" || role === "owner") return true;
  if (userId && tripOwnerId && userId === tripOwnerId) return true;
  return false;
}

export interface ItineraryDay {
  id: string;
  trip_id: string;
  day_number: number;
  date: string | null;
  notes: string | null;
  created_at: string;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  done: boolean;
  assigned_to?: string | null;
  assigned_name?: string | null;
  assigned_avatar?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  subtasks?: Subtask[];
}

export interface Place {
  id: string;
  day_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  start_time: string | null;
  end_time: string | null;
  category: string | null;
  cost: number;
  thumbnail_url: string | null;
  notes?: string | null;
  tasks_json: Task[];
  expenses?: Expense[];
  sort_order: number;
  created_at: string;
}

export interface Expense {
  id: string;
  trip_id: string;
  place_id?: string | null;
  category: string | null;
  amount: number;
  currency: string;
  date: string | null;
  description: string | null;
  paid_by: string | null;
  created_at: string;
}

export interface PackingItem {
  id: string;
  trip_id: string;
  item_name: string;
  category: string | null;
  is_checked: boolean;
  created_at: string;
}

// Category definition for itinerary
export interface Category {
  label: string;
  icon: string;
  color: string;
}

