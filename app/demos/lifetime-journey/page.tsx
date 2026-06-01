"use client";

import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  AreaChart, Area,
} from "recharts";
import {
  fullStudent, transferStudent, dimensionFactors, transferMechanism,
  type StudentProfile, type SemesterData,
} from "@/lib/journey-data";
import { cn } from "@/lib/utils";

const DIMENSION_COLORS: Record<string, string> = {
  学业: "#dc2626",
  心理: "#0891b2",
  职业: "#9333ea",
  社交: "#ca8a04",
  特长: "#16a34a",
};

const DIMENSION_LIGHT: Record<string, string> = {
  学业: "#fee2e2",
  心理: "#cffafe",
  职业: "#f3e8ff",
  社交: "#fef9c3",
  特长: "#dcfce7",
};

function DimensionBadge({ score }: { score: number }) {
  if (score >= 80) return <span className="text-[11px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">优秀</span>;
  if (score >= 65) return <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">良好</span>;
  if (score >= 50) return <span className="text-[11px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium">一般</span>;
  return <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">需关注</span>;
}

function SemesterTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload as SemesterData;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[180px]">
      <p className="text-sm font-bold text-[#1a3a5c] mb-2">{label}</p>
      <p className="text-xs text-slate-400 mb-2">基础分保底: {data.baseScore}</p>
      {(["学业", "心理", "职业", "社交", "特长"] as const).map((dim) => {
        const score = data.dimensions[dim];
        const growth = data.growthScores[dim];
        return (
          <div key={dim} className="flex items-center justify-between gap-3 py-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DIMENSION_COLORS[dim] }} />
              <span className="text-xs text-slate-600">{dim}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">{score}</span>
              <span className="text-[10px] text-slate-400">(成长{growth})</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EventTimeline({ student }: { student: StudentProfile }) {
  return (
    <div className="relative">
      {/* 时间轴线 */}
      <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-slate-200" />
      <div className="space-y-3">
        {student.events.map((event, i) => {
          const semester = student.semesters.find(s => s.id === event.semesterId);
          return (
            <div key={i} className="flex gap-3 relative">
              <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-lg shrink-0 z-10">
                {event.icon}
              </div>
              <div className="flex-1 bg-white border border-slate-100 rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-slate-400">{semester?.label}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {event.type === "milestone" ? "里程碑" : event.type === "activity" ? "活动" : event.type === "assessment" ? "测评" : event.type === "behavior" ? "行为" : "系统"}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-[#1a3a5c]">{event.title}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{event.description}</p>
                <p className="text-xs text-slate-400 mt-1.5 bg-slate-50 rounded px-2 py-1">
                  📊 影响: {event.impact}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RadarSnapshot({ semester, label, story }: { semester: SemesterData; label: string; story: string }) {
  const data = [
    { dimension: "学业", score: semester.dimensions.学业 },
    { dimension: "心理", score: semester.dimensions.心理 },
    { dimension: "职业", score: semester.dimensions.职业 },
    { dimension: "社交", score: semester.dimensions.社交 },
    { dimension: "特长", score: semester.dimensions.特长 },
  ];
  return (
    <div className="bg-white border border-slate-100 rounded-lg p-3 shadow-sm">
      <p className="text-xs font-bold text-[#1a3a5c] text-center mb-1">{label}</p>
      <p className="text-[10px] text-slate-400 text-center mb-2 line-clamp-2 h-7">{story}</p>
      <ResponsiveContainer width="100%" height={160}>
        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: "#64748b" }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: "#94a3b8" }} tickCount={5} />
          <Radar dataKey="score" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} strokeWidth={1.5} />
        </RadarChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-2 mt-1">
        {data.map(d => (
          <span key={d.dimension} className="text-[9px]" style={{ color: DIMENSION_COLORS[d.dimension] }}>
            {d.dimension}{d.score}
          </span>
        ))}
      </div>
    </div>
  );
}

function DimensionCard({ factor }: { factor: typeof dimensionFactors[0] }) {
  return (
    <div className="bg-white border border-slate-100 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{factor.icon}</span>
        <h3 className="text-sm font-bold" style={{ color: factor.color }}>{factor.dimension}维度</h3>
      </div>
      <div className="space-y-2 mb-3">
        {factor.factors.map((f, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-slate-600">{f.name}</span>
            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-[10px]">{f.weight}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 pt-2 space-y-1">
        <p className="text-[10px] font-medium text-slate-500 mb-1">行为影响:</p>
        {factor.behaviors.map((b, i) => (
          <p key={i} className="text-[10px] text-slate-500 leading-relaxed">{b}</p>
        ))}
      </div>
    </div>
  );
}

export default function LifetimeJourneyPage() {
  const [activeStudent, setActiveStudent] = useState<"full" | "transfer">("full");
  const [activeDimension, setActiveDimension] = useState<string | null>(null);

  const student = activeStudent === "full" ? fullStudent : transferStudent;

  const chartData = useMemo(() => {
    return student.semesters.map((s) => ({
      ...s,
      name: s.label,
    }));
  }, [student]);

  const growthChartData = useMemo(() => {
    return student.semesters.map((s) => ({
      name: s.label,
      baseScore: s.baseScore,
      学业: s.growthScores.学业,
      心理: s.growthScores.心理,
      职业: s.growthScores.职业,
      社交: s.growthScores.社交,
      特长: s.growthScores.特长,
    }));
  }, [student]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-[#1a3a5c] text-white py-8">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-2xl font-bold mb-2">🎯 学生生涯发展全景图</h1>
          <p className="text-sm text-blue-200">
            基于"基础分保底增长 + 成长分真实表现"双轨模型，展示学生从入学到毕业的五维发展轨迹
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Student Switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveStudent("full")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeStudent === "full"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:border-blue-300"
            )}
          >
            <span className="text-lg">👧</span>
            <div className="text-left">
              <div className="font-bold">林小满</div>
              <div className="text-[10px] opacity-80">K1→K11 完整发展</div>
            </div>
          </button>
          <button
            onClick={() => setActiveStudent("transfer")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeStudent === "transfer"
                ? "bg-red-600 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:border-red-300"
            )}
          >
            <span className="text-lg">👦</span>
            <div className="text-left">
              <div className="font-bold">张新航</div>
              <div className="text-[10px] opacity-80">K8 插班 → 快速融入</div>
            </div>
          </button>
        </div>

        {/* Student Profile Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="text-4xl">{student.avatar}</div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-[#1a3a5c]">{student.name}</h2>
              <p className="text-sm text-slate-500 mt-1">{student.description}</p>
              <div className="flex flex-wrap gap-3 mt-3">
                <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">
                  入学: {student.enrollment}
                </span>
                <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">
                  共 {student.semesters.length} 个学期
                </span>
                {student.type === "transfer" && (
                  <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-medium">
                    🛡️ 插班生观察期机制
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Five Dimension Trend Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#1a3a5c]">📈 五维发展趋势</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {student.type === "full"
                  ? "从 K1 到 K11，五维随学业阶段、行为事件、里程碑波动发展"
                  : "从 K8 插班到 K11，观察期加速 + 新手保护帮助快速融入"}
              </p>
            </div>
            {/* Dimension toggle */}
            <div className="flex gap-1">
              {(["学业", "心理", "职业", "社交", "特长"] as const).map((dim) => (
                <button
                  key={dim}
                  onClick={() => setActiveDimension(activeDimension === dim ? null : dim)}
                  className={cn(
                    "text-[10px] px-2 py-1 rounded-full border transition-all",
                    activeDimension === dim
                      ? "text-white border-transparent"
                      : "text-slate-500 border-slate-200 hover:border-slate-300"
                  )}
                  style={{
                    backgroundColor: activeDimension === dim ? DIMENSION_COLORS[dim] : "transparent",
                  }}
                >
                  {dim}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip content={<SemesterTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {(["学业", "心理", "职业", "社交", "特长"] as const).map((dim) => (
                <Line
                  key={dim}
                  type="monotone"
                  dataKey={`dimensions.${dim}`}
                  name={dim}
                  stroke={DIMENSION_COLORS[dim]}
                  strokeWidth={activeDimension === dim ? 3 : activeDimension ? 1 : 2}
                  strokeOpacity={activeDimension && activeDimension !== dim ? 0.2 : 1}
                  dot={{ r: activeDimension === dim ? 4 : 3, strokeWidth: 1.5, fill: "#fff" }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>

          {/* Annotation for transfer student */}
          {student.type === "transfer" && (
            <div className="mt-3 flex items-center gap-4 text-xs bg-red-50 rounded-lg p-3">
              <span className="text-red-600 font-medium">🛡️ 观察期 (K8秋 - K9春)</span>
              <span className="text-slate-500">基础分加速: 40 → 45 → 50 → 53.5 (+5/学期)</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-500">新手保护: 各维度成长分保底</span>
            </div>
          )}
        </div>

        {/* Base Score vs Growth Score */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-base font-bold text-[#1a3a5c] mb-1">🔍 基础分与成长分拆解</h3>
          <p className="text-xs text-slate-400 mb-4">
            蓝色区域 = 基础分（保底增长，只要在校就会涨） | 彩色线 = 成长分（真实表现，有波动）
            {student.type === "transfer" && " | 观察期基础分加速: +5/学期（普通生 +3.5）"}
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Base Score Area */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2 text-center">基础分（保底）</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis domain={[0, 70]} tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Tooltip formatter={(v: any) => [`${v}分`, "基础分"]} />
                  <Area type="monotone" dataKey="baseScore" name="基础分" stroke="#64748b" fill="#e2e8f0" strokeWidth={2} />
                  {student.type === "transfer" && (
                    <Area type="monotone" dataKey="baseScore" name="普通生基准" stroke="#94a3b8" strokeDasharray="4 4" fill="transparent" strokeWidth={1.5} />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Growth Score Lines */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2 text-center">成长分（真实表现）</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={growthChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis domain={[0, 45]} tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {(["学业", "心理", "职业", "社交", "特长"] as const).map((dim) => (
                    <Line
                      key={dim}
                      type="monotone"
                      dataKey={dim}
                      name={dim}
                      stroke={DIMENSION_COLORS[dim]}
                      strokeWidth={1.5}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Key Snapshots */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-base font-bold text-[#1a3a5c] mb-4">
            🎯 关键学期雷达图对比
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {student.keySnapshots.map((snap) => {
              const semester = student.semesters.find(s => s.id === snap.semesterId);
              if (!semester) return null;
              return (
                <RadarSnapshot
                  key={snap.semesterId}
                  semester={semester}
                  label={snap.label}
                  story={snap.story}
                />
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["学业", "心理", "职业", "社交", "特长"] as const).map((dim) => (
              <div key={dim} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DIMENSION_COLORS[dim] }} />
                <span className="text-[10px] text-slate-500">{dim}</span>
              </div>
            ))}
            <span className="text-[10px] text-slate-400 ml-2">满分 100 = 基础分60 + 成长分40</span>
          </div>
        </div>

        {/* Two Column Layout: Timeline + Factors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Event Timeline */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-[#1a3a5c] mb-4">
              📍 生涯事件时间线
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              里程碑、活动、测评、行为如何影响五维波动
            </p>
            <EventTimeline student={student} />
          </div>

          {/* Dimension Factors */}
          <div>
            <h3 className="text-base font-bold text-[#1a3a5c] mb-4">
              🎛️ 五维影响因素
            </h3>
            <div className="space-y-3">
              {dimensionFactors.map((factor) => (
                <DimensionCard key={factor.dimension} factor={factor} />
              ))}
            </div>
          </div>
        </div>

        {/* Transfer Student Special Section */}
        {student.type === "transfer" && (
          <div className="bg-white border border-red-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-red-700 mb-1">
              🎒 插班生快速融入机制详解
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              张新航的故事：从 K8 插班到 K11，系统如何通过 6 大机制帮助他快速融入
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {transferMechanism.map((mech, i) => (
                <div key={i} className="bg-red-50 border border-red-100 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{mech.icon}</span>
                    <h4 className="text-sm font-bold text-red-800">{mech.title}</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{mech.description}</p>
                  <p className="text-[10px] text-red-600 mt-2 bg-white rounded px-2 py-1">
                    💡 {mech.example}
                  </p>
                </div>
              ))}
            </div>

            {/* Compare with full student */}
            <div className="mt-5 border-t border-red-100 pt-4">
              <h4 className="text-sm font-bold text-[#1a3a5c] mb-3">📊 插班生 vs 完整学生 — 同年级对比</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-2 font-medium text-slate-500">对比项</th>
                      <th className="text-center py-2 px-2 font-medium text-blue-700">林小满 (完整生)</th>
                      <th className="text-center py-2 px-2 font-medium text-red-700">张新航 (插班生)</th>
                      <th className="text-left py-2 px-2 font-medium text-slate-500">差异说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 px-2 text-slate-600">K9 秋基础分</td>
                      <td className="text-center py-2 px-2">60（已封顶）</td>
                      <td className="text-center py-2 px-2 font-bold text-red-600">50（追赶中）</td>
                      <td className="py-2 px-2 text-slate-400">插班生晚入学 8 学期，但观察期加速缩小差距</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 px-2 text-slate-600">K9 秋显示分(学业)</td>
                      <td className="text-center py-2 px-2">88</td>
                      <td className="text-center py-2 px-2 font-bold text-red-600">74</td>
                      <td className="py-2 px-2 text-slate-400">插班生学业适应期，但成长分24已接近在校生水平</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 px-2 text-slate-600">K10 春显示分(学业)</td>
                      <td className="text-center py-2 px-2">84</td>
                      <td className="text-center py-2 px-2 font-bold text-red-600">90</td>
                      <td className="py-2 px-2 text-slate-400">🎉 插班生已超越！成长分30 {'>'} 在校生24</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 px-2 text-slate-600">K11 春五维均值</td>
                      <td className="text-center py-2 px-2">94.6</td>
                      <td className="text-center py-2 px-2 font-bold text-red-600">93.5</td>
                      <td className="py-2 px-2 text-slate-400">差距仅 1.1 分，插班生完全融入</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2 text-slate-600">毕业成果</td>
                      <td className="text-center py-2 px-2">全额奖学金录取</td>
                      <td className="text-center py-2 px-2 font-bold text-red-600">体育特长生认定</td>
                      <td className="py-2 px-2 text-slate-400">不同的闪光点，同样的成功</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Full Student: How milestones & activities shape the journey */}
        {student.type === "full" && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-[#1a3a5c] mb-1">
              🗺️ 生涯图示：里程碑与活动如何构成成长路径
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              林小满的 K1→K11：从懵懂新生到全面发展的成长轨迹
            </p>

            <div className="relative overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Timeline bars */}
                <div className="flex items-center gap-1 mb-4">
                  {student.semesters.map((s, i) => {
                    const events = student.events.filter(e => e.semesterId === s.id);
                    const hasEvent = events.length > 0;
                    return (
                      <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className={cn(
                            "w-full h-8 rounded flex items-center justify-center text-[9px] font-bold transition-all",
                            hasEvent ? "ring-2 ring-offset-1" : ""
                          )}
                          style={{
                            backgroundColor: hasEvent ? DIMENSION_LIGHT[events[0].dimension] || "#f1f5f9" : "#f1f5f9",
                            ...(hasEvent ? { "--tw-ring-color": DIMENSION_COLORS[events[0].dimension] } : {}),
                          } as React.CSSProperties}
                        >
                          {s.dimensions.学业 >= 85 ? "🏆" : s.dimensions.心理 <= 75 ? "😔" : "·"}
                        </div>
                        <span className="text-[8px] text-slate-400 whitespace-nowrap">{s.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Phase labels */}
                <div className="flex text-[10px] text-slate-500 mb-6">
                  <div className="flex-[4] text-center border-t-2 border-blue-200 pt-1">
                    🎨 兴趣探索期 (K1-K3)<br />
                    <span className="text-slate-400">特长萌芽，心理无忧无虑</span>
                  </div>
                  <div className="flex-[4] text-center border-t-2 border-green-200 pt-1">
                    📚 学业奠基期 (K4-K6)<br />
                    <span className="text-slate-400">竞赛突破，社交巅峰</span>
                  </div>
                  <div className="flex-[4] text-center border-t-2 border-yellow-200 pt-1">
                    🔄 青春波动期 (K7-K8)<br />
                    <span className="text-slate-400">适应困难，心理低谷</span>
                  </div>
                  <div className="flex-[6] text-center border-t-2 border-purple-200 pt-1">
                    🚀 全面腾飞期 (K9-K11)<br />
                    <span className="text-slate-400">方向明确，五维齐飞</span>
                  </div>
                </div>

                {/* Dimension curves summary */}
                <div className="grid grid-cols-5 gap-2">
                  {(["学业", "心理", "职业", "社交", "特长"] as const).map((dim) => {
                    const start = student.semesters[0].dimensions[dim];
                    const end = student.semesters[student.semesters.length - 1].dimensions[dim];
                    const min = Math.min(...student.semesters.map(s => s.dimensions[dim]));
                    const max = Math.max(...student.semesters.map(s => s.dimensions[dim]));
                    const trend = end > start ? "↗️" : end < start ? "↘️" : "→";
                    return (
                      <div key={dim} className="text-center p-2 rounded-lg border" style={{ borderColor: DIMENSION_COLORS[dim] + "30", backgroundColor: DIMENSION_LIGHT[dim] }}>
                        <div className="text-lg mb-1" style={{ color: DIMENSION_COLORS[dim] }}>{dim}</div>
                        <div className="text-xs font-bold" style={{ color: DIMENSION_COLORS[dim] }}>
                          {start} {trend} {end}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-1">
                          最低{min} · 最高{max}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-6 text-xs text-slate-400">
          <p>新府学「一生一案」平台 · 五维雷达图数学算法演示</p>
          <p className="mt-1">基于"基础分保底增长 + 成长分真实表现"双轨模型</p>
        </div>
      </div>
    </div>
  );
}
