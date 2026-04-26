const fs = require('fs');
let content = fs.readFileSync('app/_layout.tsx', 'utf8');

// Move hooks from RootLayout to InnerLayout
content = content.replace(
    /\}\) \{\s*useProtectedRoute\(onboardingDone, setOnboardingDone\);/,
    `}) {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  useProtectedRoute(onboardingDone, setOnboardingDone);`
);

// Remove hooks from RootLayout
content = content.replace(
    /export default function RootLayout\(\) \{\s*const colors = useThemeColors\(\);\s*const styles = useAppStyles\(createStyles\);/,
    `export default function RootLayout() {`
);

// Fix loading style in RootLayout
content = content.replace(
    /return \(\s*<View style=\{styles\.loadingContainer\}>\s*<ActivityIndicator size="large" color=\{Colors\.primary\} \/>\s*<\/View>\s*\);/g,
    `return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );`
);

fs.writeFileSync('app/_layout.tsx', content);
console.log('Fixed _layout.tsx');
