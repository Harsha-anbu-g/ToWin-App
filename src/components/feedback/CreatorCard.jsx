// The founder card + portfolio row (extracted from app/feedback.jsx — meeting
// the maker is its own concern; the screen file keeps only the form). Contact
// rows are 44pt links; the portfolio pill stays a neutral ghost — the trust
// color never fills an action and Submit stays the screen's only filled button.
import { Image, Linking, Pressable, Text, View } from 'react-native';
import { Briefcase, Camera, Code2, Globe, Mail, MapPin, Phone } from '../icons';
import { useTheme } from '../../theme/ThemeContext';

// Verbatim from the website's Feedback.jsx
const CONTACTS = [
  { icon: Mail, label: 'agharsha.anbu@gmail.com', href: 'mailto:agharsha.anbu@gmail.com' },
  // Portfolio (web 53b20e8 2026-07-26): the founder's own domain.
  { icon: Globe, label: 'harshavardhanag.com', href: 'https://harshavardhanag.com' },
  { icon: Phone, label: '+1 438-535-5782 (WhatsApp)', href: 'https://wa.me/14385355782' },
  { icon: MapPin, label: 'Montreal, Quebec, Canada', href: null },
  { icon: Briefcase, label: 'LinkedIn: harsha-anbu-gowri', href: 'https://www.linkedin.com/in/harsha-anbu-gowri/' },
  { icon: Code2, label: 'GitHub: Harsha-anbu-g', href: 'https://github.com/Harsha-anbu-g' },
  { icon: Camera, label: 'Instagram: harsha._.ag', href: 'https://www.instagram.com/harsha._.ag' },
];

const founder = require('../../../assets/founder.jpg');

export default function CreatorCard() {
  const { t, type } = useTheme();
  const open = (href) => href && Linking.openURL(href).catch(() => {});
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
        <Text style={{ fontSize: 14, color: t.blueDeep, fontWeight: '600', marginTop: 16, lineHeight: 20 }}>
          Full-Stack Engineer · Aspiring Entrepreneur · AI-Driven Developer
        </Text>
        <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 2 }}>
          Master's in Applied Computer Science · Concordia University, Montreal
        </Text>
        <View style={{ height: 1, backgroundColor: t.border, marginVertical: 16 }} />
        <Text style={{ fontSize: 14, fontWeight: '600', lineHeight: 21, color: t.ink }}>
          This isn't a university project. Towinly is my future startup.
        </Text>
        <Text style={{ fontSize: 14, color: t.inkSlate, lineHeight: 21, marginTop: 8 }}>
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
              <Text style={{ fontSize: 14, color: href ? t.blueDeep : t.inkSlate }}>{label}</Text>
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
              fontSize: 14,
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
