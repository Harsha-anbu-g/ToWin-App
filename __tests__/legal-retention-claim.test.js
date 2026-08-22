// The privacy policy's retention section used to end mid-decision: it said the
// backup window was "something we have not written down yet, and we will say it
// here once we have". A placeholder in a live privacy policy is a store-review
// problem (Apple 5.1.1(i) expects a real retention statement) and it is the one
// section a person reads to find out what happens to their letters.
//
// These tests pin the replacement to what the backend actually does, read from
// the read-only reference at ToWin/backend AccountService.purgeUserData
// (lines 90-127): every named store is emptied in one transaction on the
// request, the user row goes last, and there is no soft-delete flag, no archive
// table and no scheduled retention job anywhere in src/main.
//
// What is deliberately NOT asserted here: any number of days a copy may sit in
// a backup. That window is not established anywhere in the code, so the policy
// does not state one. See ralph-hardening/progress.txt, HARD-111.
import { privacySections, DRAFT } from '../src/data/legalContent';

const retention = (email = 'help@towinly.com') =>
  privacySections(email).find((s) => s.h === 'How long we keep it');

describe('privacy policy: how long we keep it', () => {
  test('no longer ships an unfinished sentence', () => {
    // Arrange / Act
    const { p } = retention();

    // Assert - the exact placeholder wording, and the shape of any successor.
    expect(p).not.toMatch(/have not written down/i);
    expect(p).not.toMatch(/we will say it here/i);
    expect(p).not.toMatch(/once we have\b/i);
    expect(p).not.toMatch(/not (yet )?decided/i);
  });

  test('states the account lifetime and that deletion happens on the request', () => {
    // Arrange / Act - deleteOwnAccount calls purgeUserData in one transaction
    // with no grace period (AccountService.java:145-151).
    const { p } = retention();

    // Assert
    expect(p).toContain('as long as your account is open');
    expect(p).toContain('at the moment you ask');
  });

  test('names what the purge actually removes', () => {
    // Arrange / Act - one phrase per repository call in purgeUserData.
    const { p } = retention();

    // Assert
    expect(p).toContain('photo');            // s3Service.deleteFile(photoUrl) :95
    expect(p).toContain('identity document'); // s3Service.deleteFile(idDocumentUrl) :96
    expect(p).toContain('messages');          // messageRepository :98
    expect(p).toContain('reviews');           // reviewRepository :99
    expect(p).toContain('help requests');     // needRepository :101-104
    expect(p).toContain('Sealed box');        // sealedItemRepository :119
    expect(p).toContain('last thing to go');  // userRepository.delete(user) :126
  });

  test('says there is no copy kept aside, because there is no such store', () => {
    // Arrange / Act - no soft-delete column on User, no archive table, and the
    // only two @Scheduled jobs in src/main are the inactivity check and the
    // rate-limiter sweep. Neither holds data back.
    const { p } = retention();

    // Assert
    expect(p).toMatch(/marked as closed/i);
    expect(p).toMatch(/no separate store/i);
  });

  test('invents no retention period it cannot prove', () => {
    // Arrange / Act
    const { p } = retention();

    // Assert - no "30 days", no "six months", in either branch of the page.
    expect(p).not.toMatch(/\b\d+\s*(days?|months?|years?)\b/);
    expect(retention(null).p).not.toMatch(/\b\d+\s*(days?|months?|years?)\b/);
  });

  test('reads as plain words, with no em dash', () => {
    // Arrange / Act
    const { p } = retention();

    // Assert
    expect(p).not.toContain('—');
    expect(p).not.toContain('–');
  });

  test('leaves the draft notice standing', () => {
    // Assert - HARD-111 fixes one sentence. The DRAFT banner is an owner
    // decision recorded in the file header and stays exactly as it is.
    expect(DRAFT.eyebrow).toBe('Draft: a lawyer has not checked this yet');
    expect(DRAFT.asOf).toBe('Draft of 16 August 2026');
    expect(DRAFT.body).toContain('A lawyer has not been through it yet');
  });
});
