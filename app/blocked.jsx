// Blocked people — view and undo device-side blocks (UGC 1.2). Reached from
// Profile → Blocked people. Unblocking only removes the hiding; it never
// re-creates a friendship that was ended when the block was made.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, Text, View } from 'react-native';
import Avatar from '../src/components/ui/Avatar';
import Card from '../src/components/ui/Card';
import Screen from '../src/components/ui/Screen';
import { useToast } from '../src/context/ToastContext';
import { getBlocked, unblockUser } from '../src/lib/blockList';
import { useTheme } from '../src/theme/ThemeContext';

export default function BlockedPeople() {
  const { t, spacing, text } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: blocked } = useQuery({ queryKey: ['block-list'], queryFn: getBlocked });
  const list = blocked ?? [];

  const unblock = async (person) => {
    await unblockUser(person.id);
    queryClient.invalidateQueries({ queryKey: ['block-list'] });
    showToast(`${person.name || 'They'} can appear again.`, 'info');
  };

  return (
    <Screen back title="Blocked people">
      {list.length === 0 ? (
        <Card>
          <Text style={{ fontSize: text.base, lineHeight: 27, color: t.inkSlate }}>
            You haven't blocked anyone. If someone ever makes you uncomfortable, open their
            profile and choose "Block this person" — their requests and messages will
            disappear for you.
          </Text>
        </Card>
      ) : (
        <Card contentStyle={{ paddingVertical: 6 }}>
          {list.map((person, i) => (
            <View
              key={person.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[3],
                paddingVertical: 10,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: t.hairline,
              }}
            >
              <Avatar name={person.name} size={44} />
              <Text style={{ flex: 1, fontSize: text.base, color: t.ink }}>
                {person.name || 'Someone'}
              </Text>
              {/* Same quiet pill as the profile Edit affordance */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Unblock ${person.name || 'this person'}`}
                onPress={() => unblock(person)}
                hitSlop={{ top: 6, bottom: 6 }}
                style={({ pressed }) => ({
                  height: 36,
                  paddingHorizontal: 15,
                  borderRadius: 18,
                  backgroundColor: t.canvas,
                  borderWidth: 1,
                  borderColor: t.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: t.ink }}>Unblock</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
