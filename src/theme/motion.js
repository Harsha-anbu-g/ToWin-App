// The app's motion beats, ready for RN Animated (UX-713). The numbers live
// in tokens.motion as pure data; this module is the ONE place they become
// Easing functions, so call sites write duration: DURATION.fast,
// easing: EASE.out and never carry their own values. Reanimated files
// (TortoiseMark) build their own Easing.bezier from the same token data —
// Reanimated easings must come from its own module to run as worklets.
import { Easing } from 'react-native';
import { motion } from './tokens';

export const DURATION = motion.duration;

export const EASE = {
  out: Easing.bezier(...motion.easing.out),
  inOut: Easing.bezier(...motion.easing.inOut),
  exit: Easing.bezier(...motion.easing.exit),
};
