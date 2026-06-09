'use client'

import { useState } from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { PageHeader } from '@/components/shared/page-header'
import { SegmentedControl } from '@/components/shared/segmented-control'
import { CampanhasTab } from './components/campanhas-tab'
import { ChatbotTab } from './components/chatbot-tab'
import { DisparosTab } from './components/disparos-tab'

type Tab = 'disparos' | 'campanhas' | 'chatbot'

export function DisparosView() {
  const [activeTab, setActiveTab] = useState<Tab>('disparos')

  return (
    <div className="app-page pb-10">
      <PageHeader
        title="Comunicação"
        description="Disparos automáticos e campanhas via WhatsApp."
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Início</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/comunicacao">Comunicação</BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />

      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 scrollbar-hide">
        <SegmentedControl
          options={[
            { value: 'disparos', label: 'Disparos' },
            { value: 'campanhas', label: 'Campanhas' },
            { value: 'chatbot', label: 'Chatbot' },
          ]}
          value={activeTab}
          onChange={(value) => setActiveTab(value as Tab)}
        />
      </div>

      {activeTab === 'disparos' && <DisparosTab />}
      {activeTab === 'campanhas' && <CampanhasTab />}
      {activeTab === 'chatbot' && <ChatbotTab />}
    </div>
  )
}
