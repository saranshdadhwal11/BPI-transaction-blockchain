"use client"
import { motion } from 'framer-motion'

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <motion.div
      whileHover={{ y: -10 }}
      className="glass-card rounded-2xl p-8 text-center group hover:bg-white/15 transition-all duration-300"
    >
      <div className="text-blue-400 mb-6 flex justify-center">
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-4">{title}</h3>
      <p className="text-gray-300 leading-relaxed">{description}</p>
    </motion.div>
  )
}
