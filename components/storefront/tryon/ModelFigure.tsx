import { useId } from "react";

export type Face = { src: string; z: number; x: number; y: number };

type Props = {
  colour: string;
  accent: string;
  printed: boolean;
  face: Face | null;
  label: string;
  className?: string;
};

const SKIN = "#C69676";
const HAIR = "#2A1A14";

// The drawn model from the prototype, dressed in the fabric's colours. With a face photo,
// the photo is clipped into the head oval; otherwise a drawn head is shown.
export default function ModelFigure({ colour: c, accent: a, printed, face, label, className }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const embroidered = !printed;
  const s = face ? 56 * face.z : 0;
  const fx = face ? 100 - s / 2 + face.x * s : 0;
  const fy = face ? 76 - s / 2 + face.y * s : 0;

  return (
    <svg viewBox="0 0 200 520" role="img" aria-label={label} className={className}>
      <defs>
        {printed ? (
          <pattern id={`${uid}k`} width="16" height="16" patternUnits="userSpaceOnUse">
            <rect width="16" height="16" fill={c} />
            <circle cx="8" cy="8" r="3" fill="none" stroke={a} strokeWidth=".8" opacity=".8" />
            <circle cx="8" cy="8" r="1" fill={a} />
            <circle cx="0" cy="0" r="1.2" fill={a} opacity=".6" />
            <circle cx="16" cy="16" r="1.2" fill={a} opacity=".6" />
          </pattern>
        ) : (
          <pattern id={`${uid}k`} width="14" height="14" patternUnits="userSpaceOnUse">
            <rect width="14" height="14" fill={c} />
            <path d="M7 1.5 L12.5 7 L7 12.5 L1.5 7Z" fill="none" stroke={a} strokeWidth=".6" opacity=".6" />
            <circle cx="7" cy="7" r="1" fill={a} opacity=".9" />
          </pattern>
        )}
        <pattern id={`${uid}d`} width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill={a} />
          <circle cx="6" cy="6" r="1.3" fill={c} opacity=".55" />
        </pattern>
        <pattern id={`${uid}b`} width="10" height="12" patternUnits="userSpaceOnUse">
          <rect width="10" height="12" fill={embroidered ? "#7A5A22" : c} />
          <path d="M0 2 L5 7 L10 2" fill="none" stroke="#E6CB8E" strokeWidth="1" />
          <circle cx="5" cy="10" r="1" fill="#E6CB8E" />
        </pattern>
        {face && (
          <clipPath id={`${uid}h`}>
            <ellipse cx="100" cy="76" rx="22" ry="26" />
          </clipPath>
        )}
      </defs>

      <ellipse cx="100" cy="506" rx="62" ry="9" fill="rgba(0,0,0,.28)" />
      <path d="M77 372 L70 494 L95 494 L100 392 L105 494 L130 494 L123 372Z" fill={c} />
      <path d="M77 372 L70 494 L95 494 L100 392 L105 494 L130 494 L123 372Z" fill="rgba(0,0,0,.3)" />
      <path d="M70 486 H95 M105 486 H130" stroke={a} strokeWidth="3" />
      <ellipse cx="82" cy="499" rx="12" ry="5" fill="#3A2A22" />
      <ellipse cx="118" cy="499" rx="12" ry="5" fill="#3A2A22" />
      <path d="M62 330 L36 120 L52 116 L80 300Z" fill={`url(#${uid}d)`} opacity=".95" />
      <rect x="92" y="98" width="16" height="22" rx="6" fill={SKIN} />
      <path d="M70 124 L46 246 L58 250 L82 156Z" fill={`url(#${uid}k)`} stroke="rgba(0,0,0,.2)" strokeWidth=".8" />
      <path d="M130 124 L154 246 L142 250 L118 156Z" fill={`url(#${uid}k)`} stroke="rgba(0,0,0,.2)" strokeWidth=".8" />
      <path d="M46 240 L58 244" stroke={a} strokeWidth="4" />
      <path d="M154 240 L142 244" stroke={a} strokeWidth="4" />
      <circle cx="51" cy="256" r="7" fill={SKIN} />
      <circle cx="149" cy="256" r="7" fill={SKIN} />
      <path d="M70 122 Q100 112 130 122 L152 386 Q100 400 48 386Z" fill={`url(#${uid}k)`} stroke="rgba(0,0,0,.22)" strokeWidth="1" />
      <path d="M50 370 Q100 384 150 370 L152 386 Q100 400 48 386Z" fill={`url(#${uid}b)`} />
      {embroidered ? (
        <>
          <path d="M86 120 Q100 150 114 120" fill="none" stroke="#E6CB8E" strokeWidth="2.4" strokeDasharray="1 3" strokeLinecap="round" />
          <path d="M100 146 V250" stroke="#E6CB8E" strokeWidth="2" strokeDasharray="1 4" strokeLinecap="round" />
          <path d="M84 118 Q100 156 116 118" fill="none" stroke="#E6CB8E" strokeWidth="1.2" />
        </>
      ) : (
        <path d="M88 120 Q100 140 112 120" fill="none" stroke={a} strokeWidth="1.6" />
      )}
      <path d="M72 120 C92 166 124 230 156 312 L168 302 C142 224 114 150 88 112Z" fill={`url(#${uid}d)`} stroke="#C8A15A" strokeWidth="1.2" opacity=".96" />
      <path d="M156 312 L168 302" stroke="#C8A15A" strokeWidth="4" />

      {face ? (
        <>
          <image
            href={face.src}
            x={fx.toFixed(1)}
            y={fy.toFixed(1)}
            width={s.toFixed(1)}
            height={s.toFixed(1)}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${uid}h)`}
          />
          <ellipse cx="100" cy="76" rx="22" ry="26" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="1.2" />
        </>
      ) : (
        <>
          <path d="M76 70 C74 44 126 44 124 70 C126 92 120 104 112 106 L88 106 C80 104 74 92 76 70Z" fill={HAIR} />
          <ellipse cx="100" cy="78" rx="19" ry="23" fill={SKIN} />
          <path d="M80 70 C82 52 118 50 121 68 C112 60 96 58 80 70Z" fill={HAIR} />
          <circle cx="124" cy="54" r="10" fill={HAIR} />
          <path d="M92 88 Q100 92 108 88" fill="none" stroke="#8A5A44" strokeWidth="1.2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

// A drawn sample face (not a real person) so visitors can try the sliders without a photo.
const sampleSvg =
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>" +
  "<rect width='200' height='200' fill='#E9DFD0'/>" +
  "<path d='M38 120 C30 40 170 40 162 120 C166 170 150 196 130 200 L70 200 C50 196 34 170 38 120Z' fill='#3B2418'/>" +
  "<ellipse cx='100' cy='108' rx='50' ry='62' fill='#D3A27F'/>" +
  "<path d='M50 92 C56 50 146 46 152 90 C130 70 82 66 50 92Z' fill='#3B2418'/>" +
  "<ellipse cx='80' cy='108' rx='6' ry='4' fill='#3B2418'/><ellipse cx='120' cy='108' rx='6' ry='4' fill='#3B2418'/>" +
  "<path d='M70 96 Q80 90 90 96 M110 96 Q120 90 130 96' fill='none' stroke='#3B2418' stroke-width='3' stroke-linecap='round'/>" +
  "<path d='M100 112 Q96 128 102 132' fill='none' stroke='#A9765A' stroke-width='3' stroke-linecap='round'/>" +
  "<path d='M84 146 Q100 158 116 146' fill='none' stroke='#B5485F' stroke-width='5' stroke-linecap='round'/>" +
  "<circle cx='66' cy='130' r='9' fill='#E8A3A0' opacity='.45'/><circle cx='134' cy='130' r='9' fill='#E8A3A0' opacity='.45'/>" +
  "</svg>";

export const SAMPLE_FACE: Face = { src: `data:image/svg+xml,${encodeURIComponent(sampleSvg)}`, z: 1.15, x: 0, y: 0.04 };
