import { StudentDashboard } from "@/components/StudentDashboard";
import { ParentDashboardWrapper } from "@/components/ParentDashboardWrapper";
import { AdvisorDashboard } from "@/components/AdvisorDashboard";
import { ProfileCompletionGate } from "@/components/ProfileCompletionGate";
import { redirect } from "next/navigation";

export default function RolePage({ params }: { params: { role: string } }) {
  const getDashboard = () => {
    if (params.role === "student") return <StudentDashboard />;
    if (params.role === "parent") return <ParentDashboardWrapper />;
    if (params.role === "advisor") return <AdvisorDashboard />;
    console.warn(`[RolePage] Unknown role route access attempt: ${params.role}`);
    redirect("/login");
  };

  return (
    <ProfileCompletionGate>
      {getDashboard()}
    </ProfileCompletionGate>
  );
}
