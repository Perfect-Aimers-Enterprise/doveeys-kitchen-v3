// Non-secret business defaults. Owner edits in the dashboard override these.
export const businessConfig = {
  currency: "NGN",
  delivery: { defaultFee: "0.00", freeThreshold: null as string | null, instructions: "" },
  owner: { name: "", bio: "" },
  about: "",
  address: "",
  operatingHours: [] as { day: string; open: string; close: string }[],
  social: { instagram: "", facebook: "", x: "", tiktok: "", whatsapp: "" },
  timezone: "Africa/Lagos",
} as const;
