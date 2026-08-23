// Input — Material outlined text field (react-native-paper) under the app's
// own API: label, error (announced out loud on the way in), helper, an
// optional leading `icon`, and an optional rightSlot overlay (used for the
// password eye toggles).
// Elder rules: >=48pt, 18px text.
//
// The leading icon goes through Paper's own `left` slot rather than the
// absolute overlay rightSlot uses. The overlay trick works on the right because
// nothing else lives there; on the left it would sit on top of the floating
// label, which starts at the same x. Paper's slot is the control that knows to
// move the label out of the icon's way (2026-08-19).
// memo'd: Paper inputs animate a floating label, so sibling fields skipping
// re-renders per keystroke is what keeps slow typists free of keyboard lag.
import { AlertCircle } from '../icons';
import { memo, useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import { TextInput as PaperInput } from 'react-native-paper';
import { announce } from '../../lib/announce';
import { useTheme } from '../../theme/ThemeContext';

export default memo(function Input({
  label,
  value,
  onChangeText,
  error,
  helper,
  style,
  inputStyle,
  icon: LeadingIcon,
  rightSlot,
  ...rest
}) {
  const { t, spacing, radius, text, fontScaleCaps } = useTheme();

  // The header above has claimed "announced" since this file was written, and
  // it was not true: accessibilityRole="alert" on the row below is a trait on
  // iOS and Android, not a live region, so nothing was ever spoken. A person
  // who cannot see the red row pressed Save and heard silence.
  //
  // Only on the way IN. Re-announcing an unchanged message on every keystroke
  // would talk over the typing it is meant to correct, and announcing on the
  // way out would say the error again just as it is fixed.
  const spoken = useRef(null);
  useEffect(() => {
    if (error && error !== spoken.current) announce(error);
    spoken.current = error || null;
  }, [error]);

  return (
    <View style={style}>
      <View>
        <PaperInput
          mode="outlined"
          label={label}
          accessibilityLabel={label}
          maxFontSizeMultiplier={fontScaleCaps.body}
          value={value}
          onChangeText={onChangeText}
          error={!!error}
          style={[
            { backgroundColor: t.canvas, fontSize: text.base, minHeight: 48 },
            // 48, not 40 — the eye slot occupies 46pt from the right edge;
            // long values were rendering underneath it (rulebook pass).
            rightSlot ? { paddingRight: 48 } : null,
            inputStyle,
          ]}
          outlineStyle={{ borderRadius: radius.input }}
          left={
            LeadingIcon ? (
              <PaperInput.Icon
                // Decorative: the field's own label already says what belongs
                // here, so a screen reader announcing "email icon" before
                // "Email" is one more thing to listen past. Only
                // importantForAccessibility is used — accessibilityElementsHidden
                // and focusable are native-only and react-native-web forwards
                // them to the DOM as an invalid `accessible` attribute.
                importantForAccessibility="no"
                icon={() => <LeadingIcon size={20} color={t.ink3} strokeWidth={2} />}
              />
            ) : undefined
          }
          {...rest}
        />
        {rightSlot ? (
          <View
            style={{
              position: 'absolute',
              right: 2,
              top: 6,
              bottom: 0,
              justifyContent: 'center',
            }}
          >
            {rightSlot}
          </View>
        ) : null}
      </View>
      {error ? (
        // Icon + color, never color alone (rulebook: ~8% of men are color-blind
        // and sunlight flattens every phone screen).
        <View
          accessible
          accessibilityRole="alert"
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[1], marginTop: spacing[2] }}
        >
          <AlertCircle size={16} color={t.redError} strokeWidth={2} style={{ marginTop: 2 }} />
          <Text
            maxFontSizeMultiplier={fontScaleCaps.body}
            style={{ flex: 1, color: t.redError, fontSize: text.sm, lineHeight: 21 }}
          >
            {error}
          </Text>
        </View>
      ) : helper ? (
        <Text
          maxFontSizeMultiplier={fontScaleCaps.body}
          style={{ color: t.inkSlate, fontSize: text.sm, marginTop: spacing[2] }}
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );
});
