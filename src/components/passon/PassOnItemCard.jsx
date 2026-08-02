// One thing she has written, as it sits on her own page.
//
// The words are shown in full rather than clipped to a preview. She wrote
// them, they are hers to re-read, and a "…" with no way to open it is a dead
// end on a page whose whole subject is being read.
import { Text, View } from 'react-native';
import { AUDIENCES, LETTERS, onDay } from '../../lib/passOnLocks';
import { useTheme } from '../../theme/ThemeContext';
import Button from '../ui/Button';
import Card from '../ui/Card';

function QuietChip({ label, color, borderColor }) {
  const { t, type, radius } = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: borderColor || t.border,
        borderRadius: radius.pill,
        paddingVertical: 4,
        paddingHorizontal: 12,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ fontSize: type.meta, fontWeight: '600', color: color || t.ink3 }}>
        {label}
      </Text>
    </View>
  );
}

export default function PassOnItemCard({ item, onChange, onRemove }) {
  const { t, text, type, spacing, fontFamily } = useTheme();
  const isLetter = item.kind === 'LETTER';
  const audience = AUDIENCES.find((a) => a.key === item.audience);
  // Anything but NOW is held. Written this way round so a release value this
  // build has never heard of reads as "held" — the shut side is the safe guess.
  const held = isLetter && item.releaseWhen && item.releaseWhen !== 'NOW';

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
          <QuietChip label={`To ${item.audienceUserName || 'someone'}`} />
        ) : audience ? (
          <QuietChip label={audience.title} />
        ) : null}
      </View>

      <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 26, marginTop: spacing[3] }}>
        {item.body}
      </Text>

      {isLetter ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[2],
            flexWrap: 'wrap',
            marginTop: spacing[3],
          }}
        >
          {/* Which of the two kinds of letter this is, on every one of them.
              Held renders in the trust accent — solemn, in trust, not yet
              achieved; readable-now in achieved green (web used gold/green;
              this app retired gold for the deep-green trust family). */}
          {held ? (
            <QuietChip label={LETTERS.heldUntilGone} color={t.trustGold} borderColor={t.greenLine} />
          ) : (
            <QuietChip label={LETTERS.readableNow} color={t.greenDeep} borderColor={t.greenLine} />
          )}
          {item.firstReadAt ? (
            <Text style={{ fontSize: text.sm, color: t.ink3 }}>
              {item.audienceUserName} read this on {onDay(item.firstReadAt)}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[4] }}>
        <Button title="Change" variant="secondary" size="small" onPress={() => onChange(item)} />
        <Button title="Remove" variant="secondary" size="small" onPress={() => onRemove(item)} />
      </View>
    </Card>
  );
}
