import { mutualFriendsText } from '../src/lib/mutualFriends'

describe('mutualFriendsText (same rules as the website)', () => {
  test('names family first, in lower case, then friends', () => {
    expect(mutualFriendsText([
      { name: 'Sarah', relation: 'FAMILY', relationship: 'Daughter' },
      { name: 'Grace', relation: 'FRIEND' },
    ], 2)).toBe('You both know Sarah (your daughter) and Grace')
  })

  test('shows a friend of a friend as a link through your friend', () => {
    expect(mutualFriendsText([{ name: 'Tom', relation: 'THROUGH' }], 0)).toBe('Known through Tom')
  })

  test('counts the people it could not fit', () => {
    expect(mutualFriendsText([
      { name: 'A', relation: 'FRIEND' }, { name: 'B', relation: 'FRIEND' }, { name: 'C', relation: 'FRIEND' },
    ], 4)).toBe('You both know A, B, C and 1 more')
  })

  test('says nothing without a link', () => {
    expect(mutualFriendsText(undefined, 0)).toBe('')
  })
})
