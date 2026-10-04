'use client';
import {createContext,useContext,type ReactNode} from 'react';
const NasDesktopContext=createContext(false);
export const NAS_DESKTOP_SECTIONS=['general','appearance','network','storage','docker','integrations','users','security','notifications','advanced'] as const;
export function desktopSectionEnabled(id:string,nasMode:boolean) {
  return !nasMode || (NAS_DESKTOP_SECTIONS as readonly string[]).includes(id);
}
export function DesktopModeProvider({nasMode,children}:{nasMode:boolean;children:ReactNode}) {
  return <NasDesktopContext.Provider value={nasMode}>{children}</NasDesktopContext.Provider>;
}
export const useNasDesktop=()=>useContext(NasDesktopContext);
