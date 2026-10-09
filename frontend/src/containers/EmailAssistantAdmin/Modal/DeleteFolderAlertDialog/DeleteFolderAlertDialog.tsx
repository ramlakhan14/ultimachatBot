import { AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, Button } from '@chakra-ui/react';
import React from 'react';

interface DeleteFolderAlertDialogProps {
  isOpen: boolean;
  leastDestructiveRef: React.RefObject<HTMLButtonElement>;
  onClose: () => void;
  onDelete: () => void;
  folderName: string;
}

const DeleteFolderAlertDialog: React.FC<DeleteFolderAlertDialogProps> = ({
  isOpen,
  leastDestructiveRef,
  onClose,
  onDelete,
  folderName
}) => {
  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={leastDestructiveRef}
      onClose={onClose}
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Delete Folder
          </AlertDialogHeader>

          <AlertDialogBody>
            Are you sure you want to delete the "{folderName}" folder?
            This action cannot be undone.
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={leastDestructiveRef} fontWeight={"500"} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" fontWeight={"500"} onClick={onDelete} ml={3}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};

export default DeleteFolderAlertDialog;