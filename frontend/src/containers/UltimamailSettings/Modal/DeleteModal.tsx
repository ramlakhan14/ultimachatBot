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
  useToast,
  Spinner,
} from "@chakra-ui/react";
import React from "react";
import { deleteEmailAndPasskeyConfig } from "../../../services/ultimamailsettings";
import ErrorImg from "../images/error.svg"

export const DeleteModal = ({ isOpenDeleteModal, onDeleteModal, fetchData, isDeleteUserData, accountAuthToken }: { accountAuthToken: any, isOpenDeleteModal: boolean, onDeleteModal: () => void, fetchData: () => void, isDeleteUserData: any }) => {
  const [isDispaly, setIsDispaly] = React.useState<boolean>(false);
  const toast = useToast();
  const deleteUser = async () => {
    const deleteUser = {
      emailId: isDeleteUserData?.email,
      id: isDeleteUserData?._id,
      authKey: accountAuthToken?.emailAccountAuthKey
    }
    try {
      setIsDispaly(true);
      const response = await deleteEmailAndPasskeyConfig(deleteUser);
      if (response?.status === 200) {
        // setIsEditable(null);
        fetchData();
        onDeleteModal();
        toast({
          title: `${response?.data?.message}`,
          status: "success",
          isClosable: true,
        })
      }
    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      })
    } finally {
      setIsDispaly(false);
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
              <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D">This email address will be deleted from postmark too.</Text>
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} disabled={isDispaly} onClick={deleteUser} fontWeight="500">
              Yes
            </Button>
            <Button colorScheme="blue" onClick={onDeleteModal} mr={3} fontWeight="500">
              <Text as="span" ms="4px" fontSize="16px" >No</Text>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
