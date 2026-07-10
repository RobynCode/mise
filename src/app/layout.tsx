import type { Metadata } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/public-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Mise — plan, cook, share", template: "%s · Mise" },
  description: "A household recipe box, meal planner, and grocery list.",
};

const themeScript = `
(function () {
  try {
    var saved = localStorage.getItem("mise-theme");
    var theme = saved === "light" || saved === "dark"
      ? saved
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
