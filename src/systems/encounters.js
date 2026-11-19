/* Counseling encounters: run a session, apply effects, decide the outcome. */
(function (root) {
  'use strict';

  const U = root.Utils;
  const St = root.State;
  const NEEDS = root.PeopleData.NEEDS;
  const ENCOUNTERS = root.PeopleData.ENCOUNTERS;

  const EFFECT_METERS = ['compassion', 'doctrine', 'spirit', 'burnout', 'humility'];

  function createSession(person) {
    const def = ENCOUNTERS[person.need];
    return {
      personId: person.id,
      need: person.need,
      def,
      step: 0,
      rapport: 0,
      flags: {},
      totals: { compassion: 0, doctrine: 0, spirit: 0, burnout: 0, humility: 0 },
      history: [],
      done: false,
      outcome: null,
    };
  }

  function applyChoice(state, session, choice) {
    const eff = choice.effects || {};
    Object.keys(eff).forEach((key) => {
      if (key === 'rapport') {
        session.rapport += eff[key];
        return;
      }
      if (EFFECT_METERS.includes(key)) session.totals[key] += eff[key];
    });
    if (choice.flag) session.flags[choice.flag] = true;
    session.history.push({ ask: session.def.steps[session.step].ask, choice });
    session.step += 1;
    return session.step >= session.def.steps.length;
  }

  /* Compassion gate: a harsh heart can be doctrinally correct and still repel people. */
  function compassionGate(state) {
    const c = state.meters.compassion;
    if (c >= 70) return 12;
    if (c >= 55) return 4;
    if (c >= 42) return -8;
    if (c >= 28) return -26;
    return -48;
  }

  function resolve(state, session) {
    const person = state.people.find((p) => p.id === session.personId);
    if (!person) return null;
    const t = session.totals;
    const flags = session.flags;

    const meterEffects = {
      compassion: t.compassion * 0.55,
      doctrine: t.doctrine * 0.5,
      spirit: t.spirit - 3,
      burnout: t.burnout + (flags.harsh ? 4 : 0),
    };
    Object.keys(meterEffects).forEach((k) => St.adjust(state, k, meterEffects[k]));

    if (t.humility) St.adjust(state, 'burnout', -Math.max(0, t.humility));

    if (flags.harsh) {
      St.bump(state, 'harshChoices');
      St.adjust(state, 'burnout', 3);
      St.adjust(state, 'compassion', -4);
    }
    if (flags.discerned) St.bump(state, 'wiseChoices');
    if (flags.listened) St.bump(state, 'wiseChoices');
    if (flags.served) St.bump(state, 'servicesRendered');

    const score = session.rapport
      + t.compassion * 0.9
      + t.doctrine * 0.6
      + compassionGate(state)
      + (flags.gospel ? 12 : 0)
      + (flags.discerned ? 8 : 0)
      + (flags.honest ? 5 : 0)
      - (flags.harsh ? 26 : 0)
      - (flags.argued ? 9 : 0);

    const heardGospel = !!flags.gospel;

    let outcome;
    if (flags.harsh && score < 12) {
      outcome = 'hardened';
    } else if (heardGospel && score >= 26 && person.openness >= 18) {
      outcome = 'converted';
    } else if (heardGospel && score >= 12) {
      outcome = 'open';
    } else if (score >= 18) {
      outcome = 'open';
    } else if (score >= 4) {
      outcome = 'polite';
    } else {
      outcome = 'closed';
    }

    St.bump(state, 'conversations');

    const opennessDelta = {
      converted: 30, open: 18, polite: 4, closed: -14, hardened: -30,
    }[outcome];

    person.openness = U.clamp(person.openness + opennessDelta, 0, 100);
    person.met = true;
    person.lastOutcome = outcome;

    let headline;
    let detail;
    let tone = 'good';

    switch (outcome) {
      case 'converted':
        person.stage = 'newborn';
        person.bornDay = state.day;
        person.driftTimer = 0;
        person.progress = 0;
        St.bump(state, 'decisions');
        St.adjust(state, 'spirit', -4);
        headline = 'A Decision — Now the Work Begins';
        detail = 'They bowed their head and meant it. But a newborn left alone is a newborn in danger: find them a mentor before the week is out.';
        tone = 'good';
        break;
      case 'open':
        person.stage = person.stage === 'newborn' ? 'newborn' : 'seeker';
        headline = heardGospel ? 'The Door Is Open' : 'A Real Conversation, No Harvest Yet';
        detail = heardGospel
          ? 'They are close. They have not yet turned, but they are no longer pretending not to hear.'
          : 'You listened well and they trusted you — but the gospel was never actually spoken. Warmth without the message leaves people comfortable and lost.';
        tone = heardGospel ? 'good' : 'warn';
        break;
      case 'polite':
        headline = 'Polite and Unchanged';
        detail = 'They thanked you and left. Nothing was broken, nothing was planted. Try again when they are readier, or preach where they can hear.';
        tone = 'warn';
        break;
      case 'closed':
        headline = 'The Conversation Closed';
        detail = 'Something in the exchange put a wall up. Perhaps the timing, perhaps the tone. Give it days, not minutes.';
        tone = 'warn';
        break;
      case 'hardened':
        headline = 'You Won the Point and Lost the Person';
        detail = 'Truth delivered without compassion reads as contempt. They will avoid you now. This is the wound pride leaves behind.';
        tone = 'bad';
        break;
      default:
        headline = 'Conversation Ended';
        detail = '';
    }

    session.done = true;
    session.outcome = outcome;

    return {
      outcome, headline, detail, tone, score,
      flags, totals: t, rapport: session.rapport,
      verse: outcome === 'converted'
        ? root.Scriptures.verseFor('convert')
        : flags.harsh
          ? root.Scriptures.verseFor('harsh')
          : flags.listened
            ? root.Scriptures.verseFor('discern')
            : root.Scriptures.verseFor('followUp'),
    };
  }

  function needInfo(needId) {
    return NEEDS[needId] || { label: needId, icon: '?', color: '#999', blurb: '' };
  }

  root.Encounters = { createSession, applyChoice, resolve, needInfo };
})(window);
