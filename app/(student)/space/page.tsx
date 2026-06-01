import { redirect } from "next/navigation";

// 旧 /space 路由重定向到 /mood
export default function SpaceRedirectPage() {
  redirect("/mood");
}
