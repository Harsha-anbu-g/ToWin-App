// src/api/reviews.js — posting a review as a named tool (Rule 6). The guardian
// path rides the same wire with onBehalfOfElderId, like the web client.
import api from '../src/api/client';
import { postReview } from '../src/api/reviews';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  friendlyWriteError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

describe('reviews API module', () => {
  test('postReview posts the review, guardian elder id included', async () => {
    // Arrange
    api.post.mockResolvedValue({});

    // Act
    await postReview({ revieweeId: 'h2', rating: 5, comment: 'Kind and patient.', onBehalfOfElderId: 'e1' });

    // Assert
    expect(api.post).toHaveBeenCalledWith('/reviews', {
      revieweeId: 'h2',
      rating: 5,
      comment: 'Kind and patient.',
      onBehalfOfElderId: 'e1',
    });
  });

  test('postReview carries a null comment as null, like the web client', async () => {
    // Arrange
    api.post.mockResolvedValue({});

    // Act
    await postReview({ revieweeId: 'h2', rating: 4, comment: null });

    // Assert
    expect(api.post).toHaveBeenCalledWith('/reviews', {
      revieweeId: 'h2',
      rating: 4,
      comment: null,
      onBehalfOfElderId: undefined,
    });
  });

  test.each([
    ['revieweeId', { rating: 5, comment: null }, 'revieweeId is required.'],
    ['rating', { revieweeId: 'h2', comment: null }, 'rating is required.'],
  ])('postReview refuses a missing %s before the wire', async (_label, bad, message) => {
    // Act / Assert
    await expect(postReview(bad)).rejects.toThrow(message);
    expect(api.post).not.toHaveBeenCalled();
  });
});
