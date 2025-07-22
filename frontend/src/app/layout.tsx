// src/app/layout.tsx (نسخه نهایی و کامل)

import { ReactNode } from "react";
import { Open_Sans } from "next/font/google";
import { GoogleAnalytics } from '@next/third-parties/google'

// PROVIDERهای اصلی برنامه شما
import CartProvider from "contexts/CartContext";
import SettingsProvider from "contexts/SettingContext";

// ---> راه حل جدید برای مشکل استایل <---
import ThemeRegistry from "theme/ThemeRegistry";

export const openSans = Open_Sans({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={openSans.className}>
        {/* Provider های اصلی در بالاترین سطح باقی می‌مانند */}
        <CartProvider>
          <SettingsProvider>
            {/* ThemeRegistry جایگزین ThemeProvider قبلی شده و مشکل را حل می‌کند */}
            <ThemeRegistry>
              {children}
            </ThemeRegistry>
          </SettingsProvider>
        </CartProvider>
        
        <GoogleAnalytics gaId="G-XKPD36JXY0" />
      </body>
    </html>
  );
}