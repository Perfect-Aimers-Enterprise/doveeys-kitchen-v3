import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

export function emailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_FROM_EMAIL);
}

export function getTransporter() {
  if (!emailConfigured()) throw new Error("SMTP is not configured");
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  return transporter;
}

export const fromAddress = () => ({ name: process.env.SMTP_FROM_NAME || "DOVEEYS KITCHEN", address: process.env.SMTP_FROM_EMAIL! });
