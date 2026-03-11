import "./globals.css";
import { Bebas_Neue, Space_Grotesk } from "next/font/google";

const display = Bebas_Neue({
    weight: "400",
    subsets: ["latin"],
    variable: "--font-display",
});

const bodyFont = Space_Grotesk({ subsets: ["latin"] });

export const metadata = {
    title: "Dashboard de Clientes",
    description: "Monitoramento de satisfação e status de clientes",
};

export default function RootLayout({ children }) {
    return (
        <html lang="pt-BR" className="dark">
            <body className={`${display.variable} ${bodyFont.className}`}>{children}</body>
        </html>
    );
}
