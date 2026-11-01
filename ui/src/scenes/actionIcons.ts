import {
  IconArrowBackUp,
  IconAtom,
  IconBomb,
  IconBuildingBank,
  IconCrown,
  IconEye,
  IconFlame,
  IconHandStop,
  IconHeartHandshake,
  IconMessageCircleOff,
  IconMicrophone,
  IconPeace,
  IconPlane,
  IconRadioactive,
  IconScale,
  IconShield,
  IconShieldCheck,
  IconShieldOff,
  IconShoppingCart,
  IconSpeakerphone,
  IconSpy,
  IconSwords,
  IconTank,
  IconTarget,
  IconTruck,
  IconUsersGroup,
  IconWritingSign,
  type Icon,
} from '@tabler/icons-react';


/** One icon and one colour family per order, used on buttons, pills and outcome cards. */
export const ACTION_ICON: Record<string, Icon> = {
  DIPLOMACY_IMPROVE_RELATIONS: IconHeartHandshake,
  DIPLOMACY_DENOUNCE: IconSpeakerphone,
  DIPLOMACY_PROPOSE_ALLIANCE: IconShieldCheck,
  DIPLOMACY_BREAK_ALLIANCE: IconShieldOff,
  DIPLOMACY_DECLARE_WAR: IconSwords,
  DIPLOMACY_PROPOSE_CEASEFIRE: IconPeace,
  DIPLOMACY_MEDIATE: IconScale,
  MILITARY_MOBILIZE: IconTank,
  MILITARY_DEMOBILIZE: IconArrowBackUp,
  MILITARY_PROCURE: IconShoppingCart,
  MILITARY_AIRSTRIKE: IconPlane,
  MILITARY_DEPLOY_BORDER: IconTruck,
  MILITARY_WITHDRAW_BORDER: IconArrowBackUp,
  NUCLEAR_FUND_PROGRAM: IconAtom,
  NUCLEAR_STRIKE: IconRadioactive,
  ECONOMY_ADJUST_MILITARY_BUDGET: IconBuildingBank,
  INTEL_GATHER: IconEye,
  INTEL_COUNTER_INTEL: IconShield,
  INTEL_SABOTAGE: IconBomb,
  INTEL_DESTABILIZE: IconFlame,
  INTEL_SUPPORT_REBELS: IconUsersGroup,
  INTEL_MISINFORMATION: IconMessageCircleOff,
  INTEL_PROPAGANDA: IconSpy,
  INTEL_ASSASSINATE: IconTarget,
  INTEL_COUP: IconCrown,
  DOMESTIC_PROPAGANDA: IconMicrophone,
  DOMESTIC_REFORM: IconWritingSign,
  DOMESTIC_POLICING: IconHandStop,
};

export function actionFamily(type: string | undefined): 'diplo' | 'mil' | 'nuke' | 'intel' | 'home' {
  if (!type) return 'home';
  if (type.startsWith('DIPLOMACY')) return type === 'DIPLOMACY_DECLARE_WAR' ? 'mil' : 'diplo';
  if (type.startsWith('NUCLEAR')) return 'nuke';
  if (type.startsWith('MILITARY') || type.startsWith('ECONOMY')) return 'mil';
  if (type.startsWith('INTEL')) return 'intel';
  return 'home';
}

export const FAMILY_COLOR = {
  diplo: '#4c8dff',
  mil: '#ff5a4f',
  nuke: '#f5d547',
  intel: '#36c5f0',
  home: '#b48cff',
} as const;

