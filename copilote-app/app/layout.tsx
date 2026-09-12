import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Copilote automobile",
  description: "Calculateur conversationnel du coût d'import d'un véhicule en France",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f7f7f8" }}>
        {children}
      </body>
    </html>
  );
}
