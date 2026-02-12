"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSession, setSession, clearSession } from "@/lib/session";

type Room = { id: string; code: string; status: "active" | "matched"; matched_food_id: string | null };
type Food = { id: string; name: string; image_url: string | null };
type Match = { room_id: string; food_id: string };

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = (params?.code || "").toUpperCase();

  const [room, setRoom] = useState<Room | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [idx, setIdx] = useState(0);
  const [matchFood, setMatchFood] = useState<Food | null>(null);
  const [busy, setBusy] = useState(false);

  const current = foods[idx] || null;

  const roomLink = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/r/${code}`;
  }, [code]);

  // Load room + foods + restore session
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data: r, error: rErr } = await supabase.from("rooms").select("*").eq("code", code).single();
        if (rErr) throw rErr;
        if (!alive) return;
        setRoom(r as Room);

        const { data: f, error: fErr } = await supabase.from("foods").select("*").order("created_at", { ascending: true });
        if (fErr) throw fErr;
        if (!alive) return;
        setFoods((f || []) as Food[]);

        const sess = getSession();
        if (sess?.roomCode === code) {
          setUserId(sess.userId);
          setName(sess.name);
        }
      } catch {
        router.push("/");
      }
    })();

    return () => {
      alive = false;
    };
  }, [code, router]);

  // Subscribe to match events
  useEffect(() => {
    if (!room) return;

    const ch = supabase
      .channel(`room-${room.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches", filter: `room_id=eq.${room.id}` },
        async (payload) => {
          const m = payload.new as Match;
          const found = foods.find((x) => x.id === m.food_id);
          if (found) setMatchFood(found);
          else {
            const { data } = await supabase.from("foods").select("*").eq("id", m.food_id).single();
            if (data) setMatchFood(data as Food);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [room, foods]);

  async function joinRoom() {
    if (!room) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    const { data, error } = await supabase
      .from("room_users")
      .insert({ room_id: room.id, display_name: trimmed })
      .select("id")
      .single();

    if (error) return;

    setUserId(data.id);
    setSession({ roomCode: code, userId: data.id, name: trimmed });
  }

  async function swipe(direction: "like" | "pass") {
    if (!room || !userId || !current || busy || matchFood) return;

    setBusy(true);
    try {
      // record swipe
      const { error: sErr } = await supabase.from("swipes").insert({
        room_id: room.id,
        user_id: userId,
        food_id: current.id,
        direction,
      });

      // ignore duplicate unique constraint
      if (sErr && !String(sErr.message || "").toLowerCase().includes("duplicate")) throw sErr;

      if (direction === "like") {
        // check other person's like already exists
        const { data: otherLikes, error: oErr } = await supabase
          .from("swipes")
          .select("id")
          .eq("room_id", room.id)
          .eq("food_id", current.id)
          .eq("direction", "like")
          .neq("user_id", userId)
          .limit(1);

        if (oErr) throw oErr;

        if (otherLikes && otherLikes.length > 0) {
          // create match (room_id unique => only first match)
          await supabase.from("matches").insert({ room_id: room.id, food_id: current.id });
          setMatchFood(current);
          return;
        }
      }

      setIdx((i) => (i < foods.length - 1 ? i + 1 : i));
    } finally {
      setBusy(false);
    }
  }

  function exit() {
    clearSession();
    router.push("/");
  }

  if (!room) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="opacity-70">Loading…</div>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm">
          <div className="text-sm opacity-70">Room</div>
          <h1 className="text-2xl font-semibold mt-1">{code}</h1>

          <div className="mt-5">
            <label className="text-sm font-medium">Your name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-xl border px-3 py-3 outline-none"
              placeholder="Jess"
              maxLength={24}
            />
            <button onClick={joinRoom} className="mt-4 w-full rounded-xl bg-black text-white py-3 font-medium">
              Join Room
            </button>
          </div>

          <div className="mt-6 text-xs opacity-70">
            Share this link to your girlfriend:
            <div className="mt-2 flex gap-2">
              <input readOnly value={roomLink} className="w-full rounded-xl border px-3 py-2 text-xs" />
              <button className="rounded-xl border px-3 py-2 text-xs" onClick={() => navigator.clipboard.writeText(roomLink)}>
                Copy
              </button>
            </div>
          </div>

          <button onClick={exit} className="mt-6 w-full rounded-xl border py-3">
            Back
          </button>
        </div>
      </main>
    );
  }

  if (matchFood) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm text-center">
          <div className="text-3xl">🎉</div>
          <h1 className="text-2xl font-semibold mt-2">It’s a match</h1>
          <p className="mt-2 opacity-80">{matchFood.name}</p>
          <button onClick={exit} className="mt-6 w-full rounded-xl border py-3">
            Exit
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs opacity-60">Room</div>
            <div className="font-semibold">{code}</div>
          </div>
          <button onClick={exit} className="text-sm underline opacity-70">
            Exit
          </button>
        </div>

        <div className="rounded-2xl border shadow-sm bg-white overflow-hidden">
          <div className="h-[280px] bg-gray-100 flex items-center justify-center">
            {current?.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.image_url} alt={current.name} className="h-full w-full object-cover" />
            ) : (
              <div className="text-6xl">🍽️</div>
            )}
          </div>
          <div className="p-4">
            <div className="text-xl font-semibold text-black">{current?.name || "No foods found"}</div>
            <div className="text-xs opacity-60 mt-1 text-black">Swipe right to like, left to pass.</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={() => swipe("pass")} className="rounded-xl border py-3 font-medium" disabled={busy || !current}>
            👎 Pass
          </button>
          <button onClick={() => swipe("like")} className="rounded-xl bg-black text-white py-3 font-medium disabled:opacity-50" disabled={busy || !current}>
            👍 Like
          </button>
        </div>

        <div className="mt-4 text-center text-xs opacity-60">
          Card {Math.min(idx + 1, foods.length)} of {foods.length}
        </div>
      </div>
    </main>
  );
}
