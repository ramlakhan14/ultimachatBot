import * as React from "react";
import {
  Button,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalHeader,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Box,
  HStack,
  Divider,
  Flex,
  ModalCloseButton,
} from "@chakra-ui/react";
import HowToUseTwilio from "./HowToUseTwilio";
type Steps =
  | "Vapi"
  | "Twilio";

const HowToUseModal = ({ isOpen, onClose }: any) => {
  const [isSubmittings, setIsSubmittings] = React.useState<boolean>(false);
  const [currentStep, setCurrentStep] = React.useState<Steps>(
    "Vapi"
  );

  const handleTabChanges = (index: number) => {
    const steps = [
      'Auth Key',
      'Secret Key'
    ];
  };

  const vapiAuthKeyData = [
    { id: 1, title: "Sign Up & Log In", description: 'Go to Vapi and <a href="https://dashboard.vapi.ai/" style="color:#2977FF" target="_blank" rel="noopener noreferrer">create an account</a>.' },
    { id: 2, title: "Navigate to ORG Settings", description: "After logging in, go to the ORG Settings section from the left-side navigation and click on the API Keys menu." },
    { id: 3, title: "Copy Your API Key", description: "Find the API Private Key listed and copy it to your clipboard." },
    { id: 4, title: "Paste the API Key", description: "Paste the copied key into the Vapi API Key box." },
    { id: 5, title: "Disclaimer:", description: " We are not responsible for changes made by third-party applications. Any updates may affect the process, and users may need to adjust accordingly. We will update the steps once informed." }
  ];

  return (
    <>
      <Modal isOpen={isOpen} size="xl" onClose={onClose} scrollBehavior="inside" closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent bg="#F7FAFC">
          <ModalCloseButton _focus={{ outline: "none" }} />
          <ModalHeader textAlign="center" fontSize="18px" fontWeight="700" color="#1A202C" pb="8px">How To Use</ModalHeader>
          <Text as="span" textAlign="center" fontSize="14px" fontWeight="400" color="#6C757D" pb="24px">Please follow the step guide</Text>
          <ModalBody>
            <Tabs variant="enclosed" w="100%" isFitted colorScheme='gray' size="md"
              onChange={handleTabChanges}
              index={
                ['Vapi', 'Twilio'].indexOf(currentStep)
              }
            >
              <TabList>
                <Tab
                  id="tab-0"
                  isDisabled={isSubmittings}
                  _focus={{ outline: "none" }}
                  _disabled={{ cursor: "not-allowed", opacity: "0.4" }}
                  style={{
                    backgroundColor: currentStep === "Vapi" ? '#fff' : '',
                    color: currentStep === "Vapi" ? '#495057' : '#2977FF',
                    fontSize: '16px',
                  }}
                  onClick={() => setCurrentStep("Vapi")}
                >
                  Vapi
                </Tab>
                <Tab
                  id="tab-1"
                  isDisabled={isSubmittings}
                  _focus={{ outline: "none" }}
                  _disabled={{ cursor: "not-allowed", opacity: "0.4" }}
                  style={{
                    backgroundColor: currentStep === "Twilio" ? '#fff' : '',
                    color: currentStep === "Twilio" ? '#495057' : '#2977FF',
                    fontSize: '16px',
                  }}
                  onClick={() => setCurrentStep("Twilio")}
                >
                  Twilio
                </Tab>

              </TabList>
              <TabPanels border="1px solid #DEE2E6" bg="#fff">
                <TabPanel pt="8">
                  <Box textAlign={"center"}>
                    <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" pb="8px">How to find the Auth Key</Text>
                    <Divider mt="24px" mb="24px" color="#E2E8F0" />
                  </Box>
                  <Box>
                    {vapiAuthKeyData.map((item: any) => (
                      <Flex key={item.id} mb={4} align="flex-start">
                        {/* Number Circle */}
                        <Flex
                          borderRadius="50%" // Makes it a circle
                          width="32px"
                          height="32px"
                          bg="#e3f3ff"
                          color="#2977FF"
                          display="flex" // Ensures it behaves as a flex container
                          alignItems="center" // Vertically centers the content
                          justifyContent="center" // Horizontally centers the content
                          fontWeight="500"
                          fontSize="14px"
                          flexShrink={0} // Prevents the circle from shrinking if the parent is tight
                          mr={4} // Margin to the right for spacing
                        >
                          {item.id}
                        </Flex>
                        {/* Text Content */}
                        <Box>
                          <Text fontWeight="500" fontSize="14px" color="#212529">{item.title}</Text>
                          <Box color="#6C757D" fontSize="14px" fontWeight="400" dangerouslySetInnerHTML={{ __html: item.description }} />
                        </Box>
                      </Flex>
                    ))}
                  </Box>
                  <HStack mt="24px" justifyContent="flex-end">
                    <Button
                      onClick={onClose}
                      fontSize="16px"
                      fontWeight="500"

                    >
                      Close
                    </Button>
                  </HStack>
                </TabPanel>
                <TabPanel pt="8">
                  <HowToUseTwilio onClose={onClose} />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
};

export default HowToUseModal;