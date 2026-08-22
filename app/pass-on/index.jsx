// What I pass on — the elder's own page. Three parts, one tab each: the
// stories she shares while she is here, the letters written to one person,
// and the sealed box of the things only she knows.
//
// Elder-only (web ElderOnly parity): helpers and family are not shown an
// error — they simply get their own home. The open tab lives in the route
// params: a story is the longest thing anyone writes in this app, and losing
// the tab on a failed save would drop her on the wrong part of her own page.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Lock, ScrollText } from '../../src/components/icons';
import { Pressable, Text, View } from 'react-native';
import api from '../../src/api/client';
import PassOnItemCard from '../../src/components/passon/PassOnItemCard';
import PassOnItemForm from '../../src/components/passon/PassOnItemForm';
import SealedItems from '../../src/components/passon/SealedItems';
import SealedKeyholders from '../../src/components/passon/SealedKeyholders';
import SealedSetup from '../../src/components/passon/SealedSetup';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Screen from '../../src/components/ui/Screen';
import SegmentedControl from '../../src/components/ui/SegmentedControl';
import SwipeSegments from '../../src/components/ui/SwipeSegments';
import LoadError from '../../src/components/ui/LoadError';
import SkeletonCard from '../../src/components/ui/Skeleton';
import { useAuth } from '../../src/context/AuthContext';
import { useConfirm } from '../../src/context/ConfirmContext';
import { useToast } from '../../src/context/ToastContext';
import {
  ANYONE_CHECK,
  LETTERS,
  NOT_A_WILL,
  PAGE_LEAD,
  SEALED_BOX,
  SEALED_ITEMS,
  SETUP,
  STORY_BOX,
  TAKE_DOWN,
  TAKE_OUT_OF_BOX,
} from '../../src/lib/passOnLocks';
import { objectionableError } from '../../src/lib/contentFilter';
import { herFamilyList, peopleSheKnows } from '../../src/lib/passOnPeople';
import { useTheme } from '../../src/theme/ThemeContext';

const TABS = [
  { key: 'stories', label: 'Story box' },
  { key: 'letters', label: 'Letter box' },
  { key: 'sealed', label: 'Sealed box' },
];

/**
 * The not-a-will line. A slim row, never a card that shouts — it has to be
 * the first thing read and never the loudest thing on the page.
 */
function NotAWillPrimer() {
  const { t, text, radius, spacing } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View
      style={{
        backgroundColor: t.canvas,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: t.hairline2,
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[4],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
        <View
          aria-hidden
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: t.greenTint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ScrollText size={16} color={t.trustGold} strokeWidth={2.2} />
        </View>
        <Text style={{ flex: 1, fontSize: text.sm, color: t.ink, lineHeight: 22 }}>
          {NOT_A_WILL.short}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={NOT_A_WILL.ask}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={({ pressed }) => ({
          minHeight: 44,
          justifyContent: 'center',
          alignSelf: 'flex-start',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.blueDeep }}>
          {NOT_A_WILL.ask}
        </Text>
      </Pressable>
      {open ? (
        <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 24, paddingLeft: 44 }}>
          {NOT_A_WILL.long}
        </Text>
      ) : null}
    </View>
  );
}

/** The Sealed box as it reads before there is anything in it: one teaching card. */
function SealedBoxTeaching() {
  const { t, text, fontFamily, spacing } = useTheme();
  return (
    <Card>
      <View
        aria-hidden
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: t.greenTint,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing[4],
        }}
      >
        <Lock size={26} color={t.trustGold} strokeWidth={2} />
      </View>

      <Text
        style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink, letterSpacing: -0.4 }}
      >
        {SEALED_BOX.title}
      </Text>
      <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 24, marginTop: 10 }}>
        {SEALED_BOX.body}
      </Text>

      <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.ink, marginTop: spacing[5] }}>
        {SEALED_BOX.safetyHeading}
      </Text>
      <View style={{ gap: spacing[3], marginTop: 10 }}>
        {SEALED_BOX.safety.map((line) => (
          <Text
            key={line.slice(0, 24)}
            style={{
              fontSize: text.sm,
              color: t.inkSlate,
              lineHeight: 24,
              paddingLeft: spacing[3],
              borderLeftWidth: 2,
              borderLeftColor: t.hairline2,
            }}
          >
            {line}
          </Text>
        ))}
      </View>

      <View
        style={{
          marginTop: spacing[5],
          paddingTop: spacing[4],
          borderTopWidth: 1,
          borderTopColor: t.hairline,
        }}
      >
        <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.ink }}>
          {SEALED_BOX.afterHeading}
        </Text>
        <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 24, marginTop: 10 }}>
          {SEALED_BOX.after}
        </Text>
      </View>
    </Card>
  );
}

function Empty({ children }) {
  const { t, text, radius, spacing } = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.canvas,
        borderWidth: 1,
        borderColor: t.hairline2,
        borderRadius: radius.xl,
        paddingVertical: spacing[6],
        paddingHorizontal: spacing[5],
      }}
    >
      <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 24 }}>{children}</Text>
    </View>
  );
}

export default function PassOn() {
  const { t, text, spacing } = useTheme();
  const { user, booted } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  const tab = TABS.some((s) => s.key === params.tab) ? params.tab : 'stories';

  const [writing, setWriting] = useState(null); // { kind, item } while the form is open
  const [saving, setSaving] = useState(false);
  const [settingUp, setSettingUp] = useState(false);

  const enabled = !!user;
  // isError + refetch on the content queries (UX-706): a failed load must
  // show LoadError with retry, never "Nothing in your boxes yet".
  const { data: mine, isLoading, isError: mineFailed, refetch: refetchMine } = useQuery({
    queryKey: ['passon-mine'],
    queryFn: async () => (await api.get('/passon/mine')).data,
    enabled,
  });
  // The two lists this page borrows from other features carry the same rule:
  // an empty array from a dropped fetch must never be read back to her as
  // "there is nobody" (UX-706, same as the content queries above).
  const { data: links, isError: linksFailed, refetch: refetchLinks } = useQuery({
    queryKey: ['family-links'],
    queryFn: async () => (await api.get('/family/links')).data,
    enabled,
  });
  const {
    data: connections,
    isError: connectionsFailed,
    refetch: refetchConnections,
  } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
    enabled,
  });
  const { data: setup, isLoading: setupLoading, isError: setupFailed, refetch: refetchSetup } = useQuery({
    queryKey: ['passon-setup'],
    queryFn: async () => (await api.get('/passon/setup')).data,
    enabled,
  });
  const { data: keyholders, isError: keysFailed, refetch: refetchKeys } = useQuery({
    queryKey: ['passon-keyholders'],
    // Same guard as the sealed box below, and for the same reason: a captive
    // portal on public wifi answers 200 with an HTML page, so axios hands back
    // a string. `|| []` lets that string straight through to .filter and takes
    // the page down mid-render.
    queryFn: async () => {
      const r = await api.get('/passon/keyholders');
      return Array.isArray(r.data) ? r.data : [];
    },
    enabled,
  });
  const { data: sealedItems } = useQuery({
    queryKey: ['passon-sealed'],
    // Array.isArray, not `|| []`: a 200 carrying anything but a list must not
    // take her whole page down — this is the page she opens to check her
    // sealed box is still there.
    queryFn: async () => {
      const r = await api.get('/passon/sealed');
      return Array.isArray(r.data) ? r.data : [];
    },
    enabled,
  });

  // Auth guards after the hooks so hook order never changes between renders.
  if (booted && !user) return <Redirect href="/(auth)/login" />;
  if (booted && user && user.role !== 'ELDER' && user.role !== 'BOTH') {
    return <Redirect href="/(tabs)/home" />;
  }

  const stories = mine?.stories || [];
  const letters = mine?.letters || [];
  const people = peopleSheKnows(links?.activeLinks, connections);
  const family = herFamilyList(links?.activeLinks);
  const keys = Array.isArray(keyholders) ? keyholders : [];

  // Failed AND nothing to show. A list left over from an earlier success is
  // still true, and replacing it with an error would take away the letter she
  // is part-way through writing or the setup she is part-way through.
  const peopleUnknown = (linksFailed || connectionsFailed) && people.length === 0;
  const familyUnknown = linksFailed && family.length === 0;
  const keysUnknown = keysFailed && keys.length === 0;
  const retryPeople = () => Promise.all([refetchLinks(), refetchConnections()]);

  const reload = () =>
    Promise.all(
      ['passon-mine', 'passon-setup', 'passon-keyholders', 'passon-sealed'].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      )
    );

  const changeTab = (next) => {
    router.setParams({ tab: next === 'stories' ? undefined : next });
    setWriting(null);
  };

  const openWriter = (kind, item = null) => setWriting({ kind, item });
  const writingHere = (kind) => writing?.kind === kind;

  async function save(payload) {
    // Apple 1.2: stop objectionable material before it is posted. Checked on the
    // title and the body, whoever the audience is: a Keyholder reading a letter
    // years from now deserves the same protection as a stranger.
    const problem = objectionableError(payload.title) || objectionableError(payload.body);
    if (problem) {
      showToast(problem, 'error');
      return;
    }
    // "Anyone" is the only audience that reaches people she has never met, so
    // it is the only one worth stopping for.
    if (payload.audience === 'EVERYONE' && !writing?.item) {
      const ok = await confirm({
        title: ANYONE_CHECK.title,
        message: ANYONE_CHECK.message,
        confirmLabel: ANYONE_CHECK.confirm,
        cancelLabel: ANYONE_CHECK.cancel,
      });
      if (!ok) return;
    }
    await send(payload);
  }

  async function send(payload) {
    const editing = writing?.item;
    setSaving(true);
    try {
      if (editing) await api.put(`/passon/items/${editing.id}`, payload);
      else await api.post('/passon/items', payload);
      setWriting(null);
      showToast(payload.kind === 'LETTER' ? 'Your letter is saved.' : 'Your story is saved.', 'success');
      await reload();
    } catch (err) {
      showToast(err?.response?.data?.message || 'We could not save that. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    const ok = await confirm({
      title: TAKE_DOWN.title,
      message: TAKE_DOWN.message,
      confirmLabel: TAKE_DOWN.confirm,
      cancelLabel: TAKE_DOWN.cancel,
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/passon/items/${item.id}`);
      showToast('Taken down.', 'success');
      await reload();
    } catch (err) {
      showToast(
        err?.response?.data?.message || 'We could not take that down. Please try again.',
        'error'
      );
    }
  }

  /** The last step of setup — one call; nobody was asked anything before it. */
  async function arm(payload) {
    setSaving(true);
    try {
      await api.post('/passon/arm', payload);
      setSettingUp(false);
      await reload();
    } catch (err) {
      showToast(err?.response?.data?.message || SETUP.before.failed, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function addSealed(payload) {
    setSaving(true);
    try {
      await api.post('/passon/sealed', payload);
      showToast(SEALED_ITEMS.saved, 'success');
      await reload();
    } catch (err) {
      showToast(err?.response?.data?.message || SEALED_ITEMS.failedToSave, 'error');
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function removeSealed(item) {
    // The one delete in this feature nobody can reverse — not support, not
    // the operator, nobody. Asked for in words that say exactly that.
    const ok = await confirm({
      title: TAKE_OUT_OF_BOX.title,
      message: TAKE_OUT_OF_BOX.message,
      confirmLabel: TAKE_OUT_OF_BOX.confirm,
      cancelLabel: TAKE_OUT_OF_BOX.cancel,
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/passon/sealed/${item.id}`);
      showToast(SEALED_ITEMS.removed, 'success');
      await reload();
    } catch (err) {
      showToast(err?.response?.data?.message || SEALED_ITEMS.failedToRemove, 'error');
    }
  }

  /**
   * The password travels in the body, never in the address. The answer is
   * handed straight back to the card that asked and kept nowhere else.
   */
  function openSealed(item, password) {
    return api.post(`/passon/sealed/${item.id}/reveal`, { password }).then((r) => r.data);
  }

  /** "If this was not your idea, undo it." Nothing is said to anybody about it. */
  async function undo() {
    const ok = await confirm({
      title: SETUP.settling.confirmTitle,
      message: SETUP.settling.confirmMessage,
      confirmLabel: SETUP.settling.confirmYes,
      cancelLabel: SETUP.settling.confirmNo,
    });
    if (!ok) return;
    setSaving(true);
    try {
      await api.post('/passon/undo');
      showToast(SETUP.settling.undone, 'success');
      await reload();
    } catch (err) {
      showToast(err?.response?.data?.message || SETUP.settling.undoFailed, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen back keyboard title="What I pass on" onRefresh={reload} contentStyle={{ gap: spacing[4] }}>
      <Text style={{ fontSize: text.sm, color: t.ink3, lineHeight: 24 }}>{PAGE_LEAD}</Text>

      <NotAWillPrimer />

      <SegmentedControl segments={TABS} value={tab} onChange={changeTab} />

      {/* Swiping the boxes left/right steps the segments, iOS-style. */}
      <SwipeSegments keys={TABS.map((s) => s.key)} value={tab} onChange={changeTab}>
      {tab === 'stories' ? (
        <View
          // No accessibilityLabel on this group on purpose. `accessible` is
          // what would make one reach VoiceOver, and on a container it
          // collapses every card and button inside into a single element
          // nobody can act on. The segmented control above already announces
          // which box is open.
          style={{ gap: spacing[3] }}
        >
          {writingHere('STORY') ? (
            <PassOnItemForm
              kind="STORY"
              initial={writing.item}
              people={people}
              saving={saving}
              onSave={save}
              onCancel={() => setWriting(null)}
            />
          ) : (
            <Button
              title={STORY_BOX.start}
              onPress={() => openWriter('STORY')}
              style={{ alignSelf: 'flex-end' }}
            />
          )}

          {mineFailed ? <LoadError what="your stories" onRetry={refetchMine} /> : null}
          {isLoading && !mine ? <SkeletonCard lines={3} /> : null}
          {!isLoading && !mineFailed && stories.length === 0 && !writingHere('STORY') ? (
            <Empty>{STORY_BOX.empty}</Empty>
          ) : null}

          {stories.map((item) => (
            <PassOnItemCard
              key={item.id}
              item={item}
              onChange={(s) => openWriter('STORY', s)}
              onRemove={remove}
            />
          ))}
        </View>
      ) : null}

      {tab === 'letters' ? (
        <View
          // No accessibilityLabel on this group on purpose. `accessible` is
          // what would make one reach VoiceOver, and on a container it
          // collapses every card and button inside into a single element
          // nobody can act on. The segmented control above already announces
          // which box is open.
          style={{ gap: spacing[3] }}
        >
          {/* Both halves of the Letter box, said before she writes anything —
              including the part that matters most: nothing here happens on
              its own. */}
          <Card>
            <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 24 }}>
              {LETTERS.howItWorks}
            </Text>
          </Card>

          {writingHere('LETTER') ? (
            <PassOnItemForm
              kind="LETTER"
              initial={writing.item}
              people={people}
              // Her Keyholders and her quorum live on the Sealed box tab, and
              // without them nobody could ever ask for a held letter to be
              // opened. Same state the tab itself reads, fetched once.
              canHoldUntilGone={Boolean(setup?.armed)}
              saving={saving}
              onSave={save}
              onCancel={() => setWriting(null)}
              onGoToSealedBox={() => changeTab('sealed')}
            />
          ) : peopleUnknown ? (
            // The picker inside the form would hold nobody and her Save could
            // never pass, so the way in waits for the retry rather than
            // telling her she has nobody left to write to.
            <LoadError what="the people you can write to" onRetry={retryPeople} />
          ) : (
            <Button
              title={LETTERS.start}
              onPress={() => openWriter('LETTER')}
              style={{ alignSelf: 'flex-end' }}
            />
          )}

          {mineFailed ? <LoadError what="your letters" onRetry={refetchMine} /> : null}
          {isLoading && !mine ? <SkeletonCard lines={3} /> : null}
          {!isLoading && !mineFailed && letters.length === 0 && !writingHere('LETTER') ? (
            <Empty>{LETTERS.empty}</Empty>
          ) : null}

          {letters.map((item) => (
            <PassOnItemCard
              key={item.id}
              item={item}
              onChange={(l) => openWriter('LETTER', l)}
              onRemove={remove}
            />
          ))}
        </View>
      ) : null}

      {tab === 'sealed' ? (
        <View
          // No accessibilityLabel on this group on purpose. `accessible` is
          // what would make one reach VoiceOver, and on a container it
          // collapses every card and button inside into a single element
          // nobody can act on. The segmented control above already announces
          // which box is open.
          style={{ gap: spacing[4] }}
        >
          {/* Three states, one at a time: the teaching card before she has
              decided anything, the three steps while she is deciding, and who
              holds a key once she has. A failed or pending setup fetch says
              so honestly first (UX-706): without this, a network drop wore
              the teaching card and Start led nowhere. */}
          {setupFailed ? <LoadError what="your Sealed box" onRetry={refetchSetup} /> : null}
          {setupLoading && !setup ? <SkeletonCard lines={3} /> : null}
          {settingUp && setup ? (
            familyUnknown ? (
              // Step one would otherwise say "You need at least three people
              // on your family list first" to an elder who has five.
              <LoadError what="your family list" onRetry={refetchLinks} />
            ) : (
              <SealedSetup
                family={family}
                setup={setup}
                already={keys
                  .filter((k) => k.status === 'INVITED' || k.status === 'ACTIVE')
                  .map((k) => k.personId)}
                saving={saving}
                onFinish={arm}
                onCancel={() => setSettingUp(false)}
              />
            )
          ) : null}

          {/* What is inside comes before who can open it one day — she reads
              down from her own things to the arrangement around them. */}
          {!settingUp && setup?.armed ? (
            <SealedItems
              items={sealedItems}
              saving={saving}
              releaseContactEmail={setup?.releaseContactEmail}
              onAdd={addSealed}
              onRemove={removeSealed}
              onReveal={openSealed}
            />
          ) : null}

          {!settingUp && setup?.armed ? (
            keysUnknown ? (
              // An armed box always has Keyholders, so an empty list here is
              // the fetch failing — never "nobody is holding a key".
              <LoadError what="your keyholders" onRetry={refetchKeys} />
            ) : (
              <SealedKeyholders
                setup={setup}
                keyholders={keys}
                undoing={saving}
                onUndo={undo}
                onChange={() => setSettingUp(true)}
              />
            )
          ) : null}

          {!settingUp && !setupLoading && !setupFailed && !setup?.armed ? (
            <>
              <SealedBoxTeaching />
              <Button
                title={SETUP.start}
                onPress={() => setSettingUp(true)}
                style={{ alignSelf: 'flex-end' }}
              />
            </>
          ) : null}
        </View>
      ) : null}
      </SwipeSegments>
    </Screen>
  );
}
