
export enum EventCategory {
  TECH = 'TECH',
  NON_TECH = 'NON_TECH',
  SPORTS = 'SPORTS'
}

export type SportsSubCategory = 'ESPORTS' | 'INDOOR' | 'OUTDOOR' | 'NONE';
export type EventStatus = 'OPEN' | 'CLOSED' | 'REGISTRATION_OPEN_SOON';

export interface Event {
  id: string;
  name: string;
  category: EventCategory;
  subCategory: SportsSubCategory;
  description: string;
  maxTeamSize: number;
  minTeamSize: number;
  venue: string;
  date: string;
  time: string;
  status: EventStatus;
}

export interface Participant {
  name: string;
  rollNumber: string; // 12 digits
  section: string;
  year: string; // Auto-detected
  phone: string; // 10 digits
}

export interface Registration {
  id: string;
  eventId: string;
  eventName: string;
  teamName?: string; // Required if teamSize > 1
  alternatePhone?: string;
  instagramLink?: string;
  driveLink?: string;
  ideaText?: string;
  substituteName?: string; // For Esports
  members: Participant[];
  memberRolls?: string[];
  timestamp: string;
  createdAt?: number;
}

export type ViewState = 'HOME' | 'SCHEDULE' | 'EVENTS' | 'REGISTRATION' | 'ADMIN';
