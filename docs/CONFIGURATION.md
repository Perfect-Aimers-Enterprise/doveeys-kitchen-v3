# Configuration

Defaults live in `src/config/*.config.ts`. Owner changes are saved in `SiteSetting` and win; clearing a value (Reset to default) deletes the override. Secrets are never in config or public APIs.

| Key | Meaning | Default source |
|---|---|---|
| delivery.defaultFee / freeThreshold / instructions | Delivery pricing | business.config |
| business.currency, address, about, ownerName, ownerBio, hours | Business profile | business.config |
| brand.name / slogan / description / logoUrl | Brand | brand.config |
| site.announcement, footer.text, theme.default | Site | site/footer/theme.config |
| contact.email / phone / whatsapp | Contact | contact.config |
| social.instagram / facebook / x / tiktok | Social links | business.config |
| notify.recipients | New-order email recipients | `DEFAULT_ADMIN_EMAIL` |
| reports.timezone / recipients / weeklyEnabled / monthlyEnabled / weeklyDay / monthlyDay | Reports | reports.config |

FAQs live in the `Faq` table (any number, reorderable); `faq.config` is the fallback. The developer credit is in `developer.config.ts`.
Public values are exposed through `GET /api/public/config` (whitelisted).
