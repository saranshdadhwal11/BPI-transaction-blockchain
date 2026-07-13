"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { CreditCard, DollarSign, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiClient, Transaction as ApiTransaction } from "@/lib/api"
import { SendMoneyModal } from "@/components/ui/SendMoneyModal"
import { RequestMoneyModal } from "@/components/ui/RequestMoneyModal"
import { TransactionList } from "@/components/ui/TransactionList"

/* =======================
   Types
======================= */

interface User {
  id: string
  bpiHandle: string
}

/* =======================
   Page
======================= */

export default function DashboardPage() {
  const [showSendMoneyModal, setShowSendMoneyModal] = useState(false)
  const [showRequestMoneyModal, setShowRequestMoneyModal] = useState(false)

  const [balance, setBalance] = useState<number>(0)
  const [transactions, setTransactions] = useState<ApiTransaction[]>([])
  const [user, setUser] = useState<User | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [balanceRes, txRes, userRes] = await Promise.all([
          apiClient.getBalance(),
          apiClient.getTransactions({ limit: 10 }),
          apiClient.getMe(),
        ])

        setBalance(balanceRes.data.balance)
        setTransactions(txRes.data.transactions)
        setUser(userRes.data.user)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard")
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const refreshData = async () => {
    const [balanceRes, txRes] = await Promise.all([
      apiClient.getBalance(),
      apiClient.getTransactions({ limit: 10 }),
    ])
    setBalance(balanceRes.data.balance)
    setTransactions(txRes.data.transactions)
  }

  const handleSendMoney = async (amount: number, recipient: string) => {
    await apiClient.sendPayment({
      recipientHandle: recipient,
      amount,
      memo: "Payment via dashboard",
    })
    await refreshData()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">Dashboard</h1>
          {user && (
            <p className="text-muted-foreground text-sm mt-1">
              BPI Handle: <span className="text-blue-400 font-medium">{user.bpiHandle}</span>
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowRequestMoneyModal(true)}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Request Money
          </Button>
          <Button onClick={() => setShowSendMoneyModal(true)}>
            <CreditCard className="mr-2 h-4 w-4" />
            Send Money
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{balance.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionList transactions={transactions.map(tx => ({
            id: tx.id,
            type: tx.direction,
            amount: tx.amount,
            recipient: tx.toHandle,
            sender: tx.fromHandle,
            time: new Date(tx.createdAt).toLocaleString(),
            status: tx.status,
          }))} />
        </CardContent>
      </Card>

      {/* Modals */}
      <SendMoneyModal
        isOpen={showSendMoneyModal}
        onClose={() => setShowSendMoneyModal(false)}
        userBalance={balance}
        onSend={handleSendMoney}
      />

      <RequestMoneyModal
        isOpen={showRequestMoneyModal}
        onClose={() => setShowRequestMoneyModal(false)}
      />
    </motion.div>
  )
}
