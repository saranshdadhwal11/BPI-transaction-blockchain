"use client"
import { motion } from 'framer-motion'
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle } from 'lucide-react'

interface Transaction {
  id: string
  type: 'sent' | 'received'
  amount: number
  recipient?: string
  sender?: string
  time: string
  status: 'completed' | 'pending' | 'failed'
}

interface TransactionListProps {
  transactions: Transaction[]
}

export function TransactionList({ transactions }: TransactionListProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'pending': return <Clock className="w-4 h-4 text-yellow-400" />
      default: return <Clock className="w-4 h-4 text-red-400" />
    }
  }

  const getTransactionIcon = (type: string) => {
    return type === 'sent' 
      ? <ArrowUpRight className="w-5 h-5 text-red-400" />
      : <ArrowDownLeft className="w-5 h-5 text-green-400" />
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <ArrowUpRight className="w-8 h-8 text-gray-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
        <p className="text-gray-400">Your transaction history will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction, index) => (
        <motion.div
          key={transaction.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-gray-700 rounded-lg">
              {getTransactionIcon(transaction.type)}
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">
                  {transaction.type === 'sent' ? 'Sent to' : 'Received from'}
                </p>
                <span className="text-blue-400 text-sm">
                  {transaction.type === 'sent' ? transaction.recipient : transaction.sender}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                {getStatusIcon(transaction.status)}
                <span>{transaction.time}</span>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <p className={`font-bold ${
              transaction.type === 'sent' ? 'text-red-400' : 'text-green-400'
            }`}>
              {transaction.type === 'sent' ? '-' : '+'}₹{transaction.amount.toLocaleString()}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
