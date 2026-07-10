import { getCurrentUser } from "@/lib/auth";
import HouseholdPanel from "@/components/HouseholdPanel";

export const metadata = { title: "Household" };

export default async function HouseholdPage() {
  const user = (await getCurrentUser())!;
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head">
        <div>
          <h1>Household</h1>
          <p>Everyone in a household shares one recipe box, meal plan, and grocery list.</p>
        </div>
      </div>
      <HouseholdPanel
        household={{
          name: user.household.name,
          inviteCode: user.household.inviteCode,
          members: user.household.members,
        }}
        currentUserId={user.id}
      />
    </div>
  );
}
