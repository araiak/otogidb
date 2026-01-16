import { useMemo } from 'react';
import {
  calculateDamage,
  generateHeatmap,
  type DamageCalcInput,
  type HeatmapCell,
} from '../../lib/damage-calc';

type StatType = 'dmg' | 'critRate' | 'critDmg' | 'skillDmg' | 'speed' | 'level';

interface StatHeatmapProps {
  baseInput: DamageCalcInput;
  xStat: StatType;
  yStat: StatType;
  mode: 'dps' | 'skill';
}

const STAT_LABELS: Record<StatType, string> = {
  dmg: 'DMG %',
  critRate: 'Crit Rate',
  critDmg: 'Crit DMG',
  skillDmg: 'Skill DMG',
  speed: 'Speed',
  level: 'Level',
};

const STAT_RANGES: Record<StatType, number[]> = {
  dmg: [0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5],
  critRate: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
  critDmg: [0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5],
  skillDmg: [0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5],
  speed: [0, 0.1, 0.2, 0.3, 0.4, 0.5],
  level: [0, 5, 10, 15, 20, 25, 30],
};

function formatValue(stat: StatType, value: number): string {
  if (stat === 'level') {
    return `+${value}`;
  }
  return `${(value * 100).toFixed(0)}%`;
}

function getColor(value: number, min: number, max: number, capped: boolean): string {
  if (capped) {
    return 'bg-yellow-500/50'; // Capped indicator
  }

  const range = max - min;
  if (range === 0) return 'bg-blue-500/30';

  const normalized = (value - min) / range;

  // Color gradient from blue (low) to green (mid) to red (high)
  if (normalized < 0.33) {
    const intensity = Math.round(30 + normalized * 3 * 40);
    return `bg-blue-500/${intensity}`;
  } else if (normalized < 0.66) {
    const intensity = Math.round(30 + (normalized - 0.33) * 3 * 40);
    return `bg-green-500/${intensity}`;
  } else {
    const intensity = Math.round(30 + (normalized - 0.66) * 3 * 40);
    return `bg-red-500/${intensity}`;
  }
}

export function StatHeatmap({ baseInput, xStat, yStat, mode }: StatHeatmapProps) {
  const xRange = STAT_RANGES[xStat];
  const yRange = STAT_RANGES[yStat];

  const heatmapData = useMemo(() => {
    return generateHeatmap(baseInput, xStat, yStat, xRange, yRange);
  }, [baseInput, xStat, yStat, xRange, yRange]);

  // Find min/max for color scaling
  const allValues = heatmapData.flat().map(cell => mode === 'dps' ? cell.dps : cell.skillDamage);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="p-1 text-secondary text-left">
              {STAT_LABELS[yStat]} ↓ / {STAT_LABELS[xStat]} →
            </th>
            {xRange.map(x => (
              <th key={x} className="p-1 text-secondary text-center font-mono">
                {formatValue(xStat, x)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {yRange.slice().reverse().map((y, yIdx) => (
            <tr key={y}>
              <td className="p-1 text-secondary font-mono">
                {formatValue(yStat, y)}
              </td>
              {heatmapData[yRange.length - 1 - yIdx].map((cell, xIdx) => {
                const value = mode === 'dps' ? cell.dps : cell.skillDamage;
                const colorClass = getColor(value, minVal, maxVal, cell.capped);

                return (
                  <td
                    key={xIdx}
                    className={`p-1 text-center font-mono ${colorClass} border border-border/30`}
                    title={`${STAT_LABELS[xStat]}: ${formatValue(xStat, cell.x)}, ${STAT_LABELS[yStat]}: ${formatValue(yStat, cell.y)}\n${mode === 'dps' ? 'DPS' : 'Skill'}: ${value.toLocaleString()}${cell.capped ? ' (CAPPED)' : ''}`}
                  >
                    {cell.capped && <span className="text-yellow-400">⚠</span>}
                    {!cell.capped && (value / 1000).toFixed(1) + 'k'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex gap-4 text-xs text-secondary">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-blue-500/50 rounded" /> Lower
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-500/50 rounded" /> Mid
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-500/50 rounded" /> Higher
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-yellow-500/50 rounded" /> Capped
        </span>
      </div>
    </div>
  );
}

// Heatmap selector component
interface HeatmapSelectorProps {
  baseInput: DamageCalcInput;
}

export function HeatmapSection({ baseInput }: HeatmapSelectorProps) {
  const [xStat, setXStat] = useState<StatType>('critRate');
  const [yStat, setYStat] = useState<StatType>('critDmg');
  const [mode, setMode] = useState<'dps' | 'skill'>('dps');

  const statOptions: StatType[] = ['dmg', 'critRate', 'critDmg', 'skillDmg', 'speed', 'level'];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-xs text-secondary mb-1">X Axis</label>
          <select
            value={xStat}
            onChange={(e) => setXStat(e.target.value as StatType)}
            className="px-2 py-1 bg-surface border border-border rounded text-sm"
          >
            {statOptions.map(stat => (
              <option key={stat} value={stat}>{STAT_LABELS[stat]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-secondary mb-1">Y Axis</label>
          <select
            value={yStat}
            onChange={(e) => setYStat(e.target.value as StatType)}
            className="px-2 py-1 bg-surface border border-border rounded text-sm"
          >
            {statOptions.map(stat => (
              <option key={stat} value={stat}>{STAT_LABELS[stat]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-secondary mb-1">Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'dps' | 'skill')}
            className="px-2 py-1 bg-surface border border-border rounded text-sm"
          >
            <option value="dps">Normal DPS</option>
            <option value="skill">Skill Damage</option>
          </select>
        </div>
      </div>

      <StatHeatmap
        baseInput={baseInput}
        xStat={xStat}
        yStat={yStat}
        mode={mode}
      />
    </div>
  );
}

import { useState } from 'react';

export default HeatmapSection;
