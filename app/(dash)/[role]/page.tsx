import { StudentDashboard } from "@/components/StudentDashboard";
import { ParentDashboard } from "@/components/ParentDashboard";
import { AdvisorDashboard } from "@/components/AdvisorDashboard";
import type { Role } from "app/lib/domain";

export default function RolePage({ params }: { params: { role: Role } }) {
  if (params.role === "student") return <StudentDashboard />;
  if (params.role === "parent")
    return (
      <ParentDashboard
        email="preview@vectorius.edu"
        students={[]}
        selectedStudentId={null}
        onSelectStudent={() => {}}
        firstName=""
        lastName=""
        grade=""
        onFirstNameChange={() => {}}
        onLastNameChange={() => {}}
        onGradeChange={() => {}}
        onAddStudent={(event) => event.preventDefault()}
        isSaving={false}
        deletingStudentId={null}
        formError={null}
        loadError={null}
        deleteStatus={null}
        onDeleteStudent={() => {}}
      />
    );
  if (params.role === "advisor") return <AdvisorDashboard />;
  return <StudentDashboard />;
}
