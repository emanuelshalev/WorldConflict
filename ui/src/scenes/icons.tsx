import { IconMicrophone } from '@tabler/icons-react';
import { ACTION_ICON, FAMILY_COLOR, actionFamily } from './actionIcons';

export function ActionIcon({ type, size = 16 }: { type?: string; size?: number }) {
  const I = (type && ACTION_ICON[type]) || IconMicrophone;
  return <I size={size} stroke={1.8} color={FAMILY_COLOR[actionFamily(type)]} aria-hidden />;
}
