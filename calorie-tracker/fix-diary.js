const fs = require('fs');
let content = fs.readFileSync('app/(tabs)/diary.tsx', 'utf8');

// EntryRow
content = content.replace(
    /function EntryRow\(\{[\s\S]*?\}\) \{/,
    match => match + '\n    const colors = useThemeColors();\n    const er = useAppStyles(createErStyles);'
);
content = content.replace(
    /const er = StyleSheet\.create\(\{/,
    'const createErStyles = (colors: any) => StyleSheet.create({'
);

// MacroBar
content = content.replace(
    /const styles = useAppStyles\(createStyles\);/,
    'const mb = useAppStyles(createMbStyles);'
);
content = content.replace(
    /const mb = StyleSheet\.create\(\{/,
    'const createMbStyles = (colors: any) => StyleSheet.create({'
);

// EditModal
content = content.replace(
    /const totalCalPreview = \(parseFloat\(cals\) \|\| 0\) \* \(parseFloat\(servings\) \|\| 1\);/,
    'const colors = useThemeColors();\n    const em = useAppStyles(createEmStyles);\n    const totalCalPreview = (parseFloat(cals) || 0) * (parseFloat(servings) || 1);'
);
content = content.replace(
    /const em = StyleSheet\.create\(\{/,
    'const createEmStyles = (colors: any) => StyleSheet.create({'
);

fs.writeFileSync('app/(tabs)/diary.tsx', content);
console.log('Fixed diary.tsx');
