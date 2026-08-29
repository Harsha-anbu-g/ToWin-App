// Takes the web-only "Refresh" control off the page before a store screenshot.
//
// Two rules, both learned from a capture that went wrong.
//
// OUT OF LAYOUT, NOT OUT OF SIGHT. `visibility: hidden` leaves the box behind.
// The control is 44 CSS px tall and sits at the very top of /checkin,
// /messages and /profile, so hiding it that way put 44 px of empty white at
// the top of every one of those frames. The shipped iOS app never draws it:
// src/components/ui/RefreshControl.jsx renders the button on
// `Platform.OS === 'web'` only, and native gets the pull gesture, which
// occupies nothing. `display: none` collapses the box and the frame matches
// the app.
//
// NARROW, AND NEVER THE BODY. The element whose whole text is Refresh, then
// only ancestors whose whole text is also Refresh, and the climb stops at
// <body>. An earlier version walked three levels up regardless and hid the
// scroll container, which produced three blank captures. A screen still
// loading can have "Refresh" as the only text on it, and without the body
// guard the whole page would be the thing that matched.
module.exports = function hideRefresh(doc) {
  const isJustRefresh = (el) => (el.textContent || '').trim() === 'Refresh';
  for (const el of Array.from(doc.querySelectorAll('*'))) {
    if (!isJustRefresh(el)) continue;
    if (Array.from(el.children).some(isJustRefresh)) continue;
    let node = el;
    while (
      node.parentElement
      && node.parentElement !== doc.body
      && node.parentElement !== doc.documentElement
      && isJustRefresh(node.parentElement)
    ) {
      node = node.parentElement;
    }
    if (node === doc.body || node === doc.documentElement) continue;
    node.style.display = 'none';
  }
};
