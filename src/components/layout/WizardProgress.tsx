import React from 'react'

const STEP_LABELS = ['Transporte', 'Intervinientes', 'Grano', 'Procedencia', 'Contingencias', 'Descarga', 'Resumen']

interface WizardProgressProps {
  currentStep: number
  totalSteps?: number
}

export default function WizardProgress({ currentStep, totalSteps = 7 }: WizardProgressProps) {
  const pct = ((currentStep - 1) / (totalSteps - 1)) * 100
  const currentLabel = STEP_LABELS[currentStep - 1] ?? ''

  return (
    <div className="fixed top-14 left-0 right-0 z-30 bg-primary px-4 pt-2 pb-3">

      {/* Step counter + current label */}
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xs font-mono font-semibold text-white">
          {currentLabel}
        </span>
        <span className="text-xs font-mono text-white/50">
          {currentStep} / {totalSteps}
        </span>
      </div>

      {/* Progress bar with step dots */}
      <div className="relative h-1.5 bg-white/20 rounded-full overflow-visible">
        <div
          className="h-full bg-secondary rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
        {STEP_LABELS.map((_, i) => {
          const dotPct = (i / (totalSteps - 1)) * 100
          const done    = i + 1 < currentStep
          const active  = i + 1 === currentStep
          return (
            <span
              key={i}
              className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border transition-all duration-300 ${
                active ? 'bg-white border-white scale-125' :
                done   ? 'bg-secondary border-secondary' :
                         'bg-white/20 border-white/20'
              }`}
              style={{ left: `calc(${dotPct}% - 4px)` }}
            />
          )
        })}
      </div>
    </div>
  )
}
