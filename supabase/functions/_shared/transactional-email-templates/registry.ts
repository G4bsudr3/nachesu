/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as futureLetterDelivery } from './future-letter-delivery.tsx'
import { template as evasionNudge } from './evasion-nudge.tsx'
import { template as adminDirectMessage } from './admin-direct-message.tsx'
import { template as tutorSafetyAlert } from './tutor-safety-alert.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'future-letter-delivery': futureLetterDelivery,
  'evasion-nudge': evasionNudge,
  'admin-direct-message': adminDirectMessage,
  'tutor-safety-alert': tutorSafetyAlert,
}
