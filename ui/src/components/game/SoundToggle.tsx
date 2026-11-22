import { IconVolume, IconVolumeOff } from '@tabler/icons-react';
import { sound, useSoundSettings } from '../../lib/sound';
import '../../styles/game.css';

/**
 * The always-visible mute (design-feel.md 6.3): a 44 px speaker button for the HUD. Turning sound
 * on plays a quiet tap so the player hears what they enabled.
 */
export function SoundToggle({ className = '' }: { className?: string }) {
  const { on } = useSoundSettings();
  return (
    <button
      type="button"
      className={`wc-sound-toggle ${on ? 'is-on' : 'is-off'} ${className}`.trim()}
      aria-pressed={on}
      aria-label={on ? 'Sound on, press to mute' : 'Sound off, press to turn on'}
      title={on ? 'Sound on (press to mute)' : 'Sound off (press to turn on)'}
      onClick={() => {
        sound.setOn(!on);
        if (!on) sound.play('tap');
      }}
    >
      {on ? <IconVolume size={20} aria-hidden /> : <IconVolumeOff size={20} aria-hidden />}
    </button>
  );
}

/** The Sound section of Settings: on/off and a volume slider (0 to 100, default 55). */
export function SoundSettingsSection() {
  const { on, volume } = useSoundSettings();
  return (
    <div className="wc-sound-settings">
      <div className="section-label">Sound</div>
      <label className="setting-row">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => {
            sound.setOn(e.target.checked);
            if (e.target.checked) sound.play('tap');
          }}
        />
        <span>
          <b>Sound effects</b> Short synthesized sounds when you press, choose, spend political capital and execute the month, and for big moments. The speaker button at the top mutes them at any time.
        </span>
      </label>
      <label className="wc-volume-row">
        <span>Volume</span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={volume}
          disabled={!on}
          aria-valuetext={`${volume} out of 100`}
          onChange={(e) => sound.setVolume(Number(e.target.value))}
          onPointerUp={() => sound.play('stamp')}
          onKeyUp={() => sound.play('tap')}
        />
        <span className="num">{volume}</span>
      </label>
    </div>
  );
}
