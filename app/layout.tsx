import type { Metadata } from "next";
import { Inter, Roboto_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "next-themes";
import { LEGAL } from "@/lib/legal-config";

// Fonts
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});
export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  // Without a metadataBase, the relative `alternates.canonical` values on the
  // public policy pages cannot resolve into absolute URLs.
  metadataBase: new URL(LEGAL.siteUrl),
  title: "Clentric",
  description: "Freelance Workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        robotoMono.variable,
        "font-sans",
        inter.variable,
        spaceGrotesk.variable,
      )}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
