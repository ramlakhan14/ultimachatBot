import { AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, Button } from '@chakra-ui/react';
import React from 'react';

interface DeleteAlertDialogProps {
  isOpen: boolean;
  leastDestructiveRef: React.RefObject<HTMLButtonElement>;
  onClose: () => void;
  onDelete: () => void;
  isBulkDelete: boolean;
  alertMessage?: string;
  alertTitle?: string;
}

const DeleteAlertDialog: React.FC<DeleteAlertDialogProps> = ({ 
  isOpen, 
  leastDestructiveRef, 
  onClose, 
  onDelete,
  isBulkDelete,
  alertMessage,
  alertTitle
}) => {
  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={leastDestructiveRef}
      onClose={onClose}
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="xl" fontWeight="bold">
            {alertTitle}
            {/* Delete {isBulkDelete ? 'Emails' : 'Email'} */}
          </AlertDialogHeader>

          <AlertDialogBody>
          <p dangerouslySetInnerHTML={{__html: alertMessage || ''}} />
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={leastDestructiveRef} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={onDelete} ml={3}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};

export default DeleteAlertDialog;