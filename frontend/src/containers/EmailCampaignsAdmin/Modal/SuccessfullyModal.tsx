import React, { useState } from "react";
import {
  Button,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalFooter,
  Box,
} from "@chakra-ui/react";
import Lottie from "lottie-react";
import animationData from './Animation.json';



export const SuccessfullyModal = ({ isOpens, onCloseCancel }: { isOpens: boolean; onCloseCancel: () => void }) => {


  return (
    <>
      <Modal
        isCentered
        onClose={onCloseCancel}
        isOpen={isOpens}
        closeOnOverlayClick={false}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalBody>
            <Box
              textAlign="center"
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
            >
              <Lottie animationData={animationData} style={{ width: 130, height: 130 }} />
              <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" mb="8px" mt="24px">Great!</Text>
              <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D" mb="24px">New Audience has been added successfully to the campaign</Text>
              <Button colorScheme="blue" mr={3} onClick={onCloseCancel} sx={{
                _focus: {
                  boxShadow: 'none',  // Removes the focus box shadow
                }
              }}
              >
                <Text as="span" ms="4px" fontSize="16px" fontWeight="400">Okay</Text>
              </Button>
            </Box>

          </ModalBody>
          <ModalFooter>

          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
