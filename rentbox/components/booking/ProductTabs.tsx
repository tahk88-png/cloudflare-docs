'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Tab {
  id: string
  label: string
  content: React.ReactNode
}

interface ProductTabsProps {
  description: string
  specs?: Record<string, string>
  included?: string[]
  rules?: string[]
}

export function ProductTabs({ description, specs, included, rules }: ProductTabsProps) {
  const tabs: Tab[] = [
    {
      id: 'description',
      label: 'Kirjeldus',
      content: (
        <div className="prose prose-invert prose-sm max-w-none">
          <p className="text-neutral-300 whitespace-pre-line">{description}</p>
        </div>
      ),
    },
    specs && {
      id: 'specs',
      label: 'Tehnilised andmed',
      content: (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(specs).map(([key, value]) => (
            <div key={key}>
              <dt className="text-sm text-neutral-500 mb-1">{key}</dt>
              <dd className="text-neutral-300">{value}</dd>
            </div>
          ))}
        </dl>
      ),
    },
    included && {
      id: 'included',
      label: 'Mis komplektis',
      content: (
        <ul className="space-y-2">
          {included.map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-neutral-300">
              <span className="text-accent mt-1">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ),
    },
    rules && {
      id: 'rules',
      label: 'Reeglid',
      content: (
        <ul className="space-y-2">
          {rules.map((rule, index) => (
            <li key={index} className="flex items-start gap-2 text-neutral-300">
              <span className="text-neutral-500 mt-1">•</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      ),
    },
  ].filter(Boolean) as Tab[]

  const [activeTab, setActiveTab] = useState(tabs[0].id)

  return (
    <div className="space-y-4">
      {/* Tab Headers */}
      <div className="flex gap-2 border-b border-neutral-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-accent text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <Card className="bg-neutral-900/50 border-neutral-800 p-6">
        {tabs.find((tab) => tab.id === activeTab)?.content}
      </Card>
    </div>
  )
}
