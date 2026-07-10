import { getCurrentUser } from "@/lib/auth";
import SettingsPanel from "@/components/SettingsPanel";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = (await getCurrentUser())!;
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Signed in as {user.email}</p>
        </div>
      </div>
      <SettingsPanel
        initial={{ name: user.name, wetUnits: user.wetUnits, dryUnits: user.dryUnits }}
      />
    </div>
  );
}
