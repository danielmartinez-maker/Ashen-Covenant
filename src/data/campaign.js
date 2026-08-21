export const CHOIR_SEALS = ['golden-choir', 'ashen-choir', 'hollow-choir'];
export const CHOIR_VERDICTS = ['bind-choir', 'sever-choir'];

export const CAMPAIGN_CHAPTERS = [
  {
    id: 'chapter-one',
    number: 'I',
    title: 'The Bell-Broken Road',
    summary: 'A covenant is sworn beneath the broken arches of Ashen Sanctuary. The first toll comes from Gravewake, where the dead have begun to answer a bell with no hand upon its rope.',
    artwork: '/assets/campaign/chapter-one-keyart.png',
    stages: [
      { id: 'meet-maelin', title: 'A Covenant Remembered', detail: 'Speak with Sister Maelin at the Sanctuary Gate.', total: 1 },
      { id: 'reach-waystone', title: 'Out onto the Road', detail: 'Follow the cinder road to the Gravewake Waystone.', total: 1 },
      { id: 'clear-bell-risen', title: 'The Dead Answer', detail: 'Defeat the bell-risen gathered at the waystone.', total: 8 },
      { id: 'defeat-bell-witness', title: 'The Broken Toll', detail: 'Defeat the Bell-Witness before it calls the field to war.', total: 1 },
      { id: 'return-maelin', title: 'A Voice Beneath the Bell', detail: 'Return to Sister Maelin in Ashen Sanctuary.', total: 1 },
      { id: 'chapter-one-complete', title: 'The Road East', detail: 'Chapter I complete. Sister Maelin can now prepare the road to Bellscar.', total: 1 }
    ]
  },
  {
    id: 'chapter-two',
    number: 'II',
    title: 'The Bellscar Citadel',
    summary: 'The citadel is not simply a fortress. It is a choir kept alive beneath a shattered bell, and its three seals are still teaching the dead how to answer.',
    artwork: '/assets/campaign/chapter-two-keyart.png',
    stages: [
      { id: 'maelin-bellscar-briefing', title: 'The Name of the Bell', detail: 'Speak with Sister Maelin about the road that has opened east.', total: 1 },
      { id: 'enter-bellscar', title: 'Through the Scar', detail: 'Cross the Bellscar Gate and enter the drowned cathedral road.', total: 1 },
      { id: 'break-choir-seals', title: 'Silence the Three Choirs', detail: 'Break the Golden, Ashen, and Hollow Choir seals in any order.', total: 3 },
      { id: 'choose-the-toll', title: 'The Names That Remain', detail: 'At the Reliquary of Names, decide what becomes of the captive choir.', total: 1 },
      { id: 'defeat-tolling-abbot', title: 'Rath Vell, Tolling Abbot', detail: 'Enter the bell vault and stop Rath Vell before the final toll.', total: 1 },
      { id: 'return-maelin-two', title: 'After the Toll', detail: 'Return to Sister Maelin with the truth of Bellscar.', total: 1 },
      { id: 'chapter-two-complete', title: 'An Unquiet Silence', detail: 'Chapter II complete. The Broken Choir has left its mark on the covenant.', total: 1 }
    ]
  },
  {
    id: 'chapter-three',
    number: 'III',
    title: 'The Blood Beneath Redfen',
    summary: 'Bellscar’s silence exposes an older pulse beneath the Redfen. Three feeding sigils are turning drowned memory into a body for Avarra, the last Blood Matron.',
    artwork: '/assets/terrain/redfen-v2.png',
    stages: [
      { id: 'maelin-redfen-briefing', title: 'A Pulse in the Mire', detail: 'Speak with Sister Maelin about the blood rising west of Bellscar.', total: 1 },
      { id: 'enter-redfen', title: 'Open the Scarlet Sluice', detail: 'Cross the Redfen gate and enter the deep mire.', total: 1 },
      { id: 'break-blood-sigils', title: 'Starve the Rootmother', detail: 'Break the Bloodreed, Drowned Parish, and Rootmother sigils.', total: 3 },
      { id: 'defeat-blood-matron', title: 'Avarra, Blood Matron', detail: 'Enter Rootmother Basin and stop Avarra’s rebirth.', total: 1 },
      { id: 'return-maelin-three', title: 'Blood Without a Bell', detail: 'Return to Sister Maelin with Avarra’s severed root.', total: 1 },
      { id: 'chapter-three-complete', title: 'The Mire Exhales', detail: 'Chapter III complete. Cairnreach has begun moving its dead armies again.', total: 1 }
    ]
  },
  {
    id: 'chapter-four',
    number: 'IV',
    title: 'The Crownless Siege',
    summary: 'Cairnreach was built to survive any siege. Its dead regent has decided survival requires marching the fortress itself against Ashen Sanctuary.',
    artwork: '/assets/terrain/cairnreach-v2.png',
    stages: [
      { id: 'maelin-cairn-briefing', title: 'A Fortress in Motion', detail: 'Speak with Sister Maelin about the chains sounding beneath Cairnreach.', total: 1 },
      { id: 'enter-cairnreach', title: 'Cross the Broken Rampart', detail: 'Enter Cairnreach along the siege road.', total: 1 },
      { id: 'break-war-standards', title: 'Break the Three Commands', detail: 'Destroy the West, Foundry, and Crownless war standards.', total: 3 },
      { id: 'defeat-chain-regent', title: 'Odran, Chain Regent', detail: 'Reach the buried throne and end the crownless siege.', total: 1 },
      { id: 'return-maelin-four', title: 'The Last Wall Holds', detail: 'Return to Sister Maelin with the regent’s broken command chain.', total: 1 },
      { id: 'chapter-four-complete', title: 'Cairnreach Kneels', detail: 'Chapter IV complete. The Veiled Road has opened a fifth path into the world.', total: 1 }
    ]
  },
  {
    id: 'chapter-five',
    number: 'V',
    title: 'The Fifth Road',
    summary: 'A road hidden behind every other road is rewriting where the covenant has been. Noxara, its oracle, intends to erase Ashen Sanctuary from every possible route.',
    artwork: '/assets/terrain/veiled-road-v2.png',
    stages: [
      { id: 'maelin-veiled-briefing', title: 'A Map with Five Edges', detail: 'Speak with Sister Maelin about the road appearing inside the sanctuary maps.', total: 1 },
      { id: 'enter-veiled-road', title: 'Step Behind the Mirror', detail: 'Cross Mirror Verge and enter the Fifth Road.', total: 1 },
      { id: 'close-veil-anchors', title: 'Close the Roads That Should Not Be', detail: 'Close the Mirror, Courier, and Moonless anchors.', total: 3 },
      { id: 'defeat-veiled-oracle', title: 'Noxara, Oracle of the Fifth Road', detail: 'Enter the Oracle’s Mirror and preserve the road home.', total: 1 },
      { id: 'return-maelin-five', title: 'A Road Remembered', detail: 'Return to Sister Maelin before the surviving path closes.', total: 1 },
      { id: 'chapter-five-complete', title: 'The Covenant Endures', detail: 'Chapter V complete. The full broken world and its deepest endgame are open.', total: 1 }
    ]
  }
];

export const EXPANSION_ACTS = {
  'chapter-three': {
    firstStage: 'maelin-redfen-briefing', enterStage: 'enter-redfen', nodeStage: 'break-blood-sigils', bossStage: 'defeat-blood-matron', returnStage: 'return-maelin-three', completeStage: 'chapter-three-complete',
    gateId: 'redfen-gate', nodeIds: ['blood-sigil-reed', 'blood-sigil-parish', 'blood-sigil-root'], bossLandmarkId: 'blood-matron-lair', bossId: 'bloodmatron', bossCampaignId: 'chapter-three-boss',
    factionId: 'mirebound', rewardSourceId: 'redfen',
    openingDialogue: 'chapter-three-opening', briefingDialogue: 'maelin-redfen-briefing', gateDialogue: 'redfen-gate', nodeDialogue: 'blood-sigil-cleared', bossDialogue: 'blood-matron-arrives', fallDialogue: 'blood-matron-falls', returnDialogue: 'maelin-return-three',
    formations: {
      'blood-sigil-reed': ['bloodleech', 'bloodleech', 'reedstalker', 'fenwitch', 'mireling'],
      'blood-sigil-parish': ['drownedoracle', 'boghulk', 'bloodleech', 'ashbow', 'fenwitch'],
      'blood-sigil-root': ['boghulk', 'reedstalker', 'reedstalker', 'drownedoracle', 'fenwitch']
    }
  },
  'chapter-four': {
    firstStage: 'maelin-cairn-briefing', enterStage: 'enter-cairnreach', nodeStage: 'break-war-standards', bossStage: 'defeat-chain-regent', returnStage: 'return-maelin-four', completeStage: 'chapter-four-complete',
    gateId: 'cairnreach-gate', nodeIds: ['cairn-standard-west', 'cairn-standard-foundry', 'cairn-standard-crown'], bossLandmarkId: 'chain-regent-throne', bossId: 'chainregent', bossCampaignId: 'chapter-four-boss',
    factionId: 'cairn-compact', rewardSourceId: 'cairnreach',
    openingDialogue: 'chapter-four-opening', briefingDialogue: 'maelin-cairn-briefing', gateDialogue: 'cairnreach-gate', nodeDialogue: 'war-standard-cleared', bossDialogue: 'chain-regent-arrives', fallDialogue: 'chain-regent-falls', returnDialogue: 'maelin-return-four',
    formations: {
      'cairn-standard-west': ['ironwraith', 'ironwraith', 'siegeherald', 'chainmarshal', 'cairnguard'],
      'cairn-standard-foundry': ['ashsmith', 'ossuarybehemoth', 'siegeherald', 'cinderbrute', 'ironwraith'],
      'cairn-standard-crown': ['chainmarshal', 'chainmarshal', 'ironwraith', 'siegeherald', 'wardeater']
    }
  },
  'chapter-five': {
    firstStage: 'maelin-veiled-briefing', enterStage: 'enter-veiled-road', nodeStage: 'close-veil-anchors', bossStage: 'defeat-veiled-oracle', returnStage: 'return-maelin-five', completeStage: 'chapter-five-complete',
    gateId: 'veiled-road-gate', nodeIds: ['veil-anchor-mirror', 'veil-anchor-letter', 'veil-anchor-moon'], bossLandmarkId: 'oracle-mirror', bossId: 'veiledoracle', bossCampaignId: 'chapter-five-boss',
    factionId: 'veil-couriers', rewardSourceId: 'veiled-road',
    openingDialogue: 'chapter-five-opening', briefingDialogue: 'maelin-veiled-briefing', gateDialogue: 'veiled-road-gate', nodeDialogue: 'veil-anchor-cleared', bossDialogue: 'veiled-oracle-arrives', fallDialogue: 'veiled-oracle-falls', returnDialogue: 'maelin-return-five',
    formations: {
      'veil-anchor-mirror': ['mirrorwisp', 'mirrorwisp', 'veilblade', 'maskedoracle', 'nullpriest'],
      'veil-anchor-letter': ['riftmother', 'veilblade', 'veilblade', 'mirrorwisp', 'gallowscrow'],
      'veil-anchor-moon': ['maskedoracle', 'nullpriest', 'riftmother', 'riftstalker', 'mirrorwisp']
    }
  }
};

export const CAMPAIGN_DIALOGUES = {
  'chapter-one-opening': {
    speaker: 'The Ashen Road',
    title: 'Chapter I · The Bell-Broken Road',
    lines: [
      'The first bell was broken before anyone could remember who had rung it.',
      'Still, every dawn, the fields beyond the sanctuary answer with a toll.',
      'Two oaths have answered the road. Let them learn what is calling.'
    ]
  },
  'maelin-briefing': {
    speaker: 'Sister Maelin',
    title: 'Keeper of the Ashen Gate',
    lines: [
      'Gravewake was a road for mourners before the bell taught the dead to march.',
      'Reach the old waystone. If the field answers you, do not let it finish the hymn.'
    ]
  },
  'waystone-awakens': {
    speaker: 'The Bell-Witness',
    title: 'At the Gravewake Waystone',
    lines: [
      'The stone remembers the names buried beneath it.',
      'Their chains pull tight. The bell-risen are already coming.'
    ]
  },
  'witness-arrives': {
    speaker: 'The Bell-Witness',
    title: 'The Broken Toll',
    lines: [
      'No pilgrim leaves the field without paying in breath.',
      'Kneel, oathbound. Let the road close over you.'
    ]
  },
  'witness-falls': {
    speaker: 'The Ashen Road',
    title: 'The Toll Falls Silent',
    lines: [
      'For one breath, the fields are quiet.',
      'A second voice stirs farther east—older, deeper, and still beneath the shattered bell.'
    ]
  },
  'maelin-return': {
    speaker: 'Sister Maelin',
    title: 'A Road Opened',
    lines: [
      'You broke the witness, but not the will behind it.',
      'Bellscar has heard your names. When you are ready, come to me. The gate will not open for uncertainty.'
    ]
  },
  'chapter-two-opening': {
    speaker: 'The Bellscar Citadel',
    title: 'Chapter II · The Bellscar Citadel',
    lines: [
      'A citadel can keep a city safe. Bellscar was built to keep a promise trapped.',
      'Three choirs hold the promise in place. One abbot teaches it how to speak.',
      'The road has opened. What it asks of you will not be answered with steel alone.'
    ]
  },
  'maelin-bellscar-briefing': {
    speaker: 'Sister Maelin',
    title: 'The Name of the Bell',
    lines: [
      'Rath Vell was the last abbot of Bellscar. He found a way to make devotion survive death, then called it mercy.',
      'The three choir seals keep his congregation bound to the bell. Break them, and the citadel can no longer borrow their voices.',
      'Go carefully. Some of those names belonged to people who were once ours.'
    ]
  },
  'bellscar-gate': {
    speaker: 'The Gatewarden',
    title: 'Through the Scar',
    lines: [
      'The first seal is gold, for obedience. The second is ash, for grief. The third is hollow, for all that has been forgotten.',
      'Break any order you like. The bell will remember the order you chose.'
    ]
  },
  'choir-seal-cleared': {
    speaker: 'The Broken Choir',
    title: 'A Seal Falls',
    lines: [
      'A note goes missing from the hymn.',
      'The bell stutters. Somewhere inside the citadel, the abbot hears you coming.'
    ]
  },
  'reliquary-awakens': {
    speaker: 'The Reliquary of Names',
    title: 'The Names That Remain',
    lines: [
      'The choir is bound, but not gone. Each name waits for a final hand.',
      'Bind them into a living ward, or sever them from the bell and let their last breath become a weapon.'
    ]
  },
  'abbot-arrives': {
    speaker: 'Rath Vell',
    title: 'The Tolling Abbot',
    lines: [
      'You did not free them. You made them quiet enough to hear their fear.',
      'Come closer, oathbound. I will teach your two promises to ring as one.'
    ]
  },
  'abbot-falls': {
    speaker: 'The Broken Choir',
    title: 'The Bell Is Answered',
    lines: [
      'The abbot falls. The bell does not.',
      'For the first time in years, the choir is allowed to choose its own silence.'
    ]
  },
  'maelin-return-two': {
    speaker: 'Sister Maelin',
    title: 'After the Toll',
    lines: [
      'Bellscar will never be innocent, but it may be quiet enough for the living to enter again.',
      'Keep what the choir gave you. The road beyond the citadel is listening now.'
    ]
  },
  'chapter-three-opening': {
    speaker: 'The Redfen',
    title: 'Chapter III · The Blood Beneath Redfen',
    lines: [
      'When the bell falls quiet, older things hear the space it leaves behind.',
      'The Redfen has found a heartbeat beneath its roots.',
      'Three sigils are feeding it memory. A matron is teaching that memory to stand.'
    ]
  },
  'maelin-redfen-briefing': {
    speaker: 'Sister Maelin',
    title: 'A Pulse in the Mire',
    lines: [
      'Avarra kept the old blood rites before Bellscar was built. The abbots buried her work beneath the floodgates.',
      'Break the three feeding sigils. If even one remains, the mire will grow her another body.'
    ]
  },
  'redfen-gate': {
    speaker: 'The Scarlet Sluice',
    title: 'Open the Deep Mire',
    lines: [
      'The floodgate opens against the current.',
      'Something beneath the water answers with a second heartbeat.'
    ]
  },
  'blood-sigil-cleared': {
    speaker: 'Rootmother Basin',
    title: 'A Feeding Root Is Cut',
    lines: [
      'The sigil collapses into red water.',
      'Farther east, Avarra screams through every root still attached to her name.'
    ]
  },
  'blood-matron-arrives': {
    speaker: 'Avarra',
    title: 'The Blood Matron',
    lines: [
      'You brought two oaths into my water and expected the mire not to taste them.',
      'Come closer. I have grown bodies for promises stronger than yours.'
    ]
  },
  'blood-matron-falls': {
    speaker: 'The Redfen',
    title: 'The Root Is Severed',
    lines: [
      'Avarra’s borrowed heart stops.',
      'For the first time in generations, the Redfen exhales without blood in its breath.'
    ]
  },
  'maelin-return-three': {
    speaker: 'Sister Maelin',
    title: 'Blood Without a Bell',
    lines: [
      'The mire will remain dangerous, but it belongs to roots and water again.',
      'Cairnreach heard Avarra fall. Its chains have started moving toward us.'
    ]
  },
  'chapter-four-opening': {
    speaker: 'Cairnreach',
    title: 'Chapter IV · The Crownless Siege',
    lines: [
      'The fortress survived its king, its people, and the war it was built to end.',
      'Now its buried engines are pulling every wall toward Ashen Sanctuary.'
    ]
  },
  'maelin-cairn-briefing': {
    speaker: 'Sister Maelin',
    title: 'A Fortress in Motion',
    lines: [
      'Odran died without a crown, so he made command itself his throne.',
      'Break the three war standards. Without them, his dead cannot agree which direction the fortress should march.'
    ]
  },
  'cairnreach-gate': {
    speaker: 'The Broken Rampart',
    title: 'The Siege Road',
    lines: [
      'The wall opens like a jaw.',
      'Behind it, chains drag something too large to be a single engine.'
    ]
  },
  'war-standard-cleared': {
    speaker: 'The Cairn Compact',
    title: 'A Command Is Broken',
    lines: [
      'One order disappears from the dead army.',
      'The remaining standards pull harder against each other.'
    ]
  },
  'chain-regent-arrives': {
    speaker: 'Odran',
    title: 'The Chain Regent',
    lines: [
      'A crown asks for loyalty. A chain needs only weight.',
      'You will hold this fortress together, oathbound—one link from each promise.'
    ]
  },
  'chain-regent-falls': {
    speaker: 'Cairnreach',
    title: 'The Fortress Kneels',
    lines: [
      'Odran’s command chain snaps.',
      'Across Cairnreach, walls settle into the earth and remember they were built to protect.'
    ]
  },
  'maelin-return-four': {
    speaker: 'Sister Maelin',
    title: 'The Last Wall Holds',
    lines: [
      'Cairnreach is still standing, and this time it faces outward.',
      'Our maps have gained a fifth edge. The Veiled Road is trying to redraw the way home.'
    ]
  },
  'chapter-five-opening': {
    speaker: 'The Fifth Road',
    title: 'Chapter V · The Fifth Road',
    lines: [
      'Every journey leaves behind the roads it did not take.',
      'Noxara has gathered those abandoned routes into one place.',
      'She needs only erase the path home, and Ashen Sanctuary will have never been reached.'
    ]
  },
  'maelin-veiled-briefing': {
    speaker: 'Sister Maelin',
    title: 'A Map with Five Edges',
    lines: [
      'Three anchors hold the false road against ours: a mirror, an unopened letter, and a night without a moon.',
      'Close them before you face Noxara. Otherwise she will keep choosing a version of the fight where you already lost.'
    ]
  },
  'veiled-road-gate': {
    speaker: 'Mirror Verge',
    title: 'Step Behind the Road',
    lines: [
      'Your reflection takes one step too late.',
      'The road behind it opens.'
    ]
  },
  'veil-anchor-cleared': {
    speaker: 'The Veil Couriers',
    title: 'One False Road Closes',
    lines: [
      'An impossible route folds into a thin line of violet light.',
      'The remaining anchors begin moving, hoping not to be found in the same place twice.'
    ]
  },
  'veiled-oracle-arrives': {
    speaker: 'Noxara',
    title: 'Oracle of the Fifth Road',
    lines: [
      'I have seen every path that brought you here.',
      'You survive in remarkably few of them.'
    ]
  },
  'veiled-oracle-falls': {
    speaker: 'The Fifth Road',
    title: 'The Road Remembers',
    lines: [
      'Noxara’s mirror breaks inward.',
      'One road remains beneath your feet. It leads home because the covenant remembers walking it.'
    ]
  },
  'maelin-return-five': {
    speaker: 'Sister Maelin',
    title: 'The Covenant Endures',
    lines: [
      'You did more than find the way back. You made the road remember us.',
      'The world beyond remains broken, crowded, and hungry. Now every path through it belongs to the covenant.'
    ]
  }
};

export const createCampaignFlags = () => ({
  choirSeals: [],
  choirVerdict: null,
  abbotSummons: 0,
  chapterTwoRewardClaimed: false,
  chapterNodes: Object.fromEntries(Object.keys(EXPANSION_ACTS).map((id) => [id, []])),
  chapterRewards: Object.fromEntries(Object.keys(EXPANSION_ACTS).map((id) => [id, false]))
});

export const createCampaignState = (legacy = false) => ({
  chapterId: 'chapter-one',
  stageId: legacy ? 'chapter-one-complete' : 'meet-maelin',
  progress: legacy ? 1 : 0,
  completed: legacy,
  discovered: legacy ? ['chapter-one'] : [],
  dialogueSeen: legacy ? { 'chapter-one-opening': true } : {},
  flags: createCampaignFlags()
});

export const getCampaignChapter = (id = 'chapter-one') => CAMPAIGN_CHAPTERS.find((chapter) => chapter.id === id) ?? CAMPAIGN_CHAPTERS[0];

export const getCampaignStage = (state) => {
  const chapter = getCampaignChapter(state?.chapterId);
  return chapter.stages?.find((stage) => stage.id === state?.stageId) ?? chapter.stages?.[0] ?? null;
};

export const campaignStageIndex = (state, stageId) => {
  const chapter = getCampaignChapter(state?.chapterId);
  return Math.max(0, chapter.stages?.findIndex((stage) => stage.id === stageId) ?? -1);
};

export const campaignChapterIndex = (chapterId) => Math.max(0, CAMPAIGN_CHAPTERS.findIndex((chapter) => chapter.id === chapterId));

export const chapterIsComplete = (state, chapterId) => {
  const targetIndex = campaignChapterIndex(chapterId);
  const currentIndex = campaignChapterIndex(state?.chapterId);
  if (currentIndex > targetIndex) return true;
  if (currentIndex < targetIndex) return false;
  const chapter = getCampaignChapter(chapterId);
  const finalStage = chapter.stages?.at(-1)?.id;
  return state?.completed === true || state?.stageId === finalStage;
};

export const normalizeCampaignState = (value, legacy = false) => {
  const fallback = createCampaignState(legacy);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  const chapter = getCampaignChapter(typeof value.chapterId === 'string' ? value.chapterId : fallback.chapterId);
  const stage = chapter.stages?.find((entry) => entry.id === value.stageId) ?? getCampaignStage({ chapterId: chapter.id, stageId: chapter.stages?.[0]?.id });
  const total = Math.max(1, stage?.total ?? 1);
  const discovered = Array.isArray(value.discovered)
    ? [...new Set(value.discovered.filter((id) => typeof id === 'string' && CAMPAIGN_CHAPTERS.some((entry) => entry.id === id)))].slice(0, 12)
    : fallback.discovered;
  if (!discovered.includes(chapter.id)) discovered.push(chapter.id);
  const dialogueSeen = value.dialogueSeen && typeof value.dialogueSeen === 'object' && !Array.isArray(value.dialogueSeen)
    ? Object.fromEntries(Object.keys(value.dialogueSeen).filter((id) => CAMPAIGN_DIALOGUES[id]).map((id) => [id, value.dialogueSeen[id] === true]))
    : fallback.dialogueSeen;
  const rawFlags = value.flags && typeof value.flags === 'object' && !Array.isArray(value.flags) ? value.flags : {};
  const choirSeals = Array.isArray(rawFlags.choirSeals)
    ? [...new Set(rawFlags.choirSeals.filter((id) => CHOIR_SEALS.includes(id)))].slice(0, CHOIR_SEALS.length)
    : [];
  const flags = {
    choirSeals,
    choirVerdict: CHOIR_VERDICTS.includes(rawFlags.choirVerdict) ? rawFlags.choirVerdict : null,
    abbotSummons: Math.max(0, Math.min(12, Math.floor(Number(rawFlags.abbotSummons) || 0))),
    chapterTwoRewardClaimed: rawFlags.chapterTwoRewardClaimed === true,
    chapterNodes: Object.fromEntries(Object.entries(EXPANSION_ACTS).map(([chapterId, act]) => {
      const entries = Array.isArray(rawFlags.chapterNodes?.[chapterId]) ? rawFlags.chapterNodes[chapterId] : [];
      return [chapterId, [...new Set(entries.filter((id) => act.nodeIds.includes(id)))].slice(0, act.nodeIds.length)];
    })),
    chapterRewards: Object.fromEntries(Object.keys(EXPANSION_ACTS).map((chapterId) => [chapterId, rawFlags.chapterRewards?.[chapterId] === true]))
  };
  const finalStage = chapter.stages?.at(-1)?.id;
  const expansionAct = EXPANSION_ACTS[chapter.id];
  const defaultProgress = stage?.id === 'break-choir-seals'
    ? flags.choirSeals.length
    : stage?.id === expansionAct?.nodeStage
      ? flags.chapterNodes[chapter.id]?.length ?? 0
      : 0;
  return {
    chapterId: chapter.id,
    stageId: stage?.id ?? fallback.stageId,
    progress: Math.max(defaultProgress, Math.min(total, Math.floor(Number(value.progress) || 0))),
    completed: value.completed === true || stage?.id === finalStage,
    discovered,
    dialogueSeen,
    flags
  };
};
