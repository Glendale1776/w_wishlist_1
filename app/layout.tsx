import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wish List",
  description: "Surprise-safe wishlist owner flows"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-shell text-ink antialiased">{children}</body>
    </html>
  );
}
