import path from "node:path";
import { Font } from "@react-pdf/renderer";

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const file = (name: string) => path.join(FONT_DIR, name);

export const pdfFonts = {
  sans: "Inter",
  mono: "Roboto Mono",
  display: "Space Grotesk",
} as const;

Font.register({
  family: pdfFonts.sans,
  fonts: [
    { src: file("Inter-Regular.ttf"), fontWeight: 400 },
    { src: file("Inter-SemiBold.ttf"), fontWeight: 600 },
    { src: file("Inter-Bold.ttf"), fontWeight: 700 },
  ],
});

Font.register({
  family: pdfFonts.mono,
  fonts: [
    { src: file("RobotoMono-Regular.ttf"), fontWeight: 400 },
    { src: file("RobotoMono-SemiBold.ttf"), fontWeight: 600 },
  ],
});

Font.register({
  family: pdfFonts.display,
  fonts: [
    { src: file("SpaceGrotesk-SemiBold.ttf"), fontWeight: 600 },
    { src: file("SpaceGrotesk-Bold.ttf"), fontWeight: 700 },
  ],
});

// react-pdf hyphenates long words by default. On an invoice that splits
// emails, IBANs and product names mid-word — wrap whole words instead.
Font.registerHyphenationCallback((word) => [word]);
