import { brandConfig } from "@/config";

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function layout(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#FAF9F5;font-family:Manrope,Arial,sans-serif;color:#22251F">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" style="max-width:560px;background:#FFFFFF;border:1px solid #E6E3D9">
<tr><td style="padding:28px 32px;border-bottom:1px solid #E6E3D9;font-family:'Cormorant Garamond',Georgia,serif;font-size:24px;color:#173F29;letter-spacing:.04em">${esc(brandConfig.name)}</td></tr>
<tr><td style="padding:32px"><h1 style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:600;color:#173F29">${esc(title)}</h1>${bodyHtml}</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #E6E3D9;font-size:12px;color:#77776F">${esc(brandConfig.name)}</td></tr>
</table></td></tr></table></body></html>`;
}

export const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${esc(href)}" style="background:#245C37;color:#FFFFFF;text-decoration:none;padding:12px 24px;display:inline-block;font-size:14px">${esc(label)}</a></p>`;

export function passwordResetEmail(link: string) {
  return {
    subject: "Reset your administrator password",
    html: layout("Reset your password", `<p style="line-height:1.6">Use the button below to choose a new password. The link works once and expires in 60 minutes.</p>${button(link, "Choose a new password")}<p style="font-size:13px;color:#77776F;line-height:1.6">If you did not ask for this, ignore this email. Your password stays the same.</p>`),
    text: `Choose a new password (link works once, expires in 60 minutes):\n${link}\n\nIf you did not ask for this, ignore this email.`,
  };
}
