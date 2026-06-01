"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Bell, Shield, Save, CheckCircle } from "lucide-react";

interface NotificationPref {
  id: string;
  label: string;
  defaultChecked: boolean;
}

const NOTIFICATION_PREFS: NotificationPref[] = [
  { id: "new_comment", label: "教师新评语通知", defaultChecked: true },
  { id: "milestone_review", label: "里程碑审核结果通知", defaultChecked: true },
  { id: "weekly_report", label: "每周成长简报通知", defaultChecked: true },
  { id: "system_announcement", label: "系统公告通知", defaultChecked: true },
];

const PRIVACY_PREFS: NotificationPref[] = [
  { id: "show_radar_to_classmates", label: "允许同学查看我的五维雷达（脱敏）", defaultChecked: false },
  { id: "show_milestones_to_classmates", label: "允许同学查看我的里程碑", defaultChecked: false },
  { id: "show_comments_to_parents", label: "允许家长查看我的评语", defaultChecked: true },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [student, setStudent] = useState<{
    name: string;
    studentNo: string;
    email: string;
    className?: string;
  } | null>(null);

  const [notifications, setNotifications] = useState<Record<string, boolean>>({});
  const [privacy, setPrivacy] = useState<Record<string, boolean>>({});
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      // 获取学生基本信息
      const res = await fetch("/api/students/me");
      if (res.ok) {
        const data = await res.json();
        const s = data.student;
        setStudent({
          name: s.name,
          studentNo: s.studentNo || "",
          email: s.user?.email || "",
          className: s.class ? `${s.class.grade?.name} · ${s.class.name}` : undefined,
        });
        setEmail(s.user?.email || "");
      }

      // 初始化通知和隐私设置
      const notifInit: Record<string, boolean> = {};
      NOTIFICATION_PREFS.forEach((p) => {
        notifInit[p.id] = p.defaultChecked;
      });
      setNotifications(notifInit);

      const privacyInit: Record<string, boolean> = {};
      PRIVACY_PREFS.forEach((p) => {
        privacyInit[p.id] = p.defaultChecked;
      });
      setPrivacy(privacyInit);
    } catch (error) {
      console.error("获取设置失败:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      // 这里应该调用 API 保存设置
      // 模拟保存延迟
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-pulse space-y-4 w-full max-w-md">
          <div className="h-8 bg-gray-100 rounded w-1/3" />
          <div className="h-40 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* 标题 */}
      <div>
        <h1 className="text-lg font-bold text-[#1a3a5c]">个人设置</h1>
        <p className="text-sm text-slate-400 mt-0.5">账号、通知与隐私偏好</p>
      </div>

      {/* 账号信息 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px] text-[#1a3a5c] flex items-center gap-2">
            <User className="w-4 h-4" />
            账号信息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-slate-500">姓名</Label>
              <Input value={student?.name || ""} disabled className="bg-slate-50 text-slate-500" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-slate-500">学号</Label>
              <Input value={student?.studentNo || ""} disabled className="bg-slate-50 text-slate-500" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] text-slate-500">班级</Label>
            <Input
              value={student?.className || "未分配班级"}
              disabled
              className="bg-slate-50 text-slate-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] text-slate-500">邮箱</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="请输入邮箱"
            />
          </div>
          <Button variant="outline" size="sm" className="text-[12px]">
            修改密码
          </Button>
        </CardContent>
      </Card>

      {/* 通知偏好 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px] text-[#1a3a5c] flex items-center gap-2">
            <Bell className="w-4 h-4" />
            通知偏好
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {NOTIFICATION_PREFS.map((pref) => (
            <div key={pref.id} className="flex items-start gap-3 py-2">
              <Checkbox
                id={pref.id}
                checked={notifications[pref.id] ?? pref.defaultChecked}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, [pref.id]: checked as boolean }))
                }
              />
              <Label htmlFor={pref.id} className="text-[13px] text-[#1a3a5c] cursor-pointer leading-relaxed">
                {pref.label}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 隐私设置 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px] text-[#1a3a5c] flex items-center gap-2">
            <Shield className="w-4 h-4" />
            隐私设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {PRIVACY_PREFS.map((pref) => (
            <div key={pref.id} className="flex items-start gap-3 py-2">
              <Checkbox
                id={pref.id}
                checked={privacy[pref.id] ?? pref.defaultChecked}
                onCheckedChange={(checked) =>
                  setPrivacy((prev) => ({ ...prev, [pref.id]: checked as boolean }))
                }
              />
              <Label htmlFor={pref.id} className="text-[13px] text-[#1a3a5c] cursor-pointer leading-relaxed">
                {pref.label}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#4a90d9] hover:bg-[#357abd]"
        >
          {saving ? (
            "保存中..."
          ) : saved ? (
            <>
              <CheckCircle className="w-4 h-4 mr-1" />
              保存成功
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-1" />
              保存设置
            </>
          )}
        </Button>
        {saved && (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">已保存</Badge>
        )}
      </div>
    </div>
  );
}
