// Reanimated 4 can't spin up its worklets runtime under Jest — both packages
// ship official mocks (animations resolve instantly to their end values).
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
