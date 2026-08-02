// Her box once it is set up: the seven days she has to take it all back, and
// then who holds a key.
//
// The week is the point. Nothing in this app can stop a relative sitting
// beside an elder and tapping through the whole setup in one visit. What can
// be done is leave the way out open for seven days, in a card she cannot miss,
// with a button that says in her own words what it is for — never behind a
// menu, never a footnote.
//
// Every status is the real one. "David has not answered yet" is a sentence an
// elder may act on, so it is never softened into "pending".
import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SETUP, SHEET, keyholderLine, listOfNames } from '../../lib/passOnLocks';
import { useTheme } from '../../theme/ThemeContext';
import Button from '../ui/Button';
import Card from '../ui/Card';

/**
 * Props:
 *   setup       — the server's setup state
 *   keyholders  — [{ id, personName, status, respondedAt }]
 *   undoing     — true while the undo call is in flight
 *   onUndo(), onChange()
 */
export default function SealedKeyholders({ setup, keyholders, undoing, onUndo, onChange }) {
  const { t, text, type, fontFamily, radius, spacing } = useTheme();
  const router = useRouter();

  // A key she took back herself is not part of "who can open it one day".
  // Every other ending stays on the list, because she did not necessarily
  // cause it and needs to see that the number has moved.
  const shown = (keyholders || []).filter((k) => k.status !== 'REMOVED');
  const standing = shown.filter((k) => k.status === 'INVITED' || k.status === 'ACTIVE');

  // Green only for somebody actually holding a key — green means achieved.
  const dotColour = (status) => {
    if (status === 'ACTIVE') return t.greenDeep;
    if (status === 'INVITED') return t.trustGold;
    return t.ink3;
  };

  return (
    <View style={{ gap: spacing[4] }}>
      {setup.canStillUndo ? (
        <Card
          accessibilityLabel="Your box is set up"
          style={{ backgroundColor: t.greenTint, borderColor: t.trustGold }}
        >
          <Text
            style={{
              fontFamily: fontFamily.display,
              fontSize: text.lg,
              color: t.ink,
              letterSpacing: -0.4,
            }}
          >
            {SETUP.settling.title}
          </Text>
          <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 24, marginTop: 10 }}>
            {SETUP.settling.body(listOfNames(standing.map((k) => k.personName)))}
          </Text>
          <Button
            title={SETUP.settling.undo}
            variant="secondary"
            onPress={onUndo}
            disabled={undoing}
            style={{ alignSelf: 'flex-start', marginTop: spacing[4] }}
          />
        </Card>
      ) : null}

      <Card accessibilityLabel={SETUP.settled.heading}>
        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: type.cardTitle,
            color: t.ink,
            letterSpacing: -0.3,
          }}
        >
          {SETUP.settled.heading}
        </Text>
        {setup.approvalsNeeded && setup.keyholderTarget ? (
          <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 24, marginTop: 8 }}>
            {SETUP.settled.threshold(setup.approvalsNeeded, setup.keyholderTarget)}
          </Text>
        ) : null}

        <View style={{ marginTop: spacing[3] }}>
          {shown.map((person) => (
            <View
              key={person.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[3],
                minHeight: 48,
                paddingVertical: 4,
                borderTopWidth: 1,
                borderTopColor: t.hairline,
              }}
            >
              <View
                aria-hidden
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: dotColour(person.status),
                }}
              />
              <Text style={{ flex: 1, fontSize: text.sm, color: t.ink, lineHeight: 23 }}>
                {keyholderLine(person)}
              </Text>
            </View>
          ))}
        </View>

        <Button
          title={SETUP.settled.change}
          variant="secondary"
          onPress={onChange}
          style={{ alignSelf: 'flex-start', marginTop: spacing[4] }}
        />
      </Card>

      {/* The way to her saved copy — worth doing every time something here
          changes, and a page nobody can reach is a page that is not shipped. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={SHEET.linkFromBox}
        onPress={() => router.push('/pass-on/sheet')}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          minHeight: 48,
          borderRadius: radius.md,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.blueDeep }}>
          {SHEET.linkFromBox}
        </Text>
        <ChevronRight size={18} color={t.blueDeep} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}
