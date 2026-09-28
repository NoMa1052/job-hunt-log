import { createContext, useContext } from 'react'

// The signed-in Supabase user, for display only (email, initials).
export const UserContext = createContext(null)
export const useUser = () => useContext(UserContext)
