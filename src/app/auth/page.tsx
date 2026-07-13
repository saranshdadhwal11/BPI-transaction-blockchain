"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Eye, EyeOff, ArrowLeft, Building2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState<boolean>(true)
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [selectedBank, setSelectedBank] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")

  const router = useRouter()

  const banks = [
    { code: "ALPHA", name: "DemoBank Alpha", color: "from-blue-500 to-blue-600" },
    { code: "BETA", name: "DemoBank Beta", color: "from-purple-500 to-purple-600" },
  ]

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const email = String(formData.get("email") ?? "")
    const password = String(formData.get("password") ?? "")

    try {
      if (isLogin) {
        // 🔑 login() is strongly typed → no guards needed
        const response = await apiClient.login({ email, password })

        localStorage.setItem("accessToken", response.data.accessToken)
        localStorage.setItem("refreshToken", response.data.refreshToken)
        router.push("/dashboard")
      } else {
        const name = String(formData.get("name") ?? "")

        const response = await apiClient.register({
          name,
          email,
          password,
          bankCode: selectedBank,
        })

        localStorage.setItem("accessToken", response.data.accessToken)
        localStorage.setItem("refreshToken", response.data.refreshToken)
        router.push("/dashboard")
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="glass-card rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">B</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-gray-400">
              {isLogin
                ? "Sign in to your BPI account"
                : "Join the future of payments"}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <AnimatePresence>
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6"
              >
                <label className="block text-sm font-medium mb-3">
                  Select Bank
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {banks.map((bank) => (
                    <motion.button
                      key={bank.code}
                      type="button"
                      onClick={() => setSelectedBank(bank.code)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedBank === bank.code
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-gray-600 hover:border-gray-500"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 bg-gradient-to-r ${bank.color} rounded-lg flex items-center justify-center`}
                        >
                          <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-left">
                          <div className="font-semibold">{bank.name}</div>
                          <div className="text-sm text-gray-400">
                            Code: {bank.code}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                name="email"
                type="email"
                required
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full px-4 py-3 pr-12 bg-gray-800/50 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading || (!isLogin && !selectedBank)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 py-3 rounded-lg font-semibold"
            >
              {isLoading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
            </motion.button>
          </form>

          <div className="text-center mt-6 text-gray-400">
            {isLogin ? "Don&apos;t have an account?" : "Already have an account?"}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 text-blue-400 font-semibold"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
