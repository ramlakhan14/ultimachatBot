export const FOLDER_COLLECTION = 'folder';

export interface Folder {
  folderName: string;
  folderType: string;
  commonFolderId: string;
  emailAccountId?: string;
  category?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
