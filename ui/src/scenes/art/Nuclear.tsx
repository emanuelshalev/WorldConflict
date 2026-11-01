import type { SceneArtProps } from './types';

// Placeholder until the illustration lands
export default function Nuclear({ a }: SceneArtProps) {
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="640" height="360" fill="#141b27" />
      <rect x="0" y="300" width="640" height="60" fill={a[0]} opacity="0.3" />
    </svg>
  );
}
