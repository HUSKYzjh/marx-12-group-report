import type { Metadata } from 'next';
import './globals.css';


export const metadata: Metadata = {
  title: '饥馑的盛宴｜序章：厨房内外',
  description: '从面包店出发，观察生产、分配与厨房内外的联系。以章与幕展开的互动故事，教学模型不替代现实证据。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
      </body>
    </html>
  );
}
