// Frontend development works offline by default. Set VITE_DATA_SOURCE=api for Django.
export const isMockMode = (import.meta.env.VITE_DATA_SOURCE ?? 'mock') === 'mock'
export const userStorageKey = isMockMode ? 'mock:profile:v2' : 'profile:v2'
