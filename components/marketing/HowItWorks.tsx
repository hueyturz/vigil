const STEPS = [
  {
    n: '1',
    title: 'Create a service',
    body: 'Add the family name, service type, and date. Vigilight automatically generates the task checklist based on the service type.',
  },
  {
    n: '2',
    title: 'Assign and track',
    body: 'Assign tasks to staff members. They receive notifications and confirm completion with specifics — not just a checkbox.',
  },
  {
    n: '3',
    title: 'Nothing gets missed',
    body: 'Vigilight sends automatic reminders for incomplete tasks. The activity log gives you proof that everything was handled.',
  },
]

export default function HowItWorks() {
  return (
    <div id="how-it-works" className="bg-white py-24 px-6">
      {/* Header */}
      <div className="max-w-3xl mx-auto text-center mb-16">
        <p className="text-sm font-semibold tracking-widest uppercase mb-4" style={{ color: '#4A7C8C' }}>
          How It Works
        </p>
        <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6" style={{ color: '#0F172A' }}>
          Up and running in minutes.
        </h2>
        <p className="text-lg" style={{ color: '#475569' }}>
          No complicated setup. No training sessions. Just start managing services the right way.
        </p>
      </div>

      {/* Steps */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        {/* Dashed connectors — desktop only, behind the circles, aligned to circle center (28px) */}
        <div className="hidden md:block absolute border-t-2 border-dashed border-[#E2E8F0]" style={{ top: 28, left: '16.67%', right: '50%' }} />
        <div className="hidden md:block absolute border-t-2 border-dashed border-[#E2E8F0]" style={{ top: 28, left: '50%', right: '16.67%' }} />

        {STEPS.map(step => (
          <div key={step.n} className="text-center relative">
            <div
              className="w-14 h-14 rounded-full text-white font-bold text-xl flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: '#4A7C8C' }}
            >
              {step.n}
            </div>
            <h3 className="text-xl font-bold mb-3" style={{ color: '#0F172A' }}>{step.title}</h3>
            <p className="leading-relaxed" style={{ color: '#475569' }}>{step.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
