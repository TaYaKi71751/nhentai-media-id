import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "nhentai Media ID",
  description: "Extract a media ID from an nhentai gallery URL."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
