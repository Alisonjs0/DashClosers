import "./globals.css";
import { Bebas_Neue, Space_Grotesk } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { DashboardProvider } from "@/lib/contexts/DashboardContext";

const display = Bebas_Neue({
    weight: "400",
    subsets: ["latin"],
    variable: "--font-display",
});

const bodyFont = Space_Grotesk({ subsets: ["latin"] });

export const metadata = {
    title: "Dash Closers | Premium Dashboard",
    description: "Monitoramento de alta performance para SDRs e Closers",
};

export default function RootLayout({ children }) {
    return (
        <html lang="pt-BR" className="dark">
            <body className={`${display.variable} ${bodyFont.className} bg-[#020617] antialiased`}>
                <DashboardProvider>
                    <div className="flex min-h-screen">
                        <Sidebar />
                        {children}
                    </div>
                </DashboardProvider>
            </body>
        </html>
    );
}
