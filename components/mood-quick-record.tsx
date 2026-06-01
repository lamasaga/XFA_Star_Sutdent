"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const MOOD_OPTIONS = [
  { value: 1, label: "很低落", emoji: "😢", color: "bg-red-50 text-red-600 border-red-200" },
  { value: 2, label: "有些低落", emoji: "😕", color: "bg-orange-50 text-orange-600 border-orange-200" },
  { value: 3, label: "一般", emoji: "😐", color: "bg-slate-50 text-slate-600 border-slate-200" },
  { value: 4, label: "不错", emoji: "🙂", color: "bg-blue-50 text-blue-600 border-blue-200" },
  { value: 5, label: "非常好", emoji: "😄", color: "bg-green-50 text-green-600 border-green-200" },
];

export function MoodQuickRecord({ onRecorded }: { onRecorded?: () => void }) {
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function saveMood() {
    if (rating === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, note: note.trim() || undefined }),
      });
      if (res.ok) {
        setRating(0);
        setNote("");
        setMessage({ type: "success", text: "心情记录成功！" });
        setTimeout(() => setMessage(null), 2000);
        onRecorded?.();
      } else {
        setMessage({ type: "error", text: "记录失败，请重试" });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch {
      setMessage({ type: "error", text: "记录失败，请重试" });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2">
        {MOOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setRating(opt.value)}
            className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
              rating === opt.value
                ? opt.color + " ring-2 ring-offset-1"
                : "bg-white border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span className="text-2xl">{opt.emoji}</span>
            <span className="text-[11px]">{opt.label}</span>
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="写下今天的心情..."
        className="w-full text-[13px] px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/20 min-h-[80px] resize-y"
      />
      <Button
        onClick={saveMood}
        disabled={rating === 0 || saving}
        className="bg-[#4a90d9] hover:bg-[#357abd]"
      >
        {saving ? "保存中..." : "记录心情"}
      </Button>
      {message && (
        <p className={`text-[12px] ${message.type === "success" ? "text-green-600" : "text-red-500"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
