import "./globals.css";

export const metadata = {
  title: "Murmur — Nature Speaks",
  description:
    "Point your camera at any plant, tree, bird, or insect and hear it tell its story in first person.",
  manifest: "/manifest.json",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0c0a09",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body className="min-h-dvh bg-stone-950 text-stone-200 antialiased">
        {children}
      </body>
    </html>
  );
}
