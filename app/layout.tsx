import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TechSpace AI ? News to Shorts',
  description: 'Autonomous tech and space news curator and Shorts script generator',
  metadataBase: new URL('https://agentic-828a8ed2.vercel.app')
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container">
            <h1>TechSpace AI</h1>
            <p className="tag">Latest tech & space news ? YouTube Shorts</p>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          <div className="container">
            <p>Built for creators. Sources: Google News.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
