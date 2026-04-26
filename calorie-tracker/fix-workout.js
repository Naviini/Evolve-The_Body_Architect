const fs = require('fs');
let content = fs.readFileSync('app/(tabs)/workout.tsx', 'utf8');

content = content.replace(
    /\}\) \{\s*const badge = DIFF_BADGE\[exercise\.difficulty\] \?\? DIFF_BADGE\.moderate;/g,
    `}) {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  const badge = DIFF_BADGE[exercise.difficulty] ?? DIFF_BADGE.moderate;`
);

fs.writeFileSync('app/(tabs)/workout.tsx', content);
console.log('Fixed workout.tsx');
