import { StrictMode } from 'react'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'

const queryClient = new QueryClient()

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <h1>Hello, world!</h1>
    </QueryClientProvider>
  </StrictMode>,
)