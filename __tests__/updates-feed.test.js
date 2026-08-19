// The Updates feed builders — every notification source becomes plain rows,
// newest first, each with a stable seen-token that changes exactly when the
// item becomes news again.
import {
  applicantItems,
  buildFeed,
  connectionItems,
  familyAlertItems,
  keyholderAskItems,
  messageItems,
  myOfferItems,
  reviewItems,
} from '../src/lib/updatesFeed';

describe('updates feed builders', () => {
  test('a friend request waiting on me becomes a row; one I sent does not', () => {
    // Arrange
    const connections = [
      { id: 'a', status: 'PENDING', initiatedByMe: false, otherUserName: 'Priya', createdAt: '2026-08-19T10:00:00' },
      { id: 'b', status: 'PENDING', initiatedByMe: true, otherUserName: 'Ethan', createdAt: '2026-08-19T09:00:00' },
    ];
    // Act
    const items = connectionItems(connections);
    // Assert
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Priya wants to be your friend');
    expect(items[0].token).toBe('conn:a:PENDING');
    expect(items[0].href).toBe('/friends');
  });

  test('an accepted friendship becomes news again under a different token', () => {
    const pending = connectionItems([
      { id: 'a', status: 'PENDING', initiatedByMe: false, otherUserName: 'P', createdAt: '2026-08-19T10:00:00' },
    ]);
    const active = connectionItems([
      { id: 'a', status: 'ACTIVE', otherUserName: 'P', createdAt: '2026-08-19T10:00:00' },
    ]);
    expect(pending[0].token).not.toBe(active[0].token);
  });

  test('family links never appear as friend rows', () => {
    const items = connectionItems([
      { id: 'f', status: 'ACTIVE', type: 'FAMILY', otherUserName: 'Sarah', createdAt: '2026-08-19T10:00:00' },
    ]);
    expect(items).toHaveLength(0);
  });

  test('unread chats become one row per conversation, with the count said out loud', () => {
    const items = messageItems([
      { id: 'c1', status: 'ACTIVE', unreadCount: 3, otherUserName: 'Margaret', lastMessagePreview: 'See you at 4', lastMessageAt: '2026-08-19T08:00:00' },
      { id: 'c2', status: 'ACTIVE', unreadCount: 0, otherUserName: 'Quiet' },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('3 new messages from Margaret');
    expect(items[0].href).toBe('/chat/c1');
  });

  test('helpers offering on my posted help become rows (elder seat)', () => {
    const items = applicantItems({
      content: [
        {
          id: 'n1',
          title: 'A ride to the clinic',
          createdAt: '2026-08-18T12:00:00',
          applications: [{ helperId: 'h1', helperName: 'Ethan', message: 'Happy to drive' }],
        },
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Ethan offered to help with "A ride to the clinic"');
    expect(items[0].token).toBe('app:n1:h1');
  });

  test("where my own offers stand (helper seat): decided ones are news, pending isn't", () => {
    const items = myOfferItems({
      content: [
        { id: 'n1', title: 'Groceries', elderName: 'Margaret', myApplicationStatus: 'ACCEPTED', createdAt: '2026-08-18T12:00:00' },
        { id: 'n2', title: 'A walk', elderName: 'Rose', myApplicationStatus: 'PENDING', createdAt: '2026-08-18T12:00:00' },
        { id: 'n3', title: 'Reading', elderName: 'Ada', myApplicationStatus: 'DECLINED', createdAt: '2026-08-18T12:00:00' },
      ],
    });
    expect(items.map((i) => i.token)).toEqual(['offer:n1:ACCEPTED', 'offer:n3:DECLINED']);
    expect(items[0].title).toBe('Margaret said yes to your offer on "Groceries"');
  });

  test('family alerts and keyholder asks carry their own kinds', () => {
    const alerts = familyAlertItems({ alerts: [{ id: 'x', type: 'SOS', elderName: 'Margaret', body: 'Margaret pressed SOS', createdAt: '2026-08-19T07:00:00' }] });
    expect(alerts[0].kind).toBe('family-sos');
    const asks = keyholderAskItems([{ id: 'k', ownerName: 'Margaret' }]);
    expect(asks[0].title).toBe('Margaret asked you to hold a key');
  });

  test('the feed sorts newest first across every source', () => {
    const feed = buildFeed({
      connections: [
        { id: 'a', status: 'PENDING', initiatedByMe: false, otherUserName: 'P', createdAt: '2026-08-19T10:00:00' },
      ],
      reviews: [{ id: 'r', reviewerName: 'E', createdAt: '2026-08-19T11:00:00' }],
    });
    expect(feed[0].kind).toBe('review');
    expect(feed[1].kind).toBe('friend-request');
  });

  test('every builder survives missing data without a row or a crash', () => {
    expect(buildFeed({})).toEqual([]);
    expect(connectionItems(undefined)).toEqual([]);
    expect(messageItems(null)).toEqual([]);
    expect(applicantItems(undefined)).toEqual([]);
    expect(myOfferItems(undefined)).toEqual([]);
    expect(familyAlertItems(undefined)).toEqual([]);
    expect(keyholderAskItems(undefined)).toEqual([]);
    expect(reviewItems(undefined)).toEqual([]);
  });
});
