import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  useToast,
  Button,
  Text,
  Input,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
  Flex,
  InputGroup,
  InputLeftElement,
  Spinner
}
  from '@chakra-ui/react';
import { chatSummaryForMessages } from '../../services/knowledgebaseService';

const ShowSummaryModal = ({ isOpenSummaryModal, onCloseSummaryModal, isLeadEmail, isSummaeryData }: any) => {
  // console.log("isSummaeryData", isSummaeryData);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [summary, setSummary] = useState<string>("");
  useEffect(() => {
    const fatchData = async () => {
      try {
        setIsLoading(true);
        const payload = { "messages": isSummaeryData };
        const response: any = await chatSummaryForMessages(payload);
        setSummary(response?.data?.data);
        // console.log(payload);

      } catch (error) {
        // console.error('Failed to fetch users:', error);
      } finally {
        setIsLoading(false);
      }
    }
    if (isOpenSummaryModal) fatchData();
  }, [isOpenSummaryModal]);

  return (
    <Modal isOpen={isOpenSummaryModal} size="xl" onClose={onCloseSummaryModal}>
      <ModalOverlay />
      <ModalContent padding="0px 20px">
        <ModalHeader textAlign="center" mt="20px">Chat Summary {!isLoading && isLeadEmail ? `(${isLeadEmail})` : null}</ModalHeader>
        <ModalBody p={0}>
          <Box bg="#F7FAFC" p="12px" borderRadius="8px" minH="120px">
            {isLoading ? (
              <Flex align="center" justify="center" height="100%" mt={'30px'}>
                <Spinner size="lg" />
              </Flex>
            ) : (
              <Text color="#212529">{summary}</Text>
            )}
          </Box>
        </ModalBody>
        <ModalFooter padding="20px 0px">
          <Button colorScheme='blue' fontWeight={500} onClick={onCloseSummaryModal}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default ShowSummaryModal;