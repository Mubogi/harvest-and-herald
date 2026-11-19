/* Public preaching and teaching: message prep, delivery resolution, listener response. */
(function (root) {
  'use strict';

  const U = root.Utils;
  const St = root.State;
  const S = root.Scriptures;
  const Q = root.Questions;

  const VENUES = {
    square: {
      id: 'square', name: 'Marketplace Square', zone: 'marketplace',
      capacity: 26, minutes: 90, difficulty: 0, reach: 1.25,
      blurb: 'Open air, short attention spans, plenty of hecklers.',
    },
    hall: {
      id: 'hall', name: 'Teaching Hall', zone: 'hall',
      capacity: 34, minutes: 100, difficulty: 1, reach: 1.0,
      blurb: 'The gathered church. They can see through you, and they should be able to.',
    },
    campus: {
      id: 'campus', name: 'Campus Green', zone: 'campus',
      capacity: 22, minutes: 80, difficulty: 2, reach: 1.0,
      blurb: 'Sharp questions, low tolerance for slogans. Doctrine matters here.',
    },
    ward: {
      id: 'ward', name: 'Hospital Courtyard', zone: 'hospital',
      capacity: 18, minutes: 70, difficulty: 0, reach: 0.9,
      blurb: 'Small, quiet, and heavy. Compassion carries more than eloquence.',
    },
  };

  const VENUE_LIST = ['square', 'hall', 'campus', 'ward'];

  function createMessage() {
    return { venueId: 'square', themeId: null, motiveId: null, prepIds: [], composed: false };
  }

  function isComplete(msg) {
    return !!(msg.venueId && msg.themeId && msg.motiveId && msg.prepIds.length > 0);
  }

  /* Compose the actual text of the message from theme + motive + prep. */
  function compose(msg) {
    const theme = S.themeById(msg.themeId);
    const motive = S.motiveById(msg.motiveId);
    if (!theme || !motive) return null;

    const openers = {
      obedience: 'I am not here because it is my job. I am here because he told me to come, and I have learned to obey him when it is inconvenient.',
      love: 'I have been in your homes and your hospital ward this week, and I want you to know something before I say anything else: I am not here to scold you.',
      faithfulness: 'I was given a message and told not to edit it. So I am going to read it to you plainly, and then I am going to sit down.',
      duty: 'This is my post, and I will stand it. Whether you listen or not, the word will be preached here today.',
      applause: 'I have worked hard on this, and I hope you will see that. I hope you will remember who said it.',
      numbers: 'We need to see this square fill up. If we do this right, there should be far more of you here next week.',
      anger: 'Some of you have been sitting in this square for years, arguing, and it is time someone said it plainly.',
    };

    const prep = msg.prepIds.map((id) => S.prepById(id)).filter(Boolean);
    const prepLine = prep.some((x) => x.id === 'fasted')
      ? 'I put food aside this week to ask God what he wanted said. He answered, and it was not what I expected.'
      : prep.some((x) => x.id === 'prayed')
        ? 'I have been in the small room behind the hall most of this week, and the text got bigger as I prayed.'
        : prep.some((x) => x.id === 'studied' || x.id === 'manuscript')
          ? 'I want to show you the sentence before and the sentence after, because the context changes everything.'
          : 'I put these notes together last night, and I hope they hold.';

    return {
      opening: openers[motive.id],
      body: theme.line,
      verse: theme.verse,
      prepLine,
      close: motive.id === 'applause'
        ? 'So — was that not worth coming out for?'
        : motive.id === 'numbers'
          ? 'Come back next week, and bring someone. That is how we grow.'
          : motive.id === 'anger'
            ? 'You have heard it. Do with it what you like.'
            : 'If this is true, then it is true for you today, and I will be in the square tomorrow if you want to talk.',
    };
  }

  function computePower(state, msg) {
    const m = state.meters;
    const theme = S.themeById(msg.themeId);
    const motive = S.motiveById(msg.motiveId);
    const prep = msg.prepIds.map((id) => S.prepById(id)).filter(Boolean);

    const prepSpirit = prep.reduce((sum, x) => sum + (x.spirit || 0), 0);
    const prepDoctrine = prep.reduce((sum, x) => sum + (x.doctrine || 0), 0);
    const prepBurnout = prep.reduce((sum, x) => sum + (x.burnout || 0), 0);
    const borrowed = prep.some((x) => x.borrowed);

    /* The reservoir is the ceiling: preparation can raise it, never replace it. */
    const effectiveSpirit = U.clamp(m.spirit * 0.72 + prepSpirit * 0.75, 0, 100);
    const effectiveDoctrine = U.clamp(m.doctrine * 0.7 + prepDoctrine * 0.8, 0, 100);

    const burnPenalty = Math.max(0, m.burnout - 45) * 0.85;
    const emptyMinistry = effectiveSpirit < 30;
    const hollowFactor = emptyMinistry
      ? U.clamp(0.28 + effectiveSpirit / 42, 0.2, 0.85)
      : 1;

    const themeNeed = theme ? theme.difficulty * 17 : 40;
    const doctrineShortfall = Math.max(0, themeNeed - effectiveDoctrine);
    const doctrinalRisk = U.clamp(doctrineShortfall / 52, 0, 1);

    const integrity = U.clamp((m.compassion * 0.6 + (100 - m.burnout) * 0.4) / 100, 0, 1);
    const humilityBonus = (motive ? motive.humility : 0) * 2.6;

    const power = U.clamp(
      (effectiveSpirit * 0.46 + effectiveDoctrine * 0.24 + integrity * 34 + humilityBonus)
        * hollowFactor - burnPenalty,
      0, 100,
    );

    return {
      power, effectiveSpirit, effectiveDoctrine, integrity,
      hollow: emptyMinistry, hollowFactor, doctrinalRisk, borrowed,
      prepBurnout, doctrineShortfall, motive, theme,
    };
  }

  function buildCrowd(state, venue, msg, rng) {
    const r = rng || Math.random;
    const theme = S.themeById(msg.themeId);
    const size = Math.max(6, Math.round(venue.capacity * (0.45 + r() * 0.5)));
    const crowd = [];

    state.people
      .filter((p) => p.zone === venue.zone && !p.resolved)
      .forEach((p) => {
        crowd.push({
          kind: 'townsman',
          personId: p.id,
          name: p.name,
          need: p.need,
          receptivity: 0.3 + p.openness / 160,
        });
      });

    while (crowd.length < size) {
      const arch = U.pick(Q.LISTENERS);
      const need = theme && r() < 0.55
        ? U.pick(theme.needs)
        : U.pick(['grief', 'pride', 'deception', 'legality', 'addiction', 'fear']);
      crowd.push({
        kind: 'anonymous',
        name: null,
        archetype: arch.id,
        need,
        receptivity: arch.base + (r() - 0.5) * 0.22,
      });
    }

    return crowd;
  }

  function deliver(state, msg) {
    const venue = VENUES[msg.venueId];
    const p = computePower(state, msg);
    const theme = p.theme;
    const crowd = buildCrowd(state, venue, msg);
    const needMatches = theme ? theme.needs : [];

    const results = crowd.map((listener) => {
      const themeFit = needMatches.includes(listener.need)
        ? (listener.kind === 'townsman' ? 0.15 : 0.13)
        : -0.05;

      /* A cold or self-serving heart repels people even when the facts are right. */
      const heartGate = U.clamp((state.meters.compassion - 55) / 90, -0.2, 0.12);
      const motivePenalty = p.motive && p.motive.humility < 0
        ? Math.abs(p.motive.humility) * 0.05
        : 0;

      let score = listener.receptivity * 0.42
        + (p.power / 100) * 0.3
        + p.integrity * 0.1
        + heartGate
        + themeFit
        - p.doctrinalRisk * 0.2
        - motivePenalty;

      if (p.hollow) score -= 0.16;
      if (listener.archetype === 'mocker') score -= 0.12;
      if (listener.archetype === 'religious' && p.doctrinalRisk > 0.35) score -= 0.08;

      score = U.clamp(score, 0, 1);

      let response;
      if (score > 0.8) response = 'repentant';
      else if (score > 0.62) response = 'moved';
      else if (score > 0.42) response = 'curious';
      else if (score > 0.22) response = 'unmoved';
      else response = 'hostile';

      return Object.assign({}, listener, { score, response });
    });

    const byResponse = (r) => results.filter((x) => x.response === r);
    const repentant = byResponse('repentant');
    const moved = byResponse('moved');
    const curious = byResponse('curious');
    const hostile = byResponse('hostile');

    let misquote = null;
    if (Math.random() < p.doctrinalRisk * 0.75) {
      misquote = U.pick([
        { said: '"God helps those who help themselves."', actual: 'Not in the Bible. Proverbs teaches the opposite: God helps the helpless.' },
        { said: '"Money is the root of all evil."', actual: '1 Timothy 6:10 says the love of money is a root of all kinds of evils.' },
        { said: '"God will not give you more than you can handle."', actual: '1 Corinthians 10:13 promises a way of escape — not that the load will fit your strength.' },
        { said: '"Judge not, that you judge not."', actual: 'Matthew 7:1 is followed by verse 5: take the log out, then help your brother.' },
        { said: '"Where two or three are gathered, God is obliged to answer."', actual: 'Matthew 18:20 is about church discipline and Christ\'s presence, not a formula for results.' },
      ]);
    }

    const converted = [];
    repentant.forEach((listener) => {
      if (listener.kind !== 'townsman') return;
      const person = state.people.find((x) => x.id === listener.personId);
      if (!person) return;
      if (['newborn', 'growing', 'rooted', 'mentor', 'drifting'].includes(person.stage)) return;
      person.stage = 'newborn';
      person.bornDay = state.day;
      person.progress = 0;
      person.driftTimer = 0;
      person.met = true;
      person.lastOutcome = 'converted';
      converted.push(person);
      St.bump(state, 'decisions');
    });

    const anonymousDecisions = Math.round(repentant.filter((l) => l.kind !== 'townsman').length * 0.6)
      + Math.round(moved.length * 0.12);

    St.adjust(state, 'spirit', -(7 + p.power * 0.13));
    St.adjust(state, 'burnout', 3 + (p.hollow ? 7 : 0));
    if (p.motive) St.adjust(state, 'burnout', p.motive.burnout * 0.7);
    if (misquote) {
      St.adjust(state, 'doctrine', -5);
      St.adjust(state, 'compassion', -3);
    }
    if (anonymousDecisions > 0) St.bump(state, 'decisions', anonymousDecisions);
    St.bump(state, 'sermons');
    St.advanceMinutes(state, venue.minutes);

    const questions = U.shuffle(Q.QUESTIONS).slice(0, Math.min(2, 1 + Math.round(p.power / 60)));

    const record = {
      day: state.day,
      venue: venue.name,
      theme: theme ? theme.name : 'Unknown',
      motive: p.motive ? p.motive.name : 'Unknown',
      power: Math.round(p.power),
      hollow: p.hollow,
      crowdSize: results.length,
      repentant: repentant.length + anonymousDecisions,
      moved: moved.length,
      curious: curious.length,
      hostile: hostile.length,
      misquote,
      converted: converted.map((c) => c.id),
    };
    state.sermons.push(record);

    return {
      power: p, venue, crowd: results, record, converted,
      anonymousDecisions, misquote, questions,
      counts: {
        repentant: repentant.length + anonymousDecisions,
        moved: moved.length,
        curious: curious.length,
        hostile: hostile.length,
        total: results.length,
      },
    };
  }

  function answerQuestion(state, option) {
    St.adjust(state, 'doctrine', option.doctrine || 0);
    St.adjust(state, 'compassion', option.compassion || 0);
    if (option.flag === 'harsh') {
      St.adjust(state, 'burnout', 4);
      St.bump(state, 'harshChoices');
    }
    if (option.flag === 'sloppy') St.adjust(state, 'spirit', -3);
    if (option.flag === 'gospel') St.bump(state, 'wiseChoices');
    return option;
  }

  root.Preaching = {
    VENUES, VENUE_LIST,
    createMessage, isComplete, compose, computePower, buildCrowd, deliver, answerQuestion,
  };
})(window);
