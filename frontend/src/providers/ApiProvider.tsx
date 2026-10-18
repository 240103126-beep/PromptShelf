import { createContext, useContext, type ReactNode } from 'react'
import { api as defaultApi, type ApiClient } from '@/services'

const ApiContext = createContext<ApiClient>(defaultApi)

export function ApiProvider({ client, children }: { client?: ApiClient; children: ReactNode }) {
  return <ApiContext.Provider value={client ?? defaultApi}>{children}</ApiContext.Provider>
}

export const useApi = () => useContext(ApiContext)
