/* Post-sermon questions from listeners. Used to test doctrine, grace, and humility. */
(function (root) {
  'use strict';

  const QUESTIONS = [
    {
      id: 'q_saved',
      ask: '"If I sin again next week, am I still saved?"',
      good: {
        tone: 'truth',
        text: 'Christ\'s work is finished and your standing rests on him, not on your performance — but grace also teaches you to say no to sin.',
        doctrine: 6, compassion: 3, flag: 'gospel',
      },
      errors: [
        { tone: 'pride', text: 'Probably not — you should be further along by now.', doctrine: -6, compassion: -8, flag: 'harsh' },
        { tone: 'pride', text: 'It does not matter; God understands.', doctrine: -8, compassion: 2, flag: 'sloppy' },
      ],
    },
    {
      id: 'q_other_religions',
      ask: '"Is Jesus really the only way? That seems narrow."',
      good: {
        tone: 'truth',
        text: 'Jesus said he is the way, and the apostles preached it as good news, not gatekeeping — the door is narrow but it is open to everyone.',
        doctrine: 7, compassion: 4, flag: 'gospel',
      },
      errors: [
        { tone: 'pride', text: 'All paths lead to God, so you are fine either way.', doctrine: -9, compassion: 3, flag: 'sloppy' },
        { tone: 'pride', text: 'Only narrow-minded people ask that question.', doctrine: -3, compassion: -10, flag: 'harsh' },
      ],
    },
    {
      id: 'q_suffering',
      ask: '"Why did God let my child die?"',
      good: {
        tone: 'grace',
        text: 'I will not pretend to know. I know he is near to the brokenhearted, and I know he does not waste suffering — can I sit with you this week?',
        doctrine: 4, compassion: 8, flag: 'honest',
      },
      errors: [
        { tone: 'pride', text: 'You must have unconfessed sin in your life.', doctrine: -4, compassion: -14, flag: 'harsh' },
        { tone: 'pride', text: 'It was just their time; everything happens for a reason.', doctrine: -3, compassion: -8, flag: 'sloppy' },
      ],
    },
    {
      id: 'q_law',
      ask: '"Do I have to keep the Sabbath to be a real Christian?"',
      good: {
        tone: 'truth',
        text: 'Rest is a gift given to you, not a toll gate — the Sabbath was made for you, and Christ is the Lord of it.',
        doctrine: 7, compassion: 3, flag: 'gospel',
      },
      errors: [
        { tone: 'pride', text: 'Yes, and you should also be tithing and attending every meeting.', doctrine: -7, compassion: -8, flag: 'legal' },
        { tone: 'pride', text: 'Nothing you do matters — just be sincere.', doctrine: -8, compassion: 2, flag: 'sloppy' },
      ],
    },
    {
      id: 'q_hypocrites',
      ask: '"The church is full of hypocrites. Why should I bother?"',
      good: {
        tone: 'grace',
        text: 'You are right — it is a hospital full of sick people, and I am one of them. Come and be honest with us anyway.',
        doctrine: 4, compassion: 8, flag: 'honest',
      },
      errors: [
        { tone: 'pride', text: 'Our church is not like that; you should come to ours.', doctrine: -3, compassion: -6, flag: 'proud' },
        { tone: 'pride', text: 'You are looking for excuses. That is a heart problem.', doctrine: -2, compassion: -10, flag: 'harsh' },
      ],
    },
    {
      id: 'q_money',
      ask: '"Does God want me rich?"',
      good: {
        tone: 'truth',
        text: 'God wants you holy and generous. Money is a tool for the kingdom, and the love of it is a snare.',
        doctrine: 7, compassion: 3, flag: 'gospel',
      },
      errors: [
        { tone: 'pride', text: 'Yes — sow a gift today and watch what comes back.', doctrine: -10, compassion: -4, flag: 'sloppy' },
        { tone: 'pride', text: 'Poverty is next to godliness, so be poor gladly.', doctrine: -6, compassion: -5, flag: 'legal' },
      ],
    },
    {
      id: 'q_homosexuality',
      ask: '"My son says he is gay. What am I supposed to do?"',
      good: {
        tone: 'grace',
        text: 'Love your son enough to tell the truth and enough to stay at the table. His identity is not a debate to be won in one conversation.',
        doctrine: 5, compassion: 8, flag: 'honest',
      },
      errors: [
        { tone: 'pride', text: 'Cut him off until he changes; that is what a holy household does.', doctrine: -4, compassion: -14, flag: 'harsh' },
        { tone: 'pride', text: 'It does not matter — just affirm whatever he says.', doctrine: -9, compassion: 3, flag: 'sloppy' },
      ],
    },
    {
      id: 'q_doubt',
      ask: '"I pray and nothing happens. Is anyone listening?"',
      good: {
        tone: 'grace',
        text: 'Some of the holiest people I know prayed in the dark for years. Keep praying and let me pray with you — the silence is not absence.',
        doctrine: 4, compassion: 8, flag: 'honest',
      },
      errors: [
        { tone: 'pride', text: 'You are not praying with enough faith. Try harder.', doctrine: -3, compassion: -12, flag: 'harsh' },
        { tone: 'pride', text: 'Maybe God is not what you think he is.', doctrine: -8, compassion: -2, flag: 'sloppy' },
      ],
    },
    {
      id: 'q_hell',
      ask: '"Would a loving God really send people to hell?"',
      good: {
        tone: 'truth',
        text: 'The God who warns is the same God who went to a cross to prevent it. He does not delight in death — that is why he sent his Son.',
        doctrine: 8, compassion: 4, flag: 'gospel',
      },
      errors: [
        { tone: 'pride', text: 'Yes, and most of this town is headed there.', doctrine: -2, compassion: -12, flag: 'harsh' },
        { tone: 'pride', text: 'No, a loving God would never do that; you can relax.', doctrine: -10, compassion: 3, flag: 'sloppy' },
      ],
    },
    {
      id: 'q_depression',
      ask: '"I cannot get out of bed some mornings. Is that sin?"',
      good: {
        tone: 'grace',
        text: 'Not necessarily. Some wounds are in the body, not only the soul. Let us find you help and walk with you while you get it.',
        doctrine: 3, compassion: 9, flag: 'honest',
      },
      errors: [
        { tone: 'pride', text: 'Yes — you need to repent of laziness.', doctrine: -2, compassion: -14, flag: 'harsh' },
        { tone: 'pride', text: 'Just claim the joy verses and it will lift by Friday.', doctrine: -4, compassion: -6, flag: 'sloppy' },
      ],
    },
    {
      id: 'q_canon',
      ask: '"Who decided which books got into the Bible?"',
      good: {
        tone: 'truth',
        text: 'The church recognized the books that carried apostolic authority and bore witness to Christ — recognized, not invented. I would be glad to walk through it with you.',
        doctrine: 9, compassion: 2, flag: 'gospel',
      },
      errors: [
        { tone: 'pride', text: 'A king picked them at random, so do not worry about it.', doctrine: -12, compassion: 0, flag: 'sloppy' },
        { tone: 'pride', text: 'That question is a distraction from the gospel.', doctrine: -2, compassion: -8, flag: 'harsh' },
      ],
    },
    {
      id: 'q_works',
      ask: '"If faith saves me, why should I do anything good?"',
      good: {
        tone: 'truth',
        text: 'You are saved by grace and saved for good works — they are the fruit, not the root, of your standing.',
        doctrine: 8, compassion: 3, flag: 'gospel',
      },
      errors: [
        { tone: 'pride', text: 'You do not need to; grace covers it all.', doctrine: -9, compassion: 2, flag: 'sloppy' },
        { tone: 'pride', text: 'You should be working harder than you are.', doctrine: -5, compassion: -7, flag: 'legal' },
      ],
    },
  ];

  /* Listener archetypes used to generate a crowd for a sermon. */
  const LISTENERS = [
    { id: 'curious', label: 'Curious', base: 0.42, color: '#8fb8c9' },
    { id: 'hurting', label: 'Hurting', base: 0.5, color: '#c96a7a' },
    { id: 'skeptic', label: 'Skeptic', base: 0.26, color: '#b98a5a' },
    { id: 'religious', label: 'Religious', base: 0.34, color: '#7ea9c9' },
    { id: 'seeker', label: 'Seeker', base: 0.55, color: '#a9d0a9' },
    { id: 'mocker', label: 'Mocker', base: 0.14, color: '#9a86c4' },
  ];

  root.Questions = { QUESTIONS, LISTENERS };
})(window);
