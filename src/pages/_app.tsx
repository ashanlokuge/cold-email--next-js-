import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '../lib/auth'
import Head from 'next/head'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Head>
        <title>Best Cold Email App |coldsendz | Email campaign manager</title>
        <meta name="description" content="Cold email campaign manager | coldsendz" />
        <link rel="icon" href="/favicon-coldsendz.png" />
      </Head>
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#374151',
            color: '#fff',
          },
          success: {
            style: {
              background: '#059669',
            },
          },
          error: {
            style: {
              background: '#dc2626',
            },
          },
        }}
      />
    </AuthProvider>
  )
}