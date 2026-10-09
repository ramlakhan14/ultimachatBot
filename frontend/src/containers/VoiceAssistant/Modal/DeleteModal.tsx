import {
  Button,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalFooter,
  Box,
  Image,
  useToast
} from "@chakra-ui/react";
import React from "react";
import ErrorImg from "../Images/errorImg.svg";
import { deleteNumber } from "../../../services/VoiceBot";

export const DeleteModal = ({ isOpenDeleteModal, onDeleteModal, fetchData, isDeletedId }: { fetchData: () => void, isOpenDeleteModal: boolean, isDeletedId: any, onDeleteModal: () => void }) => {
  const [isDispaly, setIsDispaly] = React.useState<boolean>(false);
  const toast = useToast();
  const deletedNumber = async () => {
    try {
      const respone = await deleteNumber(isDeletedId);
      toast({
        title: `${respone.data.message}`,
        status: "success",
        isClosable: true,
      });
      onDeleteModal();
      fetchData();
    } catch (error: any) {
      toast({
        title: `${error.response.data.message}`,
        status: "error",
        isClosable: true,
      });
    }
  }

  return (
    <>
      <Modal
        onClose={onDeleteModal}
        isOpen={isOpenDeleteModal}
        closeOnOverlayClick={false}
      >
        <ModalOverlay />
        <ModalContent>
          {/* <ModalHeader>Modal Title</ModalHeader> */}
          <ModalBody>
            <Box
              textAlign="center"
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
            >
              <Image src={ErrorImg} alt='deleteicon' w="56px" h="56px" />
              <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" mb="8px" mt="24px">Are you sure you want to delete?</Text>
              <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D">This number will be deleted from vapi too.</Text>
            </Box>
          </ModalBody>
          <ModalFooter>

            <Button mr={3} fontWeight={"500"} colorScheme="gray" onClick={onDeleteModal}
            >
              <Text as="span" ms="4px" fontSize="16px" fontWeight="500">No</Text>
            </Button>
            <Button colorScheme="blue" disabled={isDispaly}
              onClick={deletedNumber}
              fontSize="16px" fontWeight="500" >
              Yes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
