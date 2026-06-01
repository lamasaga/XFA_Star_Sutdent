"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Database, Shield, Key, Bell, Palette } from "lucide-react";

const SETTINGS_ITEMS = [
  {
    icon: <Database className="h-5 w-5 text-blue-500" />,
    title: "数据库配置",
    description: "DATABASE_URL、连接池等数据库参数",
    status: "只读" as const,
  },
  {
    icon: <Shield className="h-5 w-5 text-green-500" />,
    title: "认证配置",
    description: "NEXTAUTH_SECRET、会话有效期等",
    status: "只读" as const,
  },
  {
    icon: <Key className="h-5 w-5 text-purple-500" />,
    title: "AI 服务",
    description: "DeepSeek API Key 配置与用量监控",
    status: "开发中" as const,
  },
  {
    icon: <Bell className="h-5 w-5 text-orange-500" />,
    title: "通知设置",
    description: "邮件通知、预警提醒规则",
    status: "开发中" as const,
  },
  {
    icon: <Palette className="h-5 w-5 text-pink-500" />,
    title: "界面主题",
    description: "系统配色、Logo、品牌设置",
    status: "开发中" as const,
  },
];

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">系统设置</h1>
        <p className="text-muted-foreground">平台全局配置与管理</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            平台配置
          </CardTitle>
          <CardDescription>
            系统核心参数配置（部分需通过环境变量修改）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {SETTINGS_ITEMS.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                {item.icon}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{item.title}</h3>
                    <Badge variant={item.status === "只读" ? "secondary" : "outline"} className="text-xs">
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
