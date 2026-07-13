"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ArrowDownLeft, User, ArrowRight } from "lucide-react"
import { apiClient } from "@/lib/api"

interface RequestMoneyModalProps {
  isOpen: boolean
  onClose: () => void
}

export function RequestMoneyModal({
  isOpen,
  onClose,
}: RequestMoneyModalProps) {
  const [step, setStep] = useState<number>(1)
  const [fromUser, setFromUser] = useState<string>("")
  const [amount, setAmount] = useState<string>("")
  const [memo, setMemo] = useState<string>("")
  const [expirationHours, setExpirationHours] = useState<string>("24")
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const quickAmounts = [1000, 2500, 5000, 10000]

  const handleRequest = async () => {
    setIsLoading(true)
    try {
      await apiClient.requestPayment({
        fromHandle: fromUser,
        amount: Number(amount),
        memo: memo || undefined,
        expirationHours: Number(expirationHours),
      })
      alert("Payment request sent successfully!")
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to send payment request"
      alert(message)
    } finally {
      setIsLoading(false)
      handleClose()
    }
  }

  const handleClose = () => {
    setStep(1)
    setFromUser("")
    setAmount("")
    setMemo("")
    setIsLoading(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card rounded-2xl p-6 w-full max-w-md"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Request Money</h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Request from (BPI ID)
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={fromUser}
                      onChange={(e) => setFromUser(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                      placeholder="username@bank"
                    />
                  </div>
                </div>

                <button
                  onClick={() => setStep(2)}
                  disabled={!fromUser}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-400">Requesting from</p>
                  <p className="font-semibold">{fromUser}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none text-2xl font-semibold text-center"
                    placeholder="0"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {quickAmounts.map((quickAmount) => (
                    <button
                      key={quickAmount}
                      onClick={() => setAmount(quickAmount.toString())}
                      className="py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
                    >
                      ₹{quickAmount.toLocaleString()}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    What&apos;s this for? (Optional)
                  </label>
                  <input
                    type="text"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="Dinner, movie tickets, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Expiration (hours)
                  </label>
                  <select
                    value={expirationHours}
                    onChange={(e) => setExpirationHours(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="1">1 hour</option>
                    <option value="6">6 hours</option>
                    <option value="12">12 hours</option>
                    <option value="24">24 hours</option>
                    <option value="48">48 hours</option>
                    <option value="72">72 hours</option>
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 border border-gray-600 rounded-lg font-semibold"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleRequest}
                    disabled={!amount || isLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Requesting...
                      </>
                    ) : (
                      <>
                        <ArrowDownLeft className="w-4 h-4" />
                        Request ₹{amount || "0"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
