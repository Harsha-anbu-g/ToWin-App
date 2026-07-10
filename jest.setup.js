// Reanimated 4 can't spin up its worklets runtime under Jest — it ships an
// official mock (animations resolve instantly to their end values). On SDK 54
// (worklets 0.5.x) there is no separate worklets mock path; the reanimated
// mock covers what our components touch.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
