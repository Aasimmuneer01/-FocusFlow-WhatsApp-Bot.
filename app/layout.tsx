import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'FocusFlow WhatsApp Support Bot & Webhook Backend',
  description: 'Production-ready Meta WhatsApp Cloud API backend with Gemini AI support agent, webhook verification, message status tracking, issue ticketing, and Vercel deployment templates.',
  openGraph: {
    title: 'FocusFlow WhatsApp Support Bot & Webhook Backend',
    description: 'Production-ready Meta WhatsApp Cloud API backend with Gemini AI support agent, webhook verification, message status tracking, issue ticketing, and Vercel deployment templates.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FocusFlow WhatsApp Support Bot & Webhook Backend',
    description: 'Production-ready Meta WhatsApp Cloud API backend with Gemini AI support agent, webhook verification, message status tracking, issue ticketing, and Vercel deployment templates.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
