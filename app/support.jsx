// Get help - the public page App Store Connect's Support URL points at.
//
// Apple will not accept a submission without a support address, and guideline
// 1.5 asks that the address actually provide support rather than redirect to a
// marketing page. Guideline 1.2 asks a user-generated-content app to publish a
// way to reach a human as well. A reviewer opens this cold, signed out, so it
// carries no auth guard and asks for nothing before it helps.
//
// See src/data/supportPage.js for why the route lives in the app export rather
// than on the website, and for the rule that nothing on it overclaims.
import { useState } from 'react';
import { Linking, Platform, Text, View } from 'react-native';
import Button from '../src/components/ui/Button';
import Card from '../src/components/ui/Card';
import Screen from '../src/components/ui/Screen';
import TextLink from '../src/components/ui/TextLink';
import { useToast } from '../src/context/ToastContext';
import { announce } from '../src/lib/announce';
import { SUPPORT_PAGE, supportContactEmail, supportMailto } from '../src/data/supportPage';
import { useTheme } from '../src/theme/ThemeContext';

export default function Support() {
  const { t, spacing, text } = useTheme();
  const { showToast } = useToast();
  const email = supportContactEmail();

  // Held on the page, not only in a toast: the mail app opens OVER this screen
  // and a toast has expired by the time the person comes back.
  const [outcome, setOutcome] = useState(null);

  /** On the page for the eye, through the root live region for the ear. */
  const say = (sentence) => {
    setOutcome(sentence);
    announce(sentence);
  };

  // On react-native-web Linking.openURL resolves whether or not a mail client
  // exists, so the catch below cannot run there and claiming "we started a
  // message" would be a guess. The web is told the truth about both endings at
  // once; native does reject, so it keeps the two precise answers.
  const writeToUs = () =>
    Linking.openURL(supportMailto(email))
      .then(() =>
        say(Platform.OS === 'web' ? SUPPORT_PAGE.startedOnWeb(email) : SUPPORT_PAGE.started(email))
      )
      .catch(() => {
        say(SUPPORT_PAGE.noMailApp(email));
        showToast(`Write to ${email} and tell us what happened.`, 'info');
      });

  return (
    // One heading on the page, in the header row, exactly like terms.jsx,
    // privacy.jsx and delete-account.jsx.
    <Screen back title={SUPPORT_PAGE.title}>
      <Card>
        <Text style={{ fontSize: text.sm, color: t.inkSlate2, lineHeight: 24 }}>
          {SUPPORT_PAGE.intro}
        </Text>

        {SUPPORT_PAGE.sections.map((s) => (
          <View key={s.h} style={{ marginTop: spacing[6] }}>
            <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.ink, marginBottom: 6 }}>
              {s.h}
            </Text>
            <Text style={{ fontSize: text.sm, color: t.inkSlate2, lineHeight: 24 }}>{s.p}</Text>
          </View>
        ))}

        {/* The one filled action on the page, with the address in plain
            selectable text beside it for anyone whose browser opens no mail
            app at all. */}
        <View style={{ marginTop: spacing[6], gap: spacing[3] }}>
          <Button
            title={SUPPORT_PAGE.actionLabel}
            onPress={writeToUs}
            accessibilityHint={`Starts a message to ${email} asking for help`}
          />
          <Text
            selectable
            style={{ fontSize: text.sm, color: t.inkSlate2, lineHeight: 24, textAlign: 'center' }}
          >
            {`Or write to ${email} yourself.`}
          </Text>

          {outcome ? (
            <View style={{ borderTopWidth: 1, borderTopColor: t.hairline, paddingTop: spacing[3] }}>
              <Text style={{ fontSize: text.sm, color: t.ink, lineHeight: 24 }}>{outcome}</Text>
            </View>
          ) : null}

          <TextLink
            label={SUPPORT_PAGE.deletionLinkLabel}
            onPress={() => Linking.openURL(SUPPORT_PAGE.deletionUrl)}
          />
        </View>
      </Card>
    </Screen>
  );
}
