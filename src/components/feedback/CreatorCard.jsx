// The founder card + portfolio row (extracted from app/feedback.jsx — meeting
// the maker is its own concern; the screen file keeps only the form). Contact
// rows are 44pt links; the portfolio pill stays a neutral ghost — the trust
// color never fills an action and Submit stays the screen's only filled button.
import { Image, Linking, Pressable, Text, View } from 'react-native';
import { Briefcase, Camera, Code2, Globe, Mail, MapPin } from '../icons';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../theme/ThemeContext';

// From the website's Feedback.jsx, except the contact rows: the personal
// Gmail and WhatsApp number left the app on 2026-08-15, an owner decision
// before store submission. Mail goes to the support address a person already
// reads; the founder's public profiles stay.
const CONTACTS = [
  { icon: Mail, label: 'help@towinly.com', href: 'mailto:help@towinly.com' },
  // Portfolio (web 53b20e8 2026-07-26): the founder's own domain.
  { icon: Globe, label: 'harshavardhanag.com', href: 'https://harshavardhanag.com' },
  { icon: MapPin, label: 'Montreal, Quebec, Canada', href: null },
  { icon: Briefcase, label: 'LinkedIn: harsha-anbu-gowri', href: 'https://www.linkedin.com/in/harsha-anbu-gowri/' },
  { icon: Code2, label: 'GitHub: Harsha-anbu-g', href: 'https://github.com/Harsha-anbu-g' },
  { icon: Camera, label: 'Instagram: harsha._.ag', href: 'https://www.instagram.com/harsha._.ag' },
];

const founder = require('../../../assets/founder.jpg');

export default function CreatorCard() {
  const { t, type } = useTheme();
  const { showToast } = useToast();
  // A phone with no mail app rejects mailto: and the tap used to do nothing at
  // all — the person is trying to reach a human, so the failure has to speak
  // and hand back the address (same ending as delete-account.jsx). On
  // react-native-web openURL resolves either way, so this only ever runs on a
  // real device.
  const open = (href) =>
    href &&
    Linking.openURL(href).catch(() =>
      showToast(
        href.startsWith('mailto:')
          ? `No mail app opened. Write to ${href.slice('mailto:'.length)} from your own email.`
          : 'Could not open that address. You can type it into your browser.',
        'error'
      )
    );
  return (
    <>
      <View style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: 18, padding: 20, marginTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Image
            source={founder}
            accessibilityLabel="Portrait of Harshavardhan"
            style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: t.border }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', lineHeight: 21, color: t.ink }}>
              Harshavardhan Anbuchezhian Gowri
            </Text>
            <Text style={{ fontSize: type.meta, color: t.inkSlate }}>Harsha</Text>
          </View>
        </View>
        <Text style={{ fontSize: type.meta, color: t.blueDeep, fontWeight: '600', marginTop: 16, lineHeight: 20 }}>
          Full-Stack Engineer · Aspiring Entrepreneur · AI-Driven Developer
        </Text>
        <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 2 }}>
          Master's in Applied Computer Science · Concordia University, Montreal
        </Text>
        <View style={{ height: 1, backgroundColor: t.border, marginVertical: 16 }} />
        {/* Running text, so it sits on the 16 floor like every other paragraph
            in the app (tokens.js: never below 16). */}
        <Text style={{ fontSize: type.body, fontWeight: '600', lineHeight: 23, color: t.ink }}>
          This isn't a university project. Towinly is my future startup.
        </Text>
        <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 23, marginTop: 8 }}>
          I'm building something real, and your feedback is what shapes it. Love the idea? Want to
          connect? Let's talk!
        </Text>
        <View style={{ gap: 12, marginTop: 16 }}>
          {CONTACTS.map(({ icon: Icon, label, href }) => (
            <Pressable
              key={label}
              accessibilityRole={href ? 'link' : 'text'}
              accessibilityLabel={label}
              onPress={href ? () => open(href) : undefined}
              disabled={!href}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                minHeight: 44,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Icon size={16} color={t.blue} strokeWidth={1.8} />
              {/* These labels ARE the addresses — a mis-read one is a failed
                  attempt to reach a person, so they get the body size. */}
              <Text style={{ fontSize: type.body, color: href ? t.blueDeep : t.inkSlate }}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Portfolio card: gold underlined link + gold pill */}
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Visit my portfolio"
        onPress={() => open('https://portfolioharsha.vercel.app/')}
        style={({ pressed }) => ({
          backgroundColor: t.canvas,
          borderWidth: 1,
          borderColor: t.border,
          borderRadius: 18,
          paddingVertical: 16,
          paddingHorizontal: 20,
          marginTop: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <View>
          <Text style={{ fontSize: type.caption, color: t.inkSlate }}>Want to know more?</Text>
          <Text
            style={{
              fontSize: type.body,
              fontWeight: '700',
              // blueDeep: links wear the action color; the trust accent is a
              // semantic, never a link (rulebook + HCI rule 4).
              color: t.blueDeep,
              textDecorationLine: 'underline',
              marginTop: 2,
            }}
          >
            Visit my portfolio
          </Text>
        </View>
        {/* Neutral ghost pill — the trust color never fills an action (HCI rule 4),
            and Submit stays this screen's only filled button (rule 8) */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: t.border,
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 999,
          }}
        >
          <Globe size={13} color={t.inkSlate} strokeWidth={2} />
          <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.ink }}>My Portfolio</Text>
        </View>
      </Pressable>
    </>
  );
}
