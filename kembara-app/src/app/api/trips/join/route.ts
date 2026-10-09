import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawCode = body?.inviteCode || body?.code || "";
    const cleanCode = String(rawCode).trim().toUpperCase();

    if (!cleanCode || cleanCode.length < 3) {
      return NextResponse.json(
        { success: false, error: "Kode undangan tidak valid atau tidak lengkap." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Silakan login terlebih dahulu untuk bergabung ke perjalanan.",
        },
        { status: 401 }
      );
    }

    // 1. First try calling the RPC function 'join_trip_by_code'
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc(
        "join_trip_by_code",
        { p_invite_code: cleanCode }
      );

      if (!rpcErr && rpcData) {
        return NextResponse.json(rpcData);
      }
    } catch (rpcException) {
      console.warn("RPC join_trip_by_code fallback triggered:", rpcException);
    }

    // 2. Direct Server-Side Fallback (if RPC is not yet registered in remote DB)
    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .select("id, title, user_id, invite_code")
      .ilike("invite_code", cleanCode)
      .maybeSingle();

    if (tripErr || !trip) {
      return NextResponse.json(
        {
          success: false,
          error: "Kode undangan tidak valid atau perjalanan tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    // If already host/owner
    if (trip.user_id === user.id) {
      return NextResponse.json({
        success: true,
        tripId: trip.id,
        title: trip.title,
        message: "Anda adalah Host perjalanan ini.",
      });
    }

    // Check if already member
    const { data: existingMember } = await supabase
      .from("trip_members")
      .select("id, role")
      .eq("trip_id", trip.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json({
        success: true,
        tripId: trip.id,
        title: trip.title,
        message: "Anda sudah menjadi anggota di perjalanan ini.",
      });
    }

    // Insert new member
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
      role: "viewer",
      avatar_url: avatarUrl,
    });

    if (insertErr) {
      return NextResponse.json(
        {
          success: false,
          error: insertErr.message || "Gagal menyimpan keanggotaan perjalanan.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tripId: trip.id,
      title: trip.title,
      message: "Berhasil bergabung ke perjalanan!",
    });
  } catch (error: any) {
    console.error("API /api/trips/join error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Terjadi kesalahan pada server saat bergabung.",
      },
      { status: 500 }
    );
  }
}

