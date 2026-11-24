import { PageHeader } from "@/components/admin/ui";
import { SettingsForm, type SettingField } from "@/components/forms/settings-form";
import { getAllSettings } from "@/services/settings.service";

export const metadata = { title: "Business settings" };

const FIELDS: SettingField[] = [
  { key: "brand.name", label: "Brand name", type: "text" },
  { key: "brand.slogan", label: "Slogan", type: "text", hint: "Shown under the homepage headline." },
  { key: "brand.description", label: "Brand description", type: "textarea", hint: "Used as the site description in search results. Keep it under 160 characters." },
  { key: "brand.logoUrl", label: "Logo link", type: "text", hint: "Full https:// link to your logo image." },
  { key: "site.announcement", label: "Website announcement", type: "text", hint: "Short notice for customers, for example holiday opening times." },
  { key: "business.about", label: "About your kitchen", type: "textarea", hint: "Shown on the Our Story page." },
  { key: "business.ownerName", label: "Owner name", type: "text" },
  { key: "business.ownerBio", label: "Owner biography", type: "textarea", hint: "Only write what is true; this is shown publicly." },
  { key: "contact.email", label: "Contact email", type: "text" },
  { key: "contact.phone", label: "Contact phone", type: "text" },
  { key: "contact.whatsapp", label: "WhatsApp number", type: "text", hint: "International format, for example +2348012345678." },
  { key: "business.address", label: "Business address", type: "textarea" },
  { key: "business.hours", label: "Operating hours", type: "hours" },
  { key: "social.instagram", label: "Instagram link", type: "text" },
  { key: "social.facebook", label: "Facebook link", type: "text" },
  { key: "social.x", label: "X (Twitter) link", type: "text" },
  { key: "social.tiktok", label: "TikTok link", type: "text" },
  { key: "footer.text", label: "Footer text", type: "text" },
  { key: "theme.default", label: "Default theme", type: "select", options: [{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "system", label: "Follow device" }] },
];

export default async function Page() {
  return (<><PageHeader title="Business & brand" subtitle="This information appears across the website." /><SettingsForm fields={FIELDS} settings={await getAllSettings()} /></>);
}
