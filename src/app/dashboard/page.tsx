import { redirect } from "next/navigation";
import { requireUser, roleHomePath } from "@/lib/auth";

export default async function DashboardRedirectPage() {
  const session = await requireUser();

  redirect(roleHomePath(session.user.role));
}
