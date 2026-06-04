import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { HeroUIProvider } from '@heroui/react'
import { GoogleOAuthProvider } from '@react-oauth/google'

import * as TanStackQueryProvider from './integrations/tanstack-query/root-provider.tsx'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

import './styles.css'
import reportWebVitals from './reportWebVitals.ts'
import { ConfirmationRoot } from './components/templates/confirmation-root.tsx'
import { RouterPendingComponent } from './components/templates/pending.tsx'

// Side-effect imports: applying persisted theme/background to <html> on first paint.
import './lib/stores/theme.store.ts'
import './lib/stores/background.store.ts'

// Create a new router instance

const TanStackQueryProviderContext = TanStackQueryProvider.getContext()
const router = createRouter({
  routeTree,
  context: {
    ...TanStackQueryProviderContext,
  },
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
  defaultPendingComponent: RouterPendingComponent,
  defaultPendingMs: 300,
  defaultPendingMinMs: 200,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.getElementById('app')
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

if (rootElement && !rootElement.innerHTML) {
  console.log('App Initialization - Google Client ID:', GOOGLE_CLIENT_ID ? 'Present' : 'Missing')
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <TanStackQueryProvider.Provider {...TanStackQueryProviderContext}>
          <HeroUIProvider>
            <ConfirmationRoot />
            <RouterProvider router={router} />
          </HeroUIProvider>
        </TanStackQueryProvider.Provider>
      </GoogleOAuthProvider>
    </StrictMode>,
  )
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
