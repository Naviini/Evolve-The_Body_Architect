/**
 * In-session form demo clips (HD MP4, streamable in expo-av).
 *
 * Mixkit (free license): https://mixkit.co/license/#videoFree
 *
 * Important: newer Mixkit uploads (many IDs ≥ ~100000) use `active_storage/...`
 * URLs. The old pattern `.../videos/{id}/{id}-720.mp4` returns 403 for those IDs,
 * which caused `expo-av` to error and swap in the generic fallback (wrong visuals).
 */

/** Full CDN URL when Mixkit does not serve `/videos/{id}/{id}-720.mp4` for an id. */
const MIXKIT_ACTIVE_STORAGE_BY_ID: Record<number, string> = {
  /** Woman on gym bench — close to chair/bench tricep dip setup (hands behind, torso up). */
  100521:
    'https://assets.mixkit.co/active_storage/video_items/100521/1725382949/100521-video-720.mp4',
  /** Bench press — used for lat-pulldown placeholder (bar vertical pull pattern). */
  100543:
    'https://assets.mixkit.co/active_storage/video_items/100543/1725384976/100543-video-720.mp4',
};

/** Mixkit 720p MP4 (legacy path or explicit active_storage URL). */
export function mixkitVideo720(id: number): string {
  return MIXKIT_ACTIVE_STORAGE_BY_ID[id] ?? `https://assets.mixkit.co/videos/${id}/${id}-720.mp4`;
}

/** Poster thumb for legacy Mixkit path only. */
export function mixkitPoster720(id: number): string {
  return `https://assets.mixkit.co/videos/${id}/${id}-thumb-720-3.jpg`;
}

/** Poster while video buffers — supports legacy and active_storage Mixkit URLs. */
export function posterUriForDemoVideo(mp4Url: string): string | undefined {
  const active = mp4Url.match(
    /active_storage\/video_items\/(\d+)\/(\d+)\/\1-video-720\.mp4$/i,
  );
  if (active) {
    const id = active[1];
    const mid = active[2];
    return `https://assets.mixkit.co/active_storage/video_items/${id}/${mid}/${id}-video-thumb-720-0.jpg`;
  }
  const legacy = mp4Url.match(/\/videos\/(\d+)\/\1-720\.mp4$/i);
  if (!legacy) return undefined;
  return mixkitPoster720(Number(legacy[1]));
}

const CAT: Record<string, string> = {
  strength: mixkitVideo720(24309),
  hiit: mixkitVideo720(52108),
  cardio: mixkitVideo720(722),
  flexibility: mixkitVideo720(780),
  mobility: mixkitVideo720(583),
  yoga: mixkitVideo720(780),
  recovery: mixkitVideo720(597),
};

/** Short, reliable fallback if a URL fails to load */
export const FALLBACK_DEMO_VIDEO =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

const OVERRIDE: Record<string, string> = {
  'push-up': mixkitVideo720(731),
  'incline-push-up': mixkitVideo720(24273),
  /** Chair/bench-style dip: use bench clip (see MIXKIT_ACTIVE_STORAGE_BY_ID[100521]). */
  dips: mixkitVideo720(100521),
  'dumbbell-press': mixkitVideo720(36692),
  superman: mixkitVideo720(24306),
  'dumbbell-row': mixkitVideo720(44416),
  'band-pull-apart': mixkitVideo720(1313),
  'lat-pulldown': mixkitVideo720(100543),
  'shoulder-press': mixkitVideo720(40788),
  'lateral-raise': mixkitVideo720(1313),
  'band-shoulder-press': mixkitVideo720(1313),
  'bicep-curl': mixkitVideo720(44416),
  'hammer-curl': mixkitVideo720(36602),
  'tricep-extension': mixkitVideo720(1313),
  plank: mixkitVideo720(36813),
  'dead-bug': mixkitVideo720(36813),
  'bicycle-crunch': mixkitVideo720(36813),
  'leg-raise': mixkitVideo720(36813),
  'russian-twist': mixkitVideo720(36813),
  'bodyweight-squat': mixkitVideo720(752),
  'wall-sit': mixkitVideo720(752),
  'glute-bridge': mixkitVideo720(21273),
  'reverse-lunge': mixkitVideo720(52098),
  'forward-lunge': mixkitVideo720(52110),
  'goblet-squat': mixkitVideo720(52106),
  'romanian-deadlift': mixkitVideo720(52082),
  'calf-raise': mixkitVideo720(752),
  'jumping-jack': mixkitVideo720(583),
  'high-knees': mixkitVideo720(583),
  burpee: mixkitVideo720(52108),
  'mountain-climber': mixkitVideo720(726),
  'squat-jump': mixkitVideo720(52108),
  'box-step': mixkitVideo720(44428),
  'brisk-walk': mixkitVideo720(722),
  jog: mixkitVideo720(721),
  cycling: mixkitVideo720(2002),
  'jump-rope': mixkitVideo720(583),
  swim: mixkitVideo720(722),
  'cat-cow': mixkitVideo720(780),
  'childs-pose': mixkitVideo720(780),
  'hip-flexor-stretch': mixkitVideo720(780),
  'hamstring-stretch': mixkitVideo720(780),
  'thoracic-rotation': mixkitVideo720(780),
  'ankle-circles': mixkitVideo720(780),
  'pigeon-pose': mixkitVideo720(780),
  'sun-salutation': mixkitVideo720(780),
  'yoga-deep-stretch': mixkitVideo720(780),
  'breathing-meditation': mixkitVideo720(597),
  'foam-roll': mixkitVideo720(597),
  'light-walk': mixkitVideo720(722),
  'circuit-beginner': mixkitVideo720(731),
  'circuit-intermediate': mixkitVideo720(24309),
  'hiit-tabata': mixkitVideo720(52108),
};

export function getExerciseDemoVideoUrl(exerciseId: string, category: string): string {
  const norm = exerciseId.toLowerCase();
  return (
    OVERRIDE[norm] ??
    OVERRIDE[exerciseId] ??
    CAT[category] ??
    CAT.strength
  );
}
