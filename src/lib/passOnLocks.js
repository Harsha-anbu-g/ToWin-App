import { tr } from '../i18n';
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
  get title() { return tr('My boxes'); },
  /** Shared with pageLead() below, so the card and the page cannot drift apart. */
  get lead() { return tr('Your stories, your letters, and the things only you know.'); },
  get open() { return tr('Open my boxes'); },
  get empty() { return tr('Nothing in your boxes yet. Start whenever you like.'); },
  /**
   * A count she has none of is left out rather than shown as zero, and the
   * sealed box is named only once she has really set one up. Singulars are
   * spelled out: "1 stories" is a screen that looks like nobody checked it.
   */
  summary: ({ stories = 0, letters = 0, shut = false } = {}) => {
    const said = [];
    if (stories) said.push(stories === 1 ? tr('1 story') : tr('{stories} stories', { stories }));
    if (letters) said.push(letters === 1 ? tr('1 letter') : tr('{letters} letters', { letters }));
    if (shut) said.push(tr('your box is shut'));
    return said.length ? said.join(' · ') : MY_BOXES.empty;
  },
};

// Read at render time, so it follows the language of the moment.
export const pageLead = () => `${MY_BOXES.lead} ${tr('You choose who sees each one.')}`;

/**
 * The not-a-will primer. Names no country and no profession — what makes a
 * will valid differs everywhere, so it points at whoever helps with her will.
 */
export const NOT_A_WILL = {
  get short() { return tr('This is not a will, and it does not replace one.'); },
  get ask() { return tr("What's the difference?"); },
  get long() { return tr('A will decides who gets your money, your home and your things. Nothing you write on this page changes who gets what. If you have a will, please tell whoever helped you make it that this page exists.'); },
};

/** Who a story is for. `key` is the server's PassOnAudience value. */
export const AUDIENCES = [
  {
    key: 'EVERYONE',
    get title() { return tr('Anyone'); },
    get blurb() { return tr('Anyone who opens your page, including people you have never met.'); },
  },
  {
    key: 'FAMILY',
    get title() { return tr('My family'); },
    get blurb() { return tr('Only the family members on your family list.'); },
  },
  {
    key: 'HELPERS',
    get title() { return tr('My helpers'); },
    get blurb() { return tr('Only the helpers you have built up trust with.'); },
  },
  {
    key: 'PERSON',
    get title() { return tr('One person'); },
    get blurb() { return tr('One person you choose. Nobody else.'); },
  },
];

/** Asked once, and only for the widest audience — the open street. */
export const ANYONE_CHECK = {
  get title() { return tr('Show this to anyone?'); },
  get message() { return tr('Anyone who opens your page can read this, including people you have never met. You can change your mind later.'); },
  get confirm() { return tr('Yes, show it to anyone'); },
  get cancel() { return tr('Go back'); },
};

/** The Story box's own warning — those details are what a bank asks for. */
export const NOT_HERE =
  'Please keep things a bank would ask you out of here: your first pet, the street you grew up on, '
  + 'your mother’s family name. Those belong in the Sealed box.';

export const STORY_BOX = {
  get empty() { return tr('Nothing here yet. A story can be a small one: how you met, what you learned the hard way, the recipe nobody else has.'); },
  get start() { return tr('Tell a story'); },
  get save() { return tr('Save this story'); },
  get namePrompt() { return tr('Give it a name'); },
  get namePlaceholder() { return tr('What I learned too late'); },
  get bodyPrompt() { return tr('Tell it'); },
  /** Two lines, never a speech: an example small enough to show the size a story can be. */
  get bodyPlaceholder() { return tr('At the end, all I wanted was the people I love. Call yours today.'); },
  get audiencePrompt() { return tr('Who should see this?'); },
};

export const LETTERS = {
  get empty() { return tr('No letters yet. A letter goes to one person, and only that person.'); },
  /** Nothing happens on its own — no timer, no button that opens anything. */
  get howItWorks() { return tr('Every letter can be read today, or held until after you are gone. Nothing opens on its own. Before a held letter is passed on, a person here at Towinly checks a death certificate, asks the people you chose, and tries to reach you for thirty days.'); },
  get start() { return tr('Write a letter'); },
  get save() { return tr('Save this letter'); },
  get bodyPrompt() { return tr('Write it'); },
  get personPrompt() { return tr('Who is this for?'); },
  get readableNow() { return tr('They can read this now'); },
  /** "Held", never "locked"/"pending" — a word she can read without flinching. */
  get heldUntilGone() { return tr('Held until after you are gone'); },
  get noneToWriteTo() { return tr('There is nobody to write to yet. Add someone to your family list, or build up trust with a helper, and they will appear here.'); },

  get whenPrompt() { return tr('When can they read it?'); },
  /** `key` is the server's PassOnRelease value. */
  WHEN: [
    {
      key: 'NOW',
      get title() { return tr('They can read it now'); },
      get blurb() { return tr('It goes on your page as soon as you save it, for the one person you chose.'); },
    },
    {
      key: 'AFTER',
      get title() { return tr("Only after I'm gone"); },
      get blurb() { return tr('Nobody sees this until someone at Towinly has checked a death certificate, asked the people you chose, and tried to reach you for thirty days.'); },
    },
  ],
  /** Shown disabled, never hidden — an option she cannot see cannot be earned. */
  get needsKeyholders() { return tr('First choose the people who can open things for you, in your Sealed box. Then you can hold a letter until after you are gone.'); },
  get needsKeyholdersLink() { return tr('Go to my Sealed box'); },
};

/** The Sealed box before it is set up — the honest promise in full. */
export const SEALED_BOX = {
  get title() { return tr('The things only you know.'); },
  get body() { return tr('Where the money is. Which bank. Where the papers are kept. Write them down once, here.'); },
  get safetyHeading() { return tr('How this is kept safe'); },
  get safety() {
    return [
      tr('It is scrambled before we save it, and the key that unscrambles it is not kept anywhere near '
        + 'it. If someone stole our records, they could not read a word of what you wrote. If someone '
        + 'broke into the company itself, they could. We are not going to tell you otherwise.'),
      tr('Only you can open your box. Every single time it is opened we write down when, and you can '
        + 'see that list.'),
      tr('You can never be shut out of your own box. If you forget your password you reset it the way '
        + 'you always do, and your box is still there.'),
    ];
  },
  get afterHeading() { return tr('After you are gone'); },
  get after() { return tr('We are building the part where your Keyholders can ask to open this. It is not ready, and we will not switch it on until it is. So today you do two things: name the people you trust, so they know this exists, and save the one-page sheet and keep it with your will.'); },
};

/** "Sarah, David and Ruth" — no serial comma; a sentence about her family. */
export const listOfNames = (names) => {
  const said = (names || []).filter(Boolean);
  if (said.length <= 1) return said[0] || '';
  return tr('{names} and {last}', { names: said.slice(0, -1).join(', '), last: said[said.length - 1] });
};

/**
 * Setting the Sealed box up: three steps, then a week to change her mind.
 * The two tick sentences are deliberately NOT here — they come from the server
 * with the setup state and are echoed back, because the server stores a hash
 * of the exact wording shown. A second copy here would drift invisibly.
 */
export const SETUP = {
  get start() { return tr('Set this up'); },
  step: (n, of) => tr('Step {n} of {of}', { n, of }),
  get back() { return tr('Go back'); },
  next: 'Next',
  get finish() { return tr('Finish setting this up'); },
  get cancel() { return tr('Not now'); },

  who: {
    get title() { return tr('Who can open it one day?'); },
    get blurb() { return tr('Pick at least three people you trust. They must already be on your family list, and each one has to say yes before they count.'); },
    get tooFew() { return tr('You need at least three people on your family list first.'); },
    get tooFewLink() { return tr('Go to my family list'); },
    get nothingSentYet() { return tr('Nobody is asked anything until you finish.'); },
  },

  howMany: {
    get title() { return tr('How many must agree?'); },
    get blurb() { return tr('One day, when your Keyholders ask to open this, this many of them must agree. It is never all of them, so that one person who is far away, or who has passed on themselves, can never keep it shut forever.'); },
    inRealTerms: (agree, names, of) =>
      of - agree === 1
        ? tr('So: any {agree} of {names}. That means {agree} of them can open it even if the other one says no.', { agree, names })
        : tr('So: any {agree} of {names}. That means {agree} of them can open it even if the others say no.', { agree, names }),
  },

  before: {
    get title() { return tr('Before you finish.'); },
    get confirmEmail() { return tr('Please confirm your email address first. One day it is how we would reach you about your box, and we need to know it works.'); },
    get confirmEmailLink() { return tr('Go to my account settings'); },
    get needsPassword() { return tr('Your Sealed box is kept shut by your password, and this account signs in with Google. Please set a password first, then come back.'); },
    get saveHeading() { return tr('Keep a copy somewhere else'); },
    get save() { return tr('Save your one-page copy to your computer, and keep it wherever your family would think to look. Do not let this app be your only copy.'); },
    get failed() { return tr('We could not finish that. Please try again.'); },
  },

  /** The seven days. Calm, and the undo is a real button, never behind a menu. */
  settling: {
    get title() { return tr('Your box is set up.'); },
    body: (names) =>
      tr('Nothing can be opened by anyone but you. We will check with you once more in seven days before this is settled, and we have written to {names} to ask if they will hold a key.', { names }),
    get undo() { return tr('If this was not your idea, undo it'); },
    get confirmTitle() { return tr('Undo the whole setup?'); },
    get confirmMessage() { return tr('Your box stays exactly as it is, and everything you wrote stays where it is. The people you asked will stop being asked, and nobody is told you did this.'); },
    get confirmYes() { return tr('Yes, undo it'); },
    get confirmNo() { return tr('Leave it as it is'); },
    get undone() { return tr('That is undone. Nobody is holding a key.'); },
    get undoFailed() { return tr('We could not undo that. Please try again.'); },
  },

  /** Once the week has passed — real names and real dates, never "pending". */
  settled: {
    get heading() { return tr('Who can open it one day'); },
    threshold: (agree, of) => tr('{agree} of the {of} must agree.', { agree, of }),
    saidYes: (name, when) => tr('{name} said yes on {when}', { name, when }),
    waiting: (name) => tr('{name} has not answered yet', { name }),
    saidNo: (name) => tr('{name} said no', { name }),
    steppedBack: (name) => tr('{name} is no longer holding a key', { name }),
    change: 'Change',
  },
};

/** The one readable thing about a sealed item. Keyed by the server's SealedKind. */
export const SEALED_KINDS = {
  MONEY: 'Money',
  PASSWORDS: 'Passwords',
  PAPERS: 'Papers',
  get OTHER() { return tr('Something else'); },
};

/**
 * What is in the box, and putting something in it.
 * Nothing here ever describes what an item says — the list the screen renders
 * has no body field on it at all, and there must never be a preview.
 */
export const SEALED_ITEMS = {
  shut: (count) =>
    count === 1
      ? tr('Your box is shut. 1 thing is inside. Nobody can see them but you.')
      : tr('Your box is shut. {count} things are inside. Nobody can see them but you.', { count }),
  get nothingInside() { return tr('Your box is shut. There is nothing in it yet. Nobody can see what you put in but you.'); },

  locked: 'Locked',
  unlocked: 'Open',
  get see() { return tr('See this'); },
  remove: 'Delete',

  /** The inline row. Not a dialog: she is looking at the card she asked about. */
  get askPassword() { return tr('Type your password to see this.'); },
  get passwordLabel() { return tr('Your password'); },
  get show() { return tr('Show it to me'); },
  showing: 'Opening…',
  get neverMind() { return tr('Never mind'); },
  /** On a shared family laptop, putting it away matters as much as opening it. */
  get hide() { return tr('Hide this again'); },
  get needsPassword() { return tr('Please type your password.'); },
  get failedToOpen() { return tr('We could not open that. Please try again.'); },

  get add() { return tr('Put something in'); },
  get namePrompt() { return tr('What is it?'); },
  get nameHelp() { return tr('Give it a name you would recognise. Nobody else ever sees this name, not even your Keyholders.'); },
  get namePlaceholder() { return tr('Where the money is'); },
  get bodyPrompt() { return tr('Write it down'); },
  get kindPrompt() { return tr('What kind of thing is it?'); },
  get save() { return tr('Lock this away'); },
  get saving() { return tr('Locking it away…'); },
  cancel: 'Cancel',
  get saved() { return tr('That is locked away.'); },
  get needsName() { return tr('Please give it a name.'); },
  get needsBody() { return tr('Please write something before you save it.'); },
  get needsKind() { return tr('Please choose what kind of thing this is.'); },
  get failedToSave() { return tr('We could not save that. Please try again.'); },
  get removed() { return tr('That is out of your box.'); },
  get failedToRemove() { return tr('We could not take that out. Please try again.'); },
};

/**
 * The refusal after a password change. The sentence itself is the server's —
 * it carries the real date the freeze lifts, so it is rendered exactly as it
 * arrives and never rebuilt here. `prefix` only decides whether to add the
 * contact line under it.
 */
export const FROZEN = {
  get prefix() { return tr('You changed your password recently.'); },
  tellUs: (email) => (email ? writeToUs(email) : RELEASE_CONTACT.notSetYet),
};

/** Taking something out of the box cannot be undone by anybody. */
export const TAKE_OUT_OF_BOX = {
  get title() { return tr('Take this out of the box?'); },
  get message() { return tr('It will be gone for good. Nobody will be able to read it again, and that includes you.'); },
  get confirm() { return tr('Take it out'); },
  get cancel() { return tr('Keep it'); },
};

/**
 * Who a family writes to when the day comes. The address is deployment
 * configuration on the server and arrives with the sheet and the setup state —
 * it is never written here. When unset, the truth is said out loud.
 */
export const RELEASE_CONTACT = {
  who: 'Towinly',
  get notSetYet() { return tr('Towinly has not set an address to write to yet.'); },
};

const writeToUs = (email) => tr('Write to {who} at {email}.', { who: RELEASE_CONTACT.who, email });

const noAddressOnTheSheet = () =>
  `${RELEASE_CONTACT.notSetYet} `
  + tr('Save a new copy of this page from time to time, and the address will be on it once it is set.');

/**
 * The saved copy — one page she keeps somewhere her family would think to
 * look. Digital only; there is no print step anywhere in this feature. Names
 * of what is in the box and never contents; the closing line is the whole
 * legal point of the page.
 */
export const SHEET = {
  get pageTitle() { return tr('Your one-page copy'); },
  get pageLead() { return tr('This is the copy you keep outside Towinly. Save it, and put it wherever your family would think to look. Do not let this app be your only copy.'); },
  get save() { return tr('Save this to my computer'); },
  get saved() { return tr('Saved. Now put it somewhere your family would look.'); },
  get failedToSave() { return tr('We could not save that file. Please try again.'); },
  get back() { return tr('Go back to my sealed box'); },
  get loading() { return tr('Getting your copy ready…'); },
  get failed() { return tr('We could not get your copy ready. Please try again.'); },
  lastSaved: (when) => tr('You last saved a copy on {when}.', { when }),
  get neverSaved() { return tr('You have not saved a copy yet.'); },
  get previewHeading() { return tr('This is what you will save'); },
  get linkFromBox() { return tr('Save your one-page copy'); },

  // ── the copy itself, in the order it is read ──

  title: (name) => tr('What {name} passes on', { name }),
  madeOn: (when) => tr('Made on {when}, from Towinly.', { when }),

  inTheBox: {
    get heading() { return tr('What is in the sealed box'); },
    get blurb() { return tr('These are the names of the things inside. What any of them says is not written here, and it is not written down anywhere outside Towinly.'); },
    get empty() { return tr('There is nothing in the box yet.'); },
    line: (label, kind) => `${label}, ${kind}`,
  },

  whoCanOpen: {
    get heading() { return tr('Who can ask to open it'); },
    get empty() { return tr('Nobody has been asked yet.'); },
  },

  howToAsk: {
    get heading() { return tr('How your family asks for it to be opened'); },
    writeTo: (email) => (email ? writeToUs(email) : noAddressOnTheSheet()),
    get noAddressYet() { return noAddressOnTheSheet(); },
    get askedFor() { return tr('They will be asked for:'); },
    steps: (name) => [
      tr('a death certificate, which a person here reads and writes down'),
      tr('word from each of the people above, one at a time, that they agree'),
      tr('then a wait of thirty days, while Towinly keeps trying to reach {name}', { name }),
    ],
    get thenWhat() { return tr('Only then does somebody here pass on what is in the box. None of this happens by itself, and there is no button anywhere that opens the box.'); },
  },

  /** The design copy's last line, and the whole legal point of the page. */
  get closing() { return tr('This is not a will.'); },
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
  title: (name) => tr('From {name}', { name }),
  lead: (name) => tr('What {name} chose to share with you.', { name }),
  empty: (name) => tr('{name} has not shared anything with you yet.', { name }),
  /** A letter is written to one person. If you are reading one, it was written to you. */
  get letterChip() { return tr('A letter for you'); },
  get failed() { return tr('We could not open that page.'); },
  get back() { return tr('Go back'); },
  linkFromProfile: (name) => tr('What {name} passes on', { name }),
  get linkBlurb() { return tr('Her stories, and any letter she wrote to you.'); },
};

/**
 * Objecting to a story — the reasons people actually object to a memory, not
 * the message-report categories. Not offered on letters: a letter reaches one
 * person, so it cannot name a third person to a room.
 */
export const REPORT_STORY = {
  get open() { return tr('Report this'); },
  get reasonPrompt() { return tr('What is wrong with it?'); },
  reasons: [
    'It says something untrue about me',
    'It should not be shown to people',
    'It is unkind or hurtful',
    'Something else',
  ],
  get notePrompt() { return tr('Tell us more (you can skip this)'); },
  get send() { return tr('Send this to Towinly'); },
  get cancel() { return tr('Never mind'); },
  get sending() { return tr('Sending…'); },
  get sent() { return tr('Thank you. Somebody at Towinly will read this.'); },
  get failed() { return tr('We could not send that. Please try again.'); },
};

/**
 * Being asked to hold a key, on the family member's own screen. Says
 * they/their — we do not know anybody's gender. The threshold sentence is
 * rebuilt from real numbers and left out before she has chosen them.
 */
export const KEYHOLDER_ASK = {
  heading: (name) => tr('{name} has asked you to hold a key.', { name }),
  body: (name) =>
    tr("One day, after they are gone, you would be one of the people who can ask to open {name}'s Sealed box. You cannot see anything in it now and you never will unless that day comes.", { name }),
  threshold: (agree, of) =>
    tr('{agree} of the {of} of you would have to agree, and someone here at Towinly would check first.', { agree, of }),
  get yes() { return tr('Yes, I will do that'); },
  get no() { return tr('No thanks'); },
  get reassurance() { return tr('You can change your mind whenever you like.'); },
  get failed() { return tr('We could not send your answer. Please try again.'); },
  accepted: (name) => tr('Thank you. {name} will see that you said yes.', { name }),
  get declined() { return tr('That is fine. Nothing more is needed from you.'); },
};

/** Taking something down is permanent, so it is asked for in plain words. */
export const TAKE_DOWN = {
  get title() { return tr('Take this down?'); },
  get message() { return tr('It will be gone from your page, and nobody will be able to read it.'); },
  get confirm() { return tr('Take it down'); },
  get cancel() { return tr('Keep it'); },
};
