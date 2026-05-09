import React from 'react'

const STEP_LABELS = ['General', 'Comercial', 'Flete', 'Transporte', 'Pesaje', 'Cierre']

interface WizardProgressProps {
  currentStep: number
  totalSteps?: number
}

export default function WizardProgress({ currentStep, totalSteps = 6 }: WizardProgressProps) {
  const pct = ((currentStep - 1) / (totalSteps - 1)) * 100

  return (
    <div className="fixed top-14 left-0 right-0 z-30 bg-primary px-4 pb-3">
      <div className="flex justify-between mb-1">
        {STEP_LABELS.map((label, i) => (
          <span
            key={label}
            className={`text-[10px] font-mono font-medium transition-colors ${
              i + 1 <= currentStep ? 'text-secondary' : 'text-white/40'
            }`}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-secondary rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
