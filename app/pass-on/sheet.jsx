// Her saved one-page copy.
//
// This page exists to be left behind. Everything else in this feature works
// only while Towinly does; this is the answer to "and what if it does not".
// So the whole page is one action — keep the copy — and the copy she is about
// to keep is shown above it, in full.
//
// Digital only, deliberately: no print button, no PDF (owner ruling
// 2026-07-30). On the phone the file goes out through the system share sheet
// (Files, email, AirDrop — her choice of drawer); the web build downloads it.
//
// Nothing on this page is a secret — the server builds it on the same list
// that shows her what is in her box by name, which never decrypts a body.
// There is no password gate for that reason.
import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Platform, Share, Text, View } from 'react-native';
import api from '../../src/api/client';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Screen from '../../src/components/ui/Screen';
import LoadError from '../../src/components/ui/LoadError';
import SkeletonCard from '../../src/components/ui/Skeleton';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { SHEET, onDayInFull } from '../../src/lib/passOnLocks';
import { buildSheet, sheetAsText, sheetFileName } from '../../src/lib/passOnSheet';
import { useTheme } from '../../src/theme/ThemeContext';

/** On a phone there is no "my computer" — the honest verb is keeping a copy. */
const SAVE_LABEL = Platform.OS === 'web' ? SHEET.save : 'Save a copy of this page';

export default function PassOnSheet() {
  const { t, text, type, fontFamily, spacing } = useTheme();
  const { user, booted } = useAuth();
  const { showToast } = useToast();
  const [savedAt, setSavedAt] = useState(null);

  const { data, isError, refetch } = useQuery({
    queryKey: ['passon-sheet'],
    queryFn: async () => {
      const r = await api.get('/passon/sheet');
      return r.data;
    },
    enabled: !!user,
  });

  if (booted && !user) return <Redirect href="/(auth)/login" />;
  if (booted && user && user.role !== 'ELDER' && user.role !== 'BOTH') {
    return <Redirect href="/(tabs)/home" />;
  }

  const lastSavedAt = savedAt || data?.lastSavedAt || null;
  const sheet = data ? buildSheet(data) : null;

  /**
   * Hands her the copy, then tells the server she has one. The order is the
   * design: the copy is what matters and it goes out first, so a server having
   * a bad afternoon cannot stop her taking her own copy away. Recording it is
   * a courtesy to the line below, and its failure is silent for the same reason.
   */
  async function save() {
    try {
      const text_ = sheetAsText(sheet);
      if (Platform.OS === 'web') {
        const blob = new Blob([text_], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = sheetFileName(data.ownerName);
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const shared = await Share.share(
          { message: text_, title: sheetFileName(data.ownerName) },
          { subject: sheetFileName(data.ownerName) }
        );
        // She closed the share sheet without keeping it anywhere — that is a
        // change of mind, not a save, so nothing is recorded or celebrated.
        if (shared?.action === Share.dismissedAction) return;
      }
      showToast(SHEET.saved, 'success');
    } catch {
      showToast(SHEET.failedToSave, 'error');
      return;
    }

    try {
      await api.post('/passon/sheet/saved');
      setSavedAt(new Date().toISOString());
    } catch {
      // She has the copy. Whether we wrote down that she has it is our
      // problem, and interrupting her with it would be about us, not her.
    }
  }

  return (
    <Screen back title={SHEET.pageTitle} onRefresh={refetch} contentStyle={{ gap: spacing[4] }}>
      <Text style={{ fontSize: text.sm, color: t.ink3, lineHeight: 24 }}>{SHEET.pageLead}</Text>

      {isError ? (
        // With retry in place, never a dead-end sentence (UX-706 / HCI 9).
        <LoadError what="your one-page copy" onRetry={refetch} />
      ) : !sheet ? (
        <SkeletonCard lines={3} />
      ) : (
        <>
          {/* The one action on the page, above the copy — she should not have
              to read to the bottom of a long document to find it. */}
          <Card>
            <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 22 }}>
              {lastSavedAt ? SHEET.lastSaved(onDayInFull(lastSavedAt)) : SHEET.neverSaved}
            </Text>
            <Button title={SAVE_LABEL} onPress={save} style={{ marginTop: spacing[3] }} />
          </Card>

          <Text
            style={{
              fontSize: type.meta,
              fontWeight: '600',
              color: t.ink3,
              letterSpacing: 0.3,
              marginTop: spacing[2],
            }}
          >
            {SHEET.previewHeading}
          </Text>

          {/* The copy itself, drawn from the same structure the file is
              written from — neither can gain a line the other lacks. */}
          <Card accessibilityLabel={sheet.title}>
            <Text
              style={{
                fontFamily: fontFamily.display,
                fontSize: text.lg,
                color: t.ink,
                letterSpacing: -0.4,
              }}
            >
              {sheet.title}
            </Text>
            <Text style={{ fontSize: type.meta, color: t.ink3, marginTop: 6 }}>{sheet.madeOn}</Text>

            {sheet.sections.map((section) => (
              <View
                key={section.heading}
                style={{
                  marginTop: spacing[5],
                  paddingTop: spacing[4],
                  borderTopWidth: 1,
                  borderTopColor: t.hairline,
                }}
              >
                <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.ink }}>
                  {section.heading}
                </Text>
                {section.blurb ? (
                  <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 24, marginTop: 10 }}>
                    {section.blurb}
                  </Text>
                ) : null}

                {section.lines.length === 0 && section.empty ? (
                  <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 24, marginTop: 10 }}>
                    {section.empty}
                  </Text>
                ) : (
                  <>
                    {section.listLead ? (
                      <Text
                        style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 24, marginTop: 10 }}
                      >
                        {section.listLead}
                      </Text>
                    ) : null}
                    <View style={{ marginTop: spacing[3], gap: spacing[2] }}>
                      {section.lines.map((line) => (
                        <Text
                          key={line}
                          style={{
                            fontSize: text.sm,
                            color: t.ink,
                            lineHeight: 24,
                            paddingLeft: spacing[3],
                            borderLeftWidth: 2,
                            borderLeftColor: t.trustGold,
                          }}
                        >
                          {line}
                        </Text>
                      ))}
                    </View>
                  </>
                )}

                {section.note ? (
                  <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 24, marginTop: 10 }}>
                    {section.note}
                  </Text>
                ) : null}
              </View>
            ))}

            <Text
              style={{
                fontFamily: fontFamily.display,
                fontSize: 20,
                color: t.ink,
                letterSpacing: -0.3,
                marginTop: spacing[5],
                paddingTop: spacing[4],
                borderTopWidth: 1,
                borderTopColor: t.hairline,
              }}
            >
              {sheet.closing}
            </Text>
          </Card>
        </>
      )}
    </Screen>
  );
}
