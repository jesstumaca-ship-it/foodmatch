"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { nanoid } from "nanoid";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function createRoom() {
    setLoading(true);
    try {
      const code = nanoid(6).toUpperCase();
      const { data, error } = await supabase
        .from("rooms")
        .insert({ code })
        .select("code")
        .single();

      if (error) throw error;
      router.push(`/r/${data.code}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">FoodMatch</h1>
        <p className="mt-2 text-sm opacity-80">
          Create a room, share the link, swipe until you both like the same food.
        </p>

        <button
          onClick={createRoom}
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-black text-white py-3 font-medium disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create a Room"}
        </button>
      </div>
    </main>
  );
}
