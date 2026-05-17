import Animated from 'react-native-reanimated';
import { WavingHandSvg } from '@/components/icons/WavingHandSvg';

export function HelloWave() {
  return (
    <Animated.View
      style={{
        marginTop: -6,
        animationName: {
          '50%': { transform: [{ rotate: '14deg' }] },
        },
        animationIterationCount: 4,
        animationDuration: '300ms',
      }}>
      <WavingHandSvg size={28} />
    </Animated.View>
  );
}
