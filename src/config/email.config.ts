export const emailConfig = {
  // Recipients for new-order notifications. Env value may be comma-separated.
  defaultNotificationRecipients: (process.env.DEFAULT_ADMIN_EMAIL ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean),
  maxAttempts: 3,
} as const;
