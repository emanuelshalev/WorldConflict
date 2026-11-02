import type { MapEffect } from '../scenes/OutcomeMap';

/** Which geographic animation an order gets in the dispatch panel. */
export function mapEffect(type?: string): MapEffect | null {
  switch (type) {
    case 'MILITARY_DEPLOY_BORDER': return 'deploy';
    case 'MILITARY_WITHDRAW_BORDER': return 'withdraw';
    case 'MILITARY_AIRSTRIKE':
    case 'INTEL_SABOTAGE': return type === 'INTEL_SABOTAGE' ? 'covert' : 'strike';
    case 'NUCLEAR_STRIKE': return 'nuke';
    case 'DIPLOMACY_PROPOSE_ALLIANCE': return 'alliance';
    case 'DIPLOMACY_IMPROVE_RELATIONS': return 'court';
    case 'DIPLOMACY_DENOUNCE':
    case 'DIPLOMACY_BREAK_ALLIANCE': return 'denounce';
    case 'DIPLOMACY_PROPOSE_CEASEFIRE':
    case 'DIPLOMACY_MEDIATE': return 'ceasefire';
    case 'DIPLOMACY_DECLARE_WAR': return 'war';
    default: return type?.startsWith('INTEL_') ? 'covert' : null;
  }
}
