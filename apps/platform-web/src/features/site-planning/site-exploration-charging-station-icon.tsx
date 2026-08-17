export const siteExplorationChargingStationIconDefinition = {
  name: 'site-selection-exploration-nearby-charging-station',
  color: '#f97316',
  paths: [
    'M5 22V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v17',
    'M7 8h7',
    'M8 13h4l-3 6h4',
    'M16 7h2l2 2v9a2 2 0 0 0 2 2',
    'M3 22h15',
  ] as const,
}

export function SiteExplorationChargingStationIcon({ selected = false }: { selected?: boolean }) {
  return (
    <span
      className={`flex size-6 shrink-0 items-center justify-center rounded-md text-white ${selected ? 'ring-2 ring-ring ring-offset-2' : 'ring-1 ring-background'}`}
      style={{ backgroundColor: siteExplorationChargingStationIconDefinition.color }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {siteExplorationChargingStationIconDefinition.paths.map((path) => (
          <path key={path} d={path} />
        ))}
      </svg>
    </span>
  )
}
