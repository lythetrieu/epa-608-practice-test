// Simple visual diagrams for each concept — rendered as structured HTML/CSS
// Designed for HVAC technicians who learn visually

type VisualProps = { className?: string }

function Box({ label, sub, color }: { label: string; sub?: string; color: string }) {
  return (
    <div className={`px-3 py-2 rounded-lg text-center text-xs font-bold border ${color}`}>
      <div>{label}</div>
      {sub && <div className="font-normal text-[10px] mt-0.5 opacity-80">{sub}</div>}
    </div>
  )
}

function Arrow() {
  return <div className="text-gray-400 text-lg font-bold shrink-0">→</div>
}

function CompareTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="bg-gray-100 text-gray-700 font-bold px-3 py-2 text-left border-b border-gray-200">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 border-b border-gray-100 text-gray-700">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// CORE CONCEPTS
// ═══════════════════════════════════════════════════════════════

function CoreEnv({}: VisualProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase">How CFCs Destroy Ozone</p>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Box label="CFC Released" sub="R-12, R-11" color="bg-red-50 border-red-200 text-red-700" />
        <Arrow />
        <Box label="UV Breaks CFC" sub="Releases Chlorine" color="bg-orange-50 border-orange-200 text-orange-700" />
        <Arrow />
        <Box label="Cl + O₃ → ClO + O₂" sub="Destroys ozone" color="bg-red-50 border-red-300 text-red-800" />
        <Arrow />
        <Box label="1 Cl atom" sub="Destroys 100,000 O₃" color="bg-red-100 border-red-300 text-red-900" />
      </div>
      <CompareTable
        headers={['Type', 'ODP', 'GWP', 'Example', 'Status']}
        rows={[
          ['CFC', 'High (1.0)', 'High', 'R-12, R-11', 'Banned'],
          ['HCFC', 'Low (0.05)', 'Medium', 'R-22', 'Phase-out 2030'],
          ['HFC', 'Zero', 'High', 'R-410A, R-134a', 'AIM Act phase-down'],
          ['Natural', 'Zero', 'Low', 'R-290, R-744', 'Growing use'],
        ]}
      />
    </div>
  )
}

function CoreCaa({}: VisualProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase">Clean Air Act Enforcement Chain</p>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Box label="Congress" sub="Writes law" color="bg-blue-50 border-blue-200 text-blue-700" />
        <Arrow />
        <Box label="EPA" sub="Enforces Section 608" color="bg-blue-100 border-blue-300 text-blue-800" />
        <Arrow />
        <Box label="Technicians" sub="Must be certified" color="bg-green-50 border-green-200 text-green-700" />
      </div>
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
        <p className="text-xs font-bold text-red-700">Violation Penalties</p>
        <p className="text-2xl font-black text-red-600 mt-1">Up to $44,539/day</p>
        <p className="text-[10px] text-red-500 mt-1">Per violation + possible criminal charges</p>
      </div>
    </div>
  )
}

function CoreRegs({}: VisualProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase">Certification Types</p>
      <CompareTable
        headers={['Type', 'Covers', 'Examples']}
        rows={[
          ['Type I', 'Small appliances', 'Window AC, fridges, vending machines'],
          ['Type II', 'High-pressure', 'Residential AC, supermarket cases'],
          ['Type III', 'Low-pressure', 'Centrifugal chillers'],
          ['Universal', 'All of the above', 'All equipment types'],
        ]}
      />
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-xs font-bold text-amber-700">Key Rule: Venting is ILLEGAL</p>
        <p className="text-xs text-amber-600 mt-1">Knowingly venting refrigerant = violation. Only de minimis releases during service are allowed.</p>
      </div>
    </div>
  )
}

function CoreSub({}: VisualProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase">SNAP Program — Safe Substitutes</p>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Box label="Old Refrigerant" sub="R-12 (CFC)" color="bg-red-50 border-red-200 text-red-700" />
        <Arrow />
        <Box label="SNAP Approved" sub="EPA evaluates" color="bg-blue-50 border-blue-200 text-blue-700" />
        <Arrow />
        <Box label="Substitute" sub="R-134a (HFC)" color="bg-green-50 border-green-200 text-green-700" />
      </div>
      <CompareTable
        headers={['Oil Type', 'Used With', 'Key Fact']}
        rows={[
          ['Mineral Oil', 'CFC (R-12)', 'NOT compatible with HFC'],
          ['Alkylbenzene', 'HCFC (R-22)', 'Can mix with mineral oil'],
          ['POE (Ester)', 'HFC (R-410A)', 'Absorbs moisture quickly'],
          ['PAG', 'Auto AC (R-134a)', 'NOT for home HVAC'],
        ]}
      />
    </div>
  )
}

function CoreRef({}: VisualProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase">Refrigeration Cycle</p>
      <div className="grid grid-cols-2 gap-2">
        <Box label="Compressor" sub="Low → High pressure" color="bg-red-50 border-red-200 text-red-700" />
        <Box label="Condenser" sub="Hot gas → liquid (rejects heat)" color="bg-orange-50 border-orange-200 text-orange-700" />
        <Box label="Metering Device" sub="High → Low pressure" color="bg-blue-50 border-blue-200 text-blue-700" />
        <Box label="Evaporator" sub="Liquid → gas (absorbs heat)" color="bg-cyan-50 border-cyan-200 text-cyan-700" />
      </div>
      <div className="text-center text-xs text-gray-500">
        Compressor → Condenser → Metering → Evaporator → (repeat)
      </div>
    </div>
  )
}

function Core3rs({}: VisualProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase">Recovery vs Recycling vs Reclamation</p>
      <CompareTable
        headers={['Process', 'What Happens', 'Who Does It', 'Standard']}
        rows={[
          ['Recovery', 'Remove & store in tank', 'Technician on-site', '—'],
          ['Recycling', 'Clean for reuse (same owner)', 'Technician on-site', '—'],
          ['Reclamation', 'Restore to new condition', 'EPA-certified facility', 'ARI-700'],
        ]}
      />
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs font-bold text-blue-700">Key: Only reclamation can make refrigerant &ldquo;like new&rdquo;</p>
        <p className="text-xs text-blue-600 mt-1">Reclaimed refrigerant meets ARI-700 purity standard. Recycled does not.</p>
      </div>
    </div>
  )
}

function CoreRec({}: VisualProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase">Recovery Equipment</p>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Box label="System" sub="Contains refrigerant" color="bg-gray-50 border-gray-200 text-gray-700" />
        <Arrow />
        <Box label="Recovery Machine" sub="ARI-740 certified" color="bg-blue-50 border-blue-200 text-blue-700" />
        <Arrow />
        <Box label="Recovery Tank" sub="Gray body, yellow top" color="bg-yellow-50 border-yellow-200 text-yellow-700" />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
          <p className="font-bold text-green-700">Self-Contained</p>
          <p className="text-green-600">Has own compressor</p>
          <p className="text-green-600">Works on dead systems</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-center">
          <p className="font-bold text-purple-700">System-Dependent</p>
          <p className="text-purple-600">Uses system compressor</p>
          <p className="text-purple-600">System must run</p>
        </div>
      </div>
    </div>
  )
}

function CoreEvac({}: VisualProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase">Evacuation Levels</p>
      <CompareTable
        headers={['System', 'Mfg Before 11/15/93', 'Mfg After 11/15/93']}
        rows={[
          ['Small appliance', '0 psig', '0 psig'],
          ['High-pressure (>200 lb)', '0 psig', '10" Hg vacuum'],
          ['High-pressure (<200 lb)', '0 psig', '0 psig'],
          ['Low-pressure', '25" Hg vacuum', '25 mm Hg absolute'],
        ]}
      />
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
        <p className="text-xs font-bold text-purple-700">Micron Gauge = Most Accurate</p>
        <p className="text-xs text-purple-600 mt-1">Always use a micron gauge to verify deep vacuum. Compound gauges are NOT accurate enough.</p>
      </div>
    </div>
  )
}

function CoreSafe({}: VisualProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase">Safety Essentials</p>
      <div className="grid grid-cols-3 gap-2 text-xs text-center">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
          <p className="text-2xl mb-1">🥽</p>
          <p className="font-bold text-blue-700">Safety Goggles</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-2">
          <p className="text-2xl mb-1">🧤</p>
          <p className="font-bold text-green-700">Gloves</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
          <p className="text-2xl mb-1">💨</p>
          <p className="font-bold text-orange-700">Ventilation</p>
        </div>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <p className="text-xs font-bold text-red-700">Refrigerant Exposure Dangers</p>
        <p className="text-xs text-red-600 mt-1">Oxygen displacement → suffocation. Frostbite on skin contact. Never use open flame near refrigerants — phosgene gas is deadly.</p>
      </div>
    </div>
  )
}

function CoreShip({}: VisualProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase">Cylinder Types</p>
      <div className="grid grid-cols-2 gap-2 text-xs text-center">
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-2">
          <div className="w-8 h-12 mx-auto rounded-lg bg-gray-400 border-t-4 border-yellow-400 mb-1" />
          <p className="font-bold text-gray-700">Recovery Tank</p>
          <p className="text-gray-500">Gray + Yellow top</p>
        </div>
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-2">
          <div className="w-8 h-12 mx-auto rounded-lg bg-green-500 mb-1" />
          <p className="font-bold text-gray-700">R-22</p>
          <p className="text-gray-500">Green cylinder</p>
        </div>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-xs font-bold text-amber-700">DOT Rules</p>
        <p className="text-xs text-amber-600 mt-1">Never fill recovery tank above 80% capacity. Must pass hydrostatic test every 5 years. Label with refrigerant type.</p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TYPE I
// ═══════════════════════════════════════════════════════════════

function T1Rec({}: VisualProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase">Small Appliance Recovery Requirements</p>
      <CompareTable
        headers={['Method', 'Capture Rate', 'When to Use']}
        rows={[
          ['System-Dependent', '80%', 'Working compressor'],
          ['Self-Contained', '90%', 'Any system (dead or alive)'],
        ]}
      />
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs font-bold text-blue-700">Small Appliance = 5 lbs or less refrigerant</p>
        <p className="text-xs text-blue-600 mt-1">Examples: Household fridge, window AC, PTAC, dehumidifier, vending machine</p>
      </div>
    </div>
  )
}

function T1Tech({}: VisualProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase">Sealed System Access</p>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Box label="Pierce Valve" sub="Temporary access" color="bg-blue-50 border-blue-200 text-blue-700" />
        <Arrow />
        <Box label="Process Tube" sub="Permanent access" color="bg-green-50 border-green-200 text-green-700" />
        <Arrow />
        <Box label="Braze/Solder" sub="Seal after service" color="bg-orange-50 border-orange-200 text-orange-700" />
      </div>
    </div>
  )
}

function T1Safe({}: VisualProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase">Flammable Refrigerants (A2L / A3)</p>
      <CompareTable
        headers={['Class', 'Flammability', 'Examples']}
        rows={[
          ['A1', 'Non-flammable', 'R-134a, R-410A'],
          ['A2L', 'Mildly flammable', 'R-32, R-454B'],
          ['A3', 'Highly flammable', 'R-290 (propane)'],
        ]}
      />
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <p className="text-xs font-bold text-red-700">R-290 (Propane): No sparks, no open flame, ventilate area</p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TYPE II
// ═══════════════════════════════════════════════════════════════

function T2Leak({}: VisualProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase">Leak Rate Thresholds</p>
      <CompareTable
        headers={['Equipment', 'Trigger Rate', 'Action Required']}
        rows={[
          ['Commercial refrigeration', '20%/year', 'Repair within 30 days'],
          ['Comfort cooling (AC)', '10%/year', 'Repair within 30 days'],
          ['Industrial process', '30%/year', 'Repair within 30 days'],
        ]}
      />
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs font-bold text-blue-700">Leak Rate Formula</p>
        <p className="text-sm text-blue-800 font-mono mt-1">Rate = (Refrigerant Added ÷ Full Charge) × 100</p>
      </div>
    </div>
  )
}

function T2Repair({}: VisualProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase">Leak Repair Timeline</p>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Box label="Leak Found" sub="Day 0" color="bg-red-50 border-red-200 text-red-700" />
        <Arrow />
        <Box label="Repair" sub="Within 30 days" color="bg-orange-50 border-orange-200 text-orange-700" />
        <Arrow />
        <Box label="Verify" sub="Within 30 days after" color="bg-green-50 border-green-200 text-green-700" />
      </div>
    </div>
  )
}

function T2Rec({}: VisualProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase">High-Pressure Recovery</p>
      <CompareTable
        headers={['Charge Size', 'Before 11/15/93', 'After 11/15/93']}
        rows={[
          ['< 200 lbs', '0 psig', '0 psig'],
          ['≥ 200 lbs', '0 psig', '10" Hg vacuum'],
        ]}
      />
    </div>
  )
}

function T2Tech({}: VisualProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase">Charging Methods</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <p className="font-bold text-blue-700">Subcooling</p>
          <p className="text-blue-600 mt-1">Used with TXV</p>
          <p className="text-blue-600">Liquid line temp &lt; condenser sat temp</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <p className="font-bold text-green-700">Superheat</p>
          <p className="text-green-600 mt-1">Used with fixed orifice</p>
          <p className="text-green-600">Suction line temp &gt; evaporator sat temp</p>
        </div>
      </div>
    </div>
  )
}

function T2Ref({}: VisualProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase">Common High-Pressure Refrigerants</p>
      <CompareTable
        headers={['Refrigerant', 'Type', 'Replaces', 'Pressure']}
        rows={[
          ['R-410A', 'HFC (zeotrope)', 'R-22', 'Very High (~400 psig)'],
          ['R-134a', 'HFC', 'R-12', 'Medium'],
          ['R-22', 'HCFC', '—', 'Medium (~225 psig)'],
          ['R-407C', 'HFC blend', 'R-22', 'Similar to R-22'],
        ]}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TYPE III
// ═══════════════════════════════════════════════════════════════

function T3Leak({}: VisualProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase">Low-Pressure Leak Detection</p>
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
        <p className="text-xs font-bold text-purple-700">Low-pressure systems operate BELOW atmospheric pressure</p>
        <p className="text-xs text-purple-600 mt-1">Leaks pull AIR IN (not refrigerant out). The purge unit removes non-condensables.</p>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-xs font-bold text-amber-700">High purge unit runtime = leak present</p>
      </div>
    </div>
  )
}

function T3Repair({}: VisualProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase">Chiller Repair Triggers</p>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
        <p className="text-xs font-bold text-blue-700">Commercial Refrigeration/Industrial</p>
        <p className="text-3xl font-black text-blue-800 mt-1">30% / year</p>
        <p className="text-xs text-blue-600 mt-1">Repair or retrofit/replace plan within 30 days</p>
      </div>
    </div>
  )
}

function T3Rec({}: VisualProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase">Low-Pressure Recovery</p>
      <CompareTable
        headers={['Equipment Age', 'Required Level']}
        rows={[
          ['Before 11/15/93', '25" Hg vacuum'],
          ['After 11/15/93', '25 mm Hg absolute'],
        ]}
      />
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <p className="text-xs font-bold text-red-700">Never use the chiller as a recovery vessel</p>
        <p className="text-xs text-red-600 mt-1">Pressurizing a low-pressure system risks rupture.</p>
      </div>
    </div>
  )
}

function T3Rech({}: VisualProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase">Charging Low-Pressure Systems</p>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Box label="Charge as VAPOR" sub="Into evaporator" color="bg-cyan-50 border-cyan-200 text-cyan-700" />
        <Arrow />
        <Box label="Then Liquid" sub="Once pressure stabilizes" color="bg-blue-50 border-blue-200 text-blue-700" />
      </div>
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <p className="text-xs font-bold text-red-700">NEVER charge liquid into evaporator directly</p>
        <p className="text-xs text-red-600 mt-1">Liquid refrigerant can freeze tubes and cause damage (flash-freeze).</p>
      </div>
    </div>
  )
}

function T3Ref({}: VisualProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase">Low-Pressure Refrigerants</p>
      <CompareTable
        headers={['Refrigerant', 'Type', 'Boiling Point', 'Key Fact']}
        rows={[
          ['R-11', 'CFC', '74.7°F', 'Banned. Highest ODP of common refs.'],
          ['R-123', 'HCFC', '82°F', 'R-11 replacement. Phase-out 2030.'],
          ['R-245fa', 'HFC', '59°F', 'Zero ODP. Used in new chillers.'],
        ]}
      />
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
        <p className="text-xs font-bold text-purple-700">Both R-11 and R-123 operate below atmospheric pressure at normal temps</p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// EXPORT MAP
// ═══════════════════════════════════════════════════════════════

export const CONCEPT_VISUALS: Record<string, () => React.ReactNode> = {
  'core-env': () => <CoreEnv />,
  'core-caa': () => <CoreCaa />,
  'core-regs': () => <CoreRegs />,
  'core-sub': () => <CoreSub />,
  'core-ref': () => <CoreRef />,
  'core-3rs': () => <Core3rs />,
  'core-rec': () => <CoreRec />,
  'core-evac': () => <CoreEvac />,
  'core-safe': () => <CoreSafe />,
  'core-ship': () => <CoreShip />,
  't1-rec': () => <T1Rec />,
  't1-tech': () => <T1Tech />,
  't1-safe': () => <T1Safe />,
  't2-leak': () => <T2Leak />,
  't2-repair': () => <T2Repair />,
  't2-rec': () => <T2Rec />,
  't2-tech': () => <T2Tech />,
  't2-ref': () => <T2Ref />,
  't3-leak': () => <T3Leak />,
  't3-repair': () => <T3Repair />,
  't3-rec': () => <T3Rec />,
  't3-rech': () => <T3Rech />,
  't3-ref': () => <T3Ref />,
}
