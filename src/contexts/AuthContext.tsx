'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
    id: string
    name: string
    email: string
    role: string
    tenantId: string
    phone?: string
    studentId?: string
}

interface Tenant {
    id: string
    name: string
    logo?: string
    themeColor: string
    phone?: string
    email?: string
    address?: string
    schoolCode?: string
    registrationCode?: string
    diseCode?: string
    directorSign?: string
}

interface Subscription {
    plan: string
    status: string
    trialEndsAt?: string
    amount?: number
}

interface AuthContextType {
    user: User | null
    tenant: Tenant | null
    subscription: Subscription | null
    token: string | null
    login: (email: string, password: string, role?: string, tenantId?: string) => Promise<{ success: boolean; error?: string }>
    logout: () => void
    handleUnauthorized: () => void
    isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [tenant, setTenant] = useState<Tenant | null>(null)
    const [subscription, setSubscription] = useState<Subscription | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Auth keys (starkids_)
        const storedToken = localStorage.getItem('starkids_token') || localStorage.getItem('starkids_token')
        const storedUser = localStorage.getItem('starkids_user') || localStorage.getItem('starkids_user')
        const storedTenant = localStorage.getItem('starkids_tenant') || localStorage.getItem('starkids_tenant')
        const storedSub = localStorage.getItem('starkids_subscription') || localStorage.getItem('starkids_subscription')

        if (storedToken && storedUser) {
            setToken(storedToken)
            setUser(JSON.parse(storedUser))
            if (storedTenant) setTenant(JSON.parse(storedTenant))
            if (storedSub) setSubscription(JSON.parse(storedSub))
        }
        setIsLoading(false)
    }, [])

    const login = async (email: string, password: string, role?: string, tenantId?: string) => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role, tenantId }),
            })
            const data = await res.json()

            if (!data.success) {
                return { success: false, error: data.error || 'Login failed' }
            }

            setToken(data.accessToken)
            setUser(data.user)
            setTenant(data.tenant)
            setSubscription(data.subscription)

            localStorage.setItem('starkids_token', data.accessToken)
            localStorage.setItem('starkids_user', JSON.stringify(data.user))
            localStorage.setItem('starkids_tenant', JSON.stringify(data.tenant))
            localStorage.setItem('starkids_subscription', JSON.stringify(data.subscription))
            localStorage.setItem('starkids_refresh', data.refreshToken)

            return { success: true }
        } catch {
            return { success: false, error: 'Network error' }
        }
    }

    const logout = () => {
        setUser(null)
        setTenant(null)
        setSubscription(null)
        setToken(null)
        // Clear both new and legacy keys
        localStorage.removeItem('starkids_token')
        localStorage.removeItem('starkids_user')
        localStorage.removeItem('starkids_tenant')
        localStorage.removeItem('starkids_subscription')
        localStorage.removeItem('starkids_refresh')
        localStorage.removeItem('starkids_token')
        localStorage.removeItem('starkids_user')
        localStorage.removeItem('starkids_tenant')
        localStorage.removeItem('starkids_subscription')
        localStorage.removeItem('starkids_refresh')
        window.location.href = '/login'
    }

    // Call this when any API returns 401 — clears stale token and redirects to login
    const handleUnauthorized = () => {
        setUser(null)
        setTenant(null)
        setSubscription(null)
        setToken(null)
        localStorage.removeItem('starkids_token')
        localStorage.removeItem('starkids_user')
        localStorage.removeItem('starkids_tenant')
        localStorage.removeItem('starkids_subscription')
        localStorage.removeItem('starkids_refresh')
        localStorage.removeItem('starkids_token')
        localStorage.removeItem('starkids_user')
        localStorage.removeItem('starkids_tenant')
        localStorage.removeItem('starkids_subscription')
        localStorage.removeItem('starkids_refresh')
        window.location.href = '/login'
    }

    return (
        <AuthContext.Provider value={{ user, tenant, subscription, token, login, logout, handleUnauthorized, isLoading }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}

export function useApi() {
    const { token } = useAuth()

    const fetcher = async (url: string, options?: RequestInit) => {
        const res = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...options?.headers,
            },
        })
        return res.json()
    }

    return { fetcher }
}
