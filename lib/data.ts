import type { Space, Person, Post, Bond, Group, ArchiveEntry, Notification, AuraKey, TimePhase } from './types';

export const SPACES: Space[] = [
  { id:'career',    emoji:'🏢', icon:'space-career',    name:'Career',        desc:'Work, builds, pivots',            color:'var(--c-career)',    ink:'#8a5a25' },
  { id:'spiritual', emoji:'🕊', icon:'space-spiritual', name:'Spiritual',     desc:'Faith, meaning, inner life',      color:'var(--c-spiritual)', ink:'#6a4f8f' },
  { id:'wealth',    emoji:'💰', icon:'space-wealth',    name:'Wealth',        desc:'Money, freedom, financial growth',color:'var(--c-wealth)',    ink:'#2f7044' },
  { id:'adventure', emoji:'🏔️', icon:'space-adventure', name:'Adventure',     desc:'Travel, risk, new experiences',   color:'var(--c-adventure)', ink:'#2d6f93' },
  { id:'health',    emoji:'💪', icon:'space-health',    name:'Health',        desc:'Body, mind, recovery',            color:'var(--c-health)',    ink:'#b1454f' },
  { id:'creative',  emoji:'🎨', icon:'space-creative',  name:'Creative',      desc:'Making, expressing, building',    color:'var(--c-creative)',  ink:'#aa4179' },
  { id:'learning',  emoji:'📚', icon:'space-learning',  name:'Learning',      desc:'Study, growth, new skills',       color:'var(--c-learning)',  ink:'#4257a0' },
  { id:'relation',  emoji:'🌹', icon:'space-relation',  name:'Relationships', desc:'Love, friendship, family',        color:'var(--c-relation)',  ink:'#9a6321' },
];

export function spaceById(id: string): Space {
  return SPACES.find(s => s.id === id) || SPACES[0];
}

export const STAGES: Record<string, string[]> = {
  career:    ['First job, figuring it out','Side hustle, building something','Career pivot in progress','Building a business (early)','Freelance / consulting','Growing a team','Burned out, searching','Starting over'],
  spiritual: ['Newly questioning','Deepening a practice','In a dry season','Returning after a while','Building a discipline','Holding doubt and faith'],
  wealth:    ['Getting out of debt','Building a first cushion','Investing seriously','Saving for something big','Rebuilding after a loss','Learning the basics'],
  adventure: ['Planning the leap','On the road now','Back, integrating it','Saving for the next one','First solo trip','Relocating somewhere new'],
  health:    ['Starting over','Deep in recovery','Building a habit','Managing something chronic','Training for something','Listening to my body'],
  creative:  ['Finding the spark','Mid-project','Sharing for the first time','Creative block','Going pro','Making just for me'],
  learning:  ['Day one','In the thick of study','Almost certified','Self-teaching','Changing fields','Relearning the basics'],
  relation:  ['Newly single','Building something new','Working on it','Early parenthood','Caring for family','Learning to be alone'],
};

export const PROGRESS = ['Just started','In progress','In the thick of it','Almost done','Wrapping up','Starting over'];

export const PEOPLE: Person[] = [
  { name:'David Okonkwo',  space:'career',    stage:'Building a business (early)' },
  { name:'Amara Lindqvist',space:'creative',  stage:'Mid-project' },
  { name:'Mateo Rivera',   space:'health',    stage:'Deep in recovery' },
  { name:'Saanvi Rao',     space:'learning',  stage:'Changing fields' },
  { name:'Jonah Pierce',   space:'wealth',    stage:'Getting out of debt' },
  { name:'Lena Petrova',   space:'relation',  stage:'Newly single' },
  { name:'Tomas Eklund',   space:'adventure', stage:'On the road now' },
  { name:'Ruth Nakamura',  space:'spiritual', stage:'Deepening a practice' },
  { name:'Cole Bennett',   space:'career',    stage:'Burned out, searching' },
  { name:'Priya Anand',    space:'creative',  stage:'Going pro' },
];

export const POSTS: Post[] = [
  { id:1, name:'David Okonkwo', space:'career', progress:'In the thick of it', time:'2h ago',
    doing:'Rewriting the pitch deck for the third time this week.',
    honest:'The honest thing is I still can\'t explain what we do in one sentence, and that scares me more than the runway.',
    media:{ type:'video', src:'/media/media3.png', dur:'1:24' }, roots:18, comments:5, rooted:false },
  { id:2, name:'Amara Lindqvist', space:'creative', progress:'Almost done', time:'4h ago',
    doing:'Finishing the last three pages of the picture book.',
    honest:'The honest thing is I\'m terrified to finish, because then people will actually see it.',
    media:{ type:'image', src:'/media/media1.png' }, roots:42, comments:11, rooted:true },
  { id:3, anon:true, space:'health', progress:'Starting over', time:'6h ago',
    doing:'Back at the gym after eight months away.',
    honest:'The honest thing is I\'m embarrassed by how far back I\'ve slid, and I almost turned the car around in the parking lot.',
    roots:27, comments:8, rooted:false },
  { id:4, name:'Saanvi Rao', space:'learning', progress:'Just started', time:'Yesterday',
    doing:'First week of the data course after leaving teaching.',
    honest:'The honest thing is everyone here is ten years younger and I feel like I started a decade too late.',
    media:{ type:'image', src:'/media/media2.png' }, roots:15, comments:6, rooted:false },
  { id:5, name:'Ruth Nakamura', space:'spiritual', progress:'In progress', time:'Yesterday',
    doing:'Sitting with the same passage for the fourth morning in a row.',
    honest:'The honest thing is the quiet used to feel holy and lately it just feels empty. I\'m staying anyway.',
    roots:9, comments:3, rooted:false },
];

export const BONDS: Bond[] = [
  { name:'Amara Lindqvist', space:'creative', stage:'Mid-project', depth:82, last:'2d ago', today:true,  anniv:'7 months', formed:'Oct 2025' },
  { name:'David Okonkwo',   space:'career',   stage:'Building a business (early)', depth:64, last:'5d ago', today:false, anniv:'4 months', formed:'Jan 2026' },
  { name:'Ruth Nakamura',   space:'spiritual',stage:'Deepening a practice', depth:48, last:'1w ago', today:false, anniv:'2 months', formed:'Mar 2026' },
];

export const GROUPS: Group[] = [
  { id:'g1', icon:'group-founders', name:'First-time founders', phase:'Year one', color:'var(--c-career)',
    desc:'For people building something from nothing, right now.', preview:'Closed our first paying customer today and immediately panicked about the second.' },
  { id:'g2', icon:'group-relocate', name:'Relocating solo', phase:'Just moved', color:'var(--c-adventure)',
    desc:'New city, no circle yet. Figuring out a life from scratch.', preview:'Three weeks in a city where I know no one. Anyone else eat dinner standing up?' },
  { id:'g3', icon:'group-parent', name:'Early parenthood', phase:'First 1000 days', color:'var(--c-relation)',
    desc:'The tender, sleepless, identity-shifting early years.', preview:'I love them more than anything and I also miss who I was. Both are true.' },
  { id:'g4', icon:'group-burnout', name:'Burned out, searching', phase:'In between', color:'var(--c-health)',
    desc:'Left the thing that broke you. Not sure what\'s next.', preview:'Quit the job everyone envied. The relief lasted a week. Now what?' },
  { id:'g5', icon:'group-creative', name:'Going pro with the craft', phase:'Turning it real', color:'var(--c-creative)',
    desc:'Taking the thing you make seriously for the first time.', preview:'Charged real money for the first time and felt like a fraud the whole call.' },
];

export const ARCHIVE: ArchiveEntry[] = [
  { space:'career', range:'March 2024 – November 2024', months:'8 months',
    stages:['Side hustle','Career pivot in progress','Starting over'],
    people:['Cole Bennett','Jonah Pierce','David Okonkwo'],
    q1:'That leaving wasn\'t the brave part, staying gone was.',
    q2:'You will not feel ready. Ready is something you feel afterward, looking back.',
    q3:'Cole, who told me the truth when I needed it and not when it was easy.',
    counts:'34 posts · 9 Curio reads · 4 Wander saves', release:'Bond with Jonah released.' },
  { space:'health', range:'June 2023 – February 2024', months:'9 months',
    stages:['Starting over','Deep in recovery','Building a habit'],
    people:['Mateo Rivera','Lena Petrova'],
    q1:'That the body keeps the score, but it also keeps the receipts of every small kindness you show it.',
    q2:'Don\'t chase the version of you from before. Meet the one who showed up today.',
    q3:'Mateo, who never once asked how much I could lift.',
    counts:'21 posts · 14 Curio reads · 7 Wander saves' },
];

export const NOTIFS: Notification[] = [
  { icon:'wave',    unread:true,  text:'**Lena Petrova** wants to connect in your Relationships space.', time:'2h ago' },
  { icon:'bonds',   unread:true,  text:'**David Okonkwo** invited you into a Bond.', time:'5h ago' },
  { icon:'pin',     unread:true,  text:'Someone nearby waved at you. 9 min left.', time:'just now' },
  { icon:'comment', unread:false, text:'A new message from **Amara** in your Bond Thread.', time:'Yesterday' },
  { icon:'share',   unread:false, text:'**Ruth** thinks you and **Saanvi** should meet.', time:'Yesterday' },
  { icon:'sun',     unread:false, text:'Your morning card is ready.', time:'2d ago' },
  { icon:'sprout',  unread:false, text:'Your Bond with **Amara** is 7 months old.', time:'3d ago' },
];

const AURA_MAP: Record<string, AuraKey> = {
  'Amara Lindqvist':'open','David Okonkwo':'focus','Ruth Nakamura':'reflective',
  'Saanvi Rao':'transition','Tomas Eklund':'active','Mateo Rivera':'reflective',
  'Jonah Pierce':'transition','Lena Petrova':'open','Priya Anand':'active','Cole Bennett':'focus',
};

export function auraFor(name: string): AuraKey {
  return AURA_MAP[name] || 'reflective';
}

export const AURAS: Record<AuraKey, { color: string; label: string; hint: string }> = {
  reflective: { color:'#4E7D5E', label:'Reflective',     hint:'Slow pulse · turned inward' },
  open:       { color:'#F3701E', label:'Open to connect', hint:'Warm glow · reaching out' },
  focus:      { color:'#7E93B3', label:'Deep Focus',      hint:'Misted · away for now' },
  transition: { color:'#B97A1E', label:'In transition',   hint:'Fragmented · between chapters' },
  active:     { color:'#8DD4A4', label:'Active nearby',   hint:'Fireflies · here, right now' },
};

export const AVATAR_MAP: Record<string, string> = {
  'Jonah Pierce':    '/avatars/face1.png',
  'Ruth Nakamura':   '/avatars/face2.png',
  'Mateo Rivera':    '/avatars/face3.png',
  'David Okonkwo':   '/avatars/face4.png',
  'Saanvi Rao':      '/avatars/face5.png',
  'Amara Lindqvist': '/avatars/face6.png',
  'Tomas Eklund':    '/avatars/face7.png',
  'Lena Petrova':    '/avatars/face8.png',
};

const AV_GRADS: [string, string][] = [
  ['#F3701E','#F6A969'],['#4B607F','#7E93B3'],['#4E7D5E','#8DD4A4'],
  ['#A85FB0','#D6A6DC'],['#C9551A','#F39B6B'],['#3C7A8C','#8FC7D4'],
  ['#B1454F','#E89AA1'],['#4257A0','#9AABE0'],['#9A6321','#D9A968'],['#6a4f8f','#b79ad6'],
];

export function avatarFor(name: string): { grad: [string, string]; initials: string } {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h * 31) + name.charCodeAt(i)) >>> 0;
  const grad = AV_GRADS[h % AV_GRADS.length];
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return { grad, initials };
}

export function cover(seed: string): string {
  const pal: [string, string][] = [
    ['#FCD9B6','#F8C28E'],['#E4D6F4','#CBB6EC'],['#CDEBD3','#A8DDB6'],
    ['#C9E4F2','#A2CFE8'],['#FAD4D4','#F2AEB0'],['#F8D6E6','#EFAFD0'],
    ['#DCE3F7','#BAC8F0'],['#FBE3C2','#F4CB8E'],
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h * 31) + seed.charCodeAt(i)) >>> 0;
  const g = pal[h % pal.length];
  return `linear-gradient(135deg, ${g[0]}, ${g[1]})`;
}

/** Maps a group emoji (from API) to a local icon name. Falls back to 'sprout'. */
const EMOJI_TO_GROUP_ICON: Record<string, string> = {
  '🌱': 'group-founders', '🧳': 'group-relocate', '👼': 'group-parent',
  '🥀': 'group-burnout',  '🎨': 'group-creative',
};
export function groupIcon(emoji: string | undefined | null): string {
  return (emoji && EMOJI_TO_GROUP_ICON[emoji]) ?? 'sprout';
}

export function nowPhase(hour?: number): TimePhase {
  const h = hour ?? new Date().getHours();
  if (h >= 5  && h < 8)  return 'dawn';
  if (h >= 8  && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'dusk';
  return 'night';
}

export const PHASE: Record<TimePhase, { label: string; overlay: string }> = {
  dawn:  { label:'Dawn',   overlay:'linear-gradient(165deg, rgba(255,206,156,.55), rgba(255,170,120,.08) 55%, rgba(120,140,180,.18))' },
  day:   { label:'Midday', overlay:'linear-gradient(180deg, rgba(255,255,245,.14), rgba(255,255,255,0))' },
  dusk:  { label:'Dusk',   overlay:'linear-gradient(160deg, rgba(255,150,70,.45), rgba(200,90,40,.16) 60%, rgba(40,30,60,.4))' },
  night: { label:'Night',  overlay:'linear-gradient(180deg, rgba(20,28,55,.62), rgba(30,35,70,.34) 50%, rgba(10,14,30,.66))' },
};

