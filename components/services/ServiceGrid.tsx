import { ServiceCard } from './ServiceCard'
import type { ServiceWithTasks } from '@/lib/types'

interface ServiceGridProps {
  services: ServiceWithTasks[]
  onNewService?: () => void  // placeholder — wired in Phase 4
}

export function ServiceGrid({ services, onNewService }: ServiceGridProps) {
  if (services.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl border py-20 text-center"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
      >
        <p className="text-sm font-medium" style={{ color: '#0F172A' }}>No active services</p>
        <p className="mt-1 text-sm" style={{ color: '#475569' }}>
          Create your first service to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {services.map(service => (
        <ServiceCard key={service.id} service={service} />
      ))}
    </div>
  )
}
