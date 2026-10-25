import { CircleCheck, CloudLightning, CloudSun, OctagonAlert, Sun, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { CashStatus } from '@/lib/forecast/types'

export const STATUS_STYLE: Record<
  CashStatus,
  { icon: LucideIcon; weatherIcon: LucideIcon; text: string; soft: string; fill: string; stroke: string; labelKey: `status.${CashStatus}`; descKey: `status.${CashStatus}Desc` }
> = {
  safe: {
    icon: CircleCheck,
    weatherIcon: Sun,
    text: 'text-safe',
    soft: 'bg-safe-soft',
    fill: 'bg-safe',
    stroke: 'stroke-safe',
    labelKey: 'status.safe',
    descKey: 'status.safeDesc',
  },
  near: {
    icon: TriangleAlert,
    weatherIcon: CloudSun,
    text: 'text-near',
    soft: 'bg-near-soft',
    fill: 'bg-near',
    stroke: 'stroke-near',
    labelKey: 'status.near',
    descKey: 'status.nearDesc',
  },
  below: {
    icon: OctagonAlert,
    weatherIcon: CloudLightning,
    text: 'text-below',
    soft: 'bg-below-soft',
    fill: 'bg-below',
    stroke: 'stroke-below',
    labelKey: 'status.below',
    descKey: 'status.belowDesc',
  },
}
