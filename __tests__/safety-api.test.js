// src/api/safety.js — reporting as named tools (Rule 6). The pass-on report
// names the exact story (contentType PASSON_ITEM + contentId) so an admin is
// told what was written, not only who wrote it.
import api from '../src/api/client';
import { reportPassOnStory, reportUser } from '../src/api/safety';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  friendlyWriteError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

describe('safety API module', () => {
  test('reportUser posts the reason as both reason and description', async () => {
    // Arrange
    api.post.mockResolvedValue({});

    // Act
    await reportUser('u9', 'Harassment');

    // Assert
    expect(api.post).toHaveBeenCalledWith('/reports', {
      reportedUserId: 'u9',
      reason: 'Harassment',
      description: 'Harassment',
    });
  });

  test('reportPassOnStory names the item with contentType and contentId', async () => {
    // Arrange
    api.post.mockResolvedValue({});

    // Act
    await reportPassOnStory({
      reportedUserId: 'u9',
      contentId: 'item3',
      reason: 'Upsetting',
      description: 'This story is upsetting.',
    });

    // Assert
    expect(api.post).toHaveBeenCalledWith('/reports', {
      reportedUserId: 'u9',
      contentType: 'PASSON_ITEM',
      contentId: 'item3',
      reason: 'Upsetting',
      description: 'This story is upsetting.',
    });
  });

  test.each([
    ['reportedUserId', { contentId: 'item3', reason: 'r', description: 'd' }, 'reportedUserId is required.'],
    ['contentId', { reportedUserId: 'u9', reason: 'r', description: 'd' }, 'contentId is required.'],
  ])('reportPassOnStory refuses a missing %s before the wire', async (_label, bad, message) => {
    // Act / Assert
    await expect(reportPassOnStory(bad)).rejects.toThrow(message);
    expect(api.post).not.toHaveBeenCalled();
  });
});
