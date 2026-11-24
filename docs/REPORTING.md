# Reports

Weekly (Monday to Sunday) and monthly (calendar month) PDF reports in the reporting timezone (default Africa/Lagos).
**Contents**: financial summary (gross paid revenue, refunds, net revenue, average order value, successful payments, delivered, cancelled, pending), revenue by normal and special meals, best sellers, litre distribution, status distribution, daily trend chart, branded header, footer and page numbers. Only verified paid orders count; refunds recorded on orders are subtracted.
**Scheduling**: Vercel Cron calls `/api/cron/reports` daily; it sends the weekly report on the chosen weekday and the monthly on the chosen day (1-28). **Idempotent**: `ReportLog(kind, periodStart)` is unique, so retries and double triggers send once; failed sends can be retried; "Send again" forces a resend.
**Manual**: Reports page (download last weekly/monthly or any custom range; email now).
**Notes**: PDFs use built-in fonts, so amounts show the currency code (for example `NGN 12,000.00`) because those fonts lack the naira sign. Recipients: `reports.recipients`, else `notify.recipients`.
