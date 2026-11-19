/* Follow-up and one-on-one discipleship. New believers do not survive on their own. */
(function (root) {
  'use strict';

  const U = root.Utils;
  const St = root.State;

  const STAGES = ['newborn', 'growing', 'rooted', 'mentor'];

  const STAGE_THRESHOLDS = { newborn: 0, growing: 34, rooted: 68, mentor: 100 };

  /* Care actions. Each one targets a specific weakness in a new believer's growth. */
  /* The preacher can carry a few personally; beyond that, maturity must be delegated.
     This also solves the bootstrap problem: the first believers have no one else. */
  const PLAYER_MENTOR = 'player';
  const PLAYER_CAPACITY = 3;

  function playerMentees(state) {
    return state.people.filter((p) => p.mentor === PLAYER_MENTOR);
  }

  function mentorName(state, person) {
    if (!person.mentor) return null;
    if (person.mentor === PLAYER_MENTOR) return 'you';
    const m = state.people.find((x) => x.id === person.mentor);
    return m ? m.name : null;
  }

  function unmentoredCount(state) {
    return state.people.filter((p) => !p.mentor
      && ['newborn', 'growing', 'rooted', 'drifting'].includes(p.stage)).length;
  }

  const CARE = {
    mentor: {
      id: 'mentor', name: 'Take Them Under Your Wing', minutes: 60,
      requires: (p) => !p.mentor && p.stage !== 'mentor',
      apply: (state, person) => {
        const pool = state.people.filter((x) => x.id !== person.id
          && (x.stage === 'rooted' || x.stage === 'mentor')
          && !x.mentoring);
        if (pool.length) {
          const mentor = pool.reduce((best, x) => (x.progress > best.progress ? x : best), pool[0]);
          person.mentor = mentor.id;
          mentor.mentoring = person.id;
          person.progress += 22;
          return {
            ok: true,
            message: `${mentor.name} takes ${person.name} on. Two hours a week, one text, and a lot of patience.`,
            verse: root.Scriptures.verseFor('followUp'),
          };
        }
        const mine = playerMentees(state);
        if (mine.length >= PLAYER_CAPACITY) {
          return {
            ok: false,
            message: `You are already carrying ${PLAYER_CAPACITY} people personally. Disciple one of them to maturity so they can carry others — you cannot be everyone's pastor.`,
          };
        }
        person.mentor = PLAYER_MENTOR;
        person.progress += 22;
        return {
          ok: true,
          message: `No one else is mature enough yet, so you take ${person.name} yourself. You have ${PLAYER_CAPACITY - mine.length - 1} place${PLAYER_CAPACITY - mine.length - 1 === 1 ? '' : 's'} left.`,
          verse: root.Scriptures.verseFor('followUp'),
        };
      },
    },
    pray: {
      id: 'pray', name: 'Teach Them to Pray', minutes: 45,
      apply: (state, person) => {
        person.progress += 16;
        St.adjust(state, 'spirit', -2);
        return {
          ok: true,
          message: `You pray with ${person.name} out loud, badly, on purpose — so they learn it does not have to be polished.`,
          verse: root.Scriptures.verseFor('prayer'),
        };
      },
    },
    word: {
      id: 'word', name: 'Open the Word Together', minutes: 60,
      apply: (state, person) => {
        const doctrineGap = state.meters.doctrine < 40;
        person.progress += doctrineGap ? 8 : 18;
        return {
          ok: true,
          message: doctrineGap
            ? `You read with ${person.name}, but you stumble over the passage yourself. They notice. They are gracious about it.`
            : `You read Mark 4 with ${person.name} and let them ask the obvious questions. They ask better ones than you expected.`,
          verse: root.Scriptures.verseFor('study'),
        };
      },
    },
    serve: {
      id: 'serve', name: 'Serve the Needy Together', minutes: 90,
      apply: (state, person) => {
        person.progress += 20;
        St.adjust(state, 'compassion', 4);
        St.adjust(state, 'burnout', 2);
        St.bump(state, 'servicesRendered');
        return {
          ok: true,
          message: `You take ${person.name} to the shelter. They carry the water. Something in them settles when they are useful.`,
          verse: root.Scriptures.verseFor('serve'),
        };
      },
    },
    restore: {
      id: 'restore', name: 'Sit With Them in the Dark', minutes: 75,
      requires: (p) => p.stage === 'drifting' || p.progress < 30,
      apply: (state, person) => {
        person.progress += 24;
        person.driftTimer = 0;
        St.adjust(state, 'compassion', 5);
        St.adjust(state, 'burnout', 3);
        return {
          ok: true,
          message: `You go to ${person.name} instead of waiting for them to come to you. They had been expecting to be written off.`,
          verse: root.Scriptures.verseFor('drift'),
        };
      },
    },
  };

  const CARE_LIST = ['mentor', 'pray', 'word', 'serve', 'restore'];

  function eligible(state, person) {
    const list = [];
    CARE_LIST.forEach((id) => {
      const c = CARE[id];
      if (c.requires && !c.requires(person)) return;
      if (id === 'mentor' && person.mentor) return;
      if (id === 'restore' && person.stage !== 'drifting' && person.progress >= 30) return;
      list.push(c);
    });
    return list;
  }

  function stageFor(progress) {
    if (progress >= 100) return 'mentor';
    if (progress >= 68) return 'rooted';
    if (progress >= 34) return 'growing';
    return 'newborn';
  }

  function applyCare(state, person, careId) {
    const care = CARE[careId];
    if (!care) return { ok: false, message: 'Unknown care action.' };
    const res = care.apply(state, person);
    if (!res.ok) return res;

    St.advanceMinutes(state, care.minutes);

    const prevStage = person.stage;
    if (person.stage === 'drifting') {
      person.stage = stageFor(person.progress);
    }
    const newStage = stageFor(person.progress);
    person.stage = newStage;

    if (prevStage !== newStage) {
      if (newStage === 'growing') {
        res.stageUp = `${person.name} is growing — praying without being told to.`;
      } else if (newStage === 'rooted') {
        St.bump(state, 'rooted');
        res.stageUp = `${person.name} is rooted now. They correct you from the Word sometimes, and they are right.`;
      } else if (newStage === 'mentor') {
        St.bump(state, 'rooted');
        St.bump(state, 'disciples');
        res.stageUp = `${person.name} is now discipling someone else. The fourth generation has begun.`;
      }
    }

    if (person.progress > 100) person.progress = 100;
    person.driftTimer = 0;
    return res;
  }

  /* Called each game tick. Neglected believers drift; they do not stay put. */
  function tick(state, dtSeconds, onEvent) {
    const hours = (dtSeconds * U.GAME_MINUTES_PER_REAL_SECOND) / 60;
    state.people.forEach((person) => {
      if (!['newborn', 'growing', 'rooted'].includes(person.stage)) return;

      person.driftTimer = (person.driftTimer || 0) + hours;

      const graceWindow = person.stage === 'newborn' ? 9 : person.stage === 'growing' ? 18 : 30;
      const neglected = person.driftTimer > graceWindow;

      if (neglected) {
        const decay = person.stage === 'newborn' ? 7 : person.stage === 'growing' ? 3.4 : 1.6;
        person.progress = Math.max(0, person.progress - decay * hours);
        if (person.progress <= 0 && person.stage !== 'drifting') {
          person.stage = 'drifting';
          person.driftTimer = 0;
          if (onEvent) onEvent('drift', person);
        }
      } else if (person.mentor) {
        person.progress = Math.min(100, person.progress + 0.42 * hours);
        const newStage = stageFor(person.progress);
        if (newStage !== person.stage && person.stage !== 'drifting') {
          person.stage = newStage;
          if (onEvent && (newStage === 'rooted' || newStage === 'mentor')) onEvent('mature', person);
        }
      }
    });
  }

  function roster(state) {
    return state.people
      .filter((p) => ['newborn', 'growing', 'rooted', 'mentor', 'drifting'].includes(p.stage))
      .sort((a, b) => b.progress - a.progress);
  }

  function summary(state) {
    const r = roster(state);
    const mine = playerMentees(state);
    return {
      total: r.length,
      newborn: r.filter((p) => p.stage === 'newborn').length,
      growing: r.filter((p) => p.stage === 'growing').length,
      rooted: r.filter((p) => p.stage === 'rooted').length,
      mentor: r.filter((p) => p.stage === 'mentor').length,
      drifting: r.filter((p) => p.stage === 'drifting').length,
      unmentored: unmentoredCount(state),
      yourMentees: mine.length,
      capacity: PLAYER_CAPACITY,
    };
  }

  root.Discipleship = {
    STAGES, STAGE_THRESHOLDS, CARE, CARE_LIST,
    PLAYER_MENTOR, PLAYER_CAPACITY,
    eligible, applyCare, tick, roster, summary, stageFor, mentorName, unmentoredCount, playerMentees,
  };
})(window);
