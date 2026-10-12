// Hand-written scenes for the offline interview. Each probes two traits; the adaptive
// picker serves whichever unseen scene best covers the currently least-certain traits.
import { nextTargets } from './traits';
import type { Profile, StoryScene, TraitId } from './types';

type Bank = Omit<StoryScene, 'source' | 'id'> & { id: string };

export const SCENE_BANK: Bank[] = [
  {
    id: 'delay',
    targets: ['spontaneity', 'novelty'],
    setting: 'Airport, late evening',
    prompt: 'Your connecting flight is six hours late. The city is 20 minutes away by taxi. What do you do?',
    options: [
      { label: 'Change my booking and wait', detail: 'I find a quiet seat, charge my phone and check my plans.', reaction: 'Good. You like to stay in control.', signals: { spontaneity: 15, novelty: 30, comfort: 75 } },
      { label: 'Walk around the airport', detail: 'I look at the shops and try a local snack.', reaction: 'A calm way to use the time.', signals: { spontaneity: 50, novelty: 50, pace: 55 } },
      { label: 'Take a taxi into the city', detail: 'I have no plan. I want to see what I find.', reaction: 'You like a surprise. Noted.', signals: { spontaneity: 92, novelty: 85, thrill: 70 } },
    ],
  },
  {
    id: 'soundtrack',
    targets: ['social', 'nature'],
    setting: 'First evening, 9pm',
    prompt: 'You have a free evening. Where do you want to be?',
    options: [
      { label: 'On a quiet hill', detail: 'Only the wind and the last light on the mountains.', reaction: 'You like silence and open space.', signals: { social: 10, nature: 92, pace: 20 } },
      { label: 'In a small café', detail: 'Soft music, a few people talking, rain outside.', reaction: 'Some people around you, but not too many.', signals: { social: 50, nature: 30, aesthetic: 65 } },
      { label: 'On a busy night street', detail: 'Bright signs, food stalls, music and many people.', reaction: 'You get energy from busy places.', signals: { social: 92, nature: 8, thrill: 60 } },
    ],
  },
  {
    id: 'bed',
    targets: ['comfort', 'thrill'],
    setting: 'Booking a bed for tonight',
    prompt: 'Two places are free tonight. They cost the same. Which one do you book?',
    options: [
      { label: 'A comfortable hotel', detail: 'A soft bed, a hot shower and quiet rooms.', reaction: 'A good night of sleep is important to you.', signals: { comfort: 92, thrill: 20 } },
      { label: 'A family guesthouse', detail: 'Simple and clean. Breakfast with the owners.', reaction: 'Simple comfort and local people. Good choice.', signals: { comfort: 55, culture: 70, thrill: 35 } },
      { label: 'A hammock outside', detail: 'I sleep under the stars with a mosquito net.', reaction: 'You prefer the experience to the comfort.', signals: { comfort: 8, thrill: 80, nature: 85 } },
    ],
  },
  {
    id: 'menu',
    targets: ['culture', 'food'],
    setting: 'Lunch in a small town',
    prompt: 'The menu is in the local language only. There are no pictures. What do you do?',
    options: [
      { label: 'Find a different restaurant', detail: 'I look for a menu in English.', reaction: 'You like to know what you will get.', signals: { culture: 15, food: 30 } },
      { label: 'Translate the menu', detail: 'I use my phone and choose something safe.', reaction: 'Careful and practical. You will eat well.', signals: { culture: 50, food: 55, spontaneity: 30 } },
      { label: 'Point at another table', detail: 'I order the same food as the local people.', reaction: 'You trust local people. That is a good sign.', signals: { culture: 92, food: 85, spontaneity: 80 } },
    ],
  },
  {
    id: 'day-two',
    targets: ['pace', 'aesthetic'],
    setting: 'Day two, 8am',
    prompt: 'You have no plans for today. How do you use the day?',
    options: [
      { label: 'See as much as possible', detail: 'I plan a route and visit six places.', reaction: 'You like to use every hour.', signals: { pace: 92, aesthetic: 40, spontaneity: 15 } },
      { label: 'Find the best view', detail: 'I plan my day around the best light for photos.', reaction: 'Beautiful places are important to you.', signals: { pace: 45, aesthetic: 92 } },
      { label: 'Sit in one café all day', detail: 'I read a book and watch the street.', reaction: 'A slow day is a good day for you.', signals: { pace: 8, aesthetic: 60, social: 35 } },
    ],
  },
  {
    id: 'stranger',
    targets: ['social', 'thrill'],
    setting: 'At the harbour, evening',
    prompt: 'A local fisherman offers to take you to a sea cave tomorrow at sunrise. He speaks very little English.',
    options: [
      { label: 'Say no, politely', detail: 'It is kind of him, but it feels too risky.', reaction: 'You trust your instincts. That is fine.', signals: { thrill: 15, social: 30, culture: 35 } },
      { label: 'Say yes, with other travellers', detail: 'I ask two people from my hostel to come too.', reaction: 'Adventure, but with a safety plan.', signals: { thrill: 55, social: 75 } },
      { label: 'Say yes and go alone', detail: 'I will find out the details on the boat.', reaction: 'You are ready for a real adventure.', signals: { thrill: 92, culture: 80, spontaneity: 85 } },
    ],
  },
  {
    id: 'market',
    targets: ['food', 'pace'],
    setting: 'A food market, Saturday',
    prompt: 'The market closes in one hour and you are very hungry. What do you do?',
    options: [
      { label: 'Buy something quick', detail: 'A sandwich, then I continue with my plans.', reaction: 'Food is fuel for you. Fair enough.', signals: { food: 15, pace: 75 } },
      { label: 'Eat at one good stall', detail: 'I sit at the busiest counter and order their best dish.', reaction: 'One good meal is better than many quick ones.', signals: { food: 70, pace: 35, culture: 60 } },
      { label: 'Try many small dishes', detail: 'I go from stall to stall and taste everything.', reaction: 'Food is a big part of travel for you.', signals: { food: 95, pace: 60 } },
    ],
  },
  {
    id: 'photo',
    targets: ['aesthetic', 'novelty'],
    setting: 'A famous viewpoint',
    prompt: 'There is a 40-minute line at the famous viewpoint. A small path goes somewhere with no sign.',
    options: [
      { label: 'Wait in the line', detail: 'It is famous for a reason. I want to see it.', reaction: 'Some famous places are worth the wait.', signals: { novelty: 15, aesthetic: 60 } },
      { label: 'Find a better spot nearby', detail: 'The same view, fewer people and better light.', reaction: 'You look for the best version of a view.', signals: { novelty: 55, aesthetic: 90, pace: 30 } },
      { label: 'Take the small path', detail: 'I do not know where it goes. That is the point.', reaction: 'You prefer the unknown to the famous.', signals: { novelty: 92, aesthetic: 40, nature: 80 } },
    ],
  },
  {
    id: 'rain',
    targets: ['comfort', 'nature'],
    setting: 'Day three, heavy rain',
    prompt: 'It is raining hard. Your mountain hike is still possible, but it will be wet and cold.',
    options: [
      { label: 'Go to a spa', detail: 'A sauna, a massage and a long lunch indoors.', reaction: 'Rain is a good reason to relax.', signals: { comfort: 90, nature: 20 } },
      { label: 'Visit museums and shops', detail: 'I stay in the town and stay dry.', reaction: 'A good plan for a wet day.', signals: { comfort: 65, nature: 15, aesthetic: 65 } },
      { label: 'Do the hike anyway', detail: 'The waterfalls are bigger after rain.', reaction: 'You do not let the weather stop you.', signals: { comfort: 10, nature: 95, thrill: 75 } },
    ],
  },
  {
    id: 'festival',
    targets: ['spontaneity', 'social'],
    setting: 'Walking back, 10pm',
    prompt: 'You find a village festival with drums and dancing. Nobody explains what it is.',
    options: [
      { label: 'Watch for a short time', detail: 'It is interesting, but I go back early.', reaction: 'You like to watch from a calm distance.', signals: { spontaneity: 35, social: 25 } },
      { label: 'Join for one song', detail: 'I accept a drink, dance a little, then leave.', reaction: 'You join in, but you know when to stop.', signals: { spontaneity: 60, social: 60, culture: 65 } },
      { label: 'Stay until morning', detail: 'I dance with everyone until the sun comes up.', reaction: 'You are part of the festival now.', signals: { spontaneity: 95, social: 95, thrill: 75 } },
    ],
  },
  {
    id: 'train',
    targets: ['pace', 'social'],
    setting: 'Overnight train, 7pm',
    prompt: 'The train arrives at 6am. You share a small cabin with three strangers.',
    options: [
      { label: 'Sleep early', detail: 'I use my earplugs and rest for tomorrow.', reaction: 'Rest first. You plan for energy.', signals: { pace: 30, social: 15, comfort: 65 } },
      { label: 'Read and watch the view', detail: 'I talk a little, but mostly I look outside.', reaction: 'Quiet company suits you.', signals: { pace: 35, social: 45, aesthetic: 70 } },
      { label: 'Share food and stories', detail: 'I open my snacks and ask where everyone is going.', reaction: 'You make friends on the move.', signals: { pace: 55, social: 92, culture: 70 } },
    ],
  },
  {
    id: 'luggage',
    targets: ['comfort', 'spontaneity'],
    setting: 'Arrival hall, noon',
    prompt: 'Your bag did not arrive. The airline says it will come in two days.',
    options: [
      { label: 'Wait at the hotel', detail: 'I call the airline and buy only what I must.', reaction: 'Calm and practical. Good.', signals: { comfort: 75, spontaneity: 20 } },
      { label: 'Buy a few local clothes', detail: 'I go to a market and replace the basics.', reaction: 'A problem became a shopping trip.', signals: { comfort: 50, spontaneity: 60, culture: 55 } },
      { label: 'Continue with what I have', detail: 'I travel light now. The bag can find me later.', reaction: 'You do not need much to be happy.', signals: { comfort: 10, spontaneity: 92, thrill: 60 } },
    ],
  },
  {
    id: 'dinner-invite',
    targets: ['culture', 'social'],
    setting: 'A small shop, afternoon',
    prompt: 'The shop owner invites you to dinner with her family tonight. You do not speak their language.',
    options: [
      { label: 'Thank her and say no', detail: 'It is kind, but I prefer my own evening.', reaction: 'You protect your quiet time.', signals: { culture: 25, social: 15 } },
      { label: 'Go for a short visit', detail: 'I bring a small gift and stay for one hour.', reaction: 'Polite and open. A good balance.', signals: { culture: 65, social: 55 } },
      { label: 'Go and stay all evening', detail: 'We use gestures, photos and a lot of laughing.', reaction: 'You want to see real local life.', signals: { culture: 95, social: 85, food: 70 } },
    ],
  },
  {
    id: 'bike',
    targets: ['thrill', 'pace'],
    setting: 'A coastal town, morning',
    prompt: 'You rent a bicycle for the day. There are three routes on the map.',
    options: [
      { label: 'The flat road by the sea', detail: 'Easy riding with many stops for photos.', reaction: 'An easy day with good views.', signals: { thrill: 15, pace: 30, aesthetic: 70 } },
      { label: 'The route to three villages', detail: 'Some hills, a lunch stop and a visit to each village.', reaction: 'A full day with a good plan.', signals: { thrill: 50, pace: 80, culture: 55 } },
      { label: 'The steep mountain road', detail: 'Hard climbs and a fast ride down.', reaction: 'You like a physical challenge.', signals: { thrill: 92, pace: 70, nature: 80 } },
    ],
  },
  {
    id: 'hot-spring',
    targets: ['nature', 'aesthetic'],
    setting: 'Day four, late afternoon',
    prompt: 'A local tells you about a hot spring. It is a one-hour walk from the road.',
    options: [
      { label: 'Go to the hotel spa', detail: 'Clean water, towels and a café nearby.', reaction: 'Comfort first. That is fine.', signals: { nature: 20, aesthetic: 55, comfort: 85 } },
      { label: 'Go at sunset for the light', detail: 'I time the walk for the best view of the valley.', reaction: 'You plan around beautiful moments.', signals: { nature: 70, aesthetic: 92 } },
      { label: 'Walk there in the dark', detail: 'Stars above, warm water and no other people.', reaction: 'Wild places call you.', signals: { nature: 95, aesthetic: 60, thrill: 70 } },
    ],
  },
  {
    id: 'border',
    targets: ['novelty', 'thrill'],
    setting: 'A border town, evening',
    prompt: 'A bus to a less-known country leaves in one hour. You did not plan to go there.',
    options: [
      { label: 'Stay with my plan', detail: 'I will go there on a different trip.', reaction: 'You keep your plans. That is smart.', signals: { novelty: 15, thrill: 20, spontaneity: 15 } },
      { label: 'Check the details first', detail: 'Visa, money and a safe place to sleep. Then I decide.', reaction: 'Curious, but careful. Good.', signals: { novelty: 60, thrill: 45, spontaneity: 45 } },
      { label: 'Get on the bus', detail: 'A new country with no plan. That is exciting.', reaction: 'You go where others do not.', signals: { novelty: 95, thrill: 85, spontaneity: 92 } },
    ],
  },
];

const shuffle = <T,>(xs: T[]): T[] => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Offline picker: random among the unseen scenes that best cover the traits we are least
 * sure about, with the options shuffled, so two people rarely see the same interview.
 */
export const staticScene = (p: Profile, seen: string[]): StoryScene => {
  const targets = nextTargets(p, 3);
  const pool = SCENE_BANK.filter((s) => !seen.includes(s.id));
  const ranked = (pool.length ? pool : SCENE_BANK)
    .map((s) => ({ s, hit: s.targets.reduce((n, t: TraitId) => n + (targets.includes(t) ? 3 - targets.indexOf(t) : 0), 0) + Math.random() * 2 }))
    .sort((a, b) => b.hit - a.hit);
  const best = ranked[Math.floor(Math.random() * Math.min(3, ranked.length))].s;
  return { ...best, options: shuffle(best.options), source: 'static' };
};
