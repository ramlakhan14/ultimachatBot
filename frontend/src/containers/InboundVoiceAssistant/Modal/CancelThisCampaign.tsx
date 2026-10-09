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
} from "@chakra-ui/react";
import ErrorImg from "./images/error.svg"



export const CancelThisCampaign = ({ isCancelThisCampaign, onCancelThisCampaign, sendData }: { isCancelThisCampaign: boolean; onCancelThisCampaign: () => void, sendData: () => void }) => {


  const NoCampaign = () => {
    onCancelThisCampaign();
  }
  const closeCancelCampaign = () => {
    onCancelThisCampaign();
    sendData();
  }

  return (
    <>
      <Modal
        isCentered
        onClose={onCancelThisCampaign}
        isOpen={isCancelThisCampaign}
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
              <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" mb="8px" mt="24px">Are you sure?</Text>
              <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D">You want to Cancel this campaign?</Text>
            </Box>

          </ModalBody>
          <ModalFooter>
            <Button mr={3} fontWeight="500" onClick={closeCancelCampaign} fontSize="16px" >
              Yes
            </Button>
            <Button colorScheme="blue" fontWeight="500" mr={3} onClick={NoCampaign}>
              <Text as="span" ms="4px" fontSize="16px" >No</Text>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
