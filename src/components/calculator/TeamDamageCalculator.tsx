/**
 * Team Damage Calculator
 * Main container component for the 5-member team + 2 reserve calculator
 */

import { useState, useRef } from 'react';
import { useTeamState } from './useTeamReducer';
import { TeamTabs } from './TeamTabs';
import { TeamMemberPanel } from './TeamMemberPanel';
import { EnemyConfig } from './EnemyConfig';
import { TeamSummary } from './TeamSummary';
import { AbilityTargetOverrides } from './AbilityTargetOverrides';
import { FightCalculator, type FightCalculatorHandle, FIGHT_STORAGE_KEY } from './FightCalculator';

export function TeamDamageCalculator() {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const fightCalculatorRef = useRef<FightCalculatorHandle>(null);

  const {
    state,
    nonAssistCards,
    assistCards,
    setCard,
    setAssist,
    setLimitBreak,
    setBondSlot,
    toggleSkill,
    setActiveTab,
    setEnemyBaseShield,
    setEnemyAttribute,
    setFinalWave,
    setWaveCount,
    setIgnoreShieldCap,
    setWorldBossBonus,
    setHealersDontAttack,
    setAbilityTargets,
    setRandomTargetMode,
    clearMember,
    clearAll,
    exportTeam,
    importTeam,
    calculationResults,
  } = useTeamState();

  const handleExport = async () => {
    // Combine team and fight data
    const teamJson = exportTeam();
    const teamData = JSON.parse(teamJson);
    const fightData = fightCalculatorRef.current?.exportFight();
    const combined = {
      ...teamData,
      fight: fightData ? JSON.parse(fightData) : undefined,
    };
    const json = JSON.stringify(combined, null, 2);

    try {
      await navigator.clipboard.writeText(json);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // Fallback: download as file
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'team-config.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImport = () => {
    setImportError(null);
    if (!importText.trim()) {
      setImportError('Please paste team configuration JSON');
      return;
    }

    try {
      const data = JSON.parse(importText);

      // Import team data
      const success = importTeam(importText);
      if (!success) {
        setImportError('Invalid team configuration format');
        return;
      }

      // Import fight data if present
      if (data.fight && fightCalculatorRef.current) {
        fightCalculatorRef.current.importFight(JSON.stringify(data.fight));
      }

      setShowImportModal(false);
      setImportText('');
    } catch {
      setImportError('Invalid JSON format');
    }
  };

  const handleResetAll = () => {
    clearAll();
    fightCalculatorRef.current?.clearAll();
    // Also clear fight storage directly in case ref isn't ready
    try {
      localStorage.removeItem(FIGHT_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear fight storage:', e);
    }
  };

  // Loading state
  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <div className="text-secondary">Loading card data...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-center">
        <div className="text-red-400 font-medium mb-2">Failed to load data</div>
        <div className="text-sm text-secondary">{state.error}</div>
      </div>
    );
  }

  const activeMember = state.members[state.activeTabIndex];

  // Get debuff values from calculation results
  const skillDebuffTotal = calculationResults?.skillDebuffTotal ?? 0;
  const abilityDebuffTotal = calculationResults?.abilityDebuffTotal ?? 0;
  const defenseDebuffTotal = calculationResults?.defenseDebuffTotal ?? 0;
  const effectiveEnemyShield = calculationResults?.effectiveEnemyShield ?? state.enemy.baseShield;
  const raceBonus = calculationResults?.raceBonus ?? 0;
  const enemyDebuffContributions = calculationResults?.enemyDebuffContributions ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary">Team Damage Calculator</h2>
          <p className="text-sm text-secondary mt-1">
            Configure your 5-member team and 2 reserve slots to calculate damage output
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
          >
            {copySuccess ? 'Copied!' : 'Export'}
          </button>
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
          >
            Import
          </button>
          <button
            type="button"
            onClick={handleResetAll}
            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            Reset All
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left sidebar: Summary and Enemy */}
        <div className="xl:col-span-1 space-y-4 order-2 xl:order-1">
          <TeamSummary
            members={state.members}
            onSelectMember={setActiveTab}
            activeIndex={state.activeTabIndex}
          />
          <EnemyConfig
            enemy={state.enemy}
            onBaseShieldChange={setEnemyBaseShield}
            onAttributeChange={setEnemyAttribute}
            onFinalWaveChange={setFinalWave}
            onWaveCountChange={setWaveCount}
            onIgnoreShieldCapChange={setIgnoreShieldCap}
            onWorldBossBonusChange={setWorldBossBonus}
            onHealersDontAttackChange={setHealersDontAttack}
            effectiveShield={effectiveEnemyShield}
            skillDebuffTotal={skillDebuffTotal}
            abilityDebuffTotal={abilityDebuffTotal}
            defenseDebuffTotal={defenseDebuffTotal}
            enemyDebuffContributions={enemyDebuffContributions}
            raceBonus={raceBonus}
            randomTargetMode={state.randomTargetMode}
            onRandomTargetModeChange={setRandomTargetMode}
          />
        </div>

        {/* Main content: Tabs and Member Panel */}
        <div className="xl:col-span-3 order-1 xl:order-2">
          {/* Tabs */}
          <TeamTabs
            members={state.members}
            activeIndex={state.activeTabIndex}
            onSelectTab={setActiveTab}
          />

          {/* Active member panel */}
          <div className="bg-surface-hover rounded-lg p-4">
            <TeamMemberPanel
              member={activeMember}
              memberIndex={state.activeTabIndex}
              nonAssistCards={nonAssistCards}
              assistCards={assistCards}
              onSetCard={(cardId) => setCard(state.activeTabIndex, cardId)}
              onSetAssist={(cardId) => setAssist(state.activeTabIndex, cardId)}
              onSetLimitBreak={(value) => setLimitBreak(state.activeTabIndex, value)}
              onSetBondSlot={(slot, value) => setBondSlot(state.activeTabIndex, slot, value)}
              onToggleSkill={() => toggleSkill(state.activeTabIndex)}
              onClear={() => clearMember(state.activeTabIndex)}
            />
          </div>
        </div>
      </div>

      {/* Ability Target Overrides (collapsible) */}
      <AbilityTargetOverrides
        members={state.members}
        abilityTargetOverrides={state.abilityTargetOverrides}
        onSetAbilityTargets={setAbilityTargets}
      />

      {/* Fight Calculator (collapsible) */}
      <FightCalculator ref={fightCalculatorRef} members={state.members} />

      {/* Formula reference (collapsible) */}
      <details className="bg-surface rounded-lg">
        <summary className="px-4 py-3 cursor-pointer text-sm text-secondary hover:text-primary">
          Formula Reference
        </summary>
        <div className="px-4 pb-4 text-xs text-secondary font-mono space-y-1">
          <div>Normal: ATK * (1 + DMG%) * (1 - EnemyShield)</div>
          <div>Skill: SkillBase * (1 + SkillBond%) * (1 + SkillDMG%) * (1 - EnemyShield)</div>
          <div>Expected: BaseDMG * (1 + CritRate * (CritMult - 1))</div>
          <div>DPS: ExpectedDMG / AttackInterval</div>
          <div className="pt-2 border-t border-border mt-2">
            <span className="text-yellow-400">Caps:</span> Normal 99,999 | Skill 999,999 | Crit Rate 100% | Shield 85%
          </div>
        </div>
      </details>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-auto">
            <h3 className="text-lg font-bold text-primary mb-4">Import Team Configuration</h3>
            <p className="text-sm text-secondary mb-4">
              Paste the team configuration JSON below:
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='{"version": 1, "members": [...], ...}'
              className="w-full h-48 bg-surface-hover border border-border rounded-lg p-3 text-sm font-mono text-primary resize-none focus:outline-none focus:border-blue-500"
            />
            {importError && (
              <p className="text-red-400 text-sm mt-2">{importError}</p>
            )}
            <div className="flex gap-2 mt-4 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportText('');
                  setImportError(null);
                }}
                className="px-4 py-2 bg-surface-hover text-secondary rounded-lg hover:bg-surface transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
