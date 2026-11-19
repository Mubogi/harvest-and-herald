/* Scripture references used for reminders, theming, and message prep. */
(function (root) {
  'use strict';

  const FOUNDATION = [
    { ref: '1 Corinthians 9:27', text: 'I discipline my body and keep it under control, lest after preaching to others I myself should be disqualified.' },
    { ref: '1 Timothy 4:16', text: 'Keep a close watch on yourself and on the teaching. Persist in this, for by so doing you will save both yourself and your hearers.' },
    { ref: 'Colossians 4:5-6', text: 'Walk in wisdom toward outsiders... Let your speech always be gracious, seasoned with salt, so that you may know how you ought to answer each person.' },
  ];

  /* Reminder lines paired with ministry events, so the log teaches while it records. */
  const LOG_VERSES = {
    prayer: 'Matthew 6:6 — Pray to your Father who is in secret.',
    fasting: 'Matthew 6:17-18 — When you fast, do not look gloomy.',
    repent: '1 John 1:9 — If we confess our sins, he is faithful to forgive.',
    study: '2 Timothy 2:15 — Rightly handling the word of truth.',
    preachHollow: '1 Corinthians 13:1 — A noisy gong or a clanging cymbal.',
    preachFaithful: 'Romans 10:14 — How are they to hear without someone preaching?',
    doctrineError: '1 Timothy 1:7 — Desiring to be teachers, without understanding.',
    pride: 'Proverbs 16:18 — Pride goes before destruction.',
    burnout: 'Mark 6:31 — Come away by yourselves and rest a while.',
    compassion: 'Colossians 3:12 — Put on compassion, kindness, humility.',
    harsh: 'Ephesians 4:15 — Speak the truth in love.',
    followUp: '2 Timothy 2:2 — Entrust to faithful people who will teach others.',
    drift: 'Hebrews 2:1 — Pay much closer attention to what we have heard.',
    rooted: 'Psalm 1:3 — A tree planted by streams of water.',
    convert: 'Luke 15:7 — Joy over one sinner who repents.',
    rest: 'Psalm 127:2 — He gives to his beloved sleep.',
    family: '1 Timothy 3:5 — If someone does not care for their own household...',
    discern: 'Proverbs 18:13 — Answering before listening is folly.',
    serve: 'Galatians 6:10 — Do good to everyone, especially the household of faith.',
    wrongVerse: '2 Timothy 2:15 — Do not be ashamed, rightly handling the word.',
  };

  /* Sermon themes. `needs` are the listener needs this theme speaks to;
     `difficulty` gates how much Doctrine is required to handle it well. */
  const THEMES = [
    {
      id: 'cross',
      name: 'The Cross and the Empty Tomb',
      verse: '1 Corinthians 15:3-4',
      difficulty: 1,
      needs: ['grief', 'fear', 'pride', 'deception'],
      line: 'Christ died for our sins, was buried, and was raised — and that is the ground a guilty soul can stand on.',
    },
    {
      id: 'grace',
      name: 'Grace That Is Greater Than Guilt',
      verse: 'Ephesians 2:8-9',
      difficulty: 1,
      needs: ['legality', 'grief', 'addiction', 'pride'],
      line: 'You are not saved by your performance, and you are not kept by it either.',
    },
    {
      id: 'prodigal',
      name: 'The Father Runs',
      verse: 'Luke 15:20',
      difficulty: 1,
      needs: ['grief', 'addiction', 'fear', 'deception'],
      line: 'While the son was still far off, the father saw him and ran — that is the heart of God toward you.',
    },
    {
      id: 'repentance',
      name: 'Repentance and the Kindness of God',
      verse: 'Romans 2:4',
      difficulty: 2,
      needs: ['pride', 'addiction', 'legality', 'deception'],
      line: 'God\'s kindness is meant to lead you to repentance — not to shame you into it.',
    },
    {
      id: 'suffering',
      name: 'Hope in Suffering',
      verse: 'Romans 5:3-5',
      difficulty: 2,
      needs: ['grief', 'fear'],
      line: 'Suffering produces endurance, endurance produces character, and character produces a hope that does not put us to shame.',
    },
    {
      id: 'fear',
      name: 'Do Not Be Afraid',
      verse: 'Isaiah 41:10',
      difficulty: 1,
      needs: ['fear', 'grief'],
      line: 'Fear not, for I am with you — the command comes with a promise attached to his presence, not your courage.',
    },
    {
      id: 'idols',
      name: 'The Emptiness of Idols',
      verse: 'Jeremiah 2:13',
      difficulty: 3,
      needs: ['addiction', 'pride', 'deception'],
      line: 'We hewed out cisterns for ourselves, broken cisterns that hold no water — and wondered why we were still thirsty.',
    },
    {
      id: 'legalism',
      name: 'The Yoke of Religion vs. Rest in Christ',
      verse: 'Matthew 11:28-30',
      difficulty: 3,
      needs: ['legality', 'pride'],
      line: 'My yoke is easy and my burden is light — if your religion is crushing you, it may not be his.',
    },
    {
      id: 'reconcile',
      name: 'Forgiving as You Have Been Forgiven',
      verse: 'Colossians 3:13',
      difficulty: 2,
      needs: ['pride', 'grief', 'legality'],
      line: 'As the Lord has forgiven you, so you also must forgive — not from an empty tank, but from a full one.',
    },
    {
      id: 'greatCommission',
      name: 'Sent: The Great Commission',
      verse: 'Matthew 28:19-20',
      difficulty: 2,
      needs: ['deception', 'pride', 'fear'],
      line: 'Go therefore and make disciples — not just decisions, disciples. Baptizing and teaching all that he commanded.',
    },
    {
      id: 'secondComing',
      name: 'The Return of the King',
      verse: '1 Thessalonians 4:16-17',
      difficulty: 3,
      needs: ['deception', 'fear', 'pride'],
      line: 'The Lord himself will descend with a cry of command — and every careless argument will go quiet.',
    },
    {
      id: 'word',
      name: 'The Word Is Alive',
      verse: 'Hebrews 4:12',
      difficulty: 2,
      needs: ['legality', 'deception', 'addiction'],
      line: 'The word of God is living and active, sharper than a two-edged sword — it does the surgery we cannot do.',
    },
  ];

  const MOTIVES = [
    { id: 'obedience', name: 'Obedience to Christ', note: 'I preach because he told me to, and I love him.', humility: 3, burnout: -3 },
    { id: 'love', name: 'Love for the Lost', note: 'I want these people to know the Shepherd.', humility: 2, burnout: -2 },
    { id: 'faithfulness', name: 'Stewarding the Truth', note: 'This message is a trust; I will not dilute it.', humility: 1, burnout: 0 },
    { id: 'duty', name: 'Duty and Discipline', note: 'It is my post. I will stand it whether I feel it or not.', humility: 0, burnout: 1 },
    { id: 'applause', name: 'Wanting to Be Thought Well Of', note: 'I hope they notice how well I handle the text.', humility: -3, burnout: 3 },
    { id: 'numbers', name: 'Wanting the Numbers Up', note: 'If the count is low, I am a failure.', humility: -2, burnout: 4 },
    { id: 'anger', name: 'Proving a Point', note: 'Some of these people need to be put in their place.', humility: -4, burnout: 3 },
  ];

  const PREP_OPTIONS = [
    { id: 'prayed', name: 'Hours in Prayer', note: 'You stayed in the Secret Place until the text warmed.', spirit: 14, doctrine: 4 },
    { id: 'fasted', name: 'Prayer and Fasting', note: 'You put food aside to seek his face.', spirit: 18, doctrine: 2, burnout: -4 },
    { id: 'studied', name: 'Careful Study of the Text', note: 'Context, grammar, cross-references.', spirit: 3, doctrine: 16 },
    { id: 'scribbled', name: 'Sketched It Last Night', note: 'A few lines on the back of a bulletin.', spirit: 2, doctrine: 5 },
    { id: 'borrowed', name: 'Borrowed Someone Else\'s Outline', note: 'Good lines, not yet yours.', spirit: 0, doctrine: 3, borrowed: true },
    { id: 'manuscript', name: 'Wrote Out a Full Manuscript', note: 'You know every turn of the argument.', spirit: 5, doctrine: 12 },
  ];

  root.Scriptures = {
    FOUNDATION,
    LOG_VERSES,
    THEMES,
    MOTIVES,
    PREP_OPTIONS,
    verseFor(kind) { return LOG_VERSES[kind] || ''; },
    themeById(id) { return THEMES.find((t) => t.id === id) || null; },
    motiveById(id) { return MOTIVES.find((m) => m.id === id) || null; },
    prepById(id) { return PREP_OPTIONS.find((p) => p.id === id) || null; },
  };
})(window);
