import { createClient } from "@/utils/supabase/client";
import type { TripRole } from "@/types";

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Join an existing trip by invite code
 */
export async function joinTripByCode(inviteCode: string): Promise<{ success: boolean; tripId?: string; error?: string }> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Silakan login terlebih dahulu untuk bergabung ke perjalanan." };
    }

    const cleanCode = inviteCode.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, error: "Kode undangan tidak boleh kosong." };
    }

    // 1. Find trip by invite code
    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .select("id, title, user_id")
      .eq("invite_code", cleanCode)
      .single();

    if (tripErr || !trip) {
      return { success: false, error: "Kode undangan tidak valid atau perjalanan tidak ditemukan." };
    }

    // 2. Check if user is already the owner/host or already a member
    if (trip.user_id === user.id) {
      return { success: true, tripId: trip.id };
    }

    const { data: existingMember } = await supabase
      .from("trip_members")
      .select("id, role")
      .eq("trip_id", trip.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMember) {
      // Already a member
      return { success: true, tripId: trip.id };
    }

    // 3. Add user as member with default 'viewer' role
    const userName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Anggota";
    const avatarUrl = user.user_metadata?.avatar_url || null;

    const { error: insertErr } = await supabase.from("trip_members").insert({
      trip_id: trip.id,
      user_id: user.id,
      name: userName,
      role: "viewer", // Default: read-only viewer
      avatar_url: avatarUrl,
    });

    if (insertErr) {
      return { success: false, error: insertErr.message || "Gagal bergabung ke perjalanan." };
    }

    return { success: true, tripId: trip.id };
  } catch (err: any) {
    return { success: false, error: err?.message || "Terjadi kesalahan saat bergabung." };
  }
}

/**
 * Update member role (Host only)
 */
export async function updateMemberRole(
  memberId: string,
  newRole: TripRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("trip_members")
      .update({ role: newRole })
      .eq("id", memberId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Gagal mengubah hak akses." };
  }
}

/**
 * Remove member from trip (Host only or member leaving)
 */
export async function removeTripMember(memberId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("trip_members").delete().eq("id", memberId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Gagal menghapus anggota." };
  }
}

/**
 * Regenerate trip invite code (Host only)
 */
export async function regenerateTripInviteCode(tripId: string): Promise<{ success: boolean; newCode?: string; error?: string }> {
  try {
    const supabase = createClient();
    const newCode = generateInviteCode();
    const { error } = await supabase
      .from("trips")
      .update({ invite_code: newCode })
      .eq("id", tripId);

    if (error) return { success: false, error: error.message };
    return { success: true, newCode };
  } catch (err: any) {
    return { success: false, error: err?.message || "Gagal memperbarui kode undangan." };
  }
}

