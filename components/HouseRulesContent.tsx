"use client";

type HouseRulesContentProps = {
  role?: "student" | "parent" | "advisor";
};

export function HouseRulesContent({ role = "student" }: HouseRulesContentProps) {
  return (
    <div className="space-y-4 text-sm text-gray-700">
      <div className="rounded-lg bg-blue-50 p-4">
        <h3 className="font-semibold text-blue-900">Welcome to Vectorius</h3>
        <p className="mt-1 text-blue-800">
          Before you get started, please review our community guidelines.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            1
          </div>
          <div>
            <h4 className="font-medium text-gray-900">AI is a Coach, Not a Ghostwriter</h4>
            <p className="mt-0.5 text-gray-600">
              Our AI helps you learn and grow. It guides your thinking, explains concepts,
              and helps you work through problems—but it will not do your work for you.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
            2
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Students Own Their Work</h4>
            <p className="mt-0.5 text-gray-600">
              All assignments, notes, and plans belong to the student. The goal is to build
              your skills and confidence, not to create shortcuts.
            </p>
          </div>
        </div>

        {(role === "parent" || role === "advisor") && (
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700">
              3
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Signal, Not Surveillance</h4>
              <p className="mt-0.5 text-gray-600">
                {role === "parent"
                  ? "As a parent, you'll see important signals like overdue items and upcoming tests—not every detail of your child's work. This helps you support them without micromanaging."
                  : "As an advisor, you guide students toward success. You'll see progress signals and can offer direction, but the student drives their own learning journey."}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            {role === "student" ? "3" : "4"}
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Respect & Integrity</h4>
            <p className="mt-0.5 text-gray-600">
              Use Vectorius honestly and respectfully. Do not share account access,
              misrepresent your work, or use the platform in ways that violate academic integrity.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
        By checking the box below, you agree to follow these guidelines.
        Violations may result in account restrictions.
      </div>
    </div>
  );
}
