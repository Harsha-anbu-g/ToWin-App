/**
 * The words "What I pass on" uses, in one place.
 *
 * Word-for-word port of ToWin/frontend/src/components/passOnLocks.js. The
 * elder's page, the dashboard card, the keyholder ask and the saved one-page
 * copy all read from this module, so a promise is made, repeated and acted on
 * in identical language. Reword nothing here without changing the website
 * first — the arm acknowledgements are stored with a hash of the exact wording
 * shown, and "this is not a will" is precisely the sentence somebody will
 * later dispute.
 */

/** The way in, from the elder's home. Summary said in words, never zeros. */
export const MY_BOXES = {
  title: 'My boxes',
  /** Shared with PAGE_LEAD below, so the card and the page cannot drift apart. */
  lead: 'Your stories, your letters, and the things only you know.',
  open: 'Open my boxes',
  empty: 'Nothing in your boxes yet. Start whenever you like.',
  /**
   * A count she has none of is left out rather than shown as zero, and the
   * sealed box is named only once she has really set one up. Singulars are
   * spelled out: "1 stories" is a screen that looks like nobody checked it.
   */
  summary: ({ stories = 0, letters = 0, shut = false } = {}) => {
    const said = [];
    if (stories) said.push(`${stories} ${stories === 1 ? 'story' : 'stories'}`);
    if (letters) said.push(`${letters} ${letters === 1 ? 'letter' : 'letters'}`);
    if (shut) said.push('your box is shut');
    return said.length ? said.join(' · ') : MY_BOXES.empty;
  },
};

export const PAGE_LEAD = `${MY_BOXES.lead} You choose who sees each one.`;

/**
 * The not-a-will primer. Names no country and no profession — what makes a
 * will valid differs everywhere, so it points at whoever helps with her will.
 */
export const NOT_A_WILL = {
  short: 'This is not a will, and it does not replace one.',
  ask: "What's the difference?",
  long:
    'A will decides who gets your money, your home and your things. Nothing you write on this '
    + 'page changes who gets what. If you have a will, please tell whoever helped you make it '
    + 'that this page exists.',
};

/** Who a story is for. `key` is the server's PassOnAudience value. */
export const AUDIENCES = [
  {
    key: 'EVERYONE',
    title: 'Anyone',
    blurb: 'Anyone who opens your page, including people you have never met.',
  },
  {
    key: 'FAMILY',
    title: 'My family',
    blurb: 'Only the family members on your family list.',
  },
  {
    key: 'HELPERS',
    title: 'My helpers',
    blurb: 'Only the helpers you have built up trust with.',
  },
  {
    key: 'PERSON',
    title: 'One person',
    blurb: 'One person you choose. Nobody else.',
  },
];

/** Asked once, and only for the widest audience — the open street. */
export const ANYONE_CHECK = {
  title: 'Show this to anyone?',
  message:
    'Anyone who opens your page can read this, including people you have never met. '
    + 'You can change your mind later.',
  confirm: 'Yes, show it to anyone',
  cancel: 'Go back',
};

/** The Story box's own warning — those details are what a bank asks for. */
export const NOT_HERE =
  'Please keep things a bank would ask you — your first pet, the street you grew up on, '
  + 'your mother’s family name — out of here. Those belong in the Sealed box.';

export const STORY_BOX = {
  empty:
    'Nothing here yet. A story can be a small one — how you met, what you learned the hard way, '
    + 'the recipe nobody else has.',
  start: 'Tell a story',
  save: 'Save this story',
  namePrompt: 'Give it a name',
  namePlaceholder: 'The winter we lost the roof',
  bodyPrompt: 'Tell it',
  audiencePrompt: 'Who should see this?',
};

export const LETTERS = {
  empty: 'No letters yet. A letter goes to one person, and only that person.',
  /** Nothing happens on its own — no timer, no button that opens anything. */
  howItWorks:
    'Every letter can be read today, or held until after you are gone. Nothing opens on its own. '
    + 'Before a held letter is passed on, a person here at Towinly checks a death certificate, '
    + 'asks the people you chose, and tries to reach you for thirty days.',
  start: 'Write a letter',
  save: 'Save this letter',
  bodyPrompt: 'Write it',
  personPrompt: 'Who is this for?',
  readableNow: 'They can read this now',
  /** "Held", never "locked"/"pending" — a word she can read without flinching. */
  heldUntilGone: 'Held until after you are gone',
  noneToWriteTo:
    'There is nobody to write to yet. Add someone to your family list, or build up trust with a '
    + 'helper, and they will appear here.',

  whenPrompt: 'When can they read it?',
  /** `key` is the server's PassOnRelease value. */
  WHEN: [
    {
      key: 'NOW',
      title: 'They can read it now',
      blurb: 'It goes on your page as soon as you save it, for the one person you chose.',
    },
    {
      key: 'AFTER',
      title: "Only after I'm gone",
      blurb:
        'Nobody sees this until someone at Towinly has checked a death certificate, asked the '
        + 'people you chose, and tried to reach you for thirty days.',
    },
  ],
  /** Shown disabled, never hidden — an option she cannot see cannot be earned. */
  needsKeyholders:
    'First choose the people who can open things for you, in your Sealed box. Then you can hold '
    + 'a letter until after you are gone.',
  needsKeyholdersLink: 'Go to my Sealed box',
};

/** The Sealed box before it is set up — the honest promise in full. */
export const SEALED_BOX = {
  title: 'The things only you know.',
  body: 'Where the money is. Which bank. Where the papers are kept. Write them down once, here.',
  safetyHeading: 'How this is kept safe',
  safety: [
    'It is scrambled before we save it, and the key that unscrambles it is not kept anywhere near '
    + 'it. If someone stole our records, they could not read a word of what you wrote. If someone '
    + 'broke into the company itself, they could. We are not going to tell you otherwise.',
    'Only you can open your box. Every single time it is opened we write down when, and you can '
    + 'see that list.',
    'You can never be shut out of your own box. If you forget your password you reset it the way '
    + 'you always do, and your box is still there.',
  ],
  afterHeading: 'After you are gone',
  after:
    'We are building the part where your Keyholders can ask to open this. It is not ready, and we '
    + 'will not switch it on until it is. So today you do two things: name the people you trust, '
    + 'so they know this exists — and save the one-page sheet and keep it with your will.',
};

/** "Sarah, David and Ruth" — no serial comma; a sentence about her family. */
export const listOfNames = (names) => {
  const said = (names || []).filter(Boolean);
  if (said.length <= 1) return said[0] || '';
  return `${said.slice(0, -1).join(', ')} and ${said[said.length - 1]}`;
};

/**
 * Setting the Sealed box up: three steps, then a week to change her mind.
 * The two tick sentences are deliberately NOT here — they come from the server
 * with the setup state and are echoed back, because the server stores a hash
 * of the exact wording shown. A second copy here would drift invisibly.
 */
export const SETUP = {
  start: 'Set this up',
  step: (n, of) => `Step ${n} of ${of}`,
  back: 'Go back',
  next: 'Next',
  finish: 'Finish setting this up',
  cancel: 'Not now',

  who: {
    title: 'Who can open it one day?',
    blurb:
      'Pick at least three people you trust. They must already be on your family list, '
      + 'and each one has to say yes before they count.',
    tooFew: 'You need at least three people on your family list first.',
    tooFewLink: 'Go to my family list',
    nothingSentYet: 'Nobody is asked anything until you finish.',
  },

  howMany: {
    title: 'How many must agree?',
    blurb:
      'One day, when your Keyholders ask to open this, this many of them must agree. It is '
      + 'never all of them, so that one person who is far away — or who has passed on '
      + 'themselves — can never keep it shut forever.',
    inRealTerms: (agree, names, of) =>
      `So: any ${agree} of ${names}. That means ${agree} of them can open it even if the `
      + `${of - agree === 1 ? 'other one says' : 'others say'} no.`,
  },

  before: {
    title: 'Before you finish.',
    confirmEmail:
      'Please confirm your email address first. One day it is how we would reach you about '
      + 'your box, and we need to know it works.',
    confirmEmailLink: 'Go to my account settings',
    needsPassword:
      'Your Sealed box is kept shut by your password, and this account signs in with Google. '
      + 'Please set a password first, then come back.',
    saveHeading: 'Keep a copy somewhere else',
    save:
      'Save your one-page copy to your computer, and keep it wherever your family would think '
      + 'to look. Do not let this app be your only copy.',
    failed: 'We could not finish that. Please try again.',
  },

  /** The seven days. Calm, and the undo is a real button, never behind a menu. */
  settling: {
    title: 'Your box is set up.',
    body: (names) =>
      'Nothing can be opened by anyone but you. We will check with you once more in seven days '
      + `before this is settled, and we have written to ${names} to ask if they will hold a key.`,
    undo: 'If this was not your idea, undo it',
    confirmTitle: 'Undo the whole setup?',
    confirmMessage:
      'Your box stays exactly as it is, and everything you wrote stays where it is. The people '
      + 'you asked will stop being asked, and nobody is told you did this.',
    confirmYes: 'Yes, undo it',
    confirmNo: 'Leave it as it is',
    undone: 'That is undone. Nobody is holding a key.',
    undoFailed: 'We could not undo that. Please try again.',
  },

  /** Once the week has passed — real names and real dates, never "pending". */
  settled: {
    heading: 'Who can open it one day',
    threshold: (agree, of) => `${agree} of the ${of} must agree.`,
    saidYes: (name, when) => `${name} said yes on ${when}`,
    waiting: (name) => `${name} has not answered yet`,
    saidNo: (name) => `${name} said no`,
    steppedBack: (name) => `${name} is no longer holding a key`,
    change: 'Change',
  },
};

/** The one readable thing about a sealed item. Keyed by the server's SealedKind. */
export const SEALED_KINDS = {
  MONEY: 'Money',
  PASSWORDS: 'Passwords',
  PAPERS: 'Papers',
  OTHER: 'Something else',
};

/**
 * What is in the box, and putting something in it.
 * Nothing here ever describes what an item says — the list the screen renders
 * has no body field on it at all, and there must never be a preview.
 */
export const SEALED_ITEMS = {
  shut: (count) =>
    `Your box is shut. ${count === 1 ? '1 thing is' : `${count} things are`} inside. `
    + 'Nobody can see them but you.',
  nothingInside:
    'Your box is shut. There is nothing in it yet. Nobody can see what you put in but you.',

  locked: 'Locked',
  unlocked: 'Open',
  see: 'See this',
  remove: 'Delete',

  /** The inline row. Not a dialog: she is looking at the card she asked about. */
  askPassword: 'Type your password to see this.',
  passwordLabel: 'Your password',
  show: 'Show it to me',
  showing: 'Opening…',
  neverMind: 'Never mind',
  /** On a shared family laptop, putting it away matters as much as opening it. */
  hide: 'Hide this again',
  needsPassword: 'Please type your password.',
  failedToOpen: 'We could not open that. Please try again.',

  add: 'Put something in',
  namePrompt: 'What is it?',
  nameHelp:
    'Give it a name you would recognise. Nobody else ever sees this name, not even your '
    + 'Keyholders.',
  namePlaceholder: 'Where the money is',
  bodyPrompt: 'Write it down',
  kindPrompt: 'What kind of thing is it?',
  save: 'Lock this away',
  saving: 'Locking it away…',
  cancel: 'Cancel',
  saved: 'That is locked away.',
  needsName: 'Please give it a name.',
  needsBody: 'Please write something before you save it.',
  needsKind: 'Please choose what kind of thing this is.',
  failedToSave: 'We could not save that. Please try again.',
  removed: 'That is out of your box.',
  failedToRemove: 'We could not take that out. Please try again.',
};

/**
 * The refusal after a password change. The sentence itself is the server's —
 * it carries the real date the freeze lifts, so it is rendered exactly as it
 * arrives and never rebuilt here. `prefix` only decides whether to add the
 * contact line under it.
 */
export const FROZEN = {
  prefix: 'You changed your password recently.',
  tellUs: (email) => (email ? writeToUs(email) : RELEASE_CONTACT.notSetYet),
};

/** Taking something out of the box cannot be undone by anybody. */
export const TAKE_OUT_OF_BOX = {
  title: 'Take this out of the box?',
  message: 'It will be gone for good. Nobody will be able to read it again, and that includes you.',
  confirm: 'Take it out',
  cancel: 'Keep it',
};

/**
 * Who a family writes to when the day comes. The address is deployment
 * configuration on the server and arrives with the sheet and the setup state —
 * it is never written here. When unset, the truth is said out loud.
 */
export const RELEASE_CONTACT = {
  who: 'Towinly',
  notSetYet: 'Towinly has not set an address to write to yet.',
};

const writeToUs = (email) => `Write to ${RELEASE_CONTACT.who} at ${email}.`;

const NO_ADDRESS_ON_THE_SHEET =
  `${RELEASE_CONTACT.notSetYet} Save a new copy of this page from time to time, and the address `
  + 'will be on it once it is set.';

/**
 * The saved copy — one page she keeps somewhere her family would think to
 * look. Digital only; there is no print step anywhere in this feature. Names
 * of what is in the box and never contents; the closing line is the whole
 * legal point of the page.
 */
export const SHEET = {
  pageTitle: 'Your one-page copy',
  pageLead:
    'This is the copy you keep outside Towinly. Save it, and put it wherever your family would '
    + 'think to look. Do not let this app be your only copy.',
  save: 'Save this to my computer',
  saved: 'Saved. Now put it somewhere your family would look.',
  failedToSave: 'We could not save that file. Please try again.',
  back: 'Go back to my sealed box',
  loading: 'Getting your copy ready…',
  failed: 'We could not get your copy ready. Please try again.',
  lastSaved: (when) => `You last saved a copy on ${when}.`,
  neverSaved: 'You have not saved a copy yet.',
  previewHeading: 'This is what you will save',
  linkFromBox: 'Save your one-page copy',

  // ── the copy itself, in the order it is read ──

  title: (name) => `What ${name} passes on`,
  madeOn: (when) => `Made on ${when}, from Towinly.`,

  inTheBox: {
    heading: 'What is in the sealed box',
    blurb:
      'These are the names of the things inside. What any of them says is not written here, and '
      + 'it is not written down anywhere outside Towinly.',
    empty: 'There is nothing in the box yet.',
    line: (label, kind) => `${label} — ${kind}`,
  },

  whoCanOpen: {
    heading: 'Who can ask to open it',
    empty: 'Nobody has been asked yet.',
  },

  howToAsk: {
    heading: 'How your family asks for it to be opened',
    writeTo: (email) => (email ? writeToUs(email) : NO_ADDRESS_ON_THE_SHEET),
    noAddressYet: NO_ADDRESS_ON_THE_SHEET,
    askedFor: 'They will be asked for:',
    steps: (name) => [
      'a death certificate, which a person here reads and writes down',
      'word from each of the people above, one at a time, that they agree',
      `then a wait of thirty days, while Towinly keeps trying to reach ${name}`,
    ],
    thenWhat:
      'Only then does somebody here pass on what is in the box. None of this happens by itself, '
      + 'and there is no button anywhere that opens the box.',
  },

  /** The design copy's last line, and the whole legal point of the page. */
  closing: 'This is not a will.',
};

/** "6 August" — matches how the server says a date back to her. */
export const onDay = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
};

/** "6 August 2026" — the saved copy only; a file in a drawer needs the year. */
export const onDayInFull = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

/**
 * One person's real state, in the words she would use — read in two places
 * that must never disagree: her own screen, and the copy her family reads.
 */
export const keyholderLine = (person) => {
  if (person.status === 'ACTIVE') return SETUP.settled.saidYes(person.personName, onDay(person.respondedAt));
  if (person.status === 'INVITED') return SETUP.settled.waiting(person.personName);
  if (person.status === 'DECLINED') return SETUP.settled.saidNo(person.personName);
  return SETUP.settled.steppedBack(person.personName);
};

/** Reading somebody else's page — every line takes the writer's name. */
export const FROM_PAGE = {
  title: (name) => `From ${name}`,
  lead: (name) => `What ${name} chose to share with you.`,
  empty: (name) => `${name} has not shared anything with you yet.`,
  /** A letter is written to one person. If you are reading one, it was written to you. */
  letterChip: 'A letter for you',
  failed: 'We could not open that page.',
  back: 'Go back',
  linkFromProfile: (name) => `What ${name} passes on`,
  linkBlurb: 'Her stories, and any letter she wrote to you.',
};

/**
 * Objecting to a story — the reasons people actually object to a memory, not
 * the message-report categories. Not offered on letters: a letter reaches one
 * person, so it cannot name a third person to a room.
 */
export const REPORT_STORY = {
  open: 'Report this',
  reasonPrompt: 'What is wrong with it?',
  reasons: [
    'It says something untrue about me',
    'It should not be shown to people',
    'It is unkind or hurtful',
    'Something else',
  ],
  notePrompt: 'Tell us more (you can skip this)',
  send: 'Send this to Towinly',
  cancel: 'Never mind',
  sending: 'Sending…',
  sent: 'Thank you. Somebody at Towinly will read this.',
  failed: 'We could not send that. Please try again.',
};

/**
 * Being asked to hold a key, on the family member's own screen. Says
 * they/their — we do not know anybody's gender. The threshold sentence is
 * rebuilt from real numbers and left out before she has chosen them.
 */
export const KEYHOLDER_ASK = {
  heading: (name) => `${name} has asked you to hold a key.`,
  body: (name) =>
    `One day, after they are gone, you would be one of the people who can ask to open `
    + `${name}'s Sealed box. You cannot see anything in it now and you never will unless that `
    + `day comes.`,
  threshold: (agree, of) =>
    `${agree} of the ${of} of you would have to agree, and someone here at Towinly would check first.`,
  yes: 'Yes, I will do that',
  no: 'No thanks',
  reassurance: 'You can change your mind whenever you like.',
  failed: 'We could not send your answer. Please try again.',
  accepted: (name) => `Thank you. ${name} will see that you said yes.`,
  declined: 'That is fine. Nothing more is needed from you.',
};

/** Taking something down is permanent, so it is asked for in plain words. */
export const TAKE_DOWN = {
  title: 'Take this down?',
  message: 'It will be gone from your page, and nobody will be able to read it.',
  confirm: 'Take it down',
  cancel: 'Keep it',
};
