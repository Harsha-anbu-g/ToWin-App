// One story or letter as a visitor reads it.
//
// Deliberately not PassOnItemCard with a flag. That card is the owner's, and
// it carries Change and Remove; a visitor's card must have no branch that
// could ever render either, so the two are separate files.
//
// The audience chip is absent on purpose too. "My family" tells the reader who
// *else* can see this, which is the writer's business and not the reader's. A
// letter is the one thing worth naming, because a letter reaching you at all
// means it was written to you.
import { useState } from 'react';
import { Text, View } from 'react-native';
import { FROM_PAGE, REPORT_STORY } from '../../lib/passOnLocks';
import { useTheme } from '../../theme/ThemeContext';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import RadioCards from './RadioCards';

/**
 * Asked before anything is sent, because a report is read by a person and
 * acted on. The reason is a required choice and the note is optional —
 * somebody upset enough to object should not be made to write an essay first.
 */
function ReportForm({ sending, error, onCancel, onSend }) {
  const { t, text, spacing } = useTheme();
  const [reason, setReason] = useState(REPORT_STORY.reasons[0]);
  const [note, setNote] = useState('');

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: t.hairline,
        paddingTop: spacing[4],
        gap: spacing[3],
      }}
    >
      <RadioCards
        prompt={REPORT_STORY.reasonPrompt}
        options={REPORT_STORY.reasons.map((r) => ({ key: r, title: r, blurb: '' }))}
        value={reason}
        onChange={setReason}
      />
      <Input label={REPORT_STORY.notePrompt} value={note} onChangeText={setNote} multiline />
      {error ? (
        <Text
          accessibilityRole="alert"
          style={{ fontSize: text.sm, fontWeight: '500', color: t.redDeep }}
        >
          {error}
        </Text>
      ) : null}
      <View style={{ gap: spacing[2] }}>
        <Button
          title={sending ? REPORT_STORY.sending : REPORT_STORY.send}
          onPress={() => onSend({ reason, description: note.trim() })}
          loading={sending}
        />
        <Button title={REPORT_STORY.cancel} variant="secondary" onPress={onCancel} disabled={sending} />
      </View>
    </View>
  );
}

export default function PassOnReadCard({
  item,
  reportOpen,
  reportSent,
  reportError,
  sending,
  onOpenReport,
  onCancelReport,
  onSendReport,
}) {
  const { t, text, type, fontFamily, radius, spacing } = useTheme();
  const isLetter = item.kind === 'LETTER';

  return (
    <Card>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: spacing[3],
          flexWrap: 'wrap',
        }}
      >
        <Text
          style={{
            flex: 1,
            minWidth: 160,
            fontFamily: fontFamily.display,
            fontSize: type.cardTitle,
            color: t.ink,
            letterSpacing: -0.3,
          }}
        >
          {item.title}
        </Text>
        {isLetter ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: t.greenLine,
              borderRadius: radius.pill,
              paddingVertical: 4,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.trustGold }}>
              {FROM_PAGE.letterChip}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 26, marginTop: spacing[3] }}>
        {item.body}
      </Text>

      {/* Only a story carries this — see REPORT_STORY in passOnLocks for why. */}
      {!isLetter ? (
        <View style={{ marginTop: spacing[4] }}>
          {reportSent ? (
            <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 22 }}>
              {REPORT_STORY.sent}
            </Text>
          ) : null}

          {!reportSent && !reportOpen ? (
            <Button
              title={REPORT_STORY.open}
              variant="secondary"
              size="small"
              onPress={() => onOpenReport(item)}
            />
          ) : null}

          {reportOpen ? (
            <ReportForm
              sending={sending}
              error={reportError}
              onCancel={onCancelReport}
              onSend={onSendReport}
            />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
