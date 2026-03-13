import { CalendarView } from "@/components/calendar/calendar-view";
import { requireUser } from "@/lib/auth/session";
import { getCalendarCards } from "@/lib/data/dashboard";

export default async function CalendarPage() {
  const user = await requireUser();
  const cards = await getCalendarCards(user.id);

  return <CalendarView cards={cards} />;
}
