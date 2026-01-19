/**
 * Fight Calculator Component
 * Allows users to simulate damage over a fight duration by capturing
 * snapshots of different skill configurations
 */

import { useState, useMemo, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import type {
  TeamMemberState,
  FightSnapshot,
  FightSnapshotMember,
  FightCalculationResult,
} from '../../lib/team-calc-types';
import { MAIN_TEAM_SIZE } from '../../lib/team-calc-types';

interface FightCalculatorProps {
  members: TeamMemberState[];
}

export interface FightCalculatorHandle {
  clearAll: () => void;
  exportFight: () => string;
  importFight: (json: string) => boolean;
}

/**
 * Storage format for fight calculator
 */
interface StoredFightState {
  fightDuration: number;
  snapshots: FightSnapshot[];
}

const FIGHT_STORAGE_KEY = 'otogidb-fight-calculator';

/**
 * Generate a unique ID for snapshots
 */
function generateId(): string {
  return `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a snapshot from current team state
 * Captures DPS and ALL damage skills (skill toggle is for buffs, not for capturing)
 * Damage values are snapshotted with current buff/debuff state
 */
function createSnapshot(
  members: TeamMemberState[],
  name: string,
  isBase: boolean = false
): FightSnapshot {
  const snapshotMembers: FightSnapshotMember[] = [];
  let totalDps = 0;
  let totalDpsMin = 0;
  let totalDpsMax = 0;

  for (let i = 0; i < MAIN_TEAM_SIZE; i++) {
    const member = members[i];
    const damage = member.damageResult;

    if (damage) {
      // Check if this member's skill deals damage (regardless of toggle state)
      const hasDamageSkill = damage.skillBaseDamage > 0;

      snapshotMembers.push({
        memberIndex: i,
        cardName: member.card?.name ?? null,
        dps: damage.normalDps,
        dpsMin: damage.normalDpsMin,
        dpsMax: damage.normalDpsMax,
        hasDamageSkill,
        // Capture current skill damage values (affected by active buffs/debuffs)
        skillDamage: hasDamageSkill ? damage.skillDamageExpected : 0,
        skillDamageMin: hasDamageSkill ? damage.skillDamageExpectedMin : 0,
        skillDamageMax: hasDamageSkill ? damage.skillDamageExpectedMax : 0,
        // Default to 1 cast for damage skills (unless base snapshot)
        skillCasts: (hasDamageSkill && !isBase) ? 1 : 0,
      });

      totalDps += damage.normalDps;
      totalDpsMin += damage.normalDpsMin;
      totalDpsMax += damage.normalDpsMax;
    }
  }

  return {
    id: generateId(),
    name,
    members: snapshotMembers,
    totalDps,
    totalDpsMin,
    totalDpsMax,
    durationSeconds: isBase ? 0 : 60, // Base uses remaining time, others default to 60s
    isBase,
  };
}

/**
 * Calculate fight damage from snapshots
 * Base snapshots (isBase=true) automatically fill remaining fight time
 */
function calculateFightDamage(
  snapshots: FightSnapshot[],
  fightDuration: number
): FightCalculationResult & { baseDuration: number } {
  const snapshotResults: FightCalculationResult['snapshotResults'] = [];

  // First pass: calculate duration used by non-base snapshots
  let nonBaseDuration = 0;
  for (const snapshot of snapshots) {
    if (!snapshot.isBase) {
      nonBaseDuration += snapshot.durationSeconds;
    }
  }

  // Calculate remaining time for base snapshot
  const baseDuration = Math.max(0, fightDuration - nonBaseDuration);

  let totalDamage = 0;
  let totalDamageMin = 0;
  let totalDamageMax = 0;
  let totalDurationUsed = 0;

  for (const snapshot of snapshots) {
    // Use calculated remaining time for base snapshots
    const effectiveDuration = snapshot.isBase ? baseDuration : snapshot.durationSeconds;

    const dpsDamage = snapshot.totalDps * effectiveDuration;
    const dpsDamageMin = snapshot.totalDpsMin * effectiveDuration;
    const dpsDamageMax = snapshot.totalDpsMax * effectiveDuration;

    // Calculate skill damage per member based on individual cast counts
    let skillDamage = 0;
    let skillDamageMin = 0;
    let skillDamageMax = 0;

    for (const member of snapshot.members) {
      if (member.hasDamageSkill && member.skillCasts > 0) {
        skillDamage += member.skillDamage * member.skillCasts;
        skillDamageMin += member.skillDamageMin * member.skillCasts;
        skillDamageMax += member.skillDamageMax * member.skillCasts;
      }
    }

    const snapshotTotal = dpsDamage + skillDamage;
    const snapshotTotalMin = dpsDamageMin + skillDamageMin;
    const snapshotTotalMax = dpsDamageMax + skillDamageMax;

    snapshotResults.push({
      snapshotId: snapshot.id,
      dpsDamage,
      dpsDamageMin,
      dpsDamageMax,
      skillDamage,
      skillDamageMin,
      skillDamageMax,
      totalDamage: snapshotTotal,
      totalDamageMin: snapshotTotalMin,
      totalDamageMax: snapshotTotalMax,
    });

    totalDamage += snapshotTotal;
    totalDamageMin += snapshotTotalMin;
    totalDamageMax += snapshotTotalMax;
    totalDurationUsed += effectiveDuration;
  }

  // Check if there's a base snapshot
  const hasBase = snapshots.some(s => s.isBase);
  const remainingDuration = hasBase ? 0 : Math.max(0, fightDuration - totalDurationUsed);

  return {
    snapshotResults,
    totalDamage,
    totalDamageMin,
    totalDamageMax,
    totalDurationUsed,
    remainingDuration,
    baseDuration,
  };
}

export const FightCalculator = forwardRef<FightCalculatorHandle, FightCalculatorProps>(
  function FightCalculator({ members }, ref) {
  const [fightDuration, setFightDuration] = useState(300); // Default 5 minutes
  const [snapshots, setSnapshots] = useState<FightSnapshot[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

  // Load from storage on mount
  useEffect(() => {
    if (hasLoadedFromStorage) return;

    try {
      const stored = localStorage.getItem(FIGHT_STORAGE_KEY);
      if (stored) {
        const data: StoredFightState = JSON.parse(stored);
        if (data.fightDuration) setFightDuration(data.fightDuration);
        if (data.snapshots) setSnapshots(data.snapshots);
      }
    } catch (e) {
      console.warn('Failed to load fight calculator state:', e);
    }
    setHasLoadedFromStorage(true);
  }, [hasLoadedFromStorage]);

  // Save to storage when state changes
  useEffect(() => {
    if (!hasLoadedFromStorage) return;

    try {
      const data: StoredFightState = {
        fightDuration,
        snapshots,
      };
      localStorage.setItem(FIGHT_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save fight calculator state:', e);
    }
  }, [fightDuration, snapshots, hasLoadedFromStorage]);

  // Calculate results whenever snapshots or duration changes
  const results = useMemo(
    () => calculateFightDamage(snapshots, fightDuration),
    [snapshots, fightDuration]
  );

  // Check if any member has a skill toggled on
  const hasActiveSkills = useCallback((membersList: TeamMemberState[]) => {
    return membersList.slice(0, MAIN_TEAM_SIZE).some(
      (m) => m.skillActive && m.card
    );
  }, []);

  // Get active slot labels (s1, s2, etc.) for naming
  const getActiveSlotLabels = useCallback((membersList: TeamMemberState[]) => {
    return membersList
      .slice(0, MAIN_TEAM_SIZE)
      .map((m, i) => ({ index: i, active: m.skillActive && m.card }))
      .filter((s) => s.active)
      .map((s) => `s${s.index + 1}`);
  }, []);

  // Add current team state as a new snapshot
  const addSnapshot = useCallback(() => {
    const activeSlots = getActiveSlotLabels(members);
    const hasSkillsActive = activeSlots.length > 0;

    // Name based on active skill slots (s1, s3, s5 etc.)
    const name = hasSkillsActive
      ? `Skills: ${activeSlots.join(', ')}`
      : 'Base (no skills)';

    // isBase = true only when NO skills are toggled on
    const isBase = !hasSkillsActive;
    const snapshot = createSnapshot(members, name, isBase);

    setSnapshots((prev) => {
      // Check if we already have a base snapshot
      const hasExistingBase = prev.some(s => s.isBase);

      // Don't auto-add base - user should capture it manually with no skills active
      // This ensures base snapshot has correct unbuffed DPS values
      if (isBase && hasExistingBase) {
        // Warn user if trying to add duplicate base
        console.warn('Base snapshot already exists');
      }

      return [...prev, snapshot];
    });
  }, [members, getActiveSlotLabels]);

  // Update snapshot parameters
  const updateSnapshot = useCallback(
    (id: string, updates: Partial<Pick<FightSnapshot, 'name' | 'durationSeconds'>>) => {
      setSnapshots((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
    },
    []
  );

  // Update member skill casts within a snapshot
  const updateMemberSkillCasts = useCallback(
    (snapshotId: string, memberIndex: number, skillCasts: number) => {
      setSnapshots((prev) =>
        prev.map((s) => {
          if (s.id !== snapshotId) return s;
          return {
            ...s,
            members: s.members.map((m) =>
              m.memberIndex === memberIndex ? { ...m, skillCasts } : m
            ),
          };
        })
      );
    },
    []
  );

  // Remove a snapshot
  const removeSnapshot = useCallback((id: string) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // Clear all snapshots
  const clearSnapshots = useCallback(() => {
    setSnapshots([]);
  }, []);

  // Move snapshot up/down
  const moveSnapshot = useCallback((id: string, direction: 'up' | 'down') => {
    setSnapshots((prev) => {
      const index = prev.findIndex((s) => s.id === id);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;

      const newSnapshots = [...prev];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      [newSnapshots[index], newSnapshots[swapIndex]] = [
        newSnapshots[swapIndex],
        newSnapshots[index],
      ];
      return newSnapshots;
    });
  }, []);

  // Export fight data
  const exportFight = useCallback((): string => {
    const data: StoredFightState = {
      fightDuration,
      snapshots,
    };
    return JSON.stringify(data, null, 2);
  }, [fightDuration, snapshots]);

  // Import fight data
  const importFight = useCallback((json: string): boolean => {
    try {
      const data: StoredFightState = JSON.parse(json);
      if (data.fightDuration) setFightDuration(data.fightDuration);
      if (data.snapshots) setSnapshots(data.snapshots);
      return true;
    } catch (e) {
      console.warn('Failed to import fight data:', e);
      return false;
    }
  }, []);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    clearAll: clearSnapshots,
    exportFight,
    importFight,
  }), [clearSnapshots, exportFight, importFight]);

  const formatNum = (n: number) => n.toLocaleString();
  const formatDamage = (n: number) => {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return formatNum(Math.round(n));
  };

  return (
    <details
      className="bg-surface rounded-lg"
      open={isExpanded}
      onToggle={(e) => setIsExpanded((e.target as HTMLDetailsElement).open)}
    >
      <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-primary hover:text-blue-400 flex items-center justify-between">
        <span>Fight Calculator</span>
        {snapshots.length > 0 && (
          <span className="text-xs text-secondary">
            {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} |{' '}
            {formatDamage(results.totalDamage)} total
          </span>
        )}
      </summary>

      <div className="px-4 pb-4 space-y-4">
        {/* Fight Duration */}
        <div className="flex items-center gap-4 flex-wrap">
          <label className="text-sm text-secondary">Fight Duration:</label>
          <input
            type="number"
            value={fightDuration}
            onChange={(e) => setFightDuration(Math.max(1, parseInt(e.target.value) || 0))}
            className="w-24 px-2 py-1 bg-surface-hover border border-border rounded text-sm text-primary"
            min={1}
          />
          <span className="text-sm text-secondary">seconds</span>
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={addSnapshot}
              className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded text-sm hover:bg-blue-500/30"
            >
              + Capture Snapshot
            </button>
            {snapshots.length > 0 && (
              <button
                type="button"
                onClick={clearSnapshots}
                className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-sm hover:bg-red-500/30"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Instructions */}
        {snapshots.length === 0 && (
          <div className="p-3 bg-surface-hover rounded-lg text-sm text-secondary">
            <p className="mb-2">
              <strong className="text-primary">How to use:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>First, turn OFF all skills and capture a "Base" snapshot</li>
              <li>Then toggle ON skill combinations (s1,s3,s5 or s2,s4) and capture snapshots</li>
              <li>Set duration for each phase and skill cast counts</li>
              <li>Base snapshot auto-fills remaining fight time</li>
            </ol>
            <p className="mt-2 text-xs text-tertiary">
              Tip: Skill toggles affect buff calculations. Capture base first to get unbuffed DPS.
            </p>
          </div>
        )}

        {/* Notice about snapshots not updating */}
        {snapshots.length > 0 && (
          <div className="text-xs text-yellow-400/80 bg-yellow-500/10 border border-yellow-500/20 rounded px-3 py-2">
            Snapshots are frozen at capture time. Changes to team configuration above won't update existing snapshots. Delete and re-capture to update values.
          </div>
        )}

        {/* Snapshots List */}
        {snapshots.length > 0 && (
          <div className="space-y-3">
            {snapshots.map((snapshot, index) => {
              const result = results.snapshotResults.find(
                (r) => r.snapshotId === snapshot.id
              );
              // Filter members that have damage skills (regardless of toggle state)
              const damageSkillMembers = snapshot.members.filter(
                (m) => m.hasDamageSkill && m.cardName
              );

              return (
                <div
                  key={snapshot.id}
                  className="p-3 bg-surface-hover rounded-lg border border-border"
                >
                  {/* Snapshot Header */}
                  <div className="flex items-center justify-between mb-2">
                    <input
                      type="text"
                      value={snapshot.name}
                      onChange={(e) =>
                        updateSnapshot(snapshot.id, { name: e.target.value })
                      }
                      className="bg-transparent border-b border-transparent hover:border-border focus:border-blue-500 text-sm font-medium text-primary outline-none"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveSnapshot(snapshot.id, 'up')}
                        disabled={index === 0}
                        className="p-1 text-secondary hover:text-primary disabled:opacity-30"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSnapshot(snapshot.id, 'down')}
                        disabled={index === snapshots.length - 1}
                        className="p-1 text-secondary hover:text-primary disabled:opacity-30"
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSnapshot(snapshot.id)}
                        className="p-1 text-red-400 hover:text-red-300"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* Duration and DPS */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-tertiary">
                        Duration {snapshot.isBase && <span className="text-blue-400">(auto)</span>}
                      </label>
                      {snapshot.isBase ? (
                        <div className="text-sm font-mono text-blue-400">
                          {results.baseDuration}s
                          <span className="text-xs text-tertiary ml-1">(remaining)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={snapshot.durationSeconds}
                            onChange={(e) =>
                              updateSnapshot(snapshot.id, {
                                durationSeconds: Math.max(0, parseInt(e.target.value) || 0),
                              })
                            }
                            className="w-16 px-2 py-1 bg-surface border border-border rounded text-sm text-primary"
                            min={0}
                          />
                          <span className="text-xs text-secondary">sec</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-tertiary">Team DPS</label>
                      <div className="text-sm font-mono text-primary">
                        {formatNum(snapshot.totalDps)}/s
                      </div>
                      <div className="text-xs text-tertiary">
                        {formatNum(snapshot.totalDpsMin)}-{formatNum(snapshot.totalDpsMax)}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-tertiary">DPS Damage</label>
                      <div className="text-sm font-mono text-primary">
                        {result ? formatDamage(result.dpsDamage) : '-'}
                      </div>
                    </div>
                  </div>

                  {/* Per-Skill Damage & Casts */}
                  {damageSkillMembers.length > 0 && (
                    <div className="mb-3 p-2 bg-surface rounded border border-border">
                      <div className="text-xs text-tertiary mb-2">Damage Skills</div>
                      <div className="space-y-2">
                        {damageSkillMembers.map((member) => (
                          <div
                            key={member.memberIndex}
                            className="flex items-center gap-3 p-2 bg-surface-hover rounded"
                          >
                            <span
                              className="text-xs text-primary font-medium truncate w-24"
                              title={member.cardName || ''}
                            >
                              {member.cardName?.split(' ')[0] || `Slot ${member.memberIndex + 1}`}
                            </span>
                            <div className="flex-1 text-xs">
                              <span className="text-secondary">DMG/cast: </span>
                              <span className="text-blue-400 font-mono">
                                {formatDamage(member.skillDamage)}
                              </span>
                              <span className="text-tertiary ml-1">
                                ({formatDamage(member.skillDamageMin)}-{formatDamage(member.skillDamageMax)})
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-tertiary">×</span>
                              <input
                                type="number"
                                value={member.skillCasts}
                                onChange={(e) =>
                                  updateMemberSkillCasts(
                                    snapshot.id,
                                    member.memberIndex,
                                    Math.max(0, parseInt(e.target.value) || 0)
                                  )
                                }
                                className="w-12 px-1 py-0.5 bg-surface border border-border rounded text-xs text-primary text-center"
                                min={0}
                              />
                              <span className="text-xs text-tertiary">casts</span>
                            </div>
                            {member.skillCasts > 0 && (
                              <div className="text-xs text-green-400 font-mono w-16 text-right">
                                = {formatDamage(member.skillDamage * member.skillCasts)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {result && result.skillDamage > 0 && (
                        <div className="text-xs text-tertiary mt-2 pt-2 border-t border-border">
                          Total Skill DMG: <span className="text-blue-400 font-mono">{formatDamage(result.skillDamage)}</span>
                          <span className="ml-2">
                            ({formatDamage(result.skillDamageMin)} - {formatDamage(result.skillDamageMax)})
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* No damage skills message */}
                  {damageSkillMembers.length === 0 && (
                    <div className="text-xs text-tertiary italic mb-2">
                      No damage skills on this team
                    </div>
                  )}

                  {/* Snapshot Damage Output */}
                  {result && (
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-sm">
                      <div>
                        <span className="text-tertiary">DPS Damage: </span>
                        <span className="font-mono text-primary">
                          {formatDamage(result.dpsDamage)}
                        </span>
                      </div>
                      <div>
                        <span className="text-tertiary">Skill Damage: </span>
                        <span className="font-mono text-blue-400">
                          {formatDamage(result.skillDamage)}
                        </span>
                      </div>
                      <div>
                        <span className="text-tertiary">Total: </span>
                        <span className="font-mono text-green-400">
                          {formatDamage(result.totalDamage)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Fight Summary */}
        {snapshots.length > 0 && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h4 className="text-sm font-medium text-primary mb-3">Fight Summary</h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
              <div>
                <div className="text-xs text-tertiary">Duration Used</div>
                <div className="text-lg font-mono text-primary">
                  {results.totalDurationUsed}s
                </div>
                {results.remainingDuration > 0 && (
                  <div className="text-xs text-yellow-400">
                    {results.remainingDuration}s remaining
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-tertiary">Total Damage (Avg)</div>
                <div className="text-lg font-mono text-green-400">
                  {formatDamage(results.totalDamage)}
                </div>
              </div>
              <div>
                <div className="text-xs text-tertiary">Damage Range</div>
                <div className="text-sm font-mono text-secondary">
                  {formatDamage(results.totalDamageMin)} - {formatDamage(results.totalDamageMax)}
                </div>
              </div>
              <div>
                <div className="text-xs text-tertiary">Avg DPS Over Fight</div>
                <div className="text-lg font-mono text-purple-400">
                  {results.totalDurationUsed > 0
                    ? formatNum(Math.round(results.totalDamage / results.totalDurationUsed))
                    : 0}
                  /s
                </div>
              </div>
            </div>

            {results.remainingDuration > 0 && (
              <div className="text-xs text-yellow-400 italic">
                Note: {results.remainingDuration}s of the {fightDuration}s fight duration is not
                covered by snapshots. Consider adding a "Base (no skills)" snapshot for the
                remaining time.
              </div>
            )}
          </div>
        )}
      </div>
    </details>
  );
});

// Export functions for external use
export { type StoredFightState, FIGHT_STORAGE_KEY };
