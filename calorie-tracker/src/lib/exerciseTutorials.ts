/**
 * Exercise Tutorial Library
 *
 * Static content: form phases, safety tips, common mistakes,
 * breathing cues, live coaching prompts, and optional biology
 * for each exercise in the workout engine library.
 */

import { ExerciseTutorial } from '@/src/types';

export const TUTORIALS: Record<string, ExerciseTutorial> = {

  'push-up': {
    exerciseId: 'push-up',
    phases: [
      { label: 'Starting Position', emoji: '🤲', cue: 'Place hands slightly wider than shoulder-width. Body forms a straight line from head to heels.' },
      { label: 'Descent', emoji: '⬇️', cue: 'Bend elbows at ~45° from your body. Lower your chest until it nearly touches the floor.' },
      { label: 'Bottom', emoji: '⏸️', cue: 'Brief pause. Elbows at ~90°. Core stays tight — don\'t let hips sag or pike up.' },
      { label: 'Drive', emoji: '⬆️', cue: 'Push the floor away. Straighten arms fully without locking elbows. Return to start.' },
    ],
    safetyTips: [
      'Never drop your hips — maintains spine neutrality and protects lower back.',
      'Keep your neck neutral — don\'t crane your chin forward.',
      'If wrists hurt, try fists or push-up handles to reduce wrist extension.',
    ],
    commonMistakes: [
      '❌ Hips sagging — signals weak core. Regress to knee push-ups.',
      '❌ Elbows flaring to 90° — increases shoulder impingement risk.',
      '❌ Partial range — bouncing at the bottom doesn\'t build strength.',
    ],
    breathingCue: 'Breathe IN on the way down. Breathe OUT as you push up.',
    coachingCues: [
      'Chest to the floor — full range! 💪',
      'Keep that core iron-tight.',
      'Breathe out as you push away.',
      'Elbows back, not out wide.',
      'Control the descent — slow and steady.',
      'Great form! Keep it up!',
    ],
    biology: {
      musclesWorked: 'Primary: Pectoralis major (chest). Secondary: Anterior deltoids (front shoulder), Triceps brachii. Stabilisers: Serratus anterior, Core.',
      mechanism: 'As you lower, your pec fibres lengthen under tension (eccentric phase) — this is when micro-tears occur that drive growth. As you push, the fibres shorten (concentric phase) generating force.',
      benefits: 'Progressive push-up training increases chest thickness, shoulder stability, and tricep endurance. Because it\'s a closed-chain movement, it also builds greater joint stability than bench press.',
    },
  },

  'bodyweight-squat': {
    exerciseId: 'bodyweight-squat',
    phases: [
      { label: 'Set Up', emoji: '🦶', cue: 'Feet shoulder-width apart, toes turned out 15–30°. Arms forward for balance or crossed on chest.' },
      { label: 'Brace', emoji: '💨', cue: 'Take a deep breath into your belly. Brace your core as if someone might punch you.' },
      { label: 'Descent', emoji: '⬇️', cue: 'Push knees out over toes. Sit back and down — imagine a chair behind you. Keep chest tall.' },
      { label: 'Bottom', emoji: '🪑', cue: 'Thighs parallel to floor (or below for mobility). Knees track over toes. Heels stay flat.' },
      { label: 'Drive', emoji: '⬆️', cue: 'Drive through your heels. Squeeze glutes at the top. Breathe out as you rise.' },
    ],
    safetyTips: [
      'If heels rise, improve ankle mobility or use a small heel wedge.',
      'Knees should track your 2nd/3rd toes — never cave inward.',
      'Stop if you feel sharp knee pain — regress to wall sits first.',
    ],
    commonMistakes: [
      '❌ Knees caving in (valgus) — increases ACL stress. Cue: "push knees out".',
      '❌ Heels rising — indicates tight calves/ankles.',
      '❌ Leaning too far forward — shifts load from quads to lower back.',
    ],
    breathingCue: 'Breathe IN before you descend. Breathe OUT as you drive up.',
    coachingCues: [
      'Push your knees out!',
      'Chest tall — don\'t round that back.',
      'Drive through those heels!',
      'Squeeze the glutes at the top.',
      'Sit back, not just down.',
      'You\'re doing great — keep depth!',
    ],
    biology: {
      musclesWorked: 'Primary: Quadriceps (rectus femoris, vastus group), Gluteus maximus. Secondary: Hamstrings, Adductors. Stabilisers: Erector spinae, Core.',
      mechanism: 'The squat is a bilateral hip and knee extension exercise. As depth increases, gluteal recruitment rises significantly. The eccentric (lowering) phase creates the most mechanical tension — key driver of strength and hypertrophy.',
      benefits: 'Regular squatting increases leg and glute strength, improves bone density in the femur and tibia, enhances athletic performance, and has the highest hormonal response (testosterone, GH) of any lower body exercise.',
    },
  },

  'plank': {
    exerciseId: 'plank',
    phases: [
      { label: 'Set Up', emoji: '🤲', cue: 'Forearms on the floor, elbows directly below shoulders. Or hands for high plank.' },
      { label: 'Body Line', emoji: '📏', cue: 'Lift hips until body forms a straight diagonal line from head to heels.' },
      { label: 'Brace', emoji: '🔒', cue: 'Squeeze core, glutes, and quads simultaneously. Imagine pulling your elbows toward your feet.' },
      { label: 'Hold & Breathe', emoji: '💨', cue: 'Breathe steadily. Don\'t hold your breath. Eyes look at the floor — neutral neck.' },
    ],
    safetyTips: [
      'Don\'t let hips sag — this compresses lumbar discs.',
      'Don\'t pike hips up — this removes the core challenge.',
      'Stop if you feel lower back pain — try a shorter hold or knee plank.',
    ],
    commonMistakes: [
      '❌ Hips dropping — most common. Regress to 20-second holds.',
      '❌ Holding breath — raises blood pressure dangerously. Always breathe.',
      '❌ Head dropping — neck should be an extension of your spine.',
    ],
    breathingCue: 'Breathe normally — slow and steady. In through nose, out through mouth.',
    coachingCues: [
      'Squeeze those glutes!',
      'Keep breathing — steady rhythm.',
      'Pull your belly button to your spine.',
      'Body is a perfect plank — great!',
      'Halfway there — keep it strong!',
      'Almost done — brace harder!',
    ],
    biology: {
      musclesWorked: 'Primary: Transverse abdominis (deep core), Rectus abdominis. Secondary: Obliques, Erector spinae, Shoulder stabilisers (serratus anterior, rotator cuff). Glutes and quads as active stabilisers.',
      mechanism: 'The plank is an isometric exercise — muscles generate force without changing length. This trains the core\'s anti-extension function (resisting spinal extension under load), which is the core\'s primary real-world job.',
      benefits: 'Superior to crunches for spinal health because it trains the deep stabilising muscles without spinal flexion under load. Reduces lower back pain risk and improves posture significantly.',
    },
  },

  'glute-bridge': {
    exerciseId: 'glute-bridge',
    phases: [
      { label: 'Set Up', emoji: '🛏️', cue: 'Lie on back. Knees bent, feet flat on floor hip-width apart, heels 6 inches from glutes.' },
      { label: 'Brace', emoji: '🔒', cue: 'Press lower back gently into the floor. Take a breath and brace your core.' },
      { label: 'Drive', emoji: '⬆️', cue: 'Drive through heels — not toes. Lift hips until body forms a straight line from knees to shoulders.' },
      { label: 'Squeeze', emoji: '🍑', cue: 'Maximum glute squeeze at the top. Hold 1–2 seconds. Don\'t hyperextend your lower back.' },
      { label: 'Lower', emoji: '⬇️', cue: 'Lower slowly with control — 2 seconds down. Don\'t let hips crash to the floor.' },
    ],
    safetyTips: [
      'Drive through heels — not the balls of your feet — to maximise glute activation.',
      'Don\'t hyperextend the lower back at the top — ribs should stay down.',
      'A great option for post-pregnancy and back pain rehabilitation.',
    ],
    commonMistakes: [
      '❌ Pushing through toes — shifts load to hamstrings and calves.',
      '❌ Hyperextending at top — compresses lumbar spine.',
      '❌ Moving too fast — removes time under tension from glutes.',
    ],
    breathingCue: 'Breathe IN at the bottom. Breathe OUT and squeeze as you lift.',
    coachingCues: [
      'Drive through your heels!',
      'Squeeze the glutes hard at the top!',
      'Hold it — 1, 2 — now lower slowly.',
      'Feel that burn in the glutes!',
      'Control the descent — don\'t drop!',
      'Perfect hip hinge — keep it up!',
    ],
    biology: {
      musclesWorked: 'Primary: Gluteus maximus (one of the largest muscles in the body). Secondary: Hamstrings, Hip adductors. Stabilisers: Core, Erector spinae.',
      mechanism: 'Hip extension is the primary movement pattern of the glute bridge. At peak contraction (top position), the gluteus maximus reaches near-maximum activation — EMG studies show it rivals barbell hip thrusts at 0 load.',
      benefits: 'Strengthens the posterior chain, corrects anterior pelvic tilt (common in desk workers), reduces lower back pain, and improves athletic performance in running and jumping. Safe for all fitness levels.',
    },
  },

  'dumbbell-row': {
    exerciseId: 'dumbbell-row',
    phases: [
      { label: 'Set Up', emoji: '🪑', cue: 'Brace one hand and knee on a bench. Other foot on the floor. Back flat — parallel to the ground.' },
      { label: 'Grip', emoji: '✊', cue: 'Grip dumbbell with palm facing your body. Let it hang fully — full arm extension.' },
      { label: 'Initiate', emoji: '🔙', cue: 'Start the pull by retracting your shoulder blade — NOT by bending your elbow first.' },
      { label: 'Pull', emoji: '⬆️', cue: 'Drive your elbow up and back toward your hip. Dumbbell travels to your ribcage.' },
      { label: 'Squeeze', emoji: '💪', cue: 'Hold 1 second at top. Squeeze your lat and mid-back muscles hard.' },
      { label: 'Lower', emoji: '⬇️', cue: 'Lower the dumbbell slowly — 2–3 seconds. Let your shoulder blade protract fully at the bottom.' },
    ],
    safetyTips: [
      'Keep your back flat — a rounded back under load stresses spinal discs.',
      'Don\'t rotate your torso to lift more weight — isolate the back.',
      'If you have lower back pain, do the cable row or band row seated instead.',
    ],
    commonMistakes: [
      '❌ Using bicep only — the back should do the work, arm is just a hook.',
      '❌ Torso rotation — indicates the weight is too heavy.',
      '❌ No shoulder blade movement — you\'re missing half the back muscle.',
    ],
    breathingCue: 'Breathe IN at the bottom (extended). Breathe OUT as you pull.',
    coachingCues: [
      'Lead with the elbow, not the hand.',
      'Squeeze the shoulder blade at the top!',
      'Flat back — don\'t twist!',
      'Full extension at the bottom — stretch it out.',
      'Feel your lat engaging?',
      'Strong pull — great back work!',
    ],
    biology: {
      musclesWorked: 'Primary: Latissimus dorsi (the "wings"), Middle trapezius, Rhomboids. Secondary: Posterior deltoid, Biceps brachii (as synergist). Stabilisers: Core, Erector spinae.',
      mechanism: 'Unilateral rowing allows greater range of motion and load asymmetry correction compared to bilateral rows. The lat is the largest upper body muscle and is responsible for shoulder adduction and extension.',
      benefits: 'Builds the V-taper physique. Corrects the forward-rounded shoulder posture caused by desk work. Critical for shoulder health — balances pressing movements and reduces impingement risk.',
    },
  },

  'shoulder-press': {
    exerciseId: 'shoulder-press',
    phases: [
      { label: 'Set Up', emoji: '🪑', cue: 'Seated (preferred) or standing. Dumbbells at ear height, elbows at 90°, palms forward.' },
      { label: 'Brace', emoji: '🔒', cue: 'Core tight. Ribs down — don\'t arch your lower back to compensate.' },
      { label: 'Press', emoji: '⬆️', cue: 'Press dumbbells in a slight arc toward each other overhead. Fully extend arms without locking elbows.' },
      { label: 'Top', emoji: '🔝', cue: 'At peak, biceps near your ears. Brief pause. Resist the urge to tilt your head back.' },
      { label: 'Lower', emoji: '⬇️', cue: 'Lower slowly — 2–3 seconds — back to start. Feel the stretch.' },
    ],
    safetyTips: [
      'NEVER press overhead with a pre-existing rotator cuff tear — see a physio first.',
      'Avoid extreme arching of the lower back — tighten your core to stay neutral.',
      'Start light until the movement feels pain-free through full range.',
    ],
    commonMistakes: [
      '❌ Arching the lower back — shifts load to the spine.',
      '❌ Pressing in front of body instead of overhead — reduces deltoid challenge.',
      '❌ Using momentum at the bottom — decreases muscle stimulus.',
    ],
    breathingCue: 'Breathe IN before pressing. Breathe OUT as you drive overhead.',
    coachingCues: [
      'Press slightly together at the top.',
      'Core tight — don\'t arch that back!',
      'Full lockout — feel the deltoids fire.',
      'Controlled descent — go slow.',
      'Strong shoulders take shape!',
      'Keep it smooth — great press!',
    ],
    biology: {
      musclesWorked: 'Primary: Anterior and medial deltoids. Secondary: Upper trapezius, Triceps brachii. Stabilisers: Rotator cuff (infraspinatus, supraspinatus), Core.',
      mechanism: 'The overhead press trains shoulder flexion and abduction simultaneously. The deltoid is a tri-pennate muscle — three heads with independent recruitment patterns. Overhead work recruits all three headers more evenly than lateral raises alone.',
      benefits: 'Builds shoulder width and roundness. Functional for overhead tasks (lifting, sports). Combined with rowing, maintains the push-pull balance that protects the shoulder joint long-term.',
    },
  },

  'bicycle-crunch': {
    exerciseId: 'bicycle-crunch',
    phases: [
      { label: 'Start', emoji: '🛏️', cue: 'Lie on back. Hands lightly behind head — elbows out wide. Lower back pressed to floor.' },
      { label: 'Lift', emoji: '⬆️', cue: 'Lift both shoulders off the floor. Bring knees to 90°. Never link fingers and pull your neck.' },
      { label: 'Rotate', emoji: '🔄', cue: 'Rotate your right shoulder toward left knee while extending right leg straight out.' },
      { label: 'Switch', emoji: '🔁', cue: 'Smoothly switch sides — left shoulder toward right knee, left leg extends.' },
    ],
    safetyTips: [
      'Don\'t pull on your neck — hands are just resting behind your head.',
      'Quality over speed — slow, controlled rotations beat fast sloppy ones.',
      'If you have neck pain, try the dead bug instead.',
    ],
    commonMistakes: [
      '❌ Pulling the neck — causes strain, not core engagement.',
      '❌ Elbows closing in — reduces rotation range and engages less oblique.',
      '❌ Lower back arching — press it down and brace throughout.',
    ],
    breathingCue: 'Exhale as you rotate to each side. Breathe in as you return to center.',
    coachingCues: [
      'Rotate the ribcage — not just your elbows.',
      'Keep that lower back FLAT!',
      'Extend the leg fully — really reach it.',
      'Slow it down — feel the obliques.',
      'Elbows wide — good form!',
      'Looking strong — core is firing!',
    ],
    biology: {
      musclesWorked: 'Primary: Obliques (internal and external). Secondary: Rectus abdominis. Stabilisers: Hip flexors (iliopsoas), Transverse abdominis.',
      mechanism: 'The rotation component specifically recruits the obliques, which the standard crunch completely misses. The contralateral reaching also activates the cross-body fascial lines (anterior oblique sling), reflecting real-world rotational movement.',
      benefits: 'Develops the "side abs" that create a narrow, athletic waist. Important for sports requiring twisting (tennis, golf, martial arts). The anti-rotation strength built also protects the lumbar spine.',
    },
  },

  'burpee': {
    exerciseId: 'burpee',
    phases: [
      { label: 'Stand', emoji: '🧍', cue: 'Start standing, feet hip-width. This is your reset position between reps.' },
      { label: 'Squat & Place', emoji: '⬇️', cue: 'Hinge at hips and knees, place hands on floor shoulder-width in front of you.' },
      { label: 'Jump Back', emoji: '↔️', cue: 'Jump or step both feet back simultaneously into a high plank position.' },
      { label: 'Optional Push-Up', emoji: '💪', cue: 'Optional: perform one push-up here. Beginners: skip this.' },
      { label: 'Jump Forward', emoji: '⬆️', cue: 'Jump or step feet forward to your hands. Land with soft knees.' },
      { label: 'Jump Up', emoji: '🚀', cue: 'Explosively jump up, fully extending your body. Clap hands overhead at peak.' },
    ],
    safetyTips: [
      'Land with soft, bent knees — never straight legs. Reduces impact by 60%.',
      'Wrist pain? Use push-up handles or step feet instead of jumping.',
      'If you have knee issues, do the half burpee (skip the jump at the end).',
      'Go slower before going faster — sloppy burpees cause wrist and knee injuries.',
    ],
    commonMistakes: [
      '❌ Straight-leg jump landing — massive impact on knee joints.',
      '❌ Lower back sagging in plank — full push-up form applies here too.',
      '❌ Rushing the movement — creates poor form and injury risk.',
    ],
    breathingCue: 'Breathe OUT as you jump up. Breathe IN when you squat down.',
    coachingCues: [
      'Soft landing — bend those knees!',
      'Plank is TIGHT — don\'t sag!',
      'Explode on the jump!',
      'Keep the pace — you\'ve got this!',
      'Every rep counts — stay strong!',
      'Beast mode — incredible effort!',
    ],
    biology: {
      musclesWorked: 'Full body: Quadriceps, Glutes, Hamstrings (squat/jump), Chest, Shoulders, Triceps (push-up), Core (plank), Calves (jump).',
      mechanism: 'The burpee is a multi-joint, multi-planar movement that creates massive metabolic demand. The transition from concentric (jump) to eccentric (landing) to isometric (plank) hits all three muscle contraction types in one rep.',
      benefits: 'One of the highest calorie-burning bodyweight exercises — burns ~10–15 kcal per minute at moderate intensity. Builds explosive power, cardiovascular endurance, and full-body coordination simultaneously.',
    },
  },

  'mountain-climber': {
    exerciseId: 'mountain-climber',
    phases: [
      { label: 'High Plank', emoji: '🤲', cue: 'Start in a high plank — arms straight, hands below shoulders. Core braced.' },
      { label: 'Drive Right Knee', emoji: '➡️', cue: 'Drive your right knee toward your right elbow — or across toward left elbow for oblique work.' },
      { label: 'Return Right', emoji: '↩️', cue: 'Return right foot to start as you simultaneously drive the left knee forward.' },
      { label: 'Alternate', emoji: '🔄', cue: 'Continue alternating — running in place in plank position. Stay low and steady.' },
    ],
    safetyTips: [
      'Don\'t let hips rise into a pike — maintains core tension and prevents neck strain.',
      'Wrists uncomfortable? Do on fists to reduce wrist extension.',
      'Start slow and controlled before building speed.',
    ],
    commonMistakes: [
      '❌ Pike position — hips high. Signals core fatigue — reduce speed.',
      '❌ Bouncing arms — arms should stay still. Only legs move.',
      '❌ Holding breath — especially common at high speed.',
    ],
    breathingCue: 'Continuous rhythmic breathing — in 2 drives, out 2 drives.',
    coachingCues: [
      'Hips LOW — hold that plank!',
      'Keep arms still — only legs drive!',
      'Breathe with the rhythm.',
      'Drive the knees — really tuck them in!',
      'Feel the cardio and core combine!',
      'Keep going — you\'re smashing it!',
    ],
    biology: {
      musclesWorked: 'Core: Transverse abdominis, Obliques. Hip Flexors: Iliopsoas, Rectus femoris. Stabilisers: Deltoids, Pectorals, Serratus anterior. Cardiovascular system elevated.',
      mechanism: 'Mountain climbers bridge strength and cardio — they keep the heart rate in the aerobic/anaerobic threshold zone while simultaneously taxing the core isometrically. Each knee drive creates a dynamic anti-rotation challenge for the obliques.',
      benefits: 'Efficient calorie burner (comparable to sprint intensity). Builds core endurance, hip flexor strength, and cardiovascular capacity without any equipment. Safe for most fitness levels.',
    },
  },

  'reverse-lunge': {
    exerciseId: 'reverse-lunge',
    phases: [
      { label: 'Stand Tall', emoji: '🧍', cue: 'Feet together or hip-width. Hands on hips or by sides. Core engaged.' },
      { label: 'Step Back', emoji: '↩️', cue: 'Take a large step backward with one foot. Land on the ball of that foot.' },
      { label: 'Lower', emoji: '⬇️', cue: 'Bend both knees to ~90°. Back knee hovers just above the floor. Front shin stays vertical.' },
      { label: 'Drive', emoji: '⬆️', cue: 'Push through your front heel to return to standing. Squeeze the glute at the top.' },
    ],
    safetyTips: [
      'Easier on the knees than forward lunges because the front knee doesn\'t travel past the toes as much.',
      'If balance is an issue, hold a wall or chair with one hand.',
      'For knee pain, shorten your step length and reduce depth.',
    ],
    commonMistakes: [
      '❌ Front knee caving inward — push it out in line with toes.',
      '❌ Torso leaning forward excessively — stand tall throughout.',
      '❌ Short step length — causes front knee to shoot past toes.',
    ],
    breathingCue: 'Breathe IN as you step back and lower. Breathe OUT as you drive up.',
    coachingCues: [
      'Big step back — give yourself space!',
      'Back knee just above the floor.',
      'Front shin stays vertical.',
      'Drive through that heel!',
      'Squeeze the glute at the top.',
      'Beautiful lunge — really controlled!',
    ],
    biology: {
      musclesWorked: 'Primary: Quadriceps (front leg), Gluteus maximus. Secondary: Hamstrings, Adductors, Calves. Stabilisers: Core, Hip abductors.',
      mechanism: 'The reverse lunge is a split-stance hip hinge and knee extension. By stepping back, the centre of mass stays over the front foot, reducing patellofemoral joint stress compared to the forward lunge by up to 30%.',
      benefits: 'Improves unilateral leg strength, corrects left-right imbalances, and enhances hip mobility and balance — all protective factors against falls and sports injuries.',
    },
  },

  'romanian-deadlift': {
    exerciseId: 'romanian-deadlift',
    phases: [
      { label: 'Start', emoji: '🏋️', cue: 'Stand with dumbbells in front of thighs. Feet hip-width, soft knee bend. Brace core.' },
      { label: 'Hinge', emoji: '↩️', cue: 'Push your hips BACK — not down. Keep the weights dragging down your legs.' },
      { label: 'Descend', emoji: '⬇️', cue: 'Lower until you feel a deep hamstring stretch. Back stays flat — no rounding.' },
      { label: 'Reverse', emoji: '⬆️', cue: 'Drive hips forward to return. Squeeze glutes as hips lock out at the top.' },
    ],
    safetyTips: [
      'NEVER round your lower back under load — this is the #1 cause of disc injuries.',
      'If you feel it in your lower back, you\'re hinging incorrectly — reduce weight.',
      'Stop range-of-motion where you can maintain a flat back — flexibility improves over time.',
    ],
    commonMistakes: [
      '❌ Squatting instead of hinging — knees bend too much, takes load off hamstrings.',
      '❌ Rounding the lower back — high injury risk at even light loads.',
      '❌ Letting weights drift away from body — creates a lever-arm on the spine.',
    ],
    breathingCue: 'Breathe IN and brace before you hinge. Breathe OUT as you drive hips forward.',
    coachingCues: [
      'Hips BACK — sit into the stretch.',
      'Weights dragging down your legs — stay close!',
      'Flat back — imagine a glass on your spine.',
      'Feel that hamstring stretch!',
      'Drive hips through — squeeze the glutes!',
      'Perfect hip hinge — textbook form!',
    ],
    biology: {
      musclesWorked: 'Primary: Hamstrings (biceps femoris, semitendinosus, semimembranosus), Gluteus maximus. Secondary: Erector spinae, Adductor Magnus. Stabilisers: Core.',
      mechanism: 'RDL trains the hamstrings through a lengthened, loaded stretch — the most effective stimulus for hamstring hypertrophy according to EMG and imaging research. The eccentric phase specifically induces architectural changes in the hamstring that improve sprint speed and reduce injury risk.',
      benefits: 'One of the most injury-preventive exercises: hamstring strengthening reduces ACL and hamstring tear incidence significantly. Also increases posterior chain power for sprinting, jumping, and sports performance.',
    },
  },

  'jumping-jack': {
    exerciseId: 'jumping-jack',
    phases: [
      { label: 'Start', emoji: '🧍', cue: 'Stand with feet together, arms by sides. Light on your feet — on the balls, not flat.' },
      { label: 'Jump Out', emoji: '↔️', cue: 'Jump feet shoulder-width apart and simultaneously raise both arms overhead in an arc.' },
      { label: 'Jump In', emoji: '🙆', cue: 'Jump feet back together and bring arms back to sides in the same arc motion.' },
    ],
    safetyTips: [
      'Land softly — absorb impact with bent knees to protect joints.',
      'For low-impact: step jacks — step side to side instead of jumping.',
      'If you have pelvic floor issues, step jacks are a safer alternative.',
    ],
    commonMistakes: [
      '❌ Straight-leg landing — increases joint stress significantly.',
      '❌ Arm motion stopping early — reduces coordination and warm-up effectiveness.',
      '❌ Going too slow to start — start at a comfortable but purposeful pace.',
    ],
    breathingCue: 'Keep breathing rhythmically — in for 2 jumps, out for 2 jumps.',
    coachingCues: [
      'Light on your feet — soft landings!',
      'Arms all the way up!',
      'Find your rhythm — settle in.',
      'Heart rate rising — that\'s the goal!',
      'Stay loose — this is your warm-up!',
      'Great energy — keep it going!',
    ],
    biology: {
      musclesWorked: 'Lower Body: Abductors (hip), Calves, Quadriceps. Upper Body: Deltoids, Trapezius. Cardiovascular system primarily.',
      mechanism: 'Jumping jacks rapidly elevate heart rate due to large muscle group recruitment and the cardiovascular demand of repeated ballistic movements. They also take joints through full abduction range, making them excellent warm-up movements.',
      benefits: 'Effective cardiovascular warm-up that raises core temperature, improving muscle elasticity and reducing injury risk for subsequent exercises. Low skill barrier makes them accessible to all fitness levels.',
    },
  },

  'brisk-walk': {
    exerciseId: 'brisk-walk',
    phases: [
      { label: 'Posture', emoji: '🧍', cue: 'Stand tall — head up, shoulders back and down, core lightly engaged.' },
      { label: 'Arm Swing', emoji: '💪', cue: 'Bend arms ~90°. Swing them forward and back (not across the body). Drives pace.' },
      { label: 'Strike', emoji: '👣', cue: 'Land on your heel, roll through the foot, push off with your toes.' },
      { label: 'Pace', emoji: '⏱️', cue: 'Target: you can talk but NOT sing comfortably. That\'s the brisk walk zone.' },
    ],
    safetyTips: [
      'Wear supportive footwear — poor shoes cause shin splints and knee pain on sustained walks.',
      'If outdoors, be aware of uneven surfaces — ankle sprains are common.',
      'In hot weather, hydrate before and during. Walking in heat significantly increases cardiovascular demand.',
    ],
    commonMistakes: [
      '❌ Head down looking at phone — causes neck tension and reduces pace.',
      '❌ Shuffling feet — engage the glutes to lift each step.',
      '❌ Crossing arms across body — inhibits torso rotation and slows pace.',
    ],
    breathingCue: 'Natural rhythmic breathing. In for 3 steps, out for 3 steps at your pace.',
    coachingCues: [
      'Head up — enjoy your environment!',
      'Big arm swings — power that pace!',
      'Land heel-to-toe — good technique.',
      'You\'re in the fat-burning zone!',
      'Halfway there — keep that pace steady.',
      'Every step is building a healthier you!',
    ],
    biology: {
      musclesWorked: 'Primary: Quadriceps, Hamstrings, Gluteus medius/maximus, Calves. Secondary: Core stabilisers, Hip flexors.',
      mechanism: 'Brisk walking at 60–70% max heart rate sits in the aerobic fat oxidation zone — the body preferentially burns fat as fuel. Sustained aerobic exercise also activates AMPK (a cellular energy sensor), improving mitochondrial density over time.',
      benefits: 'Research consistently shows 30 minutes of brisk walking 5x/week reduces cardiovascular disease risk by 35%, type 2 diabetes risk by 30%, and all-cause mortality by 20%. Low impact makes it the most sustainable long-term exercise for all ages.',
    },
  },

  'sun-salutation': {
    exerciseId: 'sun-salutation',
    phases: [
      { label: 'Mountain Pose', emoji: '🧍', cue: 'Stand tall, hands at heart. Root your feet. Long deep breath in.' },
      { label: 'Upward Salute', emoji: '🙌', cue: 'Inhale — sweep arms overhead, gentle backbend, gaze upward.' },
      { label: 'Forward Fold', emoji: '🙇', cue: 'Exhale — fold forward, bend knees generously. Hands to floor or shins.' },
      { label: 'Low Lunge', emoji: '🫳', cue: 'Inhale — step right foot back. Left knee at 90°. Hips sink, chest lifts.' },
      { label: 'Plank', emoji: '📏', cue: 'Hold breath — step left foot back. Firm plank. Core and glutes engaged.' },
      { label: 'Cobra / Updog', emoji: '🐍', cue: 'Inhale — lower to floor, press chest forward and up. Shoulders back.' },
      { label: 'Down Dog', emoji: '🐕', cue: 'Exhale — lift hips high and back. Heels press toward floor. 5 breaths here.' },
      { label: 'Return & Rise', emoji: '⬆️', cue: 'Walk feet to hands. Inhale to rise. Exhale hands to heart. Repeat.' },
    ],
    safetyTips: [
      'Never force your range of motion — move to comfortable stretch, not pain.',
      'Wrist discomfort: make fists or use forearms where possible.',
      'Prenatal: skip cobra — use cat-cow instead.',
    ],
    commonMistakes: [
      '❌ Rushing through — sun salutation is a breath-linked flow. Sync movement with breath.',
      '❌ Locked knees in forward fold — always have a generous bend.',
      '❌ Collapsing in plank — same rules as a regular plank apply.',
    ],
    breathingCue: 'Every movement is linked to a breath. Inhale on expansion, exhale on folding.',
    coachingCues: [
      'Move with your breath — stay connected.',
      'Soften the knees — don\'t force the fold.',
      'Hips high in down dog — find your length.',
      'Feel the morning energy waking up!',
      'Each round gets smoother — flow with it.',
      'Beautiful flow — you\'re moving wonderfully!',
    ],
    biology: {
      musclesWorked: 'Dynamic full-body sequence: Hamstrings (forward fold), Hip flexors (lunge), Chest/shoulders (cobra), Hamstrings/calves (down dog), Core throughout.',
      mechanism: 'Sun salutation links yoga postures in a vinyasa (breath-synchronised movement). This activates the parasympathetic nervous system (rest-and-digest), reducing cortisol. The dynamic stretching improves tissue extensibility more effectively than static holds alone.',
      benefits: 'Research shows daily sun salutation practice over 6 months improves flexibility by up to 40%, reduces anxiety and stress markers (cortisol, heart rate variability), and improves spinal mobility and posture.',
    },
  },

  'high-knees': {
    exerciseId: 'high-knees',
    phases: [
      { label: 'Set Up', emoji: '🧍', cue: 'Stand tall. Light on the balls of your feet. Arms bent at 90°.' },
      { label: 'Drive Knee', emoji: '⬆️', cue: 'Drive your right knee up to hip height. Simultaneously pump left arm forward.' },
      { label: 'Switch', emoji: '🔄', cue: 'Land softly on the right foot. Drive left knee up immediately. Arms alternate.' },
      { label: 'Rhythm', emoji: '🎵', cue: 'Find a running rhythm. Stay on the balls of your feet — never flat-footed.' },
    ],
    safetyTips: [
      'Land softly — flat-foot landing creates massive joint impact.',
      'Start at half-speed to warm up your hip flexors before going fast.',
      'If you have shin splints, reduce duration and build up gradually.',
    ],
    commonMistakes: [
      '❌ Leaning backward — shifts load off hip flexors and onto lower back.',
      '❌ Knees don\'t reach hip height — reduces activation and cardio benefit.',
      '❌ Flat-foot landing — impact goes to knees and ankles instead of being absorbed.',
    ],
    breathingCue: 'Rhythmic breathing — exhale every 2–3 steps.',
    coachingCues: [
      'Drive those knees to hip height!',
      'Stay on the balls of your feet!',
      'Arms pumping — drives the legs!',
      'You\'re running — keep the pace!',
      'Heart rate is climbing — that\'s perfect!',
      'Looking powerful — incredible effort!',
    ],
    biology: {
      musclesWorked: 'Primary: Hip flexors (Iliopsoas), Quadriceps. Secondary: Calves, Core (anti-rotation). Cardiovascular system under high demand.',
      mechanism: 'High knees train the running gait pattern, specifically the hip flexion phase. The hip flexors are often the weakest link in athletes — high knees develop their strength and speed, directly translating to faster running performance.',
      benefits: 'Burns 8–12 kcal/minute depending on intensity. Improves running biomechanics, cardiovascular fitness, and hip flexor strength. The plyometric component also develops fast-twitch muscle fibre recruitment.',
    },
  },
};

/** Get tutorial for an exercise, or null if not found */
export function getTutorial(exerciseId: string): ExerciseTutorial | null {
  return TUTORIALS[exerciseId] ?? null;
}

/** Get a random coaching cue for an exercise */
export function getCoachingCue(exerciseId: string, index: number): string {
  const tutorial = TUTORIALS[exerciseId];
  if (!tutorial || tutorial.coachingCues.length === 0) {
    const fallbacks = [
      'Keep pushing — you\'ve got this! 💪',
      'Focus on your form — quality over speed.',
      'Breathe steadily — in through the nose.',
      'Feel the muscles working — that\'s growth!',
      'Halfway through — don\'t stop now!',
      'You\'re stronger than you think!',
    ];
    return fallbacks[index % fallbacks.length];
  }
  return tutorial.coachingCues[index % tutorial.coachingCues.length];
}

/** All motivational quotes shown during rest periods */
export const MOTIVATIONAL_QUOTES = [
  { quote: 'The body achieves what the mind believes.', author: 'Napoleon Hill' },
  { quote: 'Take care of your body. It\'s the only place you have to live.', author: 'Jim Rohn' },
  { quote: 'Sweat is just fat crying.', author: 'Unknown' },
  { quote: 'The secret is to make the exercise a habit — not a punishment.', author: 'Unknown' },
  { quote: 'You don\'t have to be great to start, but you have to start to be great.', author: 'Zig Ziglar' },
  { quote: 'Every rep, every step, every drop of sweat is an investment in yourself.', author: 'Unknown' },
  { quote: 'Your future self is watching you right now through your memories.', author: 'Unknown' },
  { quote: 'It never gets easier — you just get stronger.', author: 'Unknown' },
  { quote: 'Small consistent efforts compound into extraordinary results.', author: 'Unknown' },
  { quote: 'The pain you feel today will be the strength you feel tomorrow.', author: 'Arnold Schwarzenegger' },
  { quote: 'Rest is not quitting — it\'s refueling.', author: 'Unknown' },
  { quote: 'Your only competition is who you were yesterday.', author: 'Unknown' },
];
