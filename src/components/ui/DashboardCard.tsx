

"use client"
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface DashboardCardProps {
  title: string
  value: string
  change: string
  icon: React.ReactNode
  trend: 'up' | 'down' | 'neutral'
}

export function DashboardCard({ title, value, change, icon, trend }: DashboardCardProps) {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-400'
      case 'down': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4" />
      case 'down': return <TrendingDown className="w-4 h-4" />
      default: return <Minus className="w-4 h-4" />
    }
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="glass-card rounded-xl p-6"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400">
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
          {getTrendIcon()}
          {change}
        </div>
      </div>
      
      <div>
        <h3 className="text-2xl font-bold mb-1">{value}</h3>
        <p className="text-gray-400 text-sm">{title}</p>
      </div>
    </motion.div>
  )
}
