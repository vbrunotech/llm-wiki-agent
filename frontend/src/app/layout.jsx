import './globals.css'
import { ThemeProvider } from '../components/ThemeProvider'

export const metadata = {
  title: 'LLM Wiki',
  description: 'Personal knowledge base',
}

const themeScript = `(function(){var t=localStorage.getItem('theme');var d=t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')})()`

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="h-full">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
