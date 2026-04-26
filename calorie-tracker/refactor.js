const fs = require('fs');
const path = require('path');

const files = [
  "components/ui/collapsible.tsx",
  "app/exercise-tutorial.tsx",
  "app/workout-session.tsx",
  "app/_layout.tsx",
  "app/body-simulation.tsx",
  "app/body-insights.tsx",
  "app/add-meal.tsx",
  "app/(auth)/verify-email.tsx",
  "app/(tabs)/_layout.tsx",
  "app/(auth)/_layout.tsx",
  "app/(auth)/register.tsx",
  "app/(tabs)/workout.tsx",
  "app/(tabs)/scan.tsx",
  "app/(tabs)/profile.tsx",
  "app/(tabs)/index.tsx",
  "app/(auth)/login.tsx",
  "app/(auth)/forgot-password.tsx",
  "app/(tabs)/diary.tsx",
  "app/(tabs)/analytics.tsx"
];

for (const relPath of files) {
  const file = path.join(__dirname, relPath);
  if (!fs.existsSync(file)) {
    console.log("File not found:", file);
    continue;
  }
  let content = fs.readFileSync(file, 'utf8');

  // Skip if already processed
  if (content.includes('useAppStyles')) continue;

  let modified = false;

  // 1. Add imports
  if (!content.includes('import { useAppStyles }')) {
    const importStatement = `import { useAppStyles } from '@/hooks/useAppStyles';\nimport { useThemeColors } from '@/hooks/useThemeColors';`;
    
    // Inject after the last import
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfLastImport = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, endOfLastImport + 1) + importStatement + '\n' + content.slice(endOfLastImport + 1);
    } else {
      content = importStatement + '\n' + content;
    }
    modified = true;
  }

  // 2. Change `const styles = StyleSheet.create({`
  if (content.includes('const styles = StyleSheet.create({')) {
    content = content.replace(
      /const styles = StyleSheet\.create\(\{/g,
      `const createStyles = (colors: any) => StyleSheet.create({`
    );
    modified = true;
  }

  // 3. Replace `Colors.dark.` and `Colors.light.` with `colors.`
  if (content.includes('Colors.dark.') || content.includes('Colors.light.')) {
    content = content.replace(/Colors\.dark\./g, 'colors.');
    content = content.replace(/Colors\.light\./g, 'colors.');
    modified = true;
  }

  // 4. Inject hooks inside components
  // Match functions that look like components:
  // export default function X() {
  // export function X() {
  // function X() {
  // We need to exclude non-component functions. Components start with an uppercase letter.
  const componentRegex = /(?:export\s+)?(?:default\s+)?function\s+[A-Z][a-zA-Z0-9]*\s*\([^)]*\)\s*\{/g;
  
  content = content.replace(componentRegex, (match) => {
    return `${match}\n  const colors = useThemeColors();\n  const styles = useAppStyles(createStyles);`;
  });

  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    console.log("Refactored:", file);
  }
}
