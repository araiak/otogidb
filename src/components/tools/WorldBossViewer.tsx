/**
 * World Boss Viewer Component
 * Displays boss skills, level stats, and skill rotations
 */

import { useState, useEffect, useMemo } from 'react';
import type {
  WbSettingsEntry,
  WbSkillEntry,
  WbLevelEntry,
  WorldBoss,
  ParsedBossLevel,
  ParsedBossSkill,
  ActiveBossInfo,
  ParsedEffect,
} from '../../types/worldBoss';
import {
  parseAllBosses,
  getActiveBoss,
} from '../../lib/worldBossParser';

// Status effect colors
const STATUS_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  stun: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: '⚡' },
  frozen: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', icon: '❄️' },
  stone: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: '🪨' },
  numb: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: '⚡' },
  silence: { bg: 'bg-pink-500/20', text: 'text-pink-400', icon: '🔇' },
  poison: { bg: 'bg-green-500/20', text: 'text-green-400', icon: '☠️' },
  burn: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: '🔥' },
};

// Loading state component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      <span className="ml-3 text-secondary">Loading world boss data...</span>
    </div>
  );
}

// Error state component
function ErrorState({ message }: { message: string }) {
  return (
    <div className="card p-6 text-center">
      <div className="text-red-400 mb-2">Failed to load world boss data</div>
      <div className="text-sm text-secondary">{message}</div>
    </div>
  );
}

// Boss selector tabs
interface BossTabsProps {
  bosses: WorldBoss[];
  selectedId: string;
  activeBossId: string | null;
  onSelect: (id: string) => void;
}

function BossTabs({ bosses, selectedId, activeBossId, onSelect }: BossTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {bosses.map(boss => (
        <button
          key={boss.id}
          onClick={() => onSelect(boss.id)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors relative ${
            selectedId === boss.id
              ? 'bg-accent text-white'
              : 'bg-surface hover:bg-surface-hover text-primary'
          }`}
        >
          {boss.name}
          {activeBossId === boss.id && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" title="Currently Active" />
          )}
        </button>
      ))}
    </div>
  );
}

// Active boss indicator
interface ActiveBossIndicatorProps {
  activeInfo: ActiveBossInfo | null;
  bossName: string;
}

function ActiveBossIndicator({ activeInfo, bossName }: ActiveBossIndicatorProps) {
  if (!activeInfo) return null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`card p-3 mb-6 ${activeInfo.isActive ? 'border-green-500 border' : 'border-yellow-500 border'}`}>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${activeInfo.isActive ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
        <span className="font-medium text-sm">
          {activeInfo.isActive ? `${bossName} is active` : `Next: ${bossName}`}
        </span>
        <span className="text-xs text-secondary ml-auto">
          {formatDate(activeInfo.startDate)} - {formatDate(activeInfo.endDate)}
        </span>
      </div>
    </div>
  );
}

// Compact effect badge
function EffectBadge({ effect }: { effect: ParsedEffect }) {
  const statusType = effect.type.toLowerCase();
  const isStatus = STATUS_COLORS[statusType];

  if (isStatus) {
    // Status effect: show icon + name + duration
    const { bg, text, icon } = isStatus;
    const durationMatch = effect.description.match(/\((\d+)s\)/);
    const duration = durationMatch ? durationMatch[1] : '';

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${bg} ${text}`}>
        <span>{icon}</span>
        <span className="capitalize">{effect.type}</span>
        {duration && <span className="opacity-75">{duration}s</span>}
      </span>
    );
  }

  // Stat modifier (debuff/buff)
  const isDebuff = effect.value?.startsWith('-');
  const bgClass = isDebuff ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400';

  // Simplify the display
  const label = effect.type.toUpperCase();
  const value = effect.value || '';

  // Handle specific effect types
  if (effect.type === 'hit') {
    // HIT is accuracy/chance for status effects - simplify
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-gray-300">
        <span>🎯</span>
        <span>{value} chance</span>
      </span>
    );
  }

  if (effect.type === 'erase_debuff') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
        <span>✨</span>
        <span>Cleanse</span>
      </span>
    );
  }

  // Duration
  const dur = effect.duration ? ` (${effect.duration})` : '';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${bgClass}`}>
      <span>{isDebuff ? '↓' : '↑'}</span>
      <span>{label} {value}{dur}</span>
    </span>
  );
}

// Compact skill card
interface SkillCardProps {
  skill: ParsedBossSkill;
}

function SkillCard({ skill }: SkillCardProps) {
  // Separate status effects from other effects
  const statusEffects = skill.effects.filter(e => STATUS_COLORS[e.type.toLowerCase()]);
  const otherEffects = skill.effects.filter(e => !STATUS_COLORS[e.type.toLowerCase()]);

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-surface hover:bg-surface-hover transition-colors">
      {/* Skill number */}
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-accent/20 text-accent font-bold text-sm">
        {skill.id}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Target and damage */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-primary font-medium">{skill.target.description}</span>
          {skill.damage && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">
              {skill.damage.toLocaleString()} DMG
            </span>
          )}
        </div>

        {/* Effects row */}
        {skill.effects.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {statusEffects.map((effect, i) => (
              <EffectBadge key={`status-${i}`} effect={effect} />
            ))}
            {otherEffects.map((effect, i) => (
              <EffectBadge key={`other-${i}`} effect={effect} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Skills display - compact grid
interface SkillsDisplayProps {
  boss: WorldBoss;
}

function SkillsDisplay({ boss }: SkillsDisplayProps) {
  return (
    <div className="card p-4 mb-6">
      <h2 className="text-lg font-bold mb-3">Skills</h2>
      <div className="space-y-2">
        {boss.skills.map(skill => (
          <SkillCard key={skill.id} skill={skill} />
        ))}
      </div>
    </div>
  );
}

// Calculate DR% from defense value
// Linear formula: 500 defense = 5% DR, so DR% = Defense / 100
function calculateDR(defense: number): number {
  return defense / 100;
}

// Level stats table with DR%
interface LevelStatsProps {
  levels: ParsedBossLevel[];
}

function LevelStats({ levels }: LevelStatsProps) {
  // Show key levels: 1, 5, 10, 15, 20, 25, 30
  const keyLevels = [1, 5, 10, 15, 20, 25, 30];
  const displayLevels = levels.filter(l => keyLevels.includes(l.level));

  return (
    <div className="card p-4 mb-6">
      <h2 className="text-lg font-bold mb-3">Level Stats</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-secondary">
              <th className="text-left py-2 px-3 font-medium">Level</th>
              <th className="text-right py-2 px-3 font-medium">HP</th>
              <th className="text-right py-2 px-3 font-medium">Defense</th>
              <th className="text-right py-2 px-3 font-medium">DR%</th>
            </tr>
          </thead>
          <tbody>
            {displayLevels.map((level, i) => {
              const dr = calculateDR(level.defense);
              return (
                <tr
                  key={level.level}
                  className={`border-b border-border/50 ${i % 2 === 0 ? 'bg-surface/50' : ''}`}
                >
                  <td className="py-2 px-3 font-medium">Lv.{level.level}</td>
                  <td className="py-2 px-3 text-right text-red-400">{level.hpFormatted}</td>
                  <td className="py-2 px-3 text-right text-blue-400">{level.defense.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-purple-400">{dr.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-secondary mt-2">
        DR% = Defense / 100. Formula: damage × (1 - DR%)
      </p>
    </div>
  );
}

// Timeline marker for skill rotation
interface TimelineMarkerProps {
  time: number;
  skillId: number;
  skill: ParsedBossSkill | undefined;
  maxTime: number;
  isKillPhase?: boolean;
}

function TimelineMarker({ time, skill, maxTime, isKillPhase }: TimelineMarkerProps) {
  const position = (time / maxTime) * 100;
  const bgColor = isKillPhase ? 'bg-red-500/20' : 'bg-surface-hover';
  const borderColor = isKillPhase ? 'border-red-500' : 'border-accent';

  // Get primary effect icon for display
  const primaryEffect = skill?.effects.find(e => STATUS_COLORS[e.type.toLowerCase()]);
  const effectIcon = primaryEffect ? STATUS_COLORS[primaryEffect.type.toLowerCase()]?.icon : '⚔️';

  return (
    <div
      className="absolute transform -translate-x-1/2 group z-10"
      style={{ left: `${position}%` }}
    >
      {/* Marker - show emoji instead of number */}
      <div className={`w-7 h-7 rounded-full ${bgColor} border-2 ${borderColor} flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-sm`}>
        <span className="text-sm">{effectIcon}</span>
      </div>
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
        <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
          <div className="font-medium">{time}s</div>
          <div className="text-gray-300">{skill?.target.description}</div>
          {primaryEffect && (
            <div className="text-gray-400">{primaryEffect.description}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Time scale component
function TimeScale({ maxTime }: { maxTime: number }) {
  const ticks = [0, 15, 30, 45, 60].filter(t => t <= maxTime);
  return (
    <div className="relative h-4 mt-1">
      {ticks.map(t => (
        <div
          key={t}
          className="absolute transform -translate-x-1/2 text-[10px] text-secondary"
          style={{ left: `${(t / maxTime) * 100}%` }}
        >
          {t}s
        </div>
      ))}
    </div>
  );
}

// Visual skill rotation timeline
interface SkillRotationProps {
  levels: ParsedBossLevel[];
  skills: WorldBoss['skills'];
}

function SkillRotation({ levels, skills }: SkillRotationProps) {
  const [selectedLevel, setSelectedLevel] = useState(1);

  const level = levels.find(l => l.level === selectedLevel) || levels[0];
  if (!level) return null;

  const levelOptions = [1, 5, 10, 15, 20, 25, 30].filter(l =>
    levels.some(lv => lv.level === l)
  );

  // Calculate max time for timeline scale (always 60s for WB)
  const normalMaxTime = Math.max(...level.normalRotation.map(r => r.time), 60);
  const killMaxTime = Math.max(...level.killRotation.map(r => r.time), 60);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Skill Timeline</h2>
        <select
          value={selectedLevel}
          onChange={e => setSelectedLevel(Number(e.target.value))}
          className="px-2 py-1 bg-surface border border-border rounded text-primary text-sm"
        >
          {levelOptions.map(lv => (
            <option key={lv} value={lv}>Lv.{lv}</option>
          ))}
        </select>
      </div>

      {/* Normal Phase Timeline */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-3 h-3 rounded-full bg-accent"></span>
          <h3 className="text-sm font-medium text-secondary">Normal Phase</h3>
          <span className="text-xs text-secondary">(4x)</span>
        </div>
        <div className="relative h-12 bg-surface rounded-lg overflow-visible mx-2">
          {/* Timeline track - z-0 to be behind markers */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2 z-0"></div>
          {/* Markers - z-10 to be above track */}
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2">
            {level.normalRotation.map((entry, i) => (
              <TimelineMarker
                key={i}
                time={entry.time}
                skillId={entry.skillId}
                skill={skills.find(s => s.id === entry.skillId)}
                maxTime={normalMaxTime}
              />
            ))}
          </div>
        </div>
        <div className="mx-2">
          <TimeScale maxTime={normalMaxTime} />
        </div>
      </div>

      {/* Kill Phase Timeline */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <h3 className="text-sm font-medium text-secondary">Enraged Phase</h3>
          <span className="text-xs text-secondary">(1x + extensions)</span>
          <span className="text-xs text-red-400 ml-1">+50% ATK</span>
        </div>
        <div className="relative h-12 bg-surface rounded-lg overflow-visible mx-2">
          {/* Markers */}
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2">
            {level.killRotation.map((entry, i) => (
              <TimelineMarker
                key={i}
                time={entry.time}
                skillId={entry.skillId}
                skill={skills.find(s => s.id === entry.skillId)}
                maxTime={killMaxTime}
                isKillPhase
              />
            ))}
          </div>
        </div>
        <div className="mx-2">
          <TimeScale maxTime={killMaxTime} />
        </div>
      </div>

      {/* Note */}
      <p className="mt-4 pt-3 border-t border-border text-xs text-secondary">
        Each rotation is 60s. Enraged Phase begins after burst break at 4:00.
      </p>
    </div>
  );
}

// Main component
export function WorldBossViewer() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<WbSettingsEntry[]>([]);
  const [rawSkills, setRawSkills] = useState<WbSkillEntry[]>([]);
  const [rawLevels, setRawLevels] = useState<WbLevelEntry[]>([]);
  const [selectedBossId, setSelectedBossId] = useState('1');

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [settingsRes, skillsRes, levelsRes] = await Promise.all([
          fetch('/data/wbSettings.json'),
          fetch('/data/wbSkill.json'),
          fetch('/data/wbLv.json'),
        ]);

        if (!settingsRes.ok || !skillsRes.ok || !levelsRes.ok) {
          throw new Error('Failed to fetch world boss data');
        }

        const [settingsData, skillsData, levelsData] = await Promise.all([
          settingsRes.json(),
          skillsRes.json(),
          levelsRes.json(),
        ]);

        setSettings(settingsData);
        setRawSkills(skillsData);
        setRawLevels(levelsData);

        // Set selected boss to currently active one
        const active = getActiveBoss(settingsData);
        if (active) {
          setSelectedBossId(active.bossId);
        }

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Parse bosses
  const bosses = useMemo(() => {
    if (rawSkills.length === 0 || rawLevels.length === 0) return [];
    return parseAllBosses(rawSkills, rawLevels);
  }, [rawSkills, rawLevels]);

  // Get selected boss and active info
  const selectedBoss = useMemo(() => {
    return bosses.find(b => b.id === selectedBossId) || bosses[0];
  }, [bosses, selectedBossId]);

  const activeInfo = useMemo(() => {
    return getActiveBoss(settings);
  }, [settings]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} />;
  if (!selectedBoss) return <ErrorState message="No boss data available" />;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">World Boss Guide</h1>
        <p className="text-secondary text-sm">
          Skills, stats, and rotation timelines for World Boss events.
        </p>
      </div>

      {/* Boss tabs */}
      <BossTabs
        bosses={bosses}
        selectedId={selectedBossId}
        activeBossId={activeInfo?.bossId || null}
        onSelect={setSelectedBossId}
      />

      {/* Active boss indicator */}
      {activeInfo && activeInfo.bossId === selectedBossId && (
        <ActiveBossIndicator activeInfo={activeInfo} bossName={selectedBoss.name} />
      )}

      {/* Two-column layout on larger screens */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Skills */}
        <SkillsDisplay boss={selectedBoss} />

        {/* Level stats */}
        <LevelStats levels={selectedBoss.levels} />
      </div>

      {/* Skill rotation timeline - full width */}
      <SkillRotation levels={selectedBoss.levels} skills={selectedBoss.skills} />
    </div>
  );
}
