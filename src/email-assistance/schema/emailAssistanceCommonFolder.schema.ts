import { ObjectId } from 'mongodb';

export interface CommonFolder {
  _id?: ObjectId;
  folderName: string;
  folderType: string;
  createdAt: Date;
  updatedAt: Date;
}

export const COMMON_FOLDER_COLLECTION = 'commonFolder';
