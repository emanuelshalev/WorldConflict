import { createContext, useContext } from 'react';

/** Per-instance suffix for SVG ids, so two copies of a scene never share gradients. */
export const SceneUid = createContext('s');
export const useSceneUid = () => useContext(SceneUid);
