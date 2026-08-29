// DEEP-30 remainder: the deletion link in the legal documents used to swallow
// a failed open: `Linking.openURL(url).catch(() => {})`. A phone with no
// browser handler rejects openURL (react-native-web resolves either way, so
// this is a native-only ending), and the tap said nothing. The failure has to
// speak and name the address so the person can type it, the same ending as
// CreatorCard.jsx:36 and delete-account.jsx:67-70.
import { fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';
import LegalSections from '../src/components/legal/LegalSections';
import { ToastProvider } from '../src/context/ToastContext';
import {
  DELETION_PAGE_URL,
  LEGAL_LINK_FALLBACK,
  PRIVACY_CONTENT,
} from '../src/data/legalContent';
import { ThemeProvider } from '../src/theme/ThemeContext';

// The real section the privacy policy renders, so the test follows the
// content instead of inventing a parallel document.
const linkedSection = () => PRIVACY_CONTENT.find((s) => s.link);

function wrap(sections) {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <LegalSections sections={sections} />
      </ToastProvider>
    </ThemeProvider>
  );
}

afterEach(() => jest.restoreAllMocks());

test('the fallback sentence names the address and carries no em dash', () => {
  const sentence = LEGAL_LINK_FALLBACK(DELETION_PAGE_URL);
  expect(sentence).toContain(DELETION_PAGE_URL);
  expect(sentence).not.toMatch(/—/);
});

test('a deletion link that cannot open says where to go instead of nothing', async () => {
  // Arrange - native with no browser handler: openURL rejects.
  jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no handler'));
  const section = linkedSection();
  const r = await wrap([section]);

  // Act - it stays a real link; the role is how a screen reader sells it.
  await fireEvent.press(r.getByRole('link', { name: section.link.label }));

  // Assert - the failure speaks and hands over the address.
  const sentence = LEGAL_LINK_FALLBACK(section.link.url);
  expect(await r.findByText(sentence)).toBeTruthy();
  expect(sentence).toContain(section.link.url);
});

test('a link that opens quietly shows no fallback', async () => {
  // Arrange
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const section = linkedSection();
  const r = await wrap([section]);

  // Act
  await fireEvent.press(r.getByRole('link', { name: section.link.label }));

  // Assert
  expect(Linking.openURL).toHaveBeenCalledWith(section.link.url);
  expect(r.queryByText(LEGAL_LINK_FALLBACK(section.link.url))).toBeNull();
});
