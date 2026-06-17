import './globals.css'

export const metadata = {
  title: 'LLM Wiki',
  description: 'Personal knowledge base',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        {children}
      </body>
    </html>
  )
}
