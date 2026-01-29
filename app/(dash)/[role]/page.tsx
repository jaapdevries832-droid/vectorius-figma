import { StudentDashboard } from "@/components/StudentDashboard";
import { ParentDashboardWrapper } from "@/components/ParentDashboardWrapper";
import { AdvisorDashboard } from "@/components/AdvisorDashboard";
import { ProfileCompletionGate } from "@/components/ProfileCompletionGate";
import type { Role } from "app/lib/domain";

export default function RolePage({ params }: { params: { role: Role } }) {
  const getDashboard = () => {
    if (params.role === "student") return <StudentDashboard />;
    if (params.role === "parent") return <ParentDashboardWrapper />;
    if (params.role === "advisor") return <AdvisorDashboard />;
    return <StudentDashboard />;
  };

  return (
    <ProfileCompletionGate>
      {getDashboard()}
    </ProfileCompletionGate>
  );
}
