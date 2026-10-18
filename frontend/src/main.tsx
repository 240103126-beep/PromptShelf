import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { ApiProvider } from '@/providers/ApiProvider'
import { PreferencesProvider } from '@/providers/PreferencesProvider'
import { ToastProvider } from '@/providers/ToastProvider'
import { RootLayout } from '@/components/layout/RootLayout'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { AppLayout } from '@/components/layout/AppLayout'
import LibraryPage from '@/pages/LibraryPage'
import '@/i18n'
import '@/index.css'

// Placeholder for landing page
const LandingPage = () => (
  <div className="container mx-auto px-4 py-20 text-center">
    <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">PromptShelf</h1>
    <p className="mt-6 text-lg text-muted">Save, organize and export your AI prompts and chats.</p>
  </div>
)

// Placeholder for About page
const AboutPage = () => (
  <div className="container mx-auto max-w-3xl px-4 py-20">
    <h1 className="text-3xl font-bold">About PromptShelf</h1>
    <p className="mt-4 text-muted">A minimalist tool for prompt engineers and AI enthusiasts.</p>
  </div>
)

// Placeholder for other app pages
const PagePlaceholder = ({ title }: { title: string }) => (
  <div className="py-10 text-center">
    <h1 className="text-2xl font-semibold">{title}</h1>
    <p className="mt-2 text-muted">This page is coming soon.</p>
  </div>
)

const NotFound = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
    <h1 className="text-6xl font-bold text-accent">404</h1>
    <p className="mt-4 text-xl">Page not found</p>
  </div>
)

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/', element: <LandingPage />, handle: { titleKey: 'nav.home' } },
          { path: '/about', element: <AboutPage />, handle: { titleKey: 'nav.about' } },
          { path: '*', element: <NotFound /> },
        ],
      },
      {
        path: '/app',
        element: <AppLayout />,
        children: [
          { index: true, element: <LibraryPage />, handle: { titleKey: 'nav.library' } },
          { path: 'new', element: <PagePlaceholder title="New Item" />, handle: { titleKey: 'nav.newItem' } },
          { path: 'items/:id', element: <PagePlaceholder title="Edit Item" /> },
          { path: 'collections', element: <PagePlaceholder title="Collections" />, handle: { titleKey: 'nav.collections' } },
          { path: 'collections/:id', element: <PagePlaceholder title="Collection View" /> },
          { path: 'tags', element: <PagePlaceholder title="Tags" />, handle: { titleKey: 'nav.tags' } },
          { path: 'import', element: <PagePlaceholder title="Import" />, handle: { titleKey: 'nav.import' } },
          { path: 'assistant', element: <PagePlaceholder title="Assistant" />, handle: { titleKey: 'nav.assistant' } },
          { path: 'export', element: <PagePlaceholder title="Export" />, handle: { titleKey: 'nav.export' } },
          { path: 'settings', element: <PagePlaceholder title="Settings" />, handle: { titleKey: 'nav.settings' } },
        ],
      },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApiProvider>
      <PreferencesProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </PreferencesProvider>
    </ApiProvider>
  </React.StrictMode>,
)
