import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import CalendarApp from "@/components/CalendarApp";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <CalendarApp userEmail={session.email} />;
}
