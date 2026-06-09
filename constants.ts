
import { Event, EventCategory } from './types';

export const INITIAL_EVENTS: Event[] = [
  // --- TECHNICAL ---
  {
    id: 't_hackathon',
    name: 'Hackathon',
    category: EventCategory.TECH,
    subCategory: 'NONE',
    description: 'Prototype development competition.',
    maxTeamSize: 4,
    minTeamSize: 2,
    venue: 'Main Innovation Hub',
    date: 'TBA',
    time: '09:00 AM',
    status: 'OPEN'
  },
  {
    id: 't_business_combat',
    name: 'Business Combat',
    category: EventCategory.TECH,
    subCategory: 'NONE',
    description: 'Business case strategy simulation.',
    maxTeamSize: 4,
    minTeamSize: 2,
    venue: 'Seminar Block',
    date: 'TBA',
    time: '01:00 PM',
    status: 'OPEN'
  },
  {
    id: 't_paper_presentation',
    name: 'Paper Presentation',
    category: EventCategory.TECH,
    subCategory: 'NONE',
    description: 'Research communication and presentation competition.',
    maxTeamSize: 2,
    minTeamSize: 1,
    venue: 'Research Hall',
    date: 'TBA',
    time: '04:00 PM',
    status: 'OPEN'
  },
  {
    id: 't_ai_challenge',
    name: 'AI Challenge in 1 Day',
    category: EventCategory.TECH,
    subCategory: 'NONE',
    description: 'A one-day AI challenge where participants build and present innovative solutions to real-world problems using any AI tools.',
    maxTeamSize: 4,
    minTeamSize: 2,
    venue: 'AI Lab',
    date: 'TBA',
    time: '09:30 AM',
    status: 'OPEN'
  },
  {
    id: 't_technical_debate',
    name: 'Technical Quiz',
    category: EventCategory.TECH,
    subCategory: 'NONE',
    description: 'Technical knowledge and rapid-fire quiz challenge.',
    maxTeamSize: 3,
    minTeamSize: 2,
    venue: 'Quiz Arena',
    date: 'TBA',
    time: '11:30 AM',
    status: 'OPEN'
  },
  {
    id: 't_coding_contest',
    name: 'Coding Contest',
    category: EventCategory.TECH,
    subCategory: 'NONE',
    description: 'Competitive coding and algorithmic problem-solving contest.',
    maxTeamSize: 1,
    minTeamSize: 1,
    venue: 'Coding Lab',
    date: 'TBA',
    time: '10:30 AM',
    status: 'OPEN'
  },
  // --- NON-TECHNICAL ---
  {
    id: 'nt_best_meme',
    name: 'Best Meme',
    category: EventCategory.NON_TECH,
    subCategory: 'NONE',
    description: 'Original meme creation challenge.',
    maxTeamSize: 1,
    minTeamSize: 1,
    venue: 'Media Booth',
    date: 'TBA',
    time: '11:00 AM',
    status: 'OPEN'
  },
  {
    id: 'nt_best_reel',
    name: 'Best Reel',
    category: EventCategory.NON_TECH,
    subCategory: 'NONE',
    description: 'Short-form creative reel competition.',
    maxTeamSize: 1,
    minTeamSize: 1,
    venue: 'Media Booth',
    date: 'TBA',
    time: '02:00 PM',
    status: 'OPEN'
  },
  {
    id: 'nt_photography',
    name: 'Photography',
    category: EventCategory.NON_TECH,
    subCategory: 'NONE',
    description: 'Theme-based photography contest.',
    maxTeamSize: 1,
    minTeamSize: 1,
    venue: 'Exhibition Hall',
    date: 'TBA',
    time: '10:00 AM',
    status: 'OPEN'
  },
  {
    id: 'nt_department_ideas',
    name: 'Ideas for Department Development',
    category: EventCategory.NON_TECH,
    subCategory: 'NONE',
    description: 'Pitch practical ideas to improve the department.',
    maxTeamSize: 1,
    minTeamSize: 1,
    venue: 'Seminar Hall B',
    date: 'TBA',
    time: '11:30 AM',
    status: 'OPEN'
  },
  {
    id: 'nt_poster',
    name: 'Poster Competition',
    category: EventCategory.NON_TECH,
    subCategory: 'NONE',
    description: 'Visual communication through poster design.',
    maxTeamSize: 1,
    minTeamSize: 1,
    venue: 'Art Zone',
    date: 'TBA',
    time: '01:00 PM',
    status: 'OPEN'
  },
  // --- SPORTS: ESPORTS ---
  { id: 's_bgmi', name: 'BGMI', category: EventCategory.SPORTS, subCategory: 'ESPORTS', description: 'Battlegrounds Mobile India tournament.', maxTeamSize: 4, minTeamSize: 4, venue: 'Digital Arena', date: 'TBA', time: '10:00 AM', status: 'OPEN' },
  { id: 's_ff', name: 'Free Fire', category: EventCategory.SPORTS, subCategory: 'ESPORTS', description: 'Battle royale esports competition.', maxTeamSize: 4, minTeamSize: 4, venue: 'Digital Arena', date: 'TBA', time: '12:00 PM', status: 'OPEN' },
  { id: 's_cod', name: 'COD', category: EventCategory.SPORTS, subCategory: 'ESPORTS', description: 'Call of Duty mobile showdown.', maxTeamSize: 4, minTeamSize: 4, venue: 'Digital Arena', date: 'TBA', time: '03:00 PM', status: 'OPEN' },
  // --- SPORTS: INDOOR ---
  { id: 's_bad1', name: 'Badminton Singles', category: EventCategory.SPORTS, subCategory: 'INDOOR', description: 'Singles indoor badminton showdown.', maxTeamSize: 1, minTeamSize: 1, venue: 'Indoor Stadium', date: 'TBA', time: '08:00 AM', status: 'OPEN' },
  { id: 's_bad2', name: 'Badminton Doubles', category: EventCategory.SPORTS, subCategory: 'INDOOR', description: 'Doubles indoor badminton challenge.', maxTeamSize: 2, minTeamSize: 2, venue: 'Indoor Stadium', date: 'TBA', time: '09:00 AM', status: 'OPEN' },
  { id: 's_bad3', name: 'Badminton Mixed Doubles', category: EventCategory.SPORTS, subCategory: 'INDOOR', description: 'Mixed doubles indoor badminton contest.', maxTeamSize: 2, minTeamSize: 2, venue: 'Indoor Stadium', date: 'TBA', time: '10:00 AM', status: 'OPEN' },
  { id: 's_kab', name: 'Kabaddi', category: EventCategory.SPORTS, subCategory: 'INDOOR', description: 'Traditional indoor team raid game.', maxTeamSize: 10, minTeamSize: 7, venue: 'Indoor Arena', date: 'TBA', time: '10:00 AM', status: 'OPEN' },
  { id: 's_chess', name: 'Chess', category: EventCategory.SPORTS, subCategory: 'INDOOR', description: 'Classic strategy board game.', maxTeamSize: 1, minTeamSize: 1, venue: 'Strategy Hall', date: 'TBA', time: '02:00 PM', status: 'OPEN' },
  { id: 's_car', name: 'Carroms', category: EventCategory.SPORTS, subCategory: 'INDOOR', description: 'Precision strike board game.', maxTeamSize: 2, minTeamSize: 2, venue: 'Common Room', date: 'TBA', time: '04:00 PM', status: 'OPEN' },
  { id: 's_tt', name: 'Table Tennis', category: EventCategory.SPORTS, subCategory: 'INDOOR', description: 'Fast-paced indoor table sport.', maxTeamSize: 1, minTeamSize: 1, venue: 'Indoor Stadium', date: 'TBA', time: '09:00 AM', status: 'OPEN' },
  { id: 's_cube', name: 'Cube Solving', category: EventCategory.SPORTS, subCategory: 'INDOOR', description: 'Rubik\'s cube speed-solving.', maxTeamSize: 1, minTeamSize: 1, venue: 'Lobby', date: 'TBA', time: '11:00 AM', status: 'OPEN' },
  // --- SPORTS: OUTDOOR ---
  { id: 's_cri', name: 'Cricket (Men)', category: EventCategory.SPORTS, subCategory: 'OUTDOOR', description: 'Full team cricket championship (Peace Ball).', maxTeamSize: 15, minTeamSize: 11, venue: 'Main Ground', date: 'TBA', time: '08:00 AM', status: 'OPEN' },
  { id: 's_criw', name: 'Cricket (Women)', category: EventCategory.SPORTS, subCategory: 'OUTDOOR', description: 'Women\'s full team cricket championship (Tennis Ball).', maxTeamSize: 11, minTeamSize: 11, venue: 'Main Ground', date: 'TBA', time: '08:00 AM', status: 'OPEN' },
  { id: 's_vol', name: 'Volleyball (Men)', category: EventCategory.SPORTS, subCategory: 'OUTDOOR', description: 'Net-play dominance.', maxTeamSize: 9, minTeamSize: 6, venue: 'Outdoor Court', date: 'TBA', time: '04:00 PM', status: 'OPEN' },
  { id: 's_towm', name: 'Tug of War (Men)', category: EventCategory.SPORTS, subCategory: 'OUTDOOR', description: 'Raw power and unity.', maxTeamSize: 10, minTeamSize: 8, venue: 'Main Ground', date: 'TBA', time: '11:00 AM', status: 'OPEN' },
  { id: 's_bb', name: 'Basketball (Men)', category: EventCategory.SPORTS, subCategory: 'OUTDOOR', description: 'High-flying hoops action.', maxTeamSize: 5, minTeamSize: 5, venue: 'Basketball Court', date: 'TBA', time: '03:00 PM', status: 'OPEN' },
  { id: 's_fb', name: 'Football (Men)', category: EventCategory.SPORTS, subCategory: 'OUTDOOR', description: 'The beautiful game.', maxTeamSize: 10, minTeamSize: 7, venue: 'Main Ground', date: 'TBA', time: '07:00 AM', status: 'OPEN' },
  { id: 's_s100m', name: 'Sprint 100m (Men)', category: EventCategory.SPORTS, subCategory: 'OUTDOOR', description: 'Explosive speed.', maxTeamSize: 1, minTeamSize: 1, venue: 'Campus Track', date: 'TBA', time: '08:30 AM', status: 'OPEN' },
  { id: 's_s400m', name: 'Sprint 400m (Men)', category: EventCategory.SPORTS, subCategory: 'OUTDOOR', description: 'Endurance and speed.', maxTeamSize: 1, minTeamSize: 1, venue: 'Campus Track', date: 'TBA', time: '09:00 AM', status: 'OPEN' },
  { id: 's_tbw', name: 'Throw Ball (Women)', category: EventCategory.SPORTS, subCategory: 'OUTDOOR', description: 'Women\'s court strategy.', maxTeamSize: 10, minTeamSize: 7, venue: 'Outdoor Court', date: 'TBA', time: '04:00 PM', status: 'OPEN' },
  { id: 's_khw', name: 'Kho-Kho (Women)', category: EventCategory.SPORTS, subCategory: 'OUTDOOR', description: 'Traditional agility game.', maxTeamSize: 12, minTeamSize: 9, venue: 'Outdoor Field', date: 'TBA', time: '02:00 PM', status: 'OPEN' },
  { id: 's_toww', name: 'Tug of War (Women)', category: EventCategory.SPORTS, subCategory: 'OUTDOOR', description: 'Strength challenge.', maxTeamSize: 10, minTeamSize: 8, venue: 'Main Ground', date: 'TBA', time: '12:00 PM', status: 'OPEN' },
  { id: 's_dbw', name: 'Dodge Ball (Women)', category: EventCategory.SPORTS, subCategory: 'OUTDOOR', description: 'Reflexes and aim.', maxTeamSize: 10, minTeamSize: 6, venue: 'Lawn Area', date: 'TBA', time: '11:00 AM', status: 'OPEN' },
  { id: 's_s100w', name: 'Sprint 100m (Women)', category: EventCategory.SPORTS, subCategory: 'OUTDOOR', description: 'Power dash.', maxTeamSize: 1, minTeamSize: 1, venue: 'Campus Track', date: 'TBA', time: '08:45 AM', status: 'OPEN' },
  { id: 's_s400w', name: 'Sprint 400m (Women)', category: EventCategory.SPORTS, subCategory: 'OUTDOOR', description: 'Speed endurance.', maxTeamSize: 1, minTeamSize: 1, venue: 'Campus Track', date: 'TBA', time: '09:15 AM', status: 'OPEN' },
];

export const CATEGORY_LABELS = {
  [EventCategory.TECH]: 'Technical',
  [EventCategory.NON_TECH]: 'Non-Technical',
  [EventCategory.SPORTS]: 'Sports'
};
