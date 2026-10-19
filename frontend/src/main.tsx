import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { ApiProvider } from '@/providers/ApiProvider'
import { PreferencesProvider } from '@/providers/PreferencesProvider'
import { ToastProvider } from '@/providers/ToastProvider'
import { RootLayout } from '@/components/layout/RootLayout'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { AppLayout } from '@/components/layout/AppLayout'
import LandingPage from '@/pages/LandingPage'
import AboutPage from '@/pages/AboutPage'
import NotFoundPage from '@/pages/NotFoundPage'
import LibraryPage from '@/pages/LibraryPage'
import EditorPage from '@/pages/EditorPage'
import CollectionsPage from '@/pages/CollectionsPage'
import CollectionPage from '@/pages/CollectionPage'
import TagsPage from '@/pages/TagsPage'
import ImportPage from '@/pages/ImportPage'
import AssistantPage from '@/pages/AssistantPage'
import ExportPage from '@/pages/ExportPage'
import SettingsPage from '@/pages/SettingsPage'
import '@/i18n'
import '@/index.css'

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/', element: <LandingPage />, handle: { titleKey: 'nav.home' } },
          { path: '/about', element: <AboutPage />, handle: { titleKey: 'nav.about' } },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        path: '/app',
        element: <AppLayout />,
        children: [
          { index: true, element: <LibraryPage />, handle: { titleKey: 'nav.library' } },
          { path: 'new', element: <EditorPage />, handle: { titleKey: 'nav.newItem' } },
          { path: 'items/:id', element: <EditorPage /> },
          { path: 'collections', element: <CollectionsPage />, handle: { titleKey: 'nav.collections' } },
          { path: 'collections/:id', element: <CollectionPage /> },
          { path: 'tags', element: <TagsPage />, handle: { titleKey: 'nav.tags' } },
          { path: 'import', element: <ImportPage />, handle: { titleKey: 'nav.import' } },
          { path: 'assistant', element: <AssistantPage />, handle: { titleKey: 'nav.assistant' } },
          { path: 'export', element: <ExportPage />, handle: { titleKey: 'nav.export' } },
          { path: 'settings', element: <SettingsPage />, handle: { titleKey: 'nav.settings' } },
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
