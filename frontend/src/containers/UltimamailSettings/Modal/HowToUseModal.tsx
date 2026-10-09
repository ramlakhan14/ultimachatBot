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
type Steps =
  | "Auth Key"
  | "Secret Key";


export const HowToUseModal = ({ isOpen, onClose }: any) => {
  const [isSubmittings, setIsSubmittings] = React.useState<boolean>(false);
  const [currentStep, setCurrentStep] = React.useState<Steps>(
    "Auth Key"
  );

  const handleTabChanges = (index: number) => {
    const steps = [
      'Auth Key',
      'Secret Key'
    ];
  };

  const authKeyData = [
    { id: 1, title: "Log in to Postmark", description: "Go to <a href='https://account.postmarkapp.com/login' style='color:#2977FF' target='_blank' rel='noopener noreferrer'>postmarkapp.com</a> and log in with your credentials." },
    { id: 2, title: "Access Account Settings", description: "Click your profile name or account name in the top-right corner of the dashboard. From the dropdown menu, select Account Settings." },
    { id: 3, title: "Access Account Settings", description: "Scroll down to the API Tokens section on the Account Settings page." },
    { id: 4, title: "Find the Account API Token", description: "Locate the Account API Token listed here. It’s a string like xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx." },
    { id: 5, title: "Copy the Token", description: "Click the copy button or manually copy the token to your clipboard." },
    { id: 6, title: "Secure the Token", description: "Store the token in a safe place, like an environment variable or a secret management tool. Do not share or expose this token publicly." },
  ];

  const secretKeyData = [
    { id: 1, title: "Log in to Postmark", description: "Go to <a href='https://account.postmarkapp.com/login' style='color:#2977FF' target='_blank' rel='noopener noreferrer'>postmarkapp.com</a> and log in." },
    { id: 2, title: 'Go to the Servers Tab', description: 'On the dashboard, click the Servers tab.' },
    { id: 3, title: "Select or Create a Server", description: 'Choose an existing server or click Add Server to create a new one.' },
    { id: 4, title: 'Find the API Token Section', description: 'Inside the server settings, look for the API Tokens section.' },
    { id: 5, title: "Copy the Server API Token", description: 'Copy the token displayed. This is your Server API Token for sending emails.' },
    { id: 6, title: "For Account API Token", description: 'Go to Account Settings (click your profile name in the top-right). Find and copy the Account API Token under the API Tokens section.' },
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
                ['Auth Key', 'Secret Key'].indexOf(currentStep)
              }
            >
              <TabList>
                <Tab
                  id="tab-0"
                  isDisabled={isSubmittings}
                  _focus={{ outline: "none" }}
                  _disabled={{ cursor: "not-allowed", opacity: "0.4" }}
                  style={{
                    backgroundColor: currentStep === "Auth Key" ? '#fff' : '',
                    color: currentStep === "Auth Key" ? '#495057' : '#2977FF',
                    fontSize: '16px',
                  }}
                  onClick={() => setCurrentStep("Auth Key")}
                >
                  Auth Key
                </Tab>
                <Tab
                  id="tab-1"
                  isDisabled={isSubmittings}
                  _focus={{ outline: "none" }}
                  _disabled={{ cursor: "not-allowed", opacity: "0.4" }}
                  style={{
                    backgroundColor: currentStep === "Secret Key" ? '#fff' : '',
                    color: currentStep === "Secret Key" ? '#495057' : '#2977FF',
                    fontSize: '16px',
                  }}
                  onClick={() => setCurrentStep("Secret Key")}
                >
                  Secret Key
                </Tab>

              </TabList>
              <TabPanels border="1px solid #DEE2E6" bg="#fff">
                <TabPanel pt="8">
                  <Box textAlign={"center"}>
                    <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" pb="8px">How to find the Auth Key</Text>
                    <Divider mt="24px" mb="24px" color="#E2E8F0" />
                  </Box>
                  <Box>
                    {authKeyData.map((item) => (
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
                          <Text fontWeight="400" fontSize="14px" dangerouslySetInnerHTML={{ __html: item.description }} />
                        </Box>
                      </Flex>
                    ))}
                  </Box>
                  <HStack mt="24px" justifyContent="flex-end">
                    <Button
                      mr={3}
                      onClick={onClose}
                      fontWeight="500"
                    >
                      Close
                    </Button>
                  </HStack>
                </TabPanel>
                <TabPanel pt="8">
                  <Box textAlign={"center"}>
                    <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" pb="8px">How to find the Secret Key</Text>
                    <Divider mt="24px" mb="24px" color="#E2E8F0" />
                  </Box>
                  <Box>
                    {secretKeyData.map((item) => (
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
                          <Text fontWeight="400" fontSize="14px" dangerouslySetInnerHTML={{ __html: item.description }} />
                        </Box>
                      </Flex>
                    ))}
                  </Box>
                  <HStack mt="24px" justifyContent="flex-end">
                    <Button
                      mr={3}
                      onClick={onClose}
                      fontWeight="500"
                    >
                      Close
                    </Button>
                  </HStack>

                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}
