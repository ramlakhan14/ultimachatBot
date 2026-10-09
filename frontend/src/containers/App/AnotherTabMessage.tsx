import React from "react";
import {
  Box,
  Button,
  Flex,
  Text,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalFooter,
} from "@chakra-ui/react";

export default function AnotherTabMessage({ isOpen, onOpen, onClose }: any) {

  React.useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "another_tab_active") {
        onOpen(); // show popup
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [onOpen]);

  // ---------------------------------------------------------------------
  // 🔹 2. "Use Here" Button Logic
  // ---------------------------------------------------------------------
  const handleUseHere = () => {
    // Inform other tabs that this tab is now active
    localStorage.setItem("another_tab_active", Date.now().toString());

    // Example action: refresh/session switch
    window.location.reload();
    onClose();
  };
  const closehare = () => {
    const stored = localStorage.getItem("activeTab");
    const activeTab = stored ? JSON.parse(stored) : null;

    if (activeTab?.url) {
      window.location.replace(activeTab.url);
    }

    window.open('', '_self');
    window.close();
  };
  return (
    <>
      {/* Remove this later — just for demo */}
      {/* <Button onClick={onOpen}>Show Message</Button> */}

      <Modal isOpen={isOpen} onClose={handleUseHere} isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.1)" />

        <ModalContent
          bg="white"
          borderRadius="20px"
          p="6"
          maxW="550px"
          boxShadow="lg"
        >
          <ModalBody>
            <Text fontSize="16px" color="gray.700" lineHeight="1.6">
              Your account is open in another tab. Click <b>“Use here”</b> to
              continue in this window.
            </Text>
          </ModalBody>

          <ModalFooter justifyContent="flex-end" gap="20px">
            <Button
              variant="ghost"
              color="green.600"
              fontWeight="600"
              onClick={() => closehare()}
            >
              Use New
            </Button>

            <Button
              bg="black"
              color="white"
              px="8"
              py="4"
              borderRadius="50px"
              fontWeight="600"
              _hover={{ bg: "gray.800" }}
              onClick={() => {
                // add your "use here" action
                handleUseHere()
              }}
            >
              Use here
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
