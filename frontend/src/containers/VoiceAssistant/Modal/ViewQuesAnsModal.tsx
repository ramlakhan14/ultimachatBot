import React from 'react';
import {

  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  Text,
  Box,
  useDisclosure,
} from '@chakra-ui/react';

interface ViewQuesAnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

const ViewQuesAnsModal: React.FC<ViewQuesAnsModalProps> = ({
  isOpen,
  onClose,
  data
}) => {

  // console.log("data in modal", data);
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Question & Answer</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {
            data?.customQuestions?.length > 0 &&
            data?.customQuestions?.map((item: any, index: number) => {
              return (
                <>
                  <Box >
                    <Text fontWeight="bold" color="gray.600" mb={1}>
                      Question:
                    </Text>
                    <Text>{item?.question}</Text>
                  </Box>
                  <Box mb={4}>
                    <Text fontWeight="bold" color="gray.600" mb={1}>
                      Answer:
                    </Text>
                    <Text>{item?.answer}</Text>
                  </Box>
                </>

              )
            })
          }
          {/* <Box mb={4}>
            <Text fontWeight="bold" color="gray.600" mb={1}>
              Question:
            </Text>
            <Text>{question}</Text>
          </Box>
          <Box>
            <Text fontWeight="bold" color="gray.600" mb={1}>
              Answer:
            </Text>
            <Text>{answer}</Text>
          </Box> */}
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ViewQuesAnsModal;