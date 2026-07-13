const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://bpi-43ir.onrender.com/api"

/* =======================
   Response Types
======================= */

export interface AuthResponse {
  data: {
    accessToken: string
    refreshToken: string
  }
}

export interface BalanceResponse {
  data: {
    balance: number
  }
}

export interface Transaction {
  id: string
  createdAt: string
  fromHandle: string
  toHandle: string
  amount: number
  status: "pending" | "completed" | "failed"
  direction: "sent" | "received"
  type?: "request" | "payment"
  expiresAt?: string
}

export interface TransactionsResponse {
  data: {
    transactions: Transaction[]
  }
}

export interface User {
  id: string
  bpiHandle: string
  name: string
  email: string
  bankCode: string
}

export interface MeResponse {
  data: {
    user: User
  }
}

/* =======================
   API Client
======================= */

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    }

    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken")
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      let message = `HTTP ${response.status}`
      try {
        const err = (await response.json()) as { message?: string }
        message = err.message ?? message
      } catch {
        /* ignore */
      }
      throw new Error(message)
    }

    return (await response.json()) as T
  }

  /* ========= AUTH ========= */

  async login(credentials: {
    email: string
    password: string
    rememberMe?: boolean
  }): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    })
  }

  async register(data: {
    name: string
    email: string
    password: string
    bankCode: string
  }): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async getMe(): Promise<MeResponse> {
    return this.request<MeResponse>("/auth/me")
  }

  /* ========= DASHBOARD ========= */

  async getBalance(): Promise<BalanceResponse> {
    return this.request<BalanceResponse>("/payment/balance")
  }

  async getTransactions(params?: {
    limit?: number
    page?: number
    type?: string
    status?: string
  }): Promise<TransactionsResponse> {
    const query = params
      ? new URLSearchParams(
          Object.entries(params).filter(
            ([, v]) => v !== undefined
          ) as [string, string][]
        ).toString()
      : ""

    return this.request<TransactionsResponse>(
      `/payment/transactions${query ? `?${query}` : ""}`
    )
  }

  async sendPayment(data: {
    recipientHandle: string
    amount: number
    memo?: string
  }) {
    return this.request("/payment/send", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async requestPayment(data: {
    fromHandle: string
    amount: number
    memo?: string
    expirationHours?: number
  }) {
    return this.request("/payment/request", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async fulfillRequest(requestId: string) {
    return this.request(`/payment/request/${requestId}/fulfill`, {
      method: "POST",
    })
  }

  async declineRequest(requestId: string) {
    return this.request(`/payment/request/${requestId}/decline`, {
      method: "POST",
    })
  }

  async updateProfile(data: {
    name: string
    email: string
  }) {
    return this.request("/user/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async changePassword(data: {
    currentPassword: string
    newPassword: string
  }) {
    return this.request("/user/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
