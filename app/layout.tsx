import type { Metadata } from "next";
import { Inter, Roboto_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "next-themes";

// Fonts
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-mono",
});
export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "Clentri",
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
      <body className="min-h-full flex flex-col">
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
