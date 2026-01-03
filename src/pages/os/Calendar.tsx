import CalendarHub from "@/components/admin/CalendarHub";
import SystemHealthCheck from "@/components/admin/SystemHealthCheck";

const OSCalendar = () => {
  return (
    <div className="p-6 space-y-6">
      <SystemHealthCheck />
      <CalendarHub />
    </div>
  );
};

export default OSCalendar;
