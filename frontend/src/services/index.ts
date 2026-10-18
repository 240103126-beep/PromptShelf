import type { ApiClient } from './api'
import { createHttpApi } from './httpApi'
import { createMockApi } from './mockApi'

export function selectApi(env: { VITE_USE_MOCK?: string; VITE_API_URL?: string; MODE?: string }): ApiClient {
  const useMock = env.VITE_USE_MOCK === undefined ? true : env.VITE_USE_MOCK !== 'false'
  if (useMock) return createMockApi({ latency: env.MODE === 'test' ? 0 : 350 })
  return createHttpApi(env.VITE_API_URL ?? '/api')
}

export const api: ApiClient = selectApi(import.meta.env)

export type { ApiClient } from './api'
export { ApiError } from './api'
