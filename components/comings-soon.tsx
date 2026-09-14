"use client";

import { motion, useMotionValue, useSpring, Variants } from "motion/react";
import { useEffect } from "react";
import { useHydrated } from "@/hooks/use-hydrated";

const FEATURES = [
  { label: "Clients", icon: "✦" },
  { label: "Projects", icon: "⚡" },
  { label: "Invoices", icon: "◈" },
  { label: "Proposals", icon: "✧" },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
    },
  },
};

const pillVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    },
  },
};

export default function ComingSoon() {
  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);

  const springConfig = { damping: 25, stiffness: 200 };
  const spotlightX = useSpring(mouseX, springConfig);
  const spotlightY = useSpring(mouseY, springConfig);

  // The spotlight follows the cursor, so it only renders in the browser.
  const mounted = useHydrated();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="bg-background text-foreground selection:bg-primary/20 selection:text-primary relative flex min-h-screen w-full flex-col items-center justify-between overflow-hidden font-sans">
      {/* Background Layer: Grid Pattern */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] mask-[radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] bg-size-[4rem_4rem]"
        aria-hidden="true"
      />

      {/* Background Layer: Ambient Floating Blobs */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <motion.div
          animate={{
            x: [0, 80, -40, 0],
            y: [0, -60, 40, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
          className="bg-primary/10 absolute -top-40 -left-40 h-120 w-120 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, -70, 50, 0],
            y: [0, 80, -50, 0],
            scale: [1, 1.15, 0.95, 1],
          }}
          transition={{
            duration: 28,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
          className="bg-accent/15 absolute top-1/2 -right-40 h-140 w-140 -translate-y-1/2 rounded-full blur-[140px]"
        />
        <motion.div
          animate={{
            x: [0, 50, -50, 0],
            y: [0, 50, -60, 0],
            scale: [1, 1.1, 0.85, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
          className="bg-primary/5 absolute -bottom-40 left-1/3 h-112 w-md rounded-full blur-[130px]"
        />
      </div>

      {/* Background Layer: Static Radial Center Glow */}
      <div
        className="from-primary/10 via-accent/5 pointer-events-none absolute top-1/2 left-1/2 h-180 w-180 -translate-x-1/2 -translate-y-1/2 rounded-full bg-linear-to-tr to-transparent blur-[120px]"
        aria-hidden="true"
      />

      {/* Dynamic Cursor Spotlight */}
      {mounted && (
        <motion.div
          className="pointer-events-none absolute -inset-px z-10 opacity-70 transition-opacity duration-500"
          style={{
            background: `radial-gradient(600px circle at ${spotlightX}px ${spotlightY}px, rgba(255,255,255,0.06), transparent 80%)`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Vignette Overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]"
        aria-hidden="true"
      />

      {/* Noise Overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(#fff_1px,transparent_1px)] bg-size-[16px_16px] opacity-[0.035] mix-blend-overlay"
        aria-hidden="true"
      />

      {/* Header Spacer for Vertical Center */}
      <header className="w-full py-8" />

      {/* Main Content Area */}
      <main className="relative z-30 flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 text-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="group border-border/80 bg-card/60 text-muted-foreground hover:border-border hover:bg-card hover:text-foreground relative inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium shadow-2xl backdrop-blur-xl transition-colors">
              <span className="relative flex h-2 w-2">
                <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
                <span className="bg-primary relative inline-flex h-2 w-2 rounded-full" />
              </span>
              <span className="tracking-wide">Coming Soon</span>
              <span className="text-muted-foreground/50 transition-transform duration-300 group-hover:translate-x-0.5">
                →
              </span>
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={itemVariants}
            className="from-foreground via-foreground/90 to-foreground/50 bg-linear-to-b bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-7xl md:text-8xl lg:text-9xl"
          >
            CLENTRIC
          </motion.h1>

          {/* Subheading */}
          <motion.p
            variants={itemVariants}
            className="text-foreground/90 mt-4 text-xl font-medium tracking-tight sm:text-2xl md:text-3xl"
          >
            The client workspace built for freelancers.
          </motion.p>

          {/* Description */}
          <motion.p
            variants={itemVariants}
            className="text-muted-foreground mt-4 max-w-xl text-base leading-relaxed sm:text-lg"
          >
            Manage your clients, projects, invoices and proposals—all from one
            beautiful workspace.
          </motion.p>

          {/* Feature Pills */}
          <motion.ul
            variants={itemVariants}
            aria-label="Key Features"
            className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
          >
            {FEATURES.map((feature) => (
              <motion.li key={feature.label} variants={pillVariants}>
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="border-border/60 bg-card/40 text-foreground/80 hover:border-border hover:bg-accent/50 hover:text-foreground flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm backdrop-blur-md transition-colors"
                >
                  <span className="text-primary text-xs" aria-hidden="true">
                    {feature.icon}
                  </span>
                  <span>{feature.label}</span>
                </motion.div>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="text-muted-foreground relative z-30 flex w-full flex-col items-center justify-center gap-1.5 py-8 text-xs sm:flex-row sm:gap-3">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
        >
          © 2026 Clentric
        </motion.p>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 1 }}
          className="text-muted-foreground/30 hidden sm:inline"
        >
          •
        </motion.span>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="text-muted-foreground/70"
        >
          Built with care.
        </motion.p>
      </footer>
    </div>
  );
}
