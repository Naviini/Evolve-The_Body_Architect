import Svg, { G, Path } from 'react-native-svg';

/** Classic waving-hand yellow / gold fill (emoji-style greeting). */
export const WAVING_HAND_COLOR = '#FFCC4D' as const;

/** Dark blue motion arcs beside the hand (matches UI reference). */
export const WAVING_HAND_MOTION_BLUE = '#1E40AF' as const;

export interface WavingHandSvgProps {
  size?: number;
  /** Palm / fingers fill */
  color?: string;
  /** Wave cue arcs — defaults to dark blue */
  motionColor?: string;
}

/** 👋 Palm forward, slight tilt right + blue motion marks left & right. */
export function WavingHandSvg({
  size = 22,
  color = WAVING_HAND_COLOR,
  motionColor,
}: WavingHandSvgProps) {
  const mc = motionColor ?? WAVING_HAND_MOTION_BLUE;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      accessibilityRole="image"
      accessibilityLabel="Waving hand"
    >
      {/* Left-side wave marks (near pinky / top of hand) */}
      <Path
        d="M13 15 Q 9 12 10 8.5"
        stroke={mc}
        strokeWidth={1.65}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M12 18 Q 8 15 9 11"
        stroke={mc}
        strokeWidth={1.55}
        strokeLinecap="round"
        fill="none"
        opacity={0.9}
      />

      {/* Right-side wave marks (near thumb) */}
      <Path
        d="M35 15 Q 39 12 38 8.5"
        stroke={mc}
        strokeWidth={1.65}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M36 18 Q 40 15 39 11"
        stroke={mc}
        strokeWidth={1.55}
        strokeLinecap="round"
        fill="none"
        opacity={0.9}
      />

      {/* Tilt slightly clockwise (to the right) */}
      <G transform="rotate(14 26 26)">
        <Path
          fill={color}
          d="
            M29.5 39.5
            H18.8
            c-2.4 0-4.4-1.9-4.5-4.3
            l-1.1-14.2
            c-.15-2 1.35-3.75 3.35-3.85
            c1.85-.05 3.35 1.25 3.55 3.05
            l.45 7.8
            L21 13.9
            c.15-2 1.75-3.55 3.75-3.55
            s3.65 1.55 3.75 3.55
            l.35 10.4
            .35-9.9
            c.15-1.95 1.85-3.45 3.8-3.35
            c1.85.1 3.35 1.65 3.45 3.5
            l.55 10.6
            .4-9.6
            c.2-1.95 1.95-3.35 3.9-3.25
            c1.9.1 3.35 1.55 3.5 3.45
            l.65 11.8
            V37
            c0 2.6-2.1 4.75-4.75 4.75
            z
          "
        />
        <Path
          fill={color}
          d="
            M17.2 31.8
            c-1.25-.15-2.35-.95-2.85-2.15
            c-.85-1.95.45-4.15 2.45-4.65
            c1.35-.35 2.7.05 3.55 1.05
            l2.55 3.65
            c.55.75.15 1.85-.85 2.05
            c-.75.15-1.5-.05-2.05-.55
            l-1.15-1.1
            z
          "
        />
      </G>
    </Svg>
  );
}
