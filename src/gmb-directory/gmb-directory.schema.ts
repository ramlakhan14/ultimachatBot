import { ObjectId } from 'mongodb';

export const GMB_DIRECTORY_COLLECTION = 'gmbBusinessDirectory';
export interface GmbBusinessDirectoryEntry {
  _id?: ObjectId;
  businessName: string;
  email: string;
  phoneNumber?: string;
  websiteUrl: string;
  websiteName?: string;
  categories: string[]; // raw terms, as typed by whoever scraped them
  categoryKeys: string[]; // normalized form of `categories`, used for matching

  city: string;
  cityKey: string;
  country: string;
  countryKey: string;

  postalCode?: string;
  address?: string;
  rating?: number;
  businessStatus?: string;
  verified?: boolean;
  latitude?: number;
  longitude?: number;

  source: 'outscraper';
  firstScrapedAt: Date;
  lastVerifiedAt: Date;
  usageCount: number;
  lastServedAt?: Date;
  isDead?: boolean;
}
