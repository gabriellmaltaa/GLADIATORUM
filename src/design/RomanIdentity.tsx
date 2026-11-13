import React, { useId } from 'react';
import atlas from '../assets/images/roman-world-atlas.png';

export type RomanScene = 'arsenal' | 'city' | 'map' | 'arena';

/** Decorative artwork stays separate from the live, accessible controls. */
export function RomanSceneArt({ scene, className = '', children, label }: {
  scene: RomanScene; className?: string; children?: React.ReactNode; label?: string;
}) {
  return <div className={`roman-scene scene-${scene} ${className}`} style={{ '--roman-atlas': `url(${atlas})` } as React.CSSProperties}>
    <div className="roman-scene-art" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />
    {children}
  </div>;
}

export function NavigationEmblem({ kind }: { kind: string }) {
  const id = useId().replace(/:/g, '');
  return <svg viewBox="0 0 100 90" aria-hidden="true" className="navigation-emblem">
    <defs>
      <linearGradient id={`${id}gold`} x1="0" y1="0" x2=".8" y2="1"><stop stopColor="#fff0b4"/><stop offset=".3" stopColor="#c59a50"/><stop offset=".55" stopColor="#72502b"/><stop offset=".75" stopColor="#e5c47d"/><stop offset="1" stopColor="#62401e"/></linearGradient>
      <linearGradient id={`${id}paper`}><stop stopColor="#8b572a"/><stop offset=".3" stopColor="#e4c58e"/><stop offset=".7" stopColor="#bea06a"/><stop offset="1" stopColor="#65401e"/></linearGradient>
      <linearGradient id={`${id}steel`} x2=".7" y2="1"><stop stopColor="#fbecce"/><stop offset=".4" stopColor="#9da39c"/><stop offset=".5" stopColor="#fff2ce"/><stop offset="1" stopColor="#4f5351"/></linearGradient>
    </defs>
    <g fill={`url(#${id}gold)`} stroke="#3c2716" strokeWidth="1.5" strokeLinejoin="round">
      {kind === 'character' && <><path d="M24 75L29 58 41 52 41 44 35 36 35 22Q50 4 65 22L65 36 59 44 59 52 72 58 78 75Z"/><path d="M32 25Q32 8 50 7Q69 8 68 25L61 22 57 15 43 15 39 24Z"/><path d="M38 29L45 27M55 27L62 29M44 40Q50 44 56 40M47 30L46 36 52 36M41 52L50 62 59 52M29 58L43 68 43 75M72 58L57 68 57 75" fill="none" stroke="#f5d994"/><path d="M22 76H79V82H22Z"/></>}
      {kind === 'expeditions' && <><path d="M34 17L55 10 82 19 77 68 55 61 29 70Z" fill={`url(#${id}paper)`}/><path d="M55 10V61M63 24L73 30 61 39 71 49" fill="none" stroke="#80603b" strokeDasharray="3 3"/><circle cx="30" cy="52" r="26"/><circle cx="30" cy="52" r="20" fill="#51422c"/><path d="M30 30L35 48 51 52 35 57 30 74 25 57 9 52 25 48Z"/><path d="M30 35V69M14 52H46" stroke="#f1dba0"/></>}
      {kind === 'arena' && <><path d="M50 5L74 17 80 48Q74 72 50 83Q26 72 20 48L26 17Z" fill="#6d3d22"/><path d="M50 12L68 21 72 46Q67 64 50 74Q33 64 28 46L32 21Z"/><g fill="none" strokeWidth="4"><path d="M14 66Q1 45 16 26M86 66Q99 45 84 26" stroke="#b58b45"/></g><g fill={`url(#${id}steel)`}><path d="M22 17L32 22 72 65 65 72 25 30Z"/><path d="M78 17L68 22 28 65 35 72 75 30Z"/></g><path d="M58 63L69 54 74 59 63 69ZM26 59L31 54 42 63 37 69Z"/><path d="M68 68L79 80M32 68L21 80" stroke="#e4c17b" strokeWidth="6"/></>}
      {kind === 'inventory' && <><path d="M14 37Q14 10 50 10Q86 10 86 37V75H14Z" fill="#56321f"/><path d="M14 37H86V75H14Z" fill={`url(#${id}paper)`}/><path d="M15 38Q15 17 50 17Q85 17 85 38ZM25 16V74H34V13ZM66 13V74H75V16Z"/><path d="M14 44H86V51H14ZM14 68H86V76H14Z"/><rect x="42" y="40" width="16" height="21" rx="2"/><circle cx="50" cy="49" r="3" fill="#3b2516"/><path d="M50 50V56" stroke="#3b2516" strokeWidth="3"/></>}
      {kind === 'city' && <><path d="M9 29L50 7 91 29V35H9Z"/><path d="M20 30H80L50 14Z" fill="#66523a"/><path d="M15 37H85V43H15ZM12 73H88V80H12ZM8 81H92V86H8Z"/>{[20,37,55,72].map(x=><g key={x}><path d={`M${x} 43h9v29h-9Z`}/><path d={`M${x+3} 46v23`} stroke="#f1dba0"/><path d={`M${x-2} 69h13v5h-13Z`}/></g>)}</>}
    </g>
  </svg>;
}
