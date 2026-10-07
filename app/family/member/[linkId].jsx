// One family member, on their own page (owner call 2026-09-25: a name opens a
// page like WhatsApp, not a dropdown). This is what used to unfold under the
// name on the elder's My Family list: how they are related, the Main contact
// label, and the three moves — Message, Make main contact, Remove. Only
// elder-seat links show (iAmElder); anything else reads as gone.
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { getFamilyLinks } from '../../../src/api/family';
import ActionChip from '../../../src/components/ui/ActionChip';
import Avatar from '../../../src/components/ui/Avatar';
import LoadError from '../../../src/components/ui/LoadError';
import Screen from '../../../src/components/ui/Screen';
import SkeletonCard from '../../../src/components/ui/Skeleton';
import useFamilyMemberActions from '../../../src/lib/useFamilyMemberActions';
import { useTheme } from '../../../src/theme/ThemeContext';
import { tr } from '../../../src/i18n';

export default function FamilyMemberPage() {
  const { linkId } = useLocalSearchParams();
  const { t, spacing, radius, type } = useTheme();
  const router = useRouter();
  const { openChat, makePrimary, confirmRemove, chatOpening, promoting, removing } =
    useFamilyMemberActions();

  const { data: family, isLoading, isError, refetch } = useQuery({
    queryKey: ['family-links'],
    queryFn: getFamilyLinks,
  });
  const link = (family?.activeLinks ?? []).find((l) => l.iAmElder && String(l.id) === String(linkId));

  if (!link) {
    return (
      <Screen back title={tr('Family')} onRefresh={() => refetch()}>
        {isLoading ? (
          <SkeletonCard lines={3} />
        ) : isError ? (
          <LoadError what={tr('this family member')} onRetry={refetch} />
        ) : (
          <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22 }}>
            {tr('This family member is not here any more.')}
          </Text>
        )}
      </Screen>
    );
  }

  return (
    <Screen back title={link.otherUserName} onRefresh={() => refetch()}>
      <View style={{ alignSelf: 'center', marginBottom: spacing[4] }}>
        <Avatar name={link.otherUserName} size={72} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
        <Text style={{ flex: 1, fontSize: type.body, color: t.inkSlate, lineHeight: 22 }}>
          {link.relationship || tr('Family member')}
        </Text>
        {link.isPrimary ? (
          // A label, not a button — the trust token marks the one main
          // contact (trust semantics, never action blue).
          <View
            style={{
              backgroundColor: t.greenTint,
              borderWidth: 1,
              borderColor: t.greenLine,
              borderRadius: radius.pill,
              paddingVertical: 6,
              paddingHorizontal: 14,
            }}
          >
            <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.trustGold }}>{tr('Main contact')}</Text>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: spacing[3] }}>
        {/* Private family chat (FAM-510): the link is the permission. */}
        <ActionChip
          label={chatOpening ? tr('Opening…') : tr('Message')}
          tonal
          disabled={chatOpening}
          onPress={() => openChat(link)}
          style={{ flex: 1 }}
        />
        {!link.isPrimary ? (
          <ActionChip
            label={tr('Make main contact')}
            disabled={promoting}
            onPress={() => makePrimary(link.id)}
            style={{ flex: 1 }}
          />
        ) : null}
        <ActionChip
          label={tr('Remove')}
          destructive
          disabled={removing}
          onPress={() => {
            confirmRemove(link, () => router.back());
          }}
          style={{ flex: 1 }}
        />
      </View>
    </Screen>
  );
}
