export const reportsConfig = {
  timezone: "Africa/Lagos",
  weekly: { enabled: true, dayOfWeek: 1, hour: 7 },
  monthly: { enabled: true, dayOfMonth: 1, hour: 7 },
  recipients: [] as string[],
} as const;
