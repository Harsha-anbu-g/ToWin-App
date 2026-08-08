// Delete your account - the public page Google Play's Data safety form points at.
//
// Play wants a web address where somebody can ask for deletion without
// installing anything. It lives here, in the phone web export, and goes live at
// https://towinly.com/app/delete-account. Two reasons it had to be this route
// rather than a page on the website:
//
//  - the website (ToWin/) is read-only reference in this repo, so nothing new
//    can be added to its route table;
//  - PhoneAppRedirect can never fire on it. towinly.com/app/:path* is a Vercel
//    REWRITE to the app project for every user-agent, so the website bundle
//    (the only place PhoneAppRedirect is mounted) never loads. Its allowlist,
//    ToWin/frontend/src/components/phoneAppRouting.js, would not match
//    /delete-account either way. Most people asking to delete an account are on
//    a phone, so surviving that redirect is the whole test.
//
// Public on purpose: this is a top-level route with no auth guard, exactly like
// terms.jsx and privacy.jsx. Someone who has already lost access to their
// account still has to be able to ask.
import { Linking, Text, View } from 'react-native';
import Button from '../src/components/ui/Button';
import Card from '../src/components/ui/Card';
import Screen from '../src/components/ui/Screen';
import { useToast } from '../src/context/ToastContext';
import {
  DELETE_ACCOUNT_PAGE,
  deletionContactEmail,
  deletionMailto,
} from '../src/data/deleteAccountPage';
import { useTheme } from '../src/theme/ThemeContext';

export default function DeleteAccount() {
  const { t, spacing, text } = useTheme();
  const { showToast } = useToast();
  const email = deletionContactEmail();

  // A browser with no mail client handles nothing and reports nothing, so the
  // address is also rendered as selectable text below (HCI 9) and the failure
  // is spoken rather than swallowed.
  const writeToUs = () =>
    Linking.openURL(deletionMailto(email)).catch(() =>
      showToast(`Write to ${email} and ask us to delete your account.`, 'info')
    );

  return (
    // One heading on the page, in the header row, exactly like terms.jsx and
    // privacy.jsx. A second title inside the card read as a duplicate h1 to a
    // screen reader and as repetition to everybody else.
    <Screen back title={DELETE_ACCOUNT_PAGE.title}>
      <Card>
        <Text style={{ fontSize: text.sm, color: t.inkSlate2, lineHeight: 24 }}>
          {DELETE_ACCOUNT_PAGE.intro}
        </Text>

        {DELETE_ACCOUNT_PAGE.sections.map((s) => (
          <View key={s.h} style={{ marginTop: spacing[6] }}>
            <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.ink, marginBottom: 6 }}>
              {s.h}
            </Text>
            <Text style={{ fontSize: text.sm, color: t.inkSlate2, lineHeight: 24 }}>{s.p}</Text>
          </View>
        ))}

        {/* The one filled action on the page, and the address in plain text
            beside it for anyone whose browser cannot open a mail app. */}
        <View style={{ marginTop: spacing[6], gap: spacing[3] }}>
          <Button
            title={DELETE_ACCOUNT_PAGE.actionLabel}
            onPress={writeToUs}
            accessibilityHint={`Starts a message to ${email} asking for your account to be deleted`}
          />
          <Text
            selectable
            style={{ fontSize: text.sm, color: t.inkSlate2, lineHeight: 24, textAlign: 'center' }}
          >
            {`Or write to ${email} yourself.`}
          </Text>
        </View>
      </Card>
    </Screen>
  );
}
