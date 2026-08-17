import { getCurrentUser } from "@/lib/auth";
import { groceryItems } from "@/lib/repo";
import GroceryList from "@/components/GroceryList";
import type { System } from "@/lib/units";

export const metadata = { title: "Groceries" };

export default async function GroceriesPage() {
  const user = (await getCurrentUser())!;
  const items = await groceryItems.forHousehold(user.householdId);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head">
        <div>
          <h1>Groceries</h1>
          <p>One shared list for {user.household.name}. Check off what you already have.</p>
        </div>
      </div>
      <GroceryList
        items={items.map((i) => ({
          id: i.id,
          name: i.name,
          amount: i.amount,
          unit: i.unit,
          kind: i.kind,
          checked: Boolean(i.checked),
          note: i.note,
        }))}
        prefs={{ wet: user.wetUnits as System, dry: user.dryUnits as System }}
      />
    </div>
  );
}
