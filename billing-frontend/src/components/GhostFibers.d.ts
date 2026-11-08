import { HTMLAttributes, ComponentType } from 'react';

export type GhostFibersFiberStyle = 'dots' | 'dashes' | 'lines';
export type GhostFibersGradient = 'depth' | 'along' | 'across';
export type GhostFibersHoverEffect = 'focus' | 'part' | 'none';

export interface GhostFibersProps extends HTMLAttributes<HTMLDivElement> {
  glowColor?: string;
  lineColor?: string;
  secondaryColor?: string;
  gradient?: GhostFibersGradient;
  speed?: number;
  scale?: number;
  rotation?: number;
  rollSpeed?: number;
  layers?: number;
  waves?: number;
  twist?: number;
  threads?: number;
  volume?: number;
  spread?: number;
  density?: number;
  thickness?: number;
  flow?: number;
  fiberStyle?: GhostFibersFiberStyle;
  tips?: number;
  foldGlow?: number;
  perspective?: number;
  depthOfField?: number;
  focusDepth?: number;
  particles?: number;
  sparkle?: number;
  glow?: number;
  brightness?: number;
  vignette?: number;
  grain?: number;
  mouseInteraction?: boolean;
  hoverEffect?: GhostFibersHoverEffect;
  mouseStrength?: number;
  pulseOnClick?: boolean;
  intro?: boolean;
  lightMode?: boolean;
  paused?: boolean;
  dpr?: number;
}

declare const GhostFibers: ComponentType<GhostFibersProps>;
export default GhostFibers;

