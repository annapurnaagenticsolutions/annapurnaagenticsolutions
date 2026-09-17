import { Chapter, ChoiceEffect, NarrativeChoice } from "./types";

const makeChoice = (
  id: string,
  label: string,
  tone: NarrativeChoice["tone"],
  consequence: string,
  effect: Omit<ChoiceEffect, "consequence"> = {},
): NarrativeChoice => ({
  id,
  label,
  tone,
  effect: { consequence, ...effect },
});

export const CHAPTERS: Chapter[] = [
  {
    id: 1,
    arc: "Dry Shrine",
    title: "The Road That Forgot the Rain",
    chapterNumber: "01 / 36",
    location: "The western road into Varsha Hollow",
    weather: "A low ceiling of storm clouds, no rain",
    opening: "By sunset, the road had become a ribbon of dust beneath a sky that promised everything and delivered nothing.",
    body: [
      "Neel returned to Varsha Hollow with one pack, a cracked Academy badge, and the uncomfortable knowledge that the city had found his gift useless. He could not command a slime or make a spark leap between his fingers. He could only feel the impressions that creatures left in the air: thirst, caution, curiosity, the memory of a safe hand.",
      "The village waited beyond a line of wind-bent neem trees. Forty roofs clung to the slope around an abandoned rain shrine. The channels were broken, the farms were grey, and the people who remained watched Neel arrive as if he were another weather sign to interpret."
    ],
    choices: [
      makeChoice("own-failure", "Tell the first person who asks that the Academy sent you home.", "empathy", "The truth travels faster than gossip, and the village hears the hurt beneath your words.", { stats: { Empathy: 1 }, relationships: { Meera: 1, Dev: 1 }, dayCost: 1 }),
      makeChoice("hide-failure", "Say only that you are here to study the shrine.", "wisdom", "You keep your shame private, but a useful mystery begins to grow around you.", { stats: { Wisdom: 1 }, relationships: { Tara: 1 }, dayCost: 1 }),
      makeChoice("start-working", "Ask where the nearest broken water channel is and begin there.", "practicality", "Work gives the village a reason to look at your hands instead of your history.", { stats: { Practicality: 1 }, villageDelta: 2, relationships: { Meera: 1 }, dayCost: 1 }),
    ],
    companionDialogue: [
      {
        companion: "Meera",
        base: "A woman on the nearest lintel watched him arrive with arms folded and no greeting. She measured him the way she measured timber, by grain and weight and what could still bear a load.",
        variants: [
          { text: "Meera leaned against the lintel and almost smiled. She had heard the Academy stories and decided they did not matter. What mattered was whether his hands knew the difference between a broken channel and a wish. She suspected they did.", condition: (state) => state.relationships.Meera >= 3 },
        ],
      },
    ],
  },
  {
    id: 2,
    arc: "Dry Shrine",
    title: "A Cup of Dew",
    chapterNumber: "02 / 36",
    location: "The dry reservoir",
    weather: "Heat trapped beneath cloud",
    opening: "Something trembled beneath the reservoir stones, and the feeling reached Neel before the sound did.",
    body: [
      "In the deepest crack of the reservoir, Neel found a cluster of Dew slimes. They were translucent, pale as the first light before dawn, and so dehydrated that their bodies barely held their shape. Their fear was not loud. It was a small, repeating thought: do not be taken; do not be emptied; do not be alone.",
      "Old Kavi watched from his porch while Neel returned three mornings in a row. On the third, he tapped a rhythm against the stone. One Dew slime answered. It drew moisture from the cool earth and gave back a single cup of clean water. Kavi drank slowly, as if afraid the miracle would notice him."
    ],
    choices: [
      makeChoice("share-cup", "Give the cup to Kavi before asking the slime for anything more.", "empathy", "The Dew slime learns that its gift can travel through kindness, not command.", { stats: { Empathy: 1 }, villageDelta: 3, relationships: { Dev: 1 }, resourceCost: { herbs: 1 }, dayCost: 1 }),
      makeChoice("measure-cup", "Measure the water, record the conditions, and repeat the process carefully.", "wisdom", "The village gains a method it can trust, and your notes begin to resemble a real discipline.", { stats: { Wisdom: 1 }, villageDelta: 2, relationships: { Kabir: 1 }, dayCost: 1 }),
      makeChoice("scale-water", "Ask the Dew slime to try producing more before the morning cool disappears.", "practicality", "You gain a larger reserve, but the slime's impression sharpens with exhaustion.", { stats: { Practicality: 1 }, villageDelta: 4, relationships: { Meera: -1 }, dayCost: 1 }),
    ],
    conditionalBody: [
      {
        text: "Neel knelt at the reservoir's edge and let the impressions wash through him. The fear was not a single note. It was a chord. Beneath the repeating thought of do not be taken, there was an older layer, a grief for a colony that had once numbered in the hundreds and now clung to a single crack in the stone. The Dew slimes remembered being many. They remembered the sound of water moving freely above them. The memory was so vivid it left a taste in his mouth, clean and cold and gone.",
        condition: (state) => state.stats.Empathy >= 2,
      },
    ],
  },
  {
    id: 3,
    arc: "Dry Shrine",
    title: "The Shape of Trust",
    chapterNumber: "03 / 36",
    location: "The reservoir steps",
    weather: "First wind from the valley",
    opening: "The first success made Neel popular for exactly one day and suspicious for the next.",
    body: [
      "Meera found him teaching the Dew slime to recognize three sounds: a rain tap, a warning knock, and the soft double tap that meant stop. She was carrying a salvaged beam over one shoulder and a look that could have stripped paint from a door.",
      "She did not believe in magical shortcuts. Neel did not ask her to believe. He asked her to watch the slime choose when to approach. When a gust rattled the shrine bells, the creature withdrew. Its fear was not weakness; it was information."
    ],
    choices: [
      makeChoice("listen-meera", "Let Meera set the lesson's pace and ask the slime what it needs.", "empathy", "Meera sees that you are willing to share authority, not merely seek praise.", { stats: { Empathy: 1 }, relationships: { Meera: 2 }, dayCost: 1 }),
      makeChoice("map-pattern", "Compare the slime's responses with the shrine's old water marks.", "wisdom", "A pattern emerges: the slimes remember channels the villagers stopped seeing.", { stats: { Wisdom: 1 }, relationships: { Tara: 1 }, villageDelta: 2, dayCost: 1 }),
      makeChoice("build-trough", "Use spare timber to build a covered trough for the reservoir cluster.", "practicality", "The Dew slimes gain a safer home, though Meera warns that timber will not last.", { stats: { Practicality: 1 }, villageDelta: 3, relationships: { Meera: 1 }, resourceCost: { timber: 1 }, dayCost: 1 }),
      { ...makeChoice("ask-fear", "Ask the slime what it fears most, and let the answer change the lesson.", "empathy", "The Dew slime names the dark and the closed jar, and the lesson becomes a conversation about safety instead of performance.", { stats: { Empathy: 1 }, relationships: { Meera: 1 }, villageDelta: 2, dayCost: 1 }), requires: { stat: { Empathy: 3 } } },
    ],
    conditionalBody: [
      {
        text: "She was carrying a salvaged beam over one shoulder, but the look had softened. Meera almost smiled when the Dew slime chose to approach Neel on its own. Trust, she admitted without saying it, was not something she had expected from a creature that small.",
        condition: (state) => state.relationships.Meera >= 3,
      },
    ],
  },
  {
    id: 4,
    arc: "Dry Shrine",
    title: "The Bell With No Tongue",
    chapterNumber: "04 / 36",
    location: "The rain shrine courtyard",
    weather: "Dust moving like smoke",
    opening: "The shrine bell had no tongue, yet at noon it rang once.",
    body: [
      "The sound brought the remaining villagers into the courtyard. Neel felt a ripple of unease from the Dew slimes and a deeper, older pressure beneath the shrine floor. The bell's vibration had followed the same rhythm as the tapping lesson, but no human hand had touched it.",
      "Meera wanted the cracked foundation shored up before anyone went below. Neel sensed that the shrine was asking a question, not offering an answer. The village waited for him to decide whether curiosity was worth the risk."
    ],
    choices: [
      makeChoice("comfort-slime", "Stay with the frightened Dew slimes until the bell's echo fades.", "empathy", "The slimes settle, and their calm spreads through the gathered crowd.", { stats: { Empathy: 1 }, relationships: { Dev: 1 }, villageDelta: 1, resourceCost: { herbs: 1 }, dayCost: 1 }),
      makeChoice("study-bell", "Trace the bell's vibration through the shrine's carved channels.", "wisdom", "You learn that the old water system is still listening for pressure beneath the stone.", { stats: { Wisdom: 1 }, relationships: { Tara: 1 }, dayCost: 1 }),
      makeChoice("brace-foundation", "Follow Meera's plan and reinforce the courtyard before investigating.", "practicality", "The first repairs are ugly but sound, and Meera stops calling you Academy boy.", { stats: { Practicality: 1 }, relationships: { Meera: 2 }, villageDelta: 3, nextChapterId: 5, resourceCost: { timber: 2 }, dayCost: 1 }),
    ],
    companionDialogue: [
      {
        companion: "Meera",
        base: "Shore up the foundation first. I don't care what the bell is asking. Stone falls on everyone.",
        variants: [
          { text: "Shore it up, but carefully. You know how to read a crack better than most. I'll hold the beam if you tell me where.", condition: (state) => state.relationships.Meera >= 4 },
        ],
      },
    ],
    conditionalBody: [
      {
        text: "The unease from the Dew slimes was not simple fear. It was recognition. They pressed lower against the reservoir stones as the bell's echo faded, and Neel understood that they had felt this vibration before, perhaps seasons ago, perhaps longer. The shrine was not asking a question. It was repeating one that the slimes had already answered in a language no human had written down.",
        condition: (state) => state.stats.Empathy >= 3,
      },
    ],
    summaryBeat: "The first week ends with a cup of water, a safer reservoir, and the uneasy sense that the shrine remembers Neel.",
  },
  {
    id: 5,
    arc: "Dry Shrine",
    title: "What the Village Keeps",
    chapterNumber: "05 / 36",
    location: "The council veranda",
    weather: "Clouds gathering beyond the ridge",
    opening: "At the council veranda, every old story about the village became a different kind of debt.",
    body: [
      "The elders argued over whether to sell the shrine stones, abandon the farms, or ration the Dew slimes until the next caravan. Neel heard the emotional impressions behind the words: grief disguised as practicality, fear disguised as tradition, pride that still wanted to be useful.",
      "Meera placed a list of forty roofs on the table. If the early monsoon arrived as predicted, the village had less than three weeks. The rain might restore the fields, or it might turn every weak wall into mud."
    ],
    choices: [
      makeChoice("ask-consensus", "Invite every household to name one thing they can still contribute.", "empathy", "The council becomes a circle instead of a wall, and the village commits to shared work.", { stats: { Empathy: 1 }, villageDelta: 4, relationships: { Leela: 1, Dev: 1 }, resourceCost: { herbs: 1 }, dayCost: 1 }),
      makeChoice("read-archives", "Search the shrine records for earlier monsoon failures.", "wisdom", "A half-burned map suggests that the lower channels once carried water under the village.", { stats: { Wisdom: 1 }, relationships: { Tara: 1 }, villageDelta: 2, nextChapterId: 26, dayCost: 1 }),
      makeChoice("accept-roofs", "Promise to repair the forty roofs before the rain, even without permission.", "practicality", "The village gains a deadline and a leader, whether or not Neel feels ready.", { stats: { Practicality: 1 }, villageDelta: 5, relationships: { Meera: 2 }, resourceCost: { timber: 2 }, dayCost: 1 }),
    ],
    conditionalBody: [
      {
        text: "Neel's eyes moved across the shrine records the way they moved across a load path, following the logic of the system rather than the surface of the text. The archives were not random. They were organized by water season, then by channel, then by failure type. A clerk had maintained them with the patience of someone who understood that a village's memory was its most important infrastructure. The half-burned map was not lost. It was filed under the last monsoon that had broken the lower channels, and its placement was a warning the clerk had left for whoever came next.",
        condition: (state) => state.stats.Wisdom >= 3,
      },
    ],
    summaryBeat: "The Dry Shrine arc closes with Varsha Hollow choosing work over departure. The first project is clear: forty roofs before the rain.",
  },
  {
    id: 6,
    arc: "Forty Roofs",
    title: "The Scent of Mud",
    chapterNumber: "06 / 36",
    location: "The cracked riverbed",
    weather: "Humidity rising",
    opening: "The riverbed looked empty until the mud moved against the wind.",
    body: [
      "Meera led Neel to the Clay slimes, dense little creatures that moved as if each decision had to cross a long distance inside them. They could shape mud and harden it, but only when the shape made emotional sense. A wall meant shelter. A beam meant pressure. A straight line meant nothing at all.",
      "Meera built a measuring frame from salvaged wood. Neel discovered that the slimes feared heights and disliked being hurried. The first lesson ended with a clay brick that leaned like a tired old man."
    ],
    choices: [
      makeChoice("name-feeling", "Teach the Clay slimes the feeling of shelter before the shape of a wall.", "empathy", "The slimes begin to understand the work as protection, and one glows with a steady inner warmth.", { stats: { Empathy: 1 }, relationships: { Meera: 1 }, unlockSlime: "Clay", villageDelta: 3, resourceCost: { herbs: 1 }, dayCost: 1 }),
      makeChoice("measure-first", "Build a grid and let the slimes practice one repeatable form.", "wisdom", "Precision gives the Clay slimes a language they can return to under pressure.", { stats: { Wisdom: 1 }, relationships: { Meera: 1 }, unlockSlime: "Clay", villageDelta: 4, dayCost: 1 }),
      makeChoice("push-output", "Ask for ten bricks before sunset, then solve the fear later.", "practicality", "The pile grows quickly, but the slimes begin to associate your voice with strain.", { stats: { Practicality: 1 }, relationships: { Meera: -1 }, unlockSlime: "Clay", villageDelta: 5, resourceCost: { timber: 2 }, dayCost: 1 }),
    ],
    conditionalBody: [
      {
        text: "Neel knelt and pressed his palm flat against the riverbed. The clay was not uniform. Layers of pale silt sat beneath a darker, denser band, the kind that held its shape under pressure. He had read about composition like this in the Academy's abandoned notes, but reading had never felt like this, the weight of the earth answering back through his fingertips.",
        condition: (state) => state.stats.Wisdom >= 3,
      },
      {
        text: "He recognized the species before Meera finished her introduction. The Forgotten Channels branch had taught him the Clay slimes' older lineage, the dense dark strain that remembered shapes across decades. These were cousins of the dormant colony beneath the shrine, and they greeted him as if they already knew his hands.",
        condition: (state) => state.unlockedSlimes.includes("Clay"),
      },
      {
        text: "The timber pile had shrunk to a few warped planks. Meera counted them twice, as if counting could change the number. It could not.",
        condition: (state) => state.path === "keeper" && !!state.resources && state.resources.timber < 4,
      },
    ],
  },
  {
    id: 7,
    arc: "Forty Roofs",
    title: "A Door Sealed Shut",
    chapterNumber: "07 / 36",
    location: "The eastern row of homes",
    weather: "Fine rain that never reaches the earth",
    opening: "The first Clay slime repair sealed a door so completely that Meera had to climb through a window.",
    body: [
      "The villagers laughed until they saw the clay had hardened around a cracked lintel. It was not a useless mistake; the door had been the only thing holding the wall together. Meera's impatience softened by one degree, which Neel recognized as a major weather event.",
      "They spent the afternoon teaching the slimes to leave breathing spaces. A repair was not simply material in a gap. It was a promise that people could enter, leave, carry water, and still find their way home."
    ],
    choices: [
      makeChoice("apologize-door", "Apologize to the Clay slime before asking it to try again.", "empathy", "The slime's fear loosens, and Meera recognizes the value of a pause.", { stats: { Empathy: 1 }, relationships: { Meera: 2 }, resourceCost: { herbs: 1 }, dayCost: 1 }),
      makeChoice("test-load", "Turn the mistake into a load-bearing lesson with controlled weights.", "wisdom", "The failure becomes the village's first training standard.", { stats: { Wisdom: 1 }, villageDelta: 3, relationships: { Meera: 1 }, dayCost: 1 }),
      makeChoice("cut-new-door", "Cut a second doorway and continue the work before dark.", "practicality", "The household gains a safer exit, but the original wall will need a deeper repair.", { stats: { Practicality: 1 }, villageDelta: 4, resourceCost: { timber: 2 }, dayCost: 1 }),
    ],
    companionDialogue: [
      {
        companion: "Meera",
        base: "Next time, measure the frame before you seal it. A door that doesn't open is a wall that lied about its intentions.",
        variants: [
          { text: "She bumped his shoulder with hers as they surveyed the sealed door. The mistake was funny now. It would not be funny when the rain came, but the fact that they could laugh at it meant something had changed between them. Trust, she had learned, was built from mistakes that neither of them ran from.", condition: (state) => state.relationships.Meera >= 4 },
        ],
      },
    ],
  },
  {
    id: 8,
    arc: "Forty Roofs",
    title: "The House of Falling Tiles",
    chapterNumber: "08 / 36",
    location: "The old watch-house",
    weather: "Rain finally touching the road",
    opening: "The roof groaned before anyone saw it move.",
    body: [
      "The old watch-house had been empty for years, but its roof sat above a row of occupied homes. When a tile slid, the Clay slimes froze. Neel felt their terror as a vertical wall, too high to climb and too unstable to trust.",
      "Meera wedged a spare beam under the main support and shouted a simple instruction: fill the gaps. Neel stopped trying to make the slimes brave. He made the ground feel close. Together they held the house long enough to repair it."
    ],
    choices: [
      makeChoice("steady-breath", "Anchor the Clay slimes with a slow breath and let them move one at a time.", "empathy", "The slimes discover that fear can be carried collectively without becoming panic.", { stats: { Empathy: 1 }, relationships: { Meera: 1, Dev: 1 }, villageDelta: 4, resourceCost: { herbs: 1 }, dayCost: 1 }),
      makeChoice("change-angle", "Study the roofline and redesign the repair around the original load path.", "wisdom", "The right shape costs more time but makes every later roof safer.", { stats: { Wisdom: 1 }, relationships: { Meera: 2 }, villageDelta: 5, dayCost: 1 }),
      makeChoice("hold-beam", "Take the beam yourself and order the slimes to reinforce at speed.", "practicality", "The roof holds, but your shoulder and the slimes both pay for the shortcut.", { stats: { Practicality: 1 }, relationships: { Meera: -1 }, villageDelta: 5, resourceCost: { timber: 2 }, dayCost: 1 }),
    ],
    conditionalBody: [
      {
        text: "The terror hit Neel like a wall of water. It was not his own. The Clay slimes' fear had a vertical quality, a sense of height that pressed downward through their soft bodies and into the earth beneath them. He felt the memory beneath it, a flood season long past when mud had rained from above and the colony had lost half its number to gravity. The fear was not irrational. It was a survival record written in the body's deepest layer, and it asked to be respected.",
        condition: (state) => state.stats.Empathy >= 4,
      },
    ],
  },
  {
    id: 9,
    arc: "Forty Roofs",
    title: "The Weight of Forty Homes",
    chapterNumber: "09 / 36",
    location: "Varsha Hollow's southern lane",
    weather: "Monsoon wind sharpening",
    opening: "By the twentieth roof, the work had become a rhythm shared by hands, hooves, and soft bodies of clay.",
    body: [
      "The village learned to make room for training. Children carried measuring cords. Elders sorted sound timber from rotten timber. The Clay slimes chose certain houses because they liked the family scent, while others preferred the geometry of a clean wall.",
      "A dispute broke out when one family demanded their roof be repaired first because they had offered Neel the most grain. Meera wanted a queue. Dev wanted the most vulnerable homes protected. The choice threatened to turn cooperation into a transaction."
    ],
    choices: [
      makeChoice("vulnerable-first", "Give priority to the homes with the oldest residents and smallest shelters.", "empathy", "The village sees protection as a shared measure, not a reward for wealth.", { stats: { Empathy: 1 }, relationships: { Dev: 2 }, villageDelta: 4, resourceCost: { herbs: 1 }, dayCost: 1 }),
      makeChoice("risk-ledger", "Create a visible roof-risk ledger and let every household inspect it.", "wisdom", "Transparency cools the argument and gives the queue a reason everyone can read.", { stats: { Wisdom: 1 }, relationships: { Leela: 1 }, villageDelta: 4, dayCost: 1 }),
      makeChoice("paid-priority", "Accept the grain and repair the paying household first, then repay the debt later.", "practicality", "The work accelerates for a day, but Leela warns that trust has a price.", { stats: { Practicality: 1 }, relationships: { Leela: -1 }, villageDelta: 5, resourceCost: { timber: 3 }, resourceGain: { grain: 2 }, dayCost: 1 }),
      { ...makeChoice("let-meera-decide", "Hand the queue to Meera and let her set the order without interference.", "empathy", "Meera builds a queue the village accepts because it came from her, and the argument dissolves into work.", { stats: { Empathy: 1 }, relationships: { Meera: 2 }, villageDelta: 4, dayCost: 1 }), requires: { relationship: { Meera: 5 } } },
      { ...makeChoice("reinforce-double", "Reinforce every roof with double timber.", "practicality", "The doubled beams turn forty roofs into fortifications. The timber is gone, but the village has never felt more certain of its shelter.", { stats: { Practicality: 1 }, relationships: { Meera: 2 }, villageDelta: 5, resourceCost: { timber: 5 }, dayCost: 1 }), requires: { resourceMinimum: { timber: 5 } } },
    ],
    conditionalBody: [
      {
        text: "The village smelled of desperation and wet clay. Families counted their grain in cupfuls, not sacks, and the roofs still open to the sky outnumbered the ones that had been sealed. Every repaired wall felt less like progress and more like a hand held against a flood.",
        condition: (state) => state.villageProgress < 25,
      },
      {
        text: "Something had shifted in the way the village carried itself. The repaired roofs outnumbered the broken ones now, and the families who had doubted the work had begun to bring timber of their own. Confidence was not loud. It was the quiet of people who had stopped expecting the worst.",
        condition: (state) => state.villageProgress > 40,
      },
    ],
  },
  {
    id: 10,
    arc: "Forty Roofs",
    title: "Before the First Drop",
    chapterNumber: "10 / 36",
    location: "The village square",
    weather: "Rain line visible beyond the hills",
    opening: "The fortieth roof was repaired under a sky the color of beaten iron.",
    body: [
      "Meera's mother had designed the old bridge, but Meera had never managed to rebuild it. For now, the roofs were enough. Clay slimes rested in shallow earthen basins while the villagers tied down the last loose tiles.",
      "When the first drop finally fell, nobody cheered. They listened. The rain struck the repaired roofs with a steady, ordinary sound, and the village discovered that safety could be quiet."
    ],
    choices: [
      makeChoice("thank-slimes", "Hold a small night vigil to let the Clay slimes hear the village's gratitude.", "empathy", "The slimes settle into a new confidence, and the village begins to treat their labor as partnership.", { stats: { Empathy: 1 }, relationships: { Meera: 2 }, villageDelta: 5, resourceCost: { herbs: 1 }, dayCost: 1 }),
      makeChoice("record-method", "Document the repair methods before anyone forgets what worked.", "wisdom", "The first training manual begins as a stack of damp pages beside the shrine.", { stats: { Wisdom: 1 }, relationships: { Kabir: 1 }, villageDelta: 4, dayCost: 1 }),
      makeChoice("plan-bridge", "Use the pause to draw the first bridge repair plan with Meera.", "practicality", "The village survives its first rain, and a larger ambition takes shape.", { stats: { Practicality: 1 }, relationships: { Meera: 2 }, villageDelta: 6, resourceCost: { timber: 2 }, dayCost: 1 }),
    ],
    reactiveBody: [
      {
        base: "The village stood beneath the rain and waited to learn whether the work had been enough.",
        variants: [
          { text: "The village stood beneath the rain and barely held. Too many roofs had been sealed too late, and the ones that leaked still outnumbered the ones that did not. The first drop felt less like relief and more like a test the village had not finished studying for.", condition: (state) => state.villageProgress < 25 },
          { text: "The village stood beneath the rain with the quiet confidence of a place that had done the work. Not every roof was perfect, but enough were sound that the first drop felt like a promise kept rather than a threat deferred.", condition: (state) => state.villageProgress >= 25 && state.villageProgress < 45 },
          { text: "The village stood beneath the rain and did not flinch. The roofs held because the village had held itself, and the first drop was not a test but a season arriving on schedule. Meera watched the water run clean from every gutter and allowed herself a single nod.", condition: (state) => state.villageProgress >= 45 },
        ],
      },
    ],
    conditionalBody: [
      {
        text: "The grain stores were thin. Families had started measuring portions in cupfuls, not bowls. The work continued, but the workers were quieter.",
        condition: (state) => state.path === "keeper" && !!state.resources && state.resources.grain < 4,
      },
    ],
    summaryBeat: "Forty roofs stand. Varsha Hollow enters Recovery, and Meera's unfinished bridge becomes the next promise hanging over the rain.",
  },
  {
    id: 11,
    arc: "Hollow Market",
    title: "The Woman With the Ledger",
    chapterNumber: "11 / 36",
    location: "The old shop on Market Lane",
    weather: "Warm rain and clear gutters",
    opening: "Leela returned with three crates, two contracts, and no patience for sentiment that could not be weighed.",
    body: [
      "Her father's shop had nearly collapsed into a storeroom of unsold salt and faded cloth. Leela saw a market where everyone else saw a bad season. She asked how much water the Dew slimes could spare, how much clay the riverbed could yield, and whether the repaired roofs could support a caravan's worth of trade.",
      "Neel disliked the way she turned hope into columns. Leela disliked the way he answered practical questions with feelings. They were both right often enough to be dangerous."
    ],
    choices: [
      makeChoice("share-ledger", "Show Leela your notes and ask her to help make them useful.", "empathy", "Leela agrees to protect the village's trust while she builds its trade.", { stats: { Empathy: 1 }, relationships: { Leela: 2 }, villageDelta: 4, unlockSlime: "Herb", resourceCost: { clay: 1 }, dayCost: 1 }),
      makeChoice("audit-water", "Insist on measuring every resource before announcing a market.", "wisdom", "The first market plan is slower, but it will not promise what the slimes cannot sustain.", { stats: { Wisdom: 1 }, relationships: { Leela: 1 }, villageDelta: 3, unlockSlime: "Herb", dayCost: 1 }),
      makeChoice("open-stalls", "Tell Leela to open the square this week and solve shortages as they appear.", "practicality", "Visitors arrive quickly, bringing money, questions, and the first pressure to overwork the slimes.", { stats: { Practicality: 1 }, relationships: { Leela: 1 }, villageDelta: 6, unlockSlime: "Herb", resourceCost: { timber: 1 }, resourceGain: { grain: 2 }, dayCost: 1 }),
    ],
    conditionalBody: [
      {
        text: "Neel studied the shop the way he had learned to study a load path. The shelving was sound but the inventory flow was broken, goods stacked where they entered instead of where they sold. Leela had not inherited a shop. She had inherited a system that had stopped functioning before her father gave up. The structure could be repaired, but only if the flow was redesigned from the door inward.",
        condition: (state) => state.stats.Practicality >= 4,
      },
    ],
  },
  {
    id: 12,
    arc: "Hollow Market",
    title: "The First Market Day",
    chapterNumber: "12 / 36",
    location: "The village square",
    weather: "Rain pearls on the awnings",
    opening: "The first Hollow Market occupied half the square and sounded like a village remembering its own voice.",
    body: [
      "Meera sold clay cups with uneven rims. Kabir set out herbs and a handwritten sign warning that medicine was not magic. Leela moved between stalls with a slate board and a knife tucked into her belt, collecting promises before they became arguments.",
      "The Herb slimes emerged from the wet garden behind Kabir's clinic. They recognized fever, crushed leaves, and the sharp scent of infection. Their work was gentle, but the crowd's appetite was not."
    ],
    choices: [
      makeChoice("protect-rest", "Close the Herb slime stall when the creatures begin to droop.", "empathy", "Kabir trusts your judgment, and the market learns that care includes limits.", { stats: { Empathy: 1 }, relationships: { Kabir: 2 }, villageDelta: 3, resourceCost: { herbs: 1 }, dayCost: 1 }),
      makeChoice("teach-labels", "Help Kabir label every preparation by evidence, risk, and shelf life.", "wisdom", "The clinic earns a reputation for honesty rather than easy miracles.", { stats: { Wisdom: 1 }, relationships: { Kabir: 2, Leela: 1 }, villageDelta: 4, dayCost: 1 }),
      makeChoice("meet-demand", "Let the Herb slimes work through the crowd until the last customer is served.", "practicality", "The market earns a strong first profit, while one exhausted slime retreats into the rain barrel.", { stats: { Practicality: 1 }, relationships: { Kabir: -1 }, villageDelta: 6, resourceCost: { herbs: 1 }, resourceGain: { grain: 2 }, dayCost: 1 }),
    ],
    companionDialogue: [
      {
        companion: "Kabir",
        base: "The Herb slimes are not machines. They sense fever and infection because they care, not because they are told to. Push them past their rhythm and the sensing goes dull.",
        variants: [
          { text: "Kabir placed a hand on the nearest Herb slime and looked at Neel with the trust of a man who had stopped hiding his fears. The slimes sense what we sense, he said. If we treat them like tools, they learn to feel like tools. I would rather they feel like healers.", condition: (state) => state.relationships.Kabir >= 4 },
        ],
      },
    ],
  },
  {
    id: 13,
    arc: "Hollow Market",
    title: "A Promise With Painted Eyes",
    chapterNumber: "13 / 36",
    location: "The southern road",
    weather: "Bright morning after rain",
    opening: "The counterfeit slimes arrived in painted jars before the honest traders did.",
    body: [
      "A merchant named Rusk claimed to sell trained Varsha Hollow slimes. His creatures were painted in bright colors and prodded into tricks. Neel felt their impressions through the crowd: confusion, pain, and the frantic hope that pleasing the next hand might make the last hand stop.",
      "Leela wanted proof before confrontation. Meera wanted the jars broken. Kabir wanted the slimes moved to shade. The market's new reputation balanced on the next decision."
    ],
    choices: [
      makeChoice("free-jars", "Open the jars and calm the creatures before speaking to Rusk.", "empathy", "The slimes stop performing, and the crowd is forced to see what the tricks were hiding.", { stats: { Empathy: 1 }, relationships: { Kabir: 1, Leela: 1 }, villageDelta: 2, nextChapterId: 29, resourceCost: { herbs: 2 }, dayCost: 1 }),
      makeChoice("collect-proof", "Record the injuries, labels, and contracts before making a claim.", "wisdom", "Leela gains the evidence she needs to challenge Rusk without turning the square into a brawl.", { stats: { Wisdom: 1 }, relationships: { Leela: 2 }, villageDelta: 3, dayCost: 1 }),
      makeChoice("shut-market", "Close the market for the day and force every trader to leave.", "practicality", "Varsha Hollow avoids an immediate scandal, but honest sellers lose a day's income.", { stats: { Practicality: 1 }, relationships: { Leela: -1 }, villageDelta: 1, resourceCost: { timber: 1 }, dayCost: 1 }),
    ],
    conditionalBody: [
      {
        text: "Neel did not need to open a jar to know what was inside. The impressions bled through the painted glass like heat through a wall. Each creature was holding a single repeating feeling, and the feeling was not fear of the crowd. It was fear of the hand that came after the crowd went home. He understood, with a certainty that sat heavy in his chest, that the jars were not merchandise. They were prisoners.",
        condition: (state) => state.stats.Empathy >= 4,
      },
    ],
  },
  {
    id: 14,
    arc: "Hollow Market",
    title: "The Cost of Being Believed",
    chapterNumber: "14 / 36",
    location: "The shopkeeper's back room",
    weather: "Rain ticking against shutters",
    opening: "By evening, two families had arrived with injured children and the same question: were these really your slimes?",
    body: [
      "Neel had no secret method to hide behind. He had a listening practice, a few hard lessons, and a village that had not yet decided whether it was a sanctuary or a brand. Kabir treated the rashes while Leela spread the contracts across the floor.",
      "Meera stood at the door and told the families that Varsha Hollow would help repair what it could, but would not pretend every danger could be undone. The honesty hurt. It also made room for trust."
    ],
    choices: [
      makeChoice("stay-with-families", "Stay through the night with the affected families and their frightened slimes.", "empathy", "The families agree to let Kabir document the injuries, and the slimes begin to recover.", { stats: { Empathy: 1 }, relationships: { Kabir: 2 }, villageDelta: 3, resourceCost: { herbs: 1 }, dayCost: 1 }),
      makeChoice("draft-code", "Write the first ethical training code before confronting Rusk.", "wisdom", "A clear standard gives the market a future beyond Neel's personal reputation.", { stats: { Wisdom: 1 }, relationships: { Leela: 2, Meera: 1 }, villageDelta: 4, dayCost: 1 }),
      makeChoice("demand-refund", "Take the evidence to Rusk and demand restitution in public.", "practicality", "Rusk returns part of the money, but his allies begin calling Varsha Hollow difficult.", { stats: { Practicality: 1 }, relationships: { Leela: 1 }, villageDelta: 4, resourceCost: { clay: 1 }, dayCost: 1 }),
      { ...makeChoice("free-clinic-day", "Open a free clinic day with full herb stocks.", "empathy", "Kabir opens the clinic to everyone, and the Herb slimes work until the last family is seen. The village remembers the day not as charity but as proof that care could be given without being earned.", { stats: { Empathy: 1 }, relationships: { Kabir: 3 }, villageDelta: 4, resourceCost: { herbs: 3 }, dayCost: 1 }), requires: { resourceMinimum: { herbs: 3 } } },
    ],
    conditionalBody: [
      {
        text: "The injured children's fear tasted like copper and cold water. Neel sat with them while Kabir worked and felt the slimes pressing close, sharing the children's distress as if it were their own. The Herb slimes did not distinguish between the creature that was hurt and the creature that was healing. To them, the boundary between patient and caretaker was a line drawn by people who had forgotten that pain was a shared language.",
        condition: (state) => state.stats.Empathy >= 4,
      },
    ],
  },
  {
    id: 15,
    arc: "Hollow Market",
    title: "The Market Learns Its Name",
    chapterNumber: "15 / 36",
    location: "The lantern-strung square",
    weather: "A calm night between storms",
    opening: "The second market opened beneath lanterns made from old shrine glass.",
    body: [
      "Leela posted the training code where every trader could read it: no forced evolution, no false claims, no work without rest, and no creature sold without a care plan. The rules were not perfect. They were the beginning of being accountable to one another.",
      "Neel watched the village become louder. Farmers came from the valley. Children named the square. The prosperity meter in his notebook crossed into Connection, and with it came the less visible problem of waste, crowding, and people who wanted growth without responsibility."
    ],
    choices: [
      makeChoice("care-circle", "Invite every slime keeper to sit in a circle and revise the code together.", "empathy", "The code becomes a living promise instead of a rule handed down by one person.", { stats: { Empathy: 1 }, relationships: { Leela: 1, Kabir: 1 }, villageDelta: 5, resourceCost: { herbs: 1 }, dayCost: 1 }),
      makeChoice("track-impact", "Add a ledger for water use, waste, and slime rest days.", "wisdom", "The market keeps its welcome while learning what its success costs.", { stats: { Wisdom: 1 }, relationships: { Leela: 2, Tara: 1 }, villageDelta: 5, dayCost: 1 }),
      makeChoice("expand-trade", "Accept the largest caravan contract and build the market outward.", "practicality", "Varsha Hollow earns enough to repair the southern road, but the square becomes crowded.", { stats: { Practicality: 1 }, relationships: { Leela: 2 }, villageDelta: 7, resourceCost: { timber: 1 }, resourceGain: { grain: 3 }, dayCost: 1 }),
    ],
    conditionalBody: [
      {
        text: "Meera stood at the edge of the lantern-strung square with her arms crossed and a look that was not quite pride. She had spent a season believing the village would not survive its own ambition. She had been wrong, and the admission sat on her face like weather she did not know how to name.",
        condition: (state) => state.relationships.Meera >= 5,
      },
      {
        text: "Kabir hung the training code beside his clinic door and read it twice, not because he doubted it but because he wanted to remember the feeling of seeing his own values written in a language the whole village could read. He had spent too long being careful alone. The code meant he was careful in company.",
        condition: (state) => state.relationships.Kabir >= 5,
      },
      {
        text: "Kabir's apothecary was nearly bare. The Herb slimes had given everything they could, and the shelves showed it. He did not complain. He did not need to.",
        condition: (state) => state.path === "keeper" && !!state.resources && state.resources.herbs < 2,
      },
    ],
    summaryBeat: "The Hollow Market arc closes with an ethical code, a new income, and the first signs that prosperity brings its own weather.",
  },
  {
    id: 16,
    arc: "Moving Lights",
    title: "The Mapmaker Returns",
    chapterNumber: "16 / 36",
    location: "The western forest road",
    weather: "Mist rising from the roots",
    opening: "Tara returned with a map that contradicted every map in the village archive.",
    body: [
      "She had guided caravans before the road shifted. Her maps showed monsoon paths bending around Varsha Hollow as if the valley were pushing water away. She did not trust Neel's slimes yet. Too many creatures had appeared near the channels, and ecosystems did not accept new neighbors without consequence.",
      "A smoky-violet Echo slime followed her from the forest. It answered distant sounds with a ripple through its body, repeating a birdcall that had no living bird nearby. Tara called it a warning. Neel felt something more complicated: recognition."
    ],
    choices: [
      makeChoice("ask-echo", "Let the Echo slime choose the path before you ask Tara for an explanation.", "empathy", "Tara sees that your listening can include uncertainty, and the Echo slime joins the journey.", { stats: { Empathy: 1 }, relationships: { Tara: 2 }, unlockSlime: "Echo", villageDelta: 2, resourceGain: { herbs: 1 }, dayCost: 1 }),
      makeChoice("compare-maps", "Overlay Tara's map with the shrine records and recent market routes.", "wisdom", "The changed monsoon paths form a spiral around the sealed lower chambers.", { stats: { Wisdom: 1 }, relationships: { Tara: 2 }, unlockSlime: "Echo", villageDelta: 3, dayCost: 1 }),
      makeChoice("scout-road", "Ask Tara to lead a practical survey of the safest route to the shrine.", "practicality", "The team finds a dry approach through the forest, and Tara accepts you as a field partner.", { stats: { Practicality: 1 }, relationships: { Tara: 2 }, unlockSlime: "Echo", villageDelta: 4, resourceGain: { timber: 1 }, dayCost: 1 }),
    ],
    conditionalBody: [
      {
        text: "The Echo slime's recognition hit Neel before he understood what it was. It was not fear or curiosity. It was the feeling of a creature that had been repeating a sound for a very long time and had finally found someone who could hear it. The birdcall it carried was not a mimicry. It was a question the slime had been asking the forest for months, and the forest had never answered. Neel's presence did not answer it either, but it gave the question somewhere to land.",
        condition: (state) => state.stats.Empathy >= 3,
      },
    ],
  },
  {
    id: 17,
    arc: "Moving Lights",
    title: "A Clinic Under Green Leaves",
    chapterNumber: "17 / 36",
    location: "Kabir's garden clinic",
    weather: "Warm mist and medicinal rain",
    opening: "Kabir had inherited incomplete notes, three dangerous assumptions, and a garden that refused to die.",
    body: [
      "The Herb slimes had begun responding to the symptoms of the land itself. Their leaves curled near the western channel. Kabir suspected contamination but feared being wrong loudly enough to make someone ill.",
      "Neel sensed the Herb slimes' curiosity beside their caution. They would show what they knew if he stopped asking them to prove it. Kabir spread his grandfather's notes on a table and waited for the truth to become less frightening."
    ],
    choices: [
      makeChoice("protect-kabir", "Tell Kabir that uncertainty is a reason to move carefully, not a reason to stop.", "empathy", "Kabir begins documenting negative results instead of hiding them, and the clinic becomes safer.", { stats: { Empathy: 1 }, relationships: { Kabir: 2 }, villageDelta: 3, resourceCost: { herbs: 1 }, dayCost: 1 }),
      makeChoice("test-water", "Design a controlled comparison between clean rainwater and channel water.", "wisdom", "The results reveal a metallic taste in samples drawn below the shrine.", { stats: { Wisdom: 1 }, relationships: { Kabir: 2, Tara: 1 }, villageDelta: 3, dayCost: 1 }),
      makeChoice("clear-garden", "Move the Herb slimes and clinic supplies uphill before the next rain.", "practicality", "The clinic is protected, but the mystery remains beneath the village.", { stats: { Practicality: 1 }, relationships: { Kabir: 1 }, villageDelta: 4, resourceCost: { timber: 1 }, dayCost: 1 }),
    ],
    companionDialogue: [
      {
        companion: "Kabir",
        base: "My grandfather's notes are half guesswork and half genius. I am afraid to trust the genius because it means admitting the guesswork might be mine.",
        variants: [
          { text: "Kabir spread the notes on the table without arranging them. He had stopped needing to look organized in front of Neel. The notes are incomplete, he said, and so am I. But the Herb slimes do not mind incomplete. They work with what is present. Perhaps I should learn to do the same.", condition: (state) => state.relationships.Kabir >= 4 },
        ],
      },
    ],
  },
  {
    id: 18,
    arc: "Moving Lights",
    title: "The Night of Moving Lights",
    chapterNumber: "18 / 36",
    location: "The rain shrine courtyard",
    weather: "Moonless rain, blue fireflies",
    opening: "At midnight, every Lantern slime in the valley began moving toward the shrine.",
    body: [
      "Their lights crossed the fields in a silent procession. Farmers woke to find glowing trails between their homes. The creatures did not look summoned. They looked compelled by something beneath the stone.",
      "Dev arrived with rope and evacuation markers. He had learned to respect frightened creatures because fear made people dangerous when they were ordered to pretend they were calm. The shrine doors stood sealed, but a thin amber line pulsed beneath them."
    ],
    choices: [
      makeChoice("walk-with-lights", "Follow at the Lantern slimes' pace and keep the villagers back.", "empathy", "The procession reaches the sealed doors without panic, and Dev trusts your restraint.", { stats: { Empathy: 1 }, relationships: { Dev: 2 }, villageDelta: 3, resourceCost: { herbs: 1 }, dayCost: 1 }),
      makeChoice("study-pulse", "Count the light pulses and match them to the shrine bell's rhythm.", "wisdom", "The pulse reveals a pressure cycle that may become dangerous with the coming storm.", { stats: { Wisdom: 1 }, relationships: { Tara: 2 }, villageDelta: 3, dayCost: 1 }),
      makeChoice("open-door", "Use Meera's tools to pry the seal before the lights disperse.", "practicality", "The lower entrance opens, but stone falls from the lintel and the shrine becomes unstable.", { stats: { Practicality: 1 }, relationships: { Meera: 1, Dev: -1 }, villageDelta: 4, nextChapterId: 31, resourceCost: { clay: 2 }, dayCost: 1 }),
    ],
    conditionalBody: [
      {
        text: "Neel studied the seal the way Meera had taught him to study a load path. The amber line was not decoration. It followed the grain of the original mortar, which meant the seal had been designed to release under pressure, not to hold forever. The mechanism was old, but it was not broken. It was waiting for the right force in the right place.",
        condition: (state) => state.stats.Practicality >= 4,
      },
      {
        text: "The Echo slime pressed close to Neel's ankle and sent a low ripple toward the sealed doors. The returning sound was wrong. Behind the stone, the air moved in patterns that did not match an empty chamber. Something behind the seal was breathing, or something behind the seal was waiting for the breath to stop.",
        condition: (state) => state.unlockedSlimes.includes("Echo"),
      },
    ],
  },
  {
    id: 19,
    arc: "Moving Lights",
    title: "The Chamber Beneath the Water",
    chapterNumber: "19 / 36",
    location: "The sealed lower chambers",
    weather: "Rain heard through stone",
    opening: "The lower chamber was not a temple. It was a machine built to remember a river.",
    body: [
      "Lantern slimes lit channels carved beneath the shrine. Crystals had grown in the joints, glowing with a sickly silver sheen. Kabir's tests confirmed the metallic contamination. The shrine had not stopped working; it had been choking for decades.",
      "One Lantern slime pressed against a crystal and dimmed. Neel felt its pain, then a memory that was not his: workers sealing a lower gate after a flood, leaving the valley's water cycle balanced on a temporary repair."
    ],
    choices: [
      makeChoice("free-lantern", "Pull the Lantern slime away and tend to it before examining the crystal.", "empathy", "The creature recovers, and its renewed glow reveals a second, safer path around the contamination.", { stats: { Empathy: 1 }, relationships: { Kabir: 1, Tara: 1 }, unlockSlime: "Lantern", villageDelta: 3, resourceGain: { herbs: 1 }, dayCost: 1 }),
      makeChoice("decode-gate", "Use the light pattern to reconstruct the old gate sequence.", "wisdom", "You learn the lower gate must be opened during a storm, when pressure can clear the channels.", { stats: { Wisdom: 1 }, relationships: { Tara: 2 }, unlockSlime: "Lantern", villageDelta: 4, dayCost: 1 }),
      makeChoice("break-crystal", "Have Meera fracture the nearest crystal before it poisons more water.", "practicality", "The chamber vents contaminated water into a side channel, buying time at a dangerous cost.", { stats: { Practicality: 1 }, relationships: { Meera: 1, Kabir: -1 }, unlockSlime: "Lantern", villageDelta: 5, resourceGain: { timber: 1 }, dayCost: 1 }),
    ],
    conditionalBody: [
      {
        text: "The memory that was not his arrived with the force of a hand on his chest. He saw the workers clearly, their hands raw from stone, their faces set with the grim patience of people sealing a gate they knew would trap something below. They had argued. One had refused. The others had overruled him. The refusing worker's face lingered longest, and Neel understood with a sick certainty that the man had known what the dormancy would cost the creatures left behind. The memory faded, but the worker's face stayed, a warning from a generation that had chosen convenience over care and sealed the consequences beneath the stone.",
        condition: (state) => state.stats.Empathy >= 4,
      },
    ],
  },
  {
    id: 20,
    arc: "Moving Lights",
    title: "The Storm Ledger",
    chapterNumber: "20 / 36",
    location: "The shrine's upper gallery",
    weather: "The valley pressure drops",
    opening: "Tara's map, Kabir's tests, and Dev's weather marks agreed on one thing: the next storm would be the largest in living memory.",
    body: [
      "The village could not evacuate everyone. The bridge was still unfinished, the lower road was already soft, and the shrine channels needed the storm to clear the contamination. Saving Varsha Hollow would require letting the rain in without letting it take the village away.",
      "Every friend argued for a different priority. Meera wanted the bridge. Leela wanted supplies and a fair ration plan. Tara wanted the shrine opened. Kabir wanted time to prepare the clinic. Dev wanted every household counted before nightfall."
    ],
    choices: [
      makeChoice("hear-all", "Make the plan a council and let each companion name one non-negotiable need.", "empathy", "The final plan belongs to the whole village, and no single person's fear has to carry it alone.", { stats: { Empathy: 1 }, relationships: { Meera: 1, Leela: 1, Tara: 1, Kabir: 1, Dev: 1 }, villageDelta: 5, resourceCost: { herbs: 1 }, dayCost: 1 }),
      makeChoice("model-storm", "Build a shared pressure map from every piece of evidence.", "wisdom", "The storm route becomes legible enough to assign the right slime to the right danger.", { stats: { Wisdom: 1 }, relationships: { Tara: 1, Dev: 1 }, villageDelta: 5, dayCost: 1 }),
      makeChoice("assign-posts", "Choose the most urgent posts and start moving supplies immediately.", "practicality", "The village gains precious hours, but some companions feel their priorities were decided for them.", { stats: { Practicality: 1 }, relationships: { Meera: 1, Leela: 1 }, villageDelta: 6, resourceCost: { timber: 3 }, dayCost: 1 }),
    ],
    conditionalBody: [
      {
        text: "Meera unrolled the bridge plans without being asked. She had been waiting for this storm the way a builder waits for the load that will prove the structure. Her mother's bridge had never been finished. Meera intended to finish it tonight, in the rain, with Clay slimes and salvaged timber and whatever Neel could give her from the shrine below. She did not say this. She did not need to. The plans were already on the table.",
        condition: (state) => state.relationships.Meera >= 5,
      },
      {
        text: "Dev had counted every household twice. He carried the numbers in his head the way other men carried prayers, repeating them under his breath as he moved through the village. Three families near the eastern road. Two elders above the clinic. One child who had not been seen since the Lantern slimes began moving. Dev did not share his fear. He shared his count, and the count was its own kind of courage.",
        condition: (state) => state.relationships.Dev >= 5,
      },
      {
        text: "The monsoon was close. Tara had seen the clouds building over the ridge, and the village could feel them too. There was no time left for careful work.",
        condition: (state) => state.path === "keeper" && !!state.resources && state.resources.days < 8,
      },
    ],
    summaryBeat: "The Moving Lights arc closes beneath the shrine. The slimes were not causing the valley's sickness; they were trying to lead it back toward balance.",
  },
  {
    id: 21,
    arc: "Great Storm",
    title: "The Sky Turns Black",
    chapterNumber: "21 / 36",
    location: "Varsha Hollow before the storm",
    weather: "Pressure like a held breath",
    opening: "The storm arrived before the thunder did.",
    body: [
      "Birds vanished from the fields. The river rose without rain. Dev organized the village into three rings: homes that could hold, shelters that could be reinforced, and paths that had to remain open for rescue. Leela distributed grain by household count, not by who shouted loudest.",
      "Neel felt fear everywhere. The Dew slimes shivered in the channels. Clay slimes pressed against the bridge foundations. Lantern slimes gathered at the shrine doors. Every creature seemed to know that the coming rain would ask for more than skill."
    ],
    choices: [
      makeChoice("calm-rings", "Visit each slime group and establish a shared signal for stop, danger, and rest.", "empathy", "The slimes gain a way to protect one another when Neel cannot be everywhere.", { stats: { Empathy: 1 }, relationships: { Dev: 2 }, villageDelta: 4, resourceCost: { herbs: 1 }, dayCost: 1 }),
      makeChoice("check-count", "Audit the household and supply lists with Dev and Leela.", "wisdom", "Two missing families are found before the roads vanish under water.", { stats: { Wisdom: 1 }, relationships: { Leela: 1, Dev: 1 }, villageDelta: 5, dayCost: 1 }),
      makeChoice("reinforce-bridge", "Join Meera at the bridge before the first surge reaches it.", "practicality", "The bridge gains a final support, but the village loses your help elsewhere for an hour.", { stats: { Practicality: 1 }, relationships: { Meera: 2 }, villageDelta: 6, resourceCost: { timber: 3 }, dayCost: 1 }),
    ],
    conditionalBody: [
      {
        text: "The fear was not coming from one direction. It came from everywhere at once, a chorus of small creatures reading the valley's pressure the way a sailor reads a barometer. Neel stood in the square and let the chorus move through him. The Dew slimes' fear was thin and bright, like a wire pulled taut. The Clay slimes' fear was dense and slow, a weight that pressed downward. The Lantern slimes' fear flickered, on and off, as if they were trying to decide whether to be brave. And beneath all of it, from the shrine below, came the oldest fear of all, the fear of something that had been sealed in the dark and was about to feel the sky again.",
        condition: (state) => state.stats.Empathy >= 4,
      },
    ],
  },
  {
    id: 22,
    arc: "Great Storm",
    title: "The Water Takes the Road",
    chapterNumber: "22 / 36",
    location: "The flooded eastern lane",
    weather: "Rain without horizon",
    opening: "When the rain finally fell, it erased the road between one breath and the next.",
    body: [
      "Echo slimes carried sound through the flood. Tara followed their ripples toward a family trapped in an abandoned mill. Dev formed a rope line while Dew slimes purified the shallowest pools. Every decision was smaller than heroism and more important than it.",
      "At the shrine, the Lantern slimes began to dim. The contaminated channels were opening, but debris had blocked the final gate. The village could rescue people or save the water system first. It could not pretend the choice was painless."
    ],
    choices: [
      makeChoice("rescue-first", "Send every available team to the mill and trust the Lantern slimes to hold the gate.", "empathy", "The stranded family returns safely, and the slimes keep the gate open by sharing their light.", { stats: { Empathy: 1 }, relationships: { Tara: 2, Dev: 1 }, villageDelta: 4, resourceCost: { herbs: 1 }, dayCost: 1 }),
      makeChoice("split-teams", "Divide the teams by signal: rescue, clinic, bridge, and shrine.", "wisdom", "The plan is fragile but balanced, giving each danger a person and a slime to answer it.", { stats: { Wisdom: 1 }, relationships: { Tara: 1, Dev: 1, Kabir: 1 }, villageDelta: 5, dayCost: 1 }),
      makeChoice("gate-first", "Clear the shrine gate before the flood rises higher.", "practicality", "Water begins to move through the old channels, but the rescue team reaches the mill late.", { stats: { Practicality: 1 }, relationships: { Tara: -1, Dev: -1 }, villageDelta: 7, nextChapterId: 33, resourceCost: { timber: 1, grain: 2 }, dayCost: 1 }),
    ],
    conditionalBody: [
      {
        text: "Tara found Neel at the rope line and spoke quickly, the way she spoke only when she trusted the person listening. The eastern road was not the only flood. A second surge was building behind the ridge, and the mill family had maybe an hour before the water reached the second storey. She had not shared this with Dev. She was sharing it with him.",
        condition: (state) => state.relationships.Tara >= 4,
      },
      {
        text: "The village moved through the flood with a readiness that would have been impossible a season ago. Rope lines were already knotted. Supply caches were already placed. The work of the forty roofs and the market and the clinic had not just repaired buildings. It had built a village that knew what to do when the water came.",
        condition: (state) => state.villageProgress > 50,
      },
    ],
  },
  {
    id: 23,
    arc: "Great Storm",
    title: "The Bridge of Spirits",
    chapterNumber: "23 / 36",
    location: "The old bridge",
    weather: "Wind driving rain sideways",
    opening: "Meera's bridge flexed like a living thing beneath the river's anger.",
    body: [
      "Clay slimes packed the foundations, but the current kept peeling their work away. Meera shouted for Neel to stop asking them to harden. The river was moving the wrong way through the stone. They needed to shape a path for the water, not simply build a wall against it.",
      "The old bridge carried her mother's design: graceful arches meant to let floods pass beneath. The final repair would either restore that idea or bury it beneath a barricade."
    ],
    choices: [
      makeChoice("trust-meera", "Let Meera lead the Clay slimes without correcting her from the riverbank.", "empathy", "Meera's confidence steadies the whole bridge crew, and the slimes follow her memory of the design.", { stats: { Empathy: 1 }, relationships: { Meera: 2 }, villageDelta: 5, resourceCost: { herbs: 1 }, dayCost: 1 }),
      makeChoice("read-current", "Use the Echo slimes to map the river's pressure through sound.", "wisdom", "The hidden arch becomes visible in the water, showing where the flood wants to go.", { stats: { Wisdom: 1 }, relationships: { Tara: 1, Meera: 1 }, villageDelta: 6, dayCost: 1 }),
      makeChoice("brace-arch", "Order the Clay slimes to harden the bridge immediately around the weakest span.", "practicality", "The span holds for now, but the old design may be lost beneath the emergency repair.", { stats: { Practicality: 1 }, relationships: { Meera: -1 }, villageDelta: 6, resourceCost: { timber: 2 }, dayCost: 1 }),
      { ...makeChoice("shape-the-arch", "Shape the arch yourself, the way Meera's mother designed it, and let the Clay slimes follow your hands.", "empathy", "The arch takes form under Neel's hands as Meera watches without speaking. The bridge remembers its original shape, and Meera remembers why she trusted him.", { stats: { Empathy: 1 }, relationships: { Meera: 3 }, villageDelta: 7, resourceCost: { herbs: 1 }, dayCost: 1 }), requires: { relationship: { Meera: 5 } } },
    ],
    conditionalBody: [
      {
        text: "The Echo slime pressed against Neel's ankle and sent a ripple toward the river. The returning sound painted the water's shape in his mind, every current and counter-current, every hidden stone and submerged log. The river was not angry. It was lost. The old channel beneath the bridge was the path it was searching for, and the Clay slimes' work was not a wall against the water. It was a guide back to the route the river had forgotten.",
        condition: (state) => state.unlockedSlimes.includes("Echo"),
      },
    ],
  },
  {
    id: 24,
    arc: "Great Storm",
    title: "The Gate Opens",
    chapterNumber: "24 / 36",
    location: "The lower rain shrine",
    weather: "Thunder beneath the earth",
    opening: "At the heart of the storm, the shrine inhaled.",
    body: [
      "Lantern slimes gathered around the contaminated crystal while Herb slimes marked safe stone with green light. Kabir carried his notes inside his shirt. Tara held the map. Dev counted the retreat route. Meera placed the final tool beside the gate and looked at Neel only once.",
      "Neel could feel every slime at the edge of exhaustion. The gate needed one coordinated surge of pressure, but forcing them would repeat the old cruelty that had poisoned the shrine in the first place. The only path forward was to ask, listen, and let them choose the moment."
    ],
    choices: [
      makeChoice("ask-consent", "Open your senses and wait until every slime answers with the same rhythm.", "empathy", "The gate opens as a shared decision, and the contaminated water is carried away without breaking the channel walls.", { stats: { Empathy: 1 }, relationships: { Meera: 1, Tara: 1, Kabir: 1, Dev: 1 }, villageDelta: 7, resourceCost: { herbs: 1 }, dayCost: 1 }),
      makeChoice("follow-sequence", "Use the decoded pressure cycle and give each slime one measured signal.", "wisdom", "The gate opens cleanly, proving that patience and precision can be forms of courage.", { stats: { Wisdom: 1 }, relationships: { Tara: 2, Kabir: 1 }, villageDelta: 8, nextChapterId: 35, dayCost: 1 }),
      makeChoice("take-control", "Push the sequence through before the chamber floods.", "practicality", "The channel clears, but the surge leaves several slimes dim and Neel unable to sense them for a moment.", { stats: { Practicality: 1 }, relationships: { Kabir: -1, Dev: -1 }, villageDelta: 8, nextChapterId: 36, resourceCost: { timber: 4, clay: 2 }, dayCost: 1 }),
      { ...makeChoice("rebuild-gate", "Rebuild the gate with everything we have.", "practicality", "The gate is rebuilt from the village's last stores, and the structure that emerges is not a repair. It is a monument to everything Varsha Hollow was willing to give. The channels open wide, and the water runs cleaner than it has in generations.", { stats: { Practicality: 1 }, relationships: { Meera: 2, Tara: 2 }, villageDelta: 8, nextChapterId: 35, resourceCost: { timber: 4, clay: 3 }, dayCost: 1 }), requires: { resourceMinimum: { timber: 4, clay: 3 } } },
    ],
    reactiveBody: [
      {
        base: "The shrine held its breath, and so did the village.",
        variants: [
          { text: "Neel's empathy had become a kind of map. He could feel every slime in the chamber as a point of warmth or cold, and the gate was not a mechanism to him. It was a conversation he had been preparing for since the first cup of dew.", condition: (state) => state.stats.Empathy >= state.stats.Wisdom && state.stats.Empathy >= state.stats.Practicality },
          { text: "Neel's wisdom had become a kind of architecture. Every pattern the shrine had revealed, the bell, the channels, the pressure cycle, assembled itself into a single sequence. The gate was a problem he had already solved in every piece. Now the pieces had to move together.", condition: (state) => state.stats.Wisdom > state.stats.Empathy && state.stats.Wisdom >= state.stats.Practicality },
          { text: "Neel's practicality had become a kind of instinct. The chamber was a worksite, the gate was a job, and the slimes were a crew he had learned to move. He knew what could be forced and what could not, and he knew the cost of confusing the two.", condition: (state) => state.stats.Practicality > state.stats.Empathy && state.stats.Practicality > state.stats.Wisdom },
        ],
      },
      {
        base: "The village's prosperity had carried them to this moment.",
        variants: [
          { text: "Varsha Hollow had climbed from Survival through Recovery and into Connection. The village that had barely held forty roofs now stood in the lower shrine as a single body, and the gate would open because they had learned to move together.", condition: (state) => state.villageProgress < 40 },
          { text: "Varsha Hollow had grown into Connection and was reaching toward Growth. The village's confidence was not loud. It was the steady hand of people who had repaired too many walls to panic at one more.", condition: (state) => state.villageProgress >= 40 && state.villageProgress < 60 },
          { text: "Varsha Hollow stood at the edge of Identity. The village had become more than its survival, and the gate was the last door between the hollow they had built and the hollow they were about to become.", condition: (state) => state.villageProgress >= 60 },
        ],
      },
    ],
    conditionalBody: [
      {
        text: "Meera stood at his shoulder, and her presence was the steadiest thing in the room. She did not tell him what to do. She had stopped needing to. Her trust was a tool he had earned, and he could feel its weight beside him like a beam bracing a wounded wall.",
        condition: (state) => state.relationships.Meera >= 5,
      },
      {
        text: "Tara's map was in his hand, and her faith was in the way she had handed it to him without instruction. She had tracked the valley's water for a season. Now the valley's water was about to move, and she trusted him to know where.",
        condition: (state) => state.relationships.Tara >= 5,
      },
      {
        text: "The gate's repair would take everything the village had left. Meera looked at the pile, then at the gate, then at the pile again. She did not say it was impossible. She did not need to.",
        condition: (state) => state.path === "keeper" && !!state.resources && state.resources.timber < 3 && state.resources.clay < 2,
      },
    ],
  },
  {
    id: 25,
    arc: "Great Storm",
    title: "A Village That Chooses Tomorrow",
    chapterNumber: "25 / 36",
    location: "The reopened rain shrine",
    weather: "Clear rain after the storm",
    opening: "Morning found Varsha Hollow bruised, flooded, and still standing.",
    body: [
      "The bridge had survived. The homes had held. The shrine channels carried clean water again, not as a miracle, but as the result of hundreds of small acts performed by people and slimes who had learned to trust one another. The village would still have waste, hunger, land disputes, and traders who wanted to profit from hope.",
      "A family from the ruined settlement upstream arrived with their belongings wrapped in oilcloth. They asked whether Varsha Hollow had room for one more hearth. Neel looked at the repaired roofs, the market stalls, the clinic garden, and the slimes resting beside their chosen partners. For the first time, the answer did not depend on him alone."
    ],
    choices: [
      makeChoice("welcome-family", "Welcome the family first, then ask the village how to make room.", "empathy", "Varsha Hollow gains its first new family, and the village's future becomes a shared responsibility.", { stats: { Empathy: 1 }, relationships: { Meera: 1, Leela: 1, Tara: 1, Kabir: 1, Dev: 1 }, villageDelta: 10, nextChapterId: 25, dayCost: 1 }),
      makeChoice("write-charter", "Invite the family to help draft the village's first sanctuary charter.", "wisdom", "The village names its values before it names its expansion, and the rain shrine becomes a school as well as a refuge.", { stats: { Wisdom: 1 }, relationships: { Tara: 1, Kabir: 1, Leela: 1 }, villageDelta: 10, nextChapterId: 25, dayCost: 1 }),
      makeChoice("build-hearth", "Put everyone to work restoring an empty home before the sun sets.", "practicality", "The new family has a roof by nightfall, and Varsha Hollow enters Identity through work it can repeat.", { stats: { Practicality: 1 }, relationships: { Meera: 1, Dev: 1 }, villageDelta: 10, nextChapterId: 25, dayCost: 1 }),
    ],
    conditionalBody: [
      {
        text: "Meera found Neel on the bridge after the family had settled. She did not speak for a long time. Then she said, quietly, that her mother would have liked the way the arches held. She did not say anything else. She did not need to.",
        condition: (state) => state.relationships.Meera >= 5,
      },
      {
        text: "Tara sat on the shrine steps with her map across her knees and a cup of clean water beside her. She looked up when Neel passed and nodded once, the nod of a scout who had decided the valley was worth staying in. She folded the map and put it away. She would draw a new one tomorrow.",
        condition: (state) => state.relationships.Tara >= 5,
      },
      {
        text: "Kabir walked the clinic garden with the Herb slimes trailing behind him like students who had forgotten the lesson was over. He had stopped fearing being wrong. He had started teaching others how to be wrong safely, and the garden was fuller for it.",
        condition: (state) => state.relationships.Kabir >= 5,
      },
      {
        text: "Leela stood at the market ledger and did not write in it. She watched the new family cross the square, and for the first time in a season, the columns in her head were not about debt. They were about who the village had room to become.",
        condition: (state) => state.relationships.Leela >= 5,
      },
      {
        text: "Dev counted the village one final time before the rain stopped. Every household accounted for. Every roof sound. Every slime paired with a keeper. He closed his ledger and let the silence sit. Protection, he had learned, was not a wall. It was the practice of knowing everyone's name.",
        condition: (state) => state.relationships.Dev >= 5,
      },
    ],
    summaryBeat: "The Great Storm arc closes with Varsha Hollow entering Identity. It is still small and imperfect, but it has begun to believe in its future.",
    isEnding: true,
  },
  {
    id: 26,
    arc: "Forgotten Channels",
    title: "The Map Beneath the Map",
    chapterNumber: "26 / 36",
    location: "The shrine archive",
    weather: "Clouds thickening over broken stone",
    opening: "The half-burned map showed water where no water had flowed in living memory.",
    body: [
      "Tara arrived at the shrine before dawn with the salvaged map and a lantern she did not trust. The paper showed channels running beneath the village like veins beneath skin, feeding cisterns that had been sealed and forgotten after a flood two generations back. Neel felt the Dew slimes stir in the reservoir above. They knew something was below them. They had always known.",
      "Tara traced the deepest line with her finger. It ran from the shrine, beneath the council veranda, and out to the eastern fields. If the channel still existed, it could carry monsoon water to every cistern in Varsha Hollow without relying on the broken surface channels. But the entrance was beneath the shrine floor, and the shrine had its own opinion about being opened.",
    ],
    choices: [
      makeChoice("descend-carefully", "Ask the Dew slimes to sense the air quality before anyone descends.", "empathy", "The slimes find the air stale but safe, and their confidence steadies Tara's hand.", { stats: { Empathy: 1 }, relationships: { Tara: 2 }, villageDelta: 3, nextChapterId: 27, resourceGain: { herbs: 1 }, dayCost: 1 }),
      makeChoice("map-first", "Sketch the full channel route before opening the sealed entrance.", "wisdom", "Tara gains a reference she can trust, and the expedition begins with a plan instead of a guess.", { stats: { Wisdom: 1 }, relationships: { Tara: 2 }, villageDelta: 3, nextChapterId: 27, dayCost: 1 }),
      makeChoice("break-entrance", "Pry the sealed entrance open with Meera's tools before the rain arrives.", "practicality", "The entrance opens, but dust cascades into the shrine and the villagers above flinch at the noise.", { stats: { Practicality: 1 }, relationships: { Meera: 1 }, villageDelta: 4, nextChapterId: 27, resourceGain: { timber: 2 }, dayCost: 1 }),
    ],
    conditionalBody: [
      {
        text: "Neel traced the map's deepest line with his finger and felt the logic of it settle into place. The channels were not random. They followed the valley's natural drainage, amplified by stone into a distribution network. Each branch served a cistern, each cistern served a cluster of homes, and the whole system was designed to equalize water across the village rather than concentrate it. The clerk who had drawn this map understood something the village had forgotten: that water was not a resource to be hoarded but a current to be shared. The map was not a record. It was an argument for a different kind of prosperity.",
        condition: (state) => state.stats.Wisdom >= 4,
      },
      {
        text: "The Dew slimes stirred in the reservoir above, and Neel felt what they felt: a pull. Not hunger or fear, but a directional awareness, a sense of something below them that they had been separated from for too long. The channels beneath the shrine were not empty to the slimes. They were family they had been kept from, and the sealed entrance was not a barrier. It was a wound.",
        condition: (state) => state.stats.Empathy >= 4,
      },
    ],
  },
  {
    id: 27,
    arc: "Forgotten Channels",
    title: "The Drowned Workshop",
    chapterNumber: "27 / 36",
    location: "Beneath the rain shrine",
    weather: "Dripping stone, echoes of old rain",
    opening: "The channels were not empty. They were waiting.",
    body: [
      "Lantern light caught the edges of a workshop that had been sealed since before Neel's grandmother was born. Stone benches held the remnants of old tools. Channels carved into the walls showed where water had been directed, tested, and released. In the deepest corner, a colony of Clay slimes had survived in dormancy, their bodies dense and dark, shaped by decades of stillness.",
      "Neel knelt beside them. Their impressions were slow and deep, like the memory of a river that had learned patience. They remembered the workers who had maintained the channels. They remembered the flood that had drowned the workshop. And they remembered the order to seal the gates above, which had trapped them here with nothing to do but wait.",
    ],
    choices: [
      makeChoice("wake-gently", "Wake the dormant Clay slimes by reintroducing the feeling of moving water.", "empathy", "The old Clay slimes stir with a cautious joy, and one shapes a perfect arch from memory.", { stats: { Empathy: 1 }, relationships: { Tara: 1 }, unlockSlime: "Clay", villageDelta: 4, nextChapterId: 28, resourceGain: { herbs: 1 }, dayCost: 1 }),
      makeChoice("study-tools", "Document the workshop tools and channel mechanisms before disturbing anything.", "wisdom", "Tara records a system that could restore the village's water independence within a season.", { stats: { Wisdom: 1 }, relationships: { Tara: 2 }, unlockSlime: "Clay", villageDelta: 4, nextChapterId: 28, dayCost: 1 }),
      makeChoice("clear-channel", "Have the awakened Clay slimes begin clearing the blocked junction immediately.", "practicality", "The channel opens faster than expected, but the old slimes move with the stiffness of long disuse.", { stats: { Practicality: 1 }, relationships: { Tara: 1 }, unlockSlime: "Clay", villageDelta: 5, nextChapterId: 28, resourceGain: { clay: 2 }, dayCost: 1 }),
    ],
    conditionalBody: [
      {
        text: "The dormant Clay slimes' memories arrived in layers, each one deeper and older than the last. The topmost layer was the flood, chaotic and sharp. Beneath it was the working season, steady and purposeful, the feeling of shaping stone that would carry water to people who needed it. And beneath that, oldest of all, was the moment of their making, a craftsman's hands pressing them into shape and whispering a word they had carried for generations. The word was not a command. It was a name. Each of them had been named, and each had remembered its name in the dark, alone, for longer than any human life.",
        condition: (state) => state.stats.Empathy >= 4,
      },
      {
        text: "Neel studied the workshop tools with the eye of someone who understood systems. The channel mechanisms were not simple valves. They were pressure regulators, each one calibrated to open at a specific water weight. The old engineers had designed for monsoon surges, not trickles. The system would only work at full flow, which meant it had been built for storms, not for the slow decline the village had suffered. The channels were not broken by age. They were broken by the absence of the rain they had been designed to receive.",
        condition: (state) => state.stats.Wisdom >= 4,
      },
    ],
  },
  {
    id: 28,
    arc: "Forgotten Channels",
    title: "What the Channels Knew",
    chapterNumber: "28 / 36",
    location: "The channel junction beneath the village",
    weather: "First rain reaching stone",
    opening: "The rain found the channels before the village found the roofs.",
    body: [
      "At the junction where three channels met, Neel and Tara found the heart of the old system. A stone wheel had once directed monsoon flow to different parts of the village. The Clay slimes pressed against it, and Neel felt their recognition: this was the shape they had been made to remember. One turn would send water to the eastern cisterns. Another would feed the council veranda. A third would flush the contaminated lower channels.",
      "Tara marked the junction on her map and looked at Neel. The channel system could serve every roof cistern in the village, but only if the roofs were sound. The knowledge did not replace the forty roofs. It gave them a reason to matter.",
    ],
    choices: [
      makeChoice("share-knowledge", "Return to the surface and share the channel map with the whole village.", "empathy", "The village sees the roof work as part of a larger promise, and volunteers double.", { stats: { Empathy: 1 }, relationships: { Meera: 2, Dev: 1 }, villageDelta: 5, nextChapterId: 10, resourceGain: { herbs: 1 }, dayCost: 1 }),
      makeChoice("integrate-plans", "Merge Tara's channel map with Meera's roof repair schedule.", "wisdom", "Every roof cistern is aligned with a channel feed, and the village gains a unified water plan.", { stats: { Wisdom: 1 }, relationships: { Tara: 2, Meera: 1 }, villageDelta: 5, nextChapterId: 10, dayCost: 1 }),
      makeChoice("rush-roofs", "Send the Clay slimes to the surface to accelerate the roof repairs before the rain.", "practicality", "The old Clay slimes bring decades of shaped memory to the roofs, and the work leaps forward.", { stats: { Practicality: 1 }, relationships: { Meera: 2 }, villageDelta: 6, nextChapterId: 10, resourceGain: { timber: 2 }, dayCost: 1 }),
    ],
    conditionalBody: [
      {
        text: "The stone wheel was not just a mechanism. It was a calendar. Each position corresponded to a phase of the monsoon, and the old engineers had carved the water routes to match the season's rhythm. Neel read the carvings the way Tara read maps, seeing not just the shape but the intent. The system was designed to listen to the rain and respond, opening and closing channels as the water rose and fell. It was not a machine to be operated. It was a conversation to be joined.",
        condition: (state) => state.stats.Wisdom >= 4,
      },
      {
        text: "The Clay slimes pressed against the stone wheel and Neel felt their joy. It was a deep, slow joy, the kind that comes from finding a purpose that was thought to be lost. They remembered this wheel. They remembered turning it. Their bodies had been shaped by decades of stillness, but the shape inside them, the shape of who they were, had never stopped being the keepers of the junction. They pressed against the stone and began to turn, and the turning was a homecoming.",
        condition: (state) => state.stats.Empathy >= 3,
      },
    ],
    summaryBeat: "The Forgotten Channels arc closes with a map of the village's hidden water. The forty roofs gain a deeper purpose: every sound roof feeds a cistern, and every cistern feeds the village.",
  },
  {
    id: 29,
    arc: "Hollow Market",
    title: "The Jar Garden",
    chapterNumber: "29 / 36",
    location: "Behind Kabir's clinic",
    weather: "Soft rain under a lean-to roof",
    opening: "The freed slimes huddled in the garden like refugees from a country no one admitted existed.",
    body: [
      "Neel carried the painted jars behind Kabir's clinic, where the Herb slimes had already cleared a corner of soft soil. The counterfeit creatures flinched at every shadow. Their impressions were a tangle of learned fear: perform or be struck, perform or go hungry, perform or be sold again. Kabir did not ask where they came from. He mixed a poultice of rainwater and crushed leaf and set it where the slimes could find it at their own pace.",
      "By evening, one of the smaller creatures uncurled. Its body was the color of a bruised sky, and it had been painted to look like a Dew slime. Beneath the pigment, it was something older, a strain Neel had never sensed. It did not know its own name. It only knew that the hand above it was not raised.",
    ],
    choices: [
      makeChoice("shelter-first", "Build a covered sanctuary before anything else.", "empathy", "The slimes gain a safe boundary, and Kabir begins calling the garden the quiet ward.", { stats: { Empathy: 1 }, relationships: { Kabir: 2 }, villageDelta: 3, nextChapterId: 30, resourceCost: { herbs: 2 }, dayCost: 1 }),
      makeChoice("catalog-strain", "Document the unknown slime strain before its paint fades.", "wisdom", "Kabir records a lineage that may predate the Academy's classifications.", { stats: { Wisdom: 1 }, relationships: { Kabir: 2, Tara: 1 }, villageDelta: 3, nextChapterId: 30, dayCost: 1 }),
      makeChoice("ask-village", "Invite the village to see the sanctuary before rumors spread.", "practicality", "The villagers arrive cautiously, and several leave with a new understanding of what trade had cost.", { stats: { Practicality: 1 }, relationships: { Kabir: 1, Dev: 1 }, villageDelta: 4, nextChapterId: 30, resourceCost: { timber: 1 }, dayCost: 1 }),
    ],
    conditionalBody: [
      {
        text: "The freed slimes' fear was not a single emotion. It was a braid. Neel sat with them in the garden and felt each strand separately: the fear of hands, sharp and immediate; the fear of jars, claustrophobic and slow; the fear of performance, a constant low hum that said produce or be punished. And beneath all three, woven through them like a thread that had been pulled too tight, was the fear of hope. They had been promised kindness before. The promise had been broken. Every gentle hand they encountered now was a test, and Neel understood that the test was not whether he could heal them. It was whether he could keep showing up after they flinched.",
        condition: (state) => state.stats.Empathy >= 4,
      },
      {
        text: "Kabir knelt beside the bruised-sky slime and did not reach for it. He had learned this from Neel, though he would not have said so. He simply waited, his hands open on his knees, until the creature uncurled enough to taste the poultice. Kabir's patience was not natural. It was practiced, the way a musician practices silence between notes. He had become a healer who understood that the first intervention was sometimes no intervention at all.",
        condition: (state) => state.relationships.Kabir >= 4,
      },
    ],
  },
  {
    id: 30,
    arc: "Hollow Market",
    title: "The Word Spreads",
    chapterNumber: "30 / 36",
    location: "The sanctuary garden",
    weather: "Clear morning after rain",
    opening: "The news traveled the way good news does, slowly, and in the voices of people who had seen it themselves.",
    body: [
      "A trader from the eastern road arrived with two jars of his own. He did not try to sell them. He set them at the garden gate and asked whether Varsha Hollow could teach his slimes to trust again. Leela watched the exchange from the clinic porch and began rewriting her market plan in her head.",
      "The sanctuary was not free. It cost grain, time, and Kabir's patience. But it gave Varsha Hollow something the market alone could not: a reputation for care that reached beyond its walls. By the time the second market day arrived, the ethical code Leela had been drafting had gained a preamble no one expected: every creature that enters the hollow is owed shelter, rest, and the chance to remember its own name.",
    ],
    choices: [
      makeChoice("welcome-trader", "Accept the trader's slimes and offer to train his keepers in return.", "empathy", "The sanctuary becomes a regional promise, and Varsha Hollow gains its first ally beyond the valley.", { stats: { Empathy: 1 }, relationships: { Leela: 2, Kabir: 1 }, villageDelta: 5, nextChapterId: 15, resourceCost: { herbs: 1 }, dayCost: 1 }),
      makeChoice("set-terms", "Draft a care agreement before accepting any outside slimes.", "wisdom", "Leela gains a framework that protects the sanctuary from becoming a dumping ground.", { stats: { Wisdom: 1 }, relationships: { Leela: 2 }, villageDelta: 5, nextChapterId: 15, dayCost: 1 }),
      makeChoice("open-market", "Reopen the market with the sanctuary as its centerpiece.", "practicality", "The market reopens with a new identity, and the sanctuary funds itself through ethical trade.", { stats: { Practicality: 1 }, relationships: { Leela: 2, Kabir: 1 }, villageDelta: 6, nextChapterId: 15, resourceCost: { timber: 1 }, resourceGain: { grain: 2 }, dayCost: 1 }),
    ],
    conditionalBody: [
      {
        text: "The freed slimes had begun to change. Their bodies were still bruised, still wary, but the paint was fading and beneath it their true colors were emerging, each one distinct, each one older than the false identities that had been forced on them. Neel felt their emotions shifting from survival toward something more tentative and more precious: curiosity. They were beginning to wonder what the garden was, and what a garden might mean, and whether the hands that tended it might be different from the hands that had sold them.",
        condition: (state) => state.stats.Empathy >= 3,
      },
    ],
    companionDialogue: [
      {
        companion: "Kabir",
        base: "The sanctuary is not a ward. It is a promise. Every creature that enters this garden is owed the chance to remember what it was before someone decided what it was worth.",
        variants: [
          { text: "Kabir stood in the garden with the Herb slimes circling his feet and the freed creatures watching from the shadows. He looked at Neel with the expression of a man who had found the thing he was meant to do. This is the clinic I always wanted, he said. Not a place where I fix what is broken. A place where I wait beside what is healing.", condition: (state) => state.relationships.Kabir >= 4 },
        ],
      },
    ],
    summaryBeat: "The Hollow Market arc bends toward care. Varsha Hollow's reputation reaches beyond the valley, and the ethical code gains a soul as well as a spine.",
  },
  {
    id: 31,
    arc: "Moving Lights",
    title: "The Fall of Stone",
    chapterNumber: "31 / 36",
    location: "The shrine entrance",
    weather: "Dust and rain mixing",
    opening: "The seal did not break cleanly. It broke like a promise.",
    body: [
      "Stone cascaded from the lintel in a curtain of dust and fractured mortar. The Lantern slimes scattered, their lights stuttering. Dev pulled Neel back by the shoulder as a second slab groaned against the doorframe. The entrance was open, but the shrine above it was now wounded.",
      "Meera arrived with props and a temper. She braced the lintel with two salvaged beams and told Neel, without softness, that the shrine had been holding itself together for longer than anyone had guessed. The lower chambers were accessible, but the upper structure would need repair before the next storm. The investigation had just become a rescue of the shrine itself.",
    ],
    choices: [
      makeChoice("steady-slimes", "Calm the scattered Lantern slimes before continuing downward.", "empathy", "The slimes regroup, and their renewed light shows a safer path around the debris.", { stats: { Empathy: 1 }, relationships: { Dev: 1, Meera: 1 }, unlockSlime: "Lantern", villageDelta: 3, nextChapterId: 32, resourceCost: { herbs: 1 }, dayCost: 1 }),
      makeChoice("assess-damage", "Help Meera document the structural damage before descending.", "wisdom", "Meera gains a repair plan that will save the shrine if the team can finish below in time.", { stats: { Wisdom: 1 }, relationships: { Meera: 2 }, unlockSlime: "Lantern", villageDelta: 3, nextChapterId: 32, dayCost: 1 }),
      makeChoice("shore-and-go", "Shore up the entrance fast and push into the lower chambers.", "practicality", "The team descends quickly, but the temporary braces creak with every shift of stone above.", { stats: { Practicality: 1 }, relationships: { Meera: -1, Dev: -1 }, unlockSlime: "Lantern", villageDelta: 4, nextChapterId: 32, resourceCost: { timber: 2 }, dayCost: 1 }),
    ],
    conditionalBody: [
      {
        text: "Neel read the fracture lines the way Meera had taught him to read a load path, but faster, because the stone was still moving. The lintel had not failed at its weakest point. It had failed at the point where two different eras of construction met, the original shrine stone and a later repair that had been mortared without keying into the old joints. The seal had been holding the repair together more than the original. Breaking it had not opened a door. It had removed the only thing keeping the newer stone from sliding free of the old.",
        condition: (state) => state.stats.Practicality >= 4,
      },
      {
        text: "Dev pulled Neel back from the falling stone and held him against the courtyard wall until the dust settled. He did not let go immediately. His hands were shaking, and Neel felt the fear beneath them, the fear of a man whose job was to protect everyone and who had just watched the ground try to swallow someone he had come to trust. Dev released him without a word. The word would come later, when the stone stopped moving.",
        condition: (state) => state.relationships.Dev >= 4,
      },
    ],
  },
  {
    id: 32,
    arc: "Moving Lights",
    title: "The Harder Path Down",
    chapterNumber: "32 / 36",
    location: "The damaged lower chambers",
    weather: "Rain entering through broken stone",
    opening: "They found another way down, but it cost them the night.",
    body: [
      "The debris had blocked the main stair. Dev found a narrow maintenance shaft that the old shrine keepers had used to inspect the channels. It was tight, wet, and older than the village. The Lantern slimes pressed themselves thin to fit, their light dimming at the edges of the squeeze.",
      "The lower chamber was worse than the maps had promised. Rain had begun seeping through the broken seal above, and the contamination was spreading faster than Kabir's tests had predicted. The crystal growth had advanced into the main junction. Neel felt the slimes' alarm as a pressure behind his eyes. They had hours, not days.",
    ],
    choices: [
      makeChoice("protect-slimes", "Pull the Lantern slimes back from the advancing crystal.", "empathy", "The slimes are safe, but the team must find another way to light the chamber.", { stats: { Empathy: 1 }, relationships: { Kabir: 1, Dev: 1 }, villageDelta: 4, nextChapterId: 20, resourceCost: { herbs: 1 }, dayCost: 1 }),
      makeChoice("map-spread", "Map the crystal spread to find the fastest safe path to the gate.", "wisdom", "Tara identifies a narrow channel where the contamination has not yet reached.", { stats: { Wisdom: 1 }, relationships: { Tara: 2 }, villageDelta: 4, nextChapterId: 20, dayCost: 1 }),
      makeChoice("break-through", "Have the Clay slimes fracture the crystal at the junction to buy time.", "practicality", "The chamber vents contaminated water, but the path to the gate is clear for now.", { stats: { Practicality: 1 }, relationships: { Meera: 1, Kabir: -1 }, villageDelta: 5, nextChapterId: 20, resourceCost: { timber: 3 }, dayCost: 1 }),
    ],
    conditionalBody: [
      {
        text: "The crystal growth was not random. It followed the channel joints, spreading from seam to seam with the logic of a mineral seeking the path of least resistance. Neel mapped the spread in his mind and saw the pattern: the contamination was moving uphill, against the water flow, which meant it was not being carried by water. It was growing on its own pressure, feeding on the stone itself. The shrine was not just choked. It was being consumed. The old engineers had sealed the gate to stop the spread, and the seal had been the treatment, not the disease. Breaking it had removed the only barrier between the crystal and the upper channels.",
        condition: (state) => state.stats.Practicality >= 4,
      },
      {
        text: "Dev counted the team in the narrow shaft and counted them again. He did not share his count, but Neel saw the number in his face: they were fewer than they should be. The maintenance shaft had taken a toll. One Lantern slime had been left behind at the squeeze, its light too dim to guide anyone. Dev had noted the loss the way he noted every loss, quietly, in the ledger he kept behind his eyes. He would carry it out of the chamber and into the storm, and he would not set it down until everyone was accounted for.",
        condition: (state) => state.relationships.Dev >= 3,
      },
    ],
    summaryBeat: "The Moving Lights arc stumbles through a broken seal. The shrine is wounded, the contamination is accelerating, and the storm is closer than anyone hoped.",
  },
  {
    id: 33,
    arc: "Great Storm",
    title: "The Missing",
    chapterNumber: "33 / 36",
    location: "The flooded eastern lane",
    weather: "Rain without mercy",
    opening: "The gate was clear. The family at the mill was not.",
    body: [
      "The shrine channels roared with clean water for the first time in decades. Neel felt the slimes' relief as a wave of warmth. Then Dev's voice cut through the rain: the mill family had not been reached. The rescue team had gone to the gate first, and now the eastern road was under three feet of moving water.",
      "Tara and Dev formed a rope line at the edge of the flood. The Echo slimes sent ripples through the water to find the mill's foundation. The family was on the roof, alive, but the water was still rising. Neel could feel their fear through the slimes, a distant, cold terror that tasted like the underside of the river.",
    ],
    choices: [
      makeChoice("wade-out", "Take the rope line yourself and reach the family before the water rises further.", "empathy", "The family is reached, but the current nearly takes you and the slimes sense your fear.", { stats: { Empathy: 1 }, relationships: { Dev: 2, Tara: 1 }, villageDelta: 4, nextChapterId: 34, resourceCost: { herbs: 1 }, dayCost: 1 }),
      makeChoice("guide-slimes", "Send the Echo slimes to map a safe wading path for the rescue team.", "wisdom", "The team finds a submerged wall that provides footing, and the rescue proceeds with measured steps.", { stats: { Wisdom: 1 }, relationships: { Tara: 2, Dev: 1 }, villageDelta: 4, nextChapterId: 34, dayCost: 1 }),
      makeChoice("redirect-water", "Open a secondary channel to lower the flood level around the mill.", "practicality", "The water drops enough for a safe crossing, but the diversion floods a storage cellar downstream.", { stats: { Practicality: 1 }, relationships: { Dev: 1 }, villageDelta: 5, nextChapterId: 34, resourceCost: { timber: 1 }, dayCost: 1 }),
    ],
    companionDialogue: [
      {
        companion: "Dev",
        base: "The gate is clear. The mill family is not. I need you to tell me that was the right call, because I cannot tell myself.",
        variants: [
          { text: "Dev gripped the rope line and looked at the flood between him and the mill. His voice was steady, but Neel had learned to hear the crack beneath Dev's steadiness. The gate is clear, he said. The mill family is not. I counted them this morning. Two adults, one child. I need you to tell me they will still be there when we reach them.", condition: (state) => state.relationships.Dev >= 4 },
        ],
      },
      {
        companion: "Tara",
        base: "The Echo slimes say the foundation is still above water. We have time. Not much, but some.",
        variants: [
          { text: "Tara crouched at the flood's edge with the Echo slimes pressed to the water. She read their ripples the way she read maps, and her face was the face of a woman who had been right about the valley's danger and took no comfort in it. The foundation holds, she said. For now. But the water is still rising, and the map I drew did not include a family on that roof. I drew channels and cisterns. I did not draw people. I should have drawn people.", condition: (state) => state.relationships.Tara >= 4 },
        ],
      },
    ],
  },
  {
    id: 34,
    arc: "Great Storm",
    title: "The Reckoning at the Mill",
    chapterNumber: "34 / 36",
    location: "The mill, surrounded by flood",
    weather: "The storm beginning to ease",
    opening: "The river gave back what it had taken, but not without a lesson.",
    body: [
      "The family was cold, frightened, and alive. Dev carried the youngest child on his shoulders while Tara guided the parents along the rope line. The mill itself was lost, the foundation had shifted, and the water had taken the lower storey. But the people were standing on solid ground, and that was enough for this night.",
      "Neel sat on the temple steps with rain running off his hair. The shrine channels were flowing clean. The village was holding. But the choice he had made, to clear the gate before the rescue, had cost the mill family their home and nearly their lives. The slimes pressed close, sensing the weight of it. They did not offer comfort. They offered presence.",
    ],
    choices: [
      makeChoice("sit-with-it", "Sit with the weight of the choice and let the slimes share the silence.", "empathy", "The slimes stay close, and Neel begins to understand that listening includes hearing what you did wrong.", { stats: { Empathy: 1 }, relationships: { Dev: 1, Kabir: 1 }, villageDelta: 4, nextChapterId: 24, dayCost: 1 }),
      makeChoice("record-failure", "Write down what the choice cost, so the village never forgets the trade.", "wisdom", "The mill becomes a lesson in the village's first disaster ledger, and the record saves lives in storms to come.", { stats: { Wisdom: 1 }, relationships: { Tara: 1, Leela: 1 }, villageDelta: 4, nextChapterId: 24, dayCost: 1 }),
      makeChoice("rebuild-mill", "Promise to rebuild the mill before the next season and start planning now.", "practicality", "The family gains a future tense, and the village gains another project that binds it together.", { stats: { Practicality: 1 }, relationships: { Meera: 1, Dev: 1 }, villageDelta: 5, nextChapterId: 24, resourceCost: { timber: 3, grain: 2 }, dayCost: 1 }),
    ],
    companionDialogue: [
      {
        companion: "Dev",
        base: "We saved them. That is not the same as being on time. I will remember the difference, and so should you.",
        variants: [
          { text: "Dev sat beside Neel on the temple steps and did not speak for a long time. When he spoke, his voice was quieter than Neel had ever heard it. I count people, he said. That is what I do. I counted the mill family this morning and I counted them again tonight. The number is the same. But the number does not tell you what it cost them to wait on that roof while we chose the gate first. I will carry that cost. I need you to carry it too.", condition: (state) => state.relationships.Dev >= 4 },
        ],
      },
      {
        companion: "Tara",
        base: "The channels are clean. The maps were right. I wish the maps had been wrong, because wrong maps would have meant we went to the mill first.",
        variants: [
          { text: "Tara rolled her map and held it against her chest. She looked at the floodwaters receding around the mill and her jaw tightened. The channels are clean, she said. The maps were right. I wish they had been wrong. Wrong maps would have sent us to the mill before the gate, and the family would not have spent an hour on that roof believing they had been forgotten. The valley's water is balanced again. I am not sure I am.", condition: (state) => state.relationships.Tara >= 4 },
        ],
      },
    ],
    conditionalBody: [
      {
        text: "The slimes pressed close, and Neel understood what they were doing. They were not comforting him. They were holding the weight of the choice alongside him, the way the Clay slimes held a beam. The slimes did not judge. They had been forced and sealed and sold and sealed again, and they had learned that the creatures who made choices were also the creatures who had to live with them. Their presence was not forgiveness. It was companionship in the carrying, and Neel understood that this was what the village had been teaching him from the first cup of dew: that listening was not just hearing what creatures needed. It was hearing what you had done, and staying in the room when you heard it.",
        condition: (state) => state.stats.Empathy >= 4,
      },
    ],
    summaryBeat: "The Great Storm arc pauses at the mill. The gate is clear, the family is safe, and the cost of choosing water over people has been written in stone and silence.",
  },
  {
    id: 35,
    arc: "Great Storm",
    title: "The Garden of Echoes",
    chapterNumber: "35 / 36",
    location: "The rain shrine, now a school",
    weather: "Clear rain, gentle and teaching",
    opening: "Varsha Hollow did not just survive the storm. It remembered it.",
    body: [
      "The shrine channels ran clean. The bridge stood. The village counted its losses and found them smaller than the rain had threatened. But the deepest change was not in the stone or the water. It was in the way the village had learned to listen.",
      "Tara's maps became the first textbook. Kabir's notes became the second. Neel's listening practice, the patience to ask a creature what it needed before telling it what to do, became the third. By the following monsoon, slime keepers from three valleys had walked the western road to learn what Varsha Hollow had stumbled into: that care was a discipline, not a gift, and that it could be taught.",
    ],
    choices: [
      makeChoice("teach-first", "Open the shrine school to every keeper who walks the road.", "empathy", "Varsha Hollow becomes a place where listening is taught, and the rain shrine finds its true purpose.", { stats: { Empathy: 1 }, relationships: { Tara: 1, Kabir: 1, Leela: 1 }, villageDelta: 10, nextChapterId: 35, dayCost: 1 }),
      makeChoice("write-curriculum", "Codify the listening practice into a curriculum that can travel.", "wisdom", "The discipline spreads beyond the valley, and Varsha Hollow's name becomes synonymous with care.", { stats: { Wisdom: 1 }, relationships: { Tara: 2, Kabir: 1 }, villageDelta: 10, nextChapterId: 35, dayCost: 1 }),
      makeChoice("build-school", "Raise a proper schoolhouse beside the shrine before the next monsoon.", "practicality", "The village gains a permanent home for its new knowledge, and the sound of learning joins the sound of rain.", { stats: { Practicality: 1 }, relationships: { Meera: 1, Dev: 1 }, villageDelta: 10, nextChapterId: 35, dayCost: 1 }),
    ],
    reactiveBody: [
      {
        base: "Neel's gift had found its purpose in Varsha Hollow, and the purpose was larger than any single skill.",
        variants: [
          { text: "Neel's empathy had become the village's foundation. He had come to Varsha Hollow able to feel what creatures felt, and he had taught others to feel it too. The school's first lesson was not a technique. It was a question: what does this creature need? The question traveled the western road with every keeper who learned it, and the rain shrine became known not for its water but for the practice it had given the world: the patience to listen before acting, and the courage to let the answer change the plan.", condition: (state) => state.stats.Empathy >= state.stats.Wisdom && state.stats.Empathy >= state.stats.Practicality },
          { text: "Neel's wisdom had become the village's architecture. Every pattern he had traced, from the bell's vibration to the channel's pressure cycle, had been assembled into a discipline that others could follow. The school's first textbook was not a collection of answers. It was a method of asking: observe, record, compare, and let the evidence revise the assumption. The rain shrine became known as a place where knowledge was not hoarded but built, one careful observation at a time, by anyone willing to look closely enough.", condition: (state) => state.stats.Wisdom > state.stats.Empathy && state.stats.Wisdom >= state.stats.Practicality },
          { text: "Neel's practicality had become the village's spine. He had come to Varsha Hollow with hands that knew how to work, and he had taught the village that care was not just a feeling but a practice, repeated daily, measured in roofs and channels and the soundness of stone. The school's first lesson was not a theory. It was a tool: how to assess a structure, how to repair it without breaking what held it together, and how to know the difference between a fix that would last and a fix that would merely hold. The rain shrine became known as a place where compassion had learned to build.", condition: (state) => state.stats.Practicality > state.stats.Empathy && state.stats.Practicality > state.stats.Wisdom },
        ],
      },
      {
        base: "The village had been shaped by many hands, and the strongest among them had left their mark.",
        variants: [
          { text: "Meera's bridge stood at the village's entrance, and her teaching stood inside every wall that had been repaired. She had never stopped building. She had only learned to build in the company of people she trusted, and the school was the last structure she would design, not because she was finished, but because she had finally built something that would build itself.", condition: (state) => state.relationships.Meera >= 5 && state.relationships.Meera >= state.relationships.Tara && state.relationships.Meera >= state.relationships.Kabir && state.relationships.Meera >= state.relationships.Leela && state.relationships.Meera >= state.relationships.Dev },
          { text: "Tara's maps lined the school's walls, and every keeper who walked the western road carried a copy. She had mapped the valley's water, its paths, its dangers, and finally its people. The last map she drew was not of channels or monsoon routes. It was a map of where every family lived, and she drew it because she had learned that a map without people was just water waiting to happen.", condition: (state) => state.relationships.Tara >= 5 && state.relationships.Tara > state.relationships.Meera && state.relationships.Tara >= state.relationships.Kabir && state.relationships.Tara >= state.relationships.Leela && state.relationships.Tara >= state.relationships.Dev },
          { text: "Kabir's clinic had grown into the school's first wing. He had taught a generation of healers that uncertainty was not weakness but honesty, and the garden behind the clinic was fuller than any garden in the valley. The Herb slimes trailed behind his students like a quiet, green procession, and the procession was the closest thing Kabir had ever given to a graduation ceremony.", condition: (state) => state.relationships.Kabir >= 5 && state.relationships.Kabir > state.relationships.Meera && state.relationships.Kabir > state.relationships.Tara && state.relationships.Kabir >= state.relationships.Leela && state.relationships.Kabir >= state.relationships.Dev },
        ],
      },
    ],
    summaryBeat: "The Garden of Echoes ending. Varsha Hollow becomes a school of listening. The rain shrine remembers what it was always meant to be: a place where creatures and people learn to hear each other.",
    isEnding: true,
  },
  {
    id: 36,
    arc: "Great Storm",
    title: "The Weight of the Water",
    chapterNumber: "36 / 36",
    location: "The repaired shrine, the quiet village",
    weather: "Rain that falls without celebration",
    opening: "The channels ran clean, but something in the village had been washed away with the poison.",
    body: [
      "The water system worked. The bridge held. The roofs did not leak. By every measure that Leela could put in a ledger, Varsha Hollow had survived the storm and entered a new season of prosperity. But Neel walked the channels and felt a silence where there had been voices.",
      "Several slimes had not recovered from the forced surge at the gate. Their lights were dim. Their impressions were faint, like signals from a distant station. They did not avoid Neel. They simply did not reach for him the way they once had. The village was functional. The village was safe. But the joy, the small, ordinary miracle of creatures and people choosing to work together, had been spent like a coin to buy a clear channel.",
    ],
    choices: [
      makeChoice("wait-patiently", "Sit beside the dimmed slimes and wait without asking anything.", "empathy", "One slime flickers faintly, and Neel learns that some trust returns only at its own speed.", { stats: { Empathy: 1 }, relationships: { Kabir: 1 }, villageDelta: 8, nextChapterId: 36, dayCost: 1 }),
      makeChoice("study-recovery", "Document the recovery process carefully, so the village learns what forced work costs.", "wisdom", "The notes become a warning that protects future slimes, even if the present ones recover slowly.", { stats: { Wisdom: 1 }, relationships: { Tara: 1, Kabir: 1 }, villageDelta: 8, nextChapterId: 36, dayCost: 1 }),
      makeChoice("rebuild-trust", "Commit to a season of patient work alongside the slimes, with no deadlines.", "practicality", "The village slows, and in the slowing, some of the lost trust begins to grow back.", { stats: { Practicality: 1 }, relationships: { Meera: 1, Dev: 1 }, villageDelta: 8, nextChapterId: 36, dayCost: 1 }),
    ],
    reactiveBody: [
      {
        base: "The cost of the clearing had been measured in dimmed lights, and the cost was different for everyone who carried it.",
        variants: [
          { text: "Neel's empathy made the cost unbearable. He could feel the dimmed slimes the way he felt the healthy ones, but their impressions arrived faint and distant, like voices through a wall. He knew their names. He knew their rhythms. The silence where their warmth had been was not empty. It was full of the knowledge that he had chosen efficiency over consent, and the knowledge did not fade with the rain.", condition: (state) => state.stats.Empathy >= state.stats.Wisdom && state.stats.Empathy >= state.stats.Practicality },
          { text: "Neel's wisdom made the cost legible. He recorded every dimmed slime, every faint impression, every sign of recovery or its absence. The notes became the village's first ledger of harm, a document that would protect future slimes by ensuring that no one could forget what forced work cost. The knowledge was heavy, but it was precise, and precision was its own kind of accountability.", condition: (state) => state.stats.Wisdom > state.stats.Empathy && state.stats.Wisdom >= state.stats.Practicality },
          { text: "Neel's practicality made the cost structural. The channels worked. The water was clean. By every measure that mattered to the village's survival, the clearing had been a success. But Neel had spent a season learning that survival was not the same as flourishing, and the dimmed slimes were the proof. He would repair what could be repaired. He would wait for what could only return on its own. And he would not confuse a working system with a healthy one again.", condition: (state) => state.stats.Practicality > state.stats.Empathy && state.stats.Practicality > state.stats.Wisdom },
        ],
      },
      {
        base: "The village carried the cost together, but the weight settled heaviest on the bonds that had been strongest.",
        variants: [
          { text: "Meera stood at the bridge and watched the dimmed Lantern slimes drift through the channels below. She had built the bridge to hold. She had not built it to be a monument to the cost of holding. She rested her hand on the railing and said nothing, because the silence was more honest than anything she could have said. The bridge would stand. The slimes would recover or they would not. Both truths existed at once, and Meera, who had spent a season learning to build in company, had also learned to carry cost in company.", condition: (state) => state.relationships.Meera >= 5 && state.relationships.Meera >= state.relationships.Tara && state.relationships.Meera >= state.relationships.Kabir && state.relationships.Meera >= state.relationships.Leela && state.relationships.Meera >= state.relationships.Dev },
          { text: "Tara sat with the Echo slimes at the channel's edge and listened. The slimes repeated the sounds the dimmed Lantern slimes had once carried, faint copies of copies, a memory of a memory. Tara understood loss in maps, in the spaces where a route had been and was no longer. She folded the Echo slimes' chorus into her next map, not as data but as elegy. Some things that were lost deserved to be remembered as more than absences.", condition: (state) => state.relationships.Tara >= 5 && state.relationships.Tara > state.relationships.Meera && state.relationships.Tara >= state.relationships.Kabir && state.relationships.Tara >= state.relationships.Leela && state.relationships.Tara >= state.relationships.Dev },
          { text: "Kabir tended the dimmed slimes with the patience he had once reserved for his own uncertainty. He mixed poultices they might not taste, sat beside bodies that might not respond, and documented every flicker of returning warmth. The clinic garden grew quieter. The Herb slimes moved slower, as if they too were carrying the weight of what the Lantern slimes had lost. Kabir did not promise recovery. He promised presence, and in the quiet of the garden, presence was enough to begin.", condition: (state) => state.relationships.Kabir >= 5 && state.relationships.Kabir > state.relationships.Meera && state.relationships.Kabir > state.relationships.Tara && state.relationships.Kabir >= state.relationships.Leela && state.relationships.Kabir >= state.relationships.Dev },
        ],
      },
    ],
    summaryBeat: "The Weight of the Water ending. Varsha Hollow survives, but the cost of the clearing is measured in dimmed lights and careful silence. The village learns that efficiency without consent leaves a debt that patience must repay.",
    isEnding: true,
  },
  {
    id: 37,
    arc: "Great Storm",
    title: "The Monsoon Won",
    chapterNumber: "37 / 38",
    location: "Varsha Hollow, unfinished",
    weather: "Rain that arrived before the work did",
    opening: "The monsoon came, and the village was not ready.",
    body: [
      "Neel stood in the square and watched the rain fall on roofs that had not been sealed, channels that had not been cleared, and a shrine that had not been opened. The work was incomplete. It was not anyone's fault alone. It was the fault of thirty days that had not been enough, of timber that had been spent on one wall when another needed it more, of grain that had gone to trade when it should have gone to the workers.",
      "Meera stood beside him with her arms folded and her jaw set. She did not say she had warned him. She had, but the warning was not the point. The point was that the rain was here, and the village would hold what it could hold and lose what it could not. Neel felt the slimes pressing close, their fear and their patience and their willingness to try again next season. He did not know if there would be a next season. He only knew that the rain had won this one, and the village would spend the monsoon learning what it had not finished in time."
    ],
    choices: [],
    summaryBeat: "The Monsoon Won ending. The Keeper's Path ends in ruin when the days run out. The village was not ready, and the rain did not wait.",
    isEnding: true,
  },
  {
    id: 38,
    arc: "Great Storm",
    title: "The Empty Village",
    chapterNumber: "38 / 38",
    location: "Varsha Hollow, silent",
    weather: "Clear sky over empty hearths",
    opening: "The grain ran out before the rain did, and the village emptied one family at a time.",
    body: [
      "Neel sat in the square where the market had been. The stalls were still standing, but no one stood behind them. The roofs had been repaired. The channels had been cleared. The shrine had been opened. But the grain was gone, and a village without food is a village without people, no matter how sound the walls.",
      "Meera had stayed. Tara had stayed. Kabir and his Herb slimes had stayed. Dev had stayed because he could not leave until he had counted everyone, and the count had shown him what he had feared: the village that had done everything right except feed itself. Neel felt the slimes moving through the empty homes, sensing the absence the way they sensed presence, with a quiet attention that asked no questions. The work had been good. The work had not been enough. He sat in the square and listened to the silence, and the silence told him what the grain had not: that survival was not the same as endurance, and that a village was not its walls. It was the people who stayed, and the people who stayed were fewer now."
    ],
    choices: [],
    summaryBeat: "The Empty Village ending. The Keeper's Path ends in ruin when the grain runs out. The village did the work but forgot to feed the workers, and the workers left.",
    isEnding: true,
  },
];

export const CHAPTER_BY_ID = new Map(CHAPTERS.map((chapter) => [chapter.id, chapter]));
