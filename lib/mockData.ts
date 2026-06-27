import {
  Sponsor,
  SponsorshipItem,
  ActivityPhoto,
  EventRow,
} from './types';

export const mockEvent: EventRow = {
  id: 'event-1',
  name: '',
  description: '',
  venue: '',
  start_date: '',
  end_date: '',
  expected_visitors: 0,
  actual_visitors: null,
  status: 'planning',
  organizer: '',
  created_by: '',
  created_at: '',
  updated_at: '',
};

export const mockSponsors: Sponsor[] = [];

export const mockItems: SponsorshipItem[] = [];

export const mockPhotos: ActivityPhoto[] = [];
