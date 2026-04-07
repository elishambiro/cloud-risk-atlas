import { useEffect, useState } from 'react'

interface RiskScoreGaugeProps {
  score: number
}

function getColor(score: number): string {
  if (score >= 80) return '#ef4444'
  if (score >= 60) return '#f97316'
  if (score >= 30) return '#eab308'
  return '#22c55e'
}

function getLabel(score: number): string {
  if (score >= 80) return 'CRITICAL'
  if (score >= 60) return 'HIGH'
  if (score >= 30) return 'MEDIUM'
  if (score > 0) return 'LOW'
  return 'NONE'
}

export default function RiskScoreGauge({ score }: RiskScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100)
    return () => clearTimeout(timer)
  }, [score])

  const radius = 80
  const strokeWidth = 12
  const circumference = Math.PI * radius // half circle
  const progress = (animatedScore / 100) * circumference

  const color = getColor(score)
  const label = getLabel(score)

  // SVG viewBox: center at (100, 100), radius 80
  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 200 110"
        className="w-48 h-28"
        style={{ overflow: 'visible' }}
      >
        {/* Background arc */}
        <path
          d={`M 20,100 A 80,80 0 0,1 180,100`}
          fill="none"
          stroke="#1f2937"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d={`M 20,100 A 80,80 0 0,1 180,100`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          style={{ transition: 'stroke-dasharray 1s ease-in-out' }}
        />
        {/* Score text */}
        <text
          x="100"
          y="85"
          textAnchor="middle"
          fontSize="32"
          fontWeight="700"
          fill="white"
        >
          {Math.round(score)}
        </text>
        <text
          x="100"
          y="108"
          textAnchor="middle"
          fontSize="11"
          fill={color}
          fontWeight="600"
        >
          {label}
        </text>
      </svg>
      <p className="text-xs text-gray-500 mt-1">Global Risk Score</p>
    </div>
  )
}
