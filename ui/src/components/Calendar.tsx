import { useState } from 'react';
import { IconBuildingCommunity, IconCalendarEvent, IconMicrophone, IconPhoneCall, IconUsers, IconX, IconMessageCircle } from '@tabler/icons-react';
import { countryName, MEETING_SLOTS, type Meeting, useGameStore, usePlayerCountry } from '../store/gameStore';
import { arrowText, effectArrows, flag } from '../lib/format';
import { useModalFocus } from '../lib/useModalFocus';
import { SceneFrame } from '../scenes/SceneFrame';
import type { SceneKind } from '../scenes/kinds';

const KIND: Record<Meeting['kind'], { label: string; scene: SceneKind; Icon: typeof IconPhoneCall; slot: string }> = {
  CALL: { label: 'Call', scene: 'address', Icon: IconPhoneCall, slot: 'Phone' },
  STAFF: { label: 'Staff', scene: 'cabinet', Icon: IconUsers, slot: 'Cabinet room' },
  VISIT: { label: 'Visit', scene: 'summit', Icon: IconBuildingCommunity, slot: 'State visit' },
  PRESS: { label: 'Press', scene: 'tv_interview', Icon: IconMicrophone, slot: 'Studio' },
};
const DAYS = ['Mon 09:00', 'Tue 14:30', 'Wed 11:00', 'Thu 16:00', 'Fri 10:00'];

/** Which minister to consult about a meeting. */
function advisorFor(m: Meeting): string {
  if (m.kind === 'CALL' || m.kind === 'VISIT') return 'FOREIGN_MINISTER';
  if (m.kind === 'PRESS') return 'CHIEF_OF_STAFF';
  if (/front|troops/i.test(m.title)) return 'DEFENSE_MINISTER';
  if (/economy/i.test(m.title)) return 'FINANCE_MINISTER';
  if (/unrest/i.test(m.title)) return 'DOMESTIC_ADVISOR';
  if (/intelligence/i.test(m.title)) return 'INTELLIGENCE_CHIEF';
  return 'CHIEF_OF_STAFF';
}

function MeetingModal({ meeting, onClose }: { meeting: Meeting; onClose: () => void }) {
  const me = usePlayerCountry();
  const choices = useGameStore((s) => s.decisionChoices);
  const choose = useGameStore((s) => s.chooseDecision);
  const consult = useGameStore((s) => s.consult);
  const agenda = useGameStore((s) => s.worldState?.agenda ?? []);
  const ref = useModalFocus<HTMLDivElement>(true);
  const k = KIND[meeting.kind];
  const attended = agenda.filter((m) => m.id !== meeting.id && choices[m.id] && choices[m.id] !== m.defaultOptionId).length;
  const full = attended >= MEETING_SLOTS;
  const picked = choices[meeting.id];
  return (
    <div ref={ref} className="overlay" role="dialog" aria-modal="true" aria-label={meeting.title} onClick={onClose}>
      <div className="meeting" onClick={(e) => e.stopPropagation()}>
        <SceneFrame
          kind={k.scene}
          home={me?.id}
          other={meeting.withCountry}
          size="card"
          live
          kicker={`${k.label}${meeting.withCountry ? ` ${flag(meeting.withCountry)}` : ''}`}
          headline={meeting.speaker}
        />
        <button className="meeting-close" onClick={onClose} aria-label="Close">
          <IconX size={18} />
        </button>
        <div className="meeting-body">
          <h3>{meeting.title}</h3>
          <blockquote>{meeting.situation}</blockquote>
          {full && !picked && <p className="meeting-full">Your calendar is full this month: answering this one means a deputy takes another.</p>}
          <div className="meeting-options">
            {meeting.options.map((o) => {
              const deputy = o.id === meeting.defaultOptionId;
              return (
                <button
                  key={o.id}
                  className={`option ${picked === o.id ? 'chosen' : ''} ${deputy ? 'deputy' : ''}`}
                  disabled={full && !deputy && picked !== o.id}
                  onClick={() => {
                    choose(meeting.id, o.id);
                    onClose();
                  }}
                >
                  <b>{o.label}</b>
                  <div className="desc">{o.description}</div>
                  <div className="arrows">
                    {effectArrows(o, countryName).map((a, i) => (
                      <span key={`${a.label}-${i}`} className={a.good ? 'delta-up' : 'delta-down'}>
                        {arrowText(a)}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
          <button className="wc-btn ghost consult-btn" onClick={() => consult(advisorFor(meeting), `${meeting.title}. ${meeting.situation} How should I respond?`)}>
            <IconMessageCircle size={16} /> Consult your staff first
          </button>
        </div>
      </div>
    </div>
  );
}

/** This month's calendar on the desk: calls, staff meetings, visits and interviews. */
export function Calendar() {
  const agenda = useGameStore((s) => s.worldState?.agenda ?? []);
  const choices = useGameStore((s) => s.decisionChoices);
  const [open, setOpen] = useState<string | null>(null);
  if (agenda.length === 0) return null;
  const attended = agenda.filter((m) => choices[m.id] && choices[m.id] !== m.defaultOptionId).length;
  const current = agenda.find((m) => m.id === open);
  return (
    <div className="calendar">
      <div className="calendar-head">
        <IconCalendarEvent size={16} />
        <span>This month's calendar</span>
        <span className="slots" aria-label={`${attended} of ${MEETING_SLOTS} meetings attended`}>
          {Array.from({ length: MEETING_SLOTS }, (_, i) => (
            <i key={i} className={i < attended ? 'on' : ''} />
          ))}
          {attended}/{MEETING_SLOTS} in person
        </span>
      </div>
      <div className="calendar-row">
        {agenda.map((m, i) => {
          const k = KIND[m.kind];
          const pick = m.options.find((o) => o.id === choices[m.id]);
          const deputy = pick && pick.id === m.defaultOptionId;
          return (
            <button key={m.id} className={`meet-card k-${m.kind.toLowerCase()} ${pick ? (deputy ? 'is-deputy' : 'is-done') : ''}`} onClick={() => setOpen(m.id)}>
              <span className="meet-when">
                <k.Icon size={14} /> {DAYS[i % DAYS.length]} · {k.slot}
              </span>
              <b>
                {m.withCountry ? `${flag(m.withCountry)} ` : ''}
                {m.speaker}
              </b>
              <span className="meet-status">{pick ? (deputy ? 'Deputy goes' : `You: ${pick.label}`) : 'Needs your answer'}</span>
            </button>
          );
        })}
      </div>
      {current && <MeetingModal meeting={current} onClose={() => setOpen(null)} />}
    </div>
  );
}
