import type { ComponentType } from 'react';
import type { SceneKind } from '../kinds';
import type { SceneArtProps } from './types';
import Cabinet from './Cabinet';
import TvInterview from './TvInterview';
import Press from './Press';
import Parliament from './Parliament';
import EconTv from './EconTv';
import FieldVisit from './FieldVisit';
import Summit from './Summit';
import Signing from './Signing';
import ExecOrder from './ExecOrder';
import Address from './Address';
import WarRoom from './WarRoom';
import Deployment from './Deployment';
import Airstrike from './Airstrike';
import Nuclear from './Nuclear';
import Covert from './Covert';
import Streets from './Streets';
import Election from './Election';
import Disaster from './Disaster';
import Ceasefire from './Ceasefire';
import UnVote from './UnVote';

export const SCENE_ART: Record<SceneKind, ComponentType<SceneArtProps>> = {
  cabinet: Cabinet,
  tv_interview: TvInterview,
  press: Press,
  parliament: Parliament,
  econ_tv: EconTv,
  field_visit: FieldVisit,
  summit: Summit,
  signing: Signing,
  exec_order: ExecOrder,
  address: Address,
  war_room: WarRoom,
  deployment: Deployment,
  airstrike: Airstrike,
  nuclear: Nuclear,
  covert: Covert,
  streets: Streets,
  election: Election,
  disaster: Disaster,
  ceasefire: Ceasefire,
  un_vote: UnVote,
};
