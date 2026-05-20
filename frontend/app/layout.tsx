import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mike Bills Predict — Premium Football Predictions",
  description:
    "Expert football predictions with guaranteed odds. Unlock premium betting slips with 2+, 5+, 10+ odds. Mike Bills Predict — bet smarter.",
  keywords:
    "football predictions, betting tips, soccer predictions, betting odds, premium tips, Mike Bills Predict",
  openGraph: {
    title: "Mike Bills Predict — Premium Football Predictions",
    description: "Expert football predictions with guaranteed odds.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#080c14" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
