import './globals.css';

export const metadata = {
  title: 'Shri Harivansh — Devotional Reader',
  description: 'Read Shri Hit Chaurasi Ji and other sacred Vaishnav texts. A serene, verse-by-verse reader with audio and progress tracking.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
