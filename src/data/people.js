/* Townspeople: names, visible needs, and the counseling encounters for each need. */
(function (root) {
  'use strict';

  const FIRST = ['Miriam', 'Tobias', 'Elena', 'Cyrus', 'Naomi', 'Darius', 'Hannah', 'Silas', 'Ruth', 'Amos',
    'Priya', 'Jonah', 'Ada', 'Marcus', 'Leah', 'Oren', 'Sofia', 'Eli', 'Tamar', 'Nadia', 'Boaz', 'Iris',
    'Keziah', 'Roman', 'Delia', 'Asher', 'Mira', 'Judah', 'Clara', 'Nate', 'Esther', 'Ivo', 'Rosalind',
    'Caleb', 'Yara', 'Phineas', 'Abigail', 'Tomas', 'Selah', 'Gideon'];
  const LAST = ['Vance', 'Okonkwo', 'Hale', 'Bright', 'Mercer', 'Adeyemi', 'Stone', 'Quill', 'Ramos',
    'Whitfield', 'Novak', 'Baptiste', 'Kaur', 'Lindqvist', 'Osei', 'Ferrer', 'Mbeki', 'Sato', 'Brenner',
    'Achterberg', 'Duarte', 'Nakamura', 'Kovacs', 'Ibarra', 'Thorne'];

  const NEEDS = {
    grief: { label: 'Grief', icon: '\u2665', color: '#c96a7a', blurb: 'Loss has hollowed them out. They need presence before answers.' },
    pride: { label: 'Pride', icon: '\u265B', color: '#d8a94a', blurb: 'They are winning arguments and losing ground. Truth must be carried gently.' },
    deception: { label: 'Deception', icon: '\u25CE', color: '#9a86c4', blurb: 'They believe something false and are building a life on it.' },
    legality: { label: 'Religious Legalism', icon: '\u2696', color: '#7ea9c9', blurb: 'Rule-keeping has become their righteousness and their prison.' },
    addiction: { label: 'Addiction', icon: '\u26B2', color: '#8c9a5a', blurb: 'Something owns them. Shame keeps them hiding.' },
    fear: { label: 'Fear', icon: '\u26A0', color: '#b98a5a', blurb: 'They are bracing for a blow that has not come.' },
  };

  /* Each encounter is a short sequence of steps. Choices carry effects and flags;
     the resolver in systems/encounters.js reads those flags to decide outcomes. */
  const ENCOUNTERS = {
    grief: {
      open: 'They are holding a folded paper. It looks like a hospital bill and a funeral notice, folded together.',
      steps: [
        {
          ask: 'They have not looked up. What do you do first?',
          choices: [
            { tone: 'wise', text: 'Sit down beside them and say nothing for a while.', effects: { compassion: 5, rapport: 12 }, flag: 'listened', result: 'The silence is not empty. After a minute they start talking, and the words come out crooked and real.' },
            { tone: 'truth', text: 'Open with a verse about joy coming in the morning.', effects: { rapport: -8, doctrine: 1 }, result: 'They nod politely and fold the paper a little tighter. The verse was true and the timing was wrong.' },
            { tone: 'pride', text: 'Tell them everything happens for a reason and they should be grateful.', effects: { compassion: -8, rapport: -16, burnout: 2 }, flag: 'harsh', result: 'Their jaw sets. "Grateful," they repeat, and the word lands like a stone.' },
          ],
        },
        {
          ask: 'They say, "I keep expecting him to come through the door." What is the real need here?',
          choices: [
            { tone: 'wise', text: 'Name it: this is grief, not a lack of faith.', effects: { compassion: 6, doctrine: 4 }, flag: 'discerned', result: 'You say it plainly. They exhale, as if permission had been granted to be sad.' },
            { tone: 'truth', text: 'Correct their expectation — he is gone, they must accept it.', effects: { compassion: -6, rapport: -10 }, result: 'True, and useless. Grief does not get argued out of the room.' },
            { tone: 'grace', text: 'Ask what he was like, and let them tell you for a while.', effects: { compassion: 8, rapport: 14 }, flag: 'listened', result: 'They talk for ten minutes. You learn his name was Samuel and he laughed at his own jokes.' },
          ],
        },
        {
          ask: 'They ask the hard one: "Where was God when it happened?"',
          choices: [
            { tone: 'truth', text: 'Read Psalm 34:18 — near to the brokenhearted — and let it stand without a lecture.', effects: { doctrine: 8, compassion: 4, rapport: 10 }, flag: 'gospel', result: '"The Lord is near to the brokenhearted." You read it twice. The second time, they finish it with you.' },
            { tone: 'pride', text: 'Explain the sovereignty of God in a way that settles the argument.', effects: { doctrine: 4, compassion: -8, rapport: -14, burnout: 2 }, flag: 'harsh', result: 'You win the logic and lose the person. They thank you and stand up to leave.' },
            { tone: 'grace', text: 'Admit you do not know, and say you will not pretend to.', effects: { compassion: 7, rapport: 9, doctrine: -2 }, flag: 'honest', result: '"I don\'t know," you say. "But I know he is not indifferent." They stay.' },
          ],
        },
      ],
    },

    pride: {
      open: 'He is mid-argument with two neighbors and looks delighted to have an audience.',
      steps: [
        {
          ask: 'He turns to you: "You\'re the preacher. Settle this." What do you do?',
          choices: [
            { tone: 'wise', text: 'Ask him to explain his position first, fully, without interruption.', effects: { compassion: 4, doctrine: 3, rapport: 8 }, flag: 'listened', result: 'He talks for four minutes. Halfway through, you hear the real question underneath the argument.' },
            { tone: 'truth', text: 'Answer the argument with a sharper argument.', effects: { doctrine: 6, compassion: -5, rapport: -6, burnout: 2 }, flag: 'argued', result: 'You out-argue him in front of his neighbors. His face closes like a shop shutter.' },
            { tone: 'pride', text: 'Tell the crowd he is proud and needs to repent.', effects: { compassion: -12, rapport: -20, burnout: 4 }, flag: 'harsh', result: 'The crowd goes quiet in the bad way. He laughs, but his hands are shaking.' },
          ],
        },
        {
          ask: 'Underneath the argument you hear, "I am afraid of being wrong in front of people." What now?',
          choices: [
            { tone: 'wise', text: 'Take him aside, out of the crowd, and speak to him as a man not a case.', effects: { compassion: 7, rapport: 12 }, flag: 'discerned', result: 'Off to the side he gets smaller and more honest. "I don\'t like looking stupid," he admits.' },
            { tone: 'truth', text: 'Keep pressing the point in front of everyone.', effects: { doctrine: 4, rapport: -14, compassion: -6 }, flag: 'argued', result: 'You are right. He will remember that you were right, and he will not come back.' },
            { tone: 'grace', text: 'Say, "I have been wrong in public too, and it cost me less than I feared."', effects: { compassion: 8, rapport: 11, humility: 2 }, result: 'He blinks. Vulnerability from you disarms him faster than any rebuttal.' },
          ],
        },
        {
          ask: 'He asks, "So what do I actually need to do?"',
          choices: [
            { tone: 'truth', text: 'Point him to repentance and the cross — pride is the thing Christ came to break.', effects: { doctrine: 9, compassion: 4, rapport: 10 }, flag: 'gospel', result: '"God opposes the proud but gives grace to the humble." You say it to yourself first, then to him.' },
            { tone: 'pride', text: 'Tell him he needs to be more like you.', effects: { compassion: -12, burnout: 5, rapport: -18 }, flag: 'harsh', result: 'The words leave your mouth and you hear them from outside yourself. That is not what you meant to say.' },
            { tone: 'wise', text: 'Invite him to read James 4 with you this week.', effects: { doctrine: 6, rapport: 8 }, flag: 'invite', result: 'He agrees, mostly to save face. But he agrees.' },
          ],
        },
      ],
    },

    deception: {
      open: 'She is handing out pamphlets about a teacher who says the resurrection was only a metaphor.',
      steps: [
        {
          ask: 'She offers you a pamphlet. What do you do?',
          choices: [
            { tone: 'wise', text: 'Take it, read a page, and ask her what drew her to this.', effects: { compassion: 4, doctrine: 5, rapport: 9 }, flag: 'listened', result: 'She is not hostile. She is hungry, and someone fed her something sweet and thin.' },
            { tone: 'pride', text: 'Refuse it and call it heresy on the spot.', effects: { compassion: -10, rapport: -16, burnout: 2 }, flag: 'harsh', result: 'She has heard that word used as a weapon before. She stops listening immediately.' },
            { tone: 'truth', text: 'Take it and say you will compare it to the text itself.', effects: { doctrine: 7, rapport: 4 }, result: '"Good," she says. "Nobody else will even read it." That is a door, barely open.' },
          ],
        },
        {
          ask: 'She says the bodily resurrection was added later by the church. What is happening?',
          choices: [
            { tone: 'wise', text: 'Recognize this as deception — a false claim, not a sincere question.', effects: { doctrine: 8, compassion: 3 }, flag: 'discerned', result: 'You can see the shape of it now: not a doubt looking for light, but a story she has been handed.' },
            { tone: 'truth', text: 'Argue the dating of 1 Corinthians 15 at her.', effects: { doctrine: 5, compassion: -4, rapport: -8 }, flag: 'argued', result: 'Facts bounce off a heart that has not been heard yet.' },
            { tone: 'grace', text: 'Ask what would change if the tomb really were empty.', effects: { compassion: 6, doctrine: 4, rapport: 10 }, flag: 'listened', result: 'She pauses. "Then everything would change," she says slowly. "That\'s the problem."' },
          ],
        },
        {
          ask: 'She is quiet now. What do you offer?',
          choices: [
            { tone: 'truth', text: 'Open 1 Corinthians 15 with her, verse by verse, and let Paul answer.', effects: { doctrine: 11, compassion: 4, rapport: 9 }, flag: 'gospel', result: 'You read "if Christ has not been raised, your faith is futile." She reads the next verse aloud herself.' },
            { tone: 'pride', text: 'Tell her she has been deceived by wolves and should be ashamed.', effects: { compassion: -10, rapport: -18, burnout: 3 }, flag: 'harsh', result: 'She folds the pamphlet, stands up, and goes to hand it to someone else.' },
            { tone: 'wise', text: 'Offer to study the resurrection accounts with her over two weeks.', effects: { doctrine: 6, rapport: 7 }, flag: 'invite', result: 'She says she will come if you really mean it. You write down the day.' },
          ],
        },
      ],
    },

    legality: {
      open: 'He is counting the minutes of the service on his watch and looks exhausted and righteous at once.',
      steps: [
        {
          ask: 'He tells you he has not missed a meeting in nine years. What do you hear?',
          choices: [
            { tone: 'wise', text: 'Hear the exhaustion under the record and ask how his soul is.', effects: { compassion: 6, rapport: 11 }, flag: 'listened', result: 'His watch hand stops. "Nobody has asked me that," he says, "in about nine years."' },
            { tone: 'truth', text: 'Affirm his diligence and encourage him to do more.', effects: { compassion: -6, burnout: 3, rapport: 3 }, flag: 'harsh', result: 'He straightens up, and something in him gets a little harder and a little more tired.' },
            { tone: 'grace', text: 'Ask what he is afraid would happen if he rested.', effects: { compassion: 7, doctrine: 3, rapport: 9 }, flag: 'discerned', result: 'He is quiet a long time. "That I\'d find out I\'m not actually accepted," he says.' },
          ],
        },
        {
          ask: 'He admits he is afraid God is disappointed in him. What is the need?',
          choices: [
            { tone: 'wise', text: 'Name it: this is legalism, not devotion.', effects: { doctrine: 7, compassion: 5 }, flag: 'discerned', result: 'You say the word gently and he flinches, then nods. He has suspected it for years.' },
            { tone: 'pride', text: 'Tell him his problem is that he is not trying hard enough.', effects: { compassion: -11, rapport: -16, burnout: 3 }, flag: 'harsh', result: 'You have just handed a drowning man a heavier coat.' },
            { tone: 'truth', text: 'Remind him that obedience matters and feelings are unreliable.', effects: { doctrine: 4, compassion: -4, rapport: -6 }, result: 'All true. None of it touches the wound.' },
          ],
        },
        {
          ask: 'He asks how to be sure he is accepted. What do you say?',
          choices: [
            { tone: 'truth', text: 'Read Matthew 11:28-30 — the yoke is easy, the burden is light.', effects: { doctrine: 9, compassion: 6, rapport: 11 }, flag: 'gospel', result: 'He takes the paper and reads it three times. "Easy," he says, like a foreign word.' },
            { tone: 'pride', text: 'Tell him he needs to get his act together first.', effects: { compassion: -10, rapport: -14, burnout: 2 }, flag: 'harsh', result: 'He nods, thanks you, and goes back to counting minutes.' },
            { tone: 'wise', text: 'Ask him to spend one hour this week doing nothing but resting in Christ.', effects: { compassion: 5, doctrine: 5, rapport: 8 }, flag: 'invite', result: 'He writes it in his planner, which is somehow the saddest and most hopeful thing you have seen all week.' },
          ],
        },
      ],
    },

    addiction: {
      open: 'He smells of the tavern and will not meet your eyes. His hands are not steady.',
      steps: [
        {
          ask: 'He steps back as you approach. What do you do?',
          choices: [
            { tone: 'wise', text: 'Keep your distance, keep your voice low, and ask if he has eaten.', effects: { compassion: 8, rapport: 12 }, flag: 'served', result: 'He blinks. "Eaten?" You buy him a meal. He eats like a man who has not been seen in months.' },
            { tone: 'truth', text: 'Tell him plainly that drunkenness is sin and he must stop.', effects: { doctrine: 3, compassion: -7, rapport: -12 }, flag: 'harsh', result: 'He already knows. Shame is not the missing information.' },
            { tone: 'pride', text: 'Point out how he is destroying his family.', effects: { compassion: -12, rapport: -18, burnout: 3 }, flag: 'harsh', result: 'He turns away hard. You have confirmed the voice he already hears every night.' },
          ],
        },
        {
          ask: 'He says, "You don\'t know what I\'ve done." What is the real need?',
          choices: [
            { tone: 'wise', text: 'Name it: this is captivity wearing shame as a mask.', effects: { compassion: 6, doctrine: 4 }, flag: 'discerned', result: '"I know what it is to be owned by something," you say. He looks up for the first time.' },
            { tone: 'grace', text: 'Tell him you have done things you would not say out loud either.', effects: { compassion: 9, rapport: 14, humility: 2 }, result: 'He laughs, ugly and short, and then his face breaks. That is the door.' },
            { tone: 'truth', text: 'Tell him the blood of Christ covers it, then move on quickly.', effects: { doctrine: 5, compassion: 0, rapport: 2 }, result: 'True and too fast. He nods and the wall goes back up.' },
          ],
        },
        {
          ask: 'He asks if God could want him after all this.',
          choices: [
            { tone: 'truth', text: 'Read Luke 15:20 — the father ran.', effects: { doctrine: 8, compassion: 8, rapport: 12 }, flag: 'gospel', result: '"While he was still far off." He puts his hand over his mouth and does not take it away.' },
            { tone: 'pride', text: 'Warn him that he must clean up first, then come to God.', effects: { compassion: -10, rapport: -14, burnout: 2 }, flag: 'harsh', result: 'He nods and walks into the tavern. The door swings twice.' },
            { tone: 'wise', text: 'Offer to walk with him this week and find him honest work.', effects: { compassion: 7, doctrine: 3, rapport: 10 }, flag: 'invite', result: 'He says yes, then asks if you will still say yes tomorrow. You say yes.' },
          ],
        },
      ],
    },

    fear: {
      open: 'She keeps looking over her shoulder at the road, and her knuckles are white on a small bag.',
      steps: [
        {
          ask: 'She startles when you speak. How do you begin?',
          choices: [
            { tone: 'wise', text: 'Step back, show your hands, and speak slowly and quietly.', effects: { compassion: 7, rapport: 13 }, flag: 'listened', result: 'She lets out a breath. "Sorry," she says. "I\'m sorry." You tell her she has nothing to apologize for.' },
            { tone: 'truth', text: 'Tell her that fear is a sin and she should trust God.', effects: { compassion: -8, rapport: -14 }, flag: 'harsh', result: 'She nods and starts edging toward the road. You have just added a debt to her terror.' },
            { tone: 'pride', text: 'Tell her she is being dramatic.', effects: { compassion: -12, rapport: -18, burnout: 3 }, flag: 'harsh', result: 'She goes still in a way that is worse than crying.' },
          ],
        },
        {
          ask: 'She admits she has not slept in four nights. What is the need?',
          choices: [
            { tone: 'wise', text: 'Name it: fear, and the exhaustion that fear leaves behind.', effects: { compassion: 6, doctrine: 3 }, flag: 'discerned', result: 'You name both, and she looks at you like someone finally read the label on her.' },
            { tone: 'grace', text: 'Ask what specifically she is afraid of, and write it down.', effects: { compassion: 7, rapport: 10 }, flag: 'listened', result: 'She lists four things. Three of them you can help with before sundown.' },
            { tone: 'truth', text: 'Give her three verses and send her home to claim them.', effects: { doctrine: 4, compassion: -3, rapport: -4 }, result: 'Verses are good seed. They still need soil, and hers is frozen.' },
          ],
        },
        {
          ask: 'She asks, "What if it happens anyway?"',
          choices: [
            { tone: 'truth', text: 'Read Isaiah 41:10 — "fear not, for I am with you" — and stay with her while she hears it.', effects: { doctrine: 9, compassion: 7, rapport: 12 }, flag: 'gospel', result: '"I am with you." She repeats it. Then she asks if you will pray now, out loud, in the street.' },
            { tone: 'pride', text: 'Tell her that if she had more faith she would not be afraid.', effects: { compassion: -11, rapport: -16, burnout: 3 }, flag: 'harsh', result: 'She takes her bag and goes. The street is emptier for it.' },
            { tone: 'wise', text: 'Help her make a practical plan for tonight — a safe place to sleep.', effects: { compassion: 8, rapport: 11 }, flag: 'served', result: 'You find her a room with a widow from the fellowship. Fear shrinks when the night has a door that locks.' },
          ],
        },
      ],
    },
  };

  function makePerson(id, rng, need, x, y) {
    const r = rng || Math.random;
    const first = FIRST[Math.floor(r() * FIRST.length)];
    const last = LAST[Math.floor(r() * LAST.length)];
    return {
      id,
      name: `${first} ${last}`,
      need,
      x, y,
      openness: 24 + Math.floor(r() * 22),
      stage: 'seeker',
      met: false,
      resolved: false,
      ignored: 0,
      driftTimer: 0,
      progress: 0,
      mentor: null,
      bornDay: null,
      lastOutcome: null,
    };
  }

  root.PeopleData = { FIRST, LAST, NEEDS, ENCOUNTERS, makePerson };
})(window);
