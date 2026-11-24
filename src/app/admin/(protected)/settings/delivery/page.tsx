import { Card, PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/forms/settings-form";
import { ZonesManager } from "@/components/forms/zones-manager";
import { listZones } from "@/services/meal-admin.service";
import { getAllSettings } from "@/services/settings.service";
import { toMoneyString } from "@/utils/money";

export const metadata = { title: "Delivery settings" };

export default async function Page() {
  const [settings, zones] = await Promise.all([getAllSettings(), listZones()]);
  return (
    <>
      <PageHeader title="Delivery" subtitle="Fees are always calculated by the server. Changing a fee never alters existing orders." />
      <div className="max-w-3xl space-y-5">
        <SettingsForm settings={settings} fields={[
          { key: "delivery.defaultFee", label: "Default delivery fee", type: "money", hint: "Charged when no delivery areas are set up, or none is selected." },
          { key: "delivery.freeThreshold", label: "Free delivery above (optional)", type: "money", hint: "Orders with a subtotal at or above this amount ship free. Leave blank for no free delivery." },
          { key: "delivery.instructions", label: "Delivery information for customers", type: "textarea" },
        ]} />
        <Card title="Delivery areas"><ZonesManager initial={zones.map((z) => ({ id: z.id, name: z.name, fee: toMoneyString(z.fee), isActive: z.isActive }))} /></Card>
      </div>
    </>
  );
}
