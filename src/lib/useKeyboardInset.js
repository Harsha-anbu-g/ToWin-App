// How many pixels the on-screen keyboard is covering, in a browser.
//
// KeyboardAvoidingView is inert on react-native-web, so on a phone browser the
// keyboard slides up over the message box and the person types blind. There is
// no keyboard event on the web either — but there is visualViewport, which
// shrinks by exactly the keyboard's height when it opens.
//
// `offsetTop` matters as much as `height`: when iOS Safari scrolls the page to
// keep the focused field visible, the visual viewport moves down, and ignoring
// that overstates the inset by however far it moved.
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Below this, the difference is browser chrome collapsing on scroll, not a
// keyboard. Treating a 60px toolbar as a keyboard would shove the composer up
// every time the thread is scrolled.
const KEYBOARD_MIN_HEIGHT = 120;

/** @returns {number} pixels to keep clear at the bottom; always 0 on native */
export default function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const viewport = window.visualViewport;
    // Older browsers without visualViewport keep the old behaviour: no inset.
    if (!viewport) return undefined;

    const update = () => {
      const covered = window.innerHeight - viewport.height - viewport.offsetTop;
      setInset(covered > KEYBOARD_MIN_HEIGHT ? Math.round(covered) : 0);
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}
