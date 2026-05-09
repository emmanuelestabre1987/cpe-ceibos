import React from 'react'

const STEP_LABELS = ['General', 'Comercial', 'Flete', 'Transporte', 'Pesaje', 'Cierre']

interface WizardProgressProps {
  currentStep: number
  totalSteps?: number
}

export default function WizardProgress({ currentStep, totalSteps = 6 }: WizardProgressProps) {
  const pct = ((currentStep - 1) / (totalSteps - 1)) * 100

  return (
    <div className="fixed top-14 left-0 right-0 z-30 bg-primary px-4 pt-2 pb-3">
      <div className="flex justify-between mb-2">
        {STEP_LABELS.map((label, i) => (
          <span
            key={label}
            className={`text-xs font-mono font-semibold transition-colors ${
              i + 1 === currentStep
                ? 'text-white'
                : i + 1 < currentStep
                  ? 'text-secondary'
                  : 'text-white/35'
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
