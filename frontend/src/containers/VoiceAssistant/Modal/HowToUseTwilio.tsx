import React from 'react';
import {
  Button,
  Text,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Box,
  HStack,
  Divider,
  Flex,
} from "@chakra-ui/react";
import { title } from 'process';
type Steps =
  | "Auth Token"
  | "Secret Key";

const HowToUseTwilio = ({ onClose }: any) => {
  const [isSubmittings, setIsSubmittings] = React.useState<boolean>(false);
  const [currentStep, setCurrentStep] = React.useState<Steps>(
    "Auth Token"
  );

  const handleTabChanges = (index: number) => {
    const steps = [
      'Auth Key',
      'Secret Key'
    ];
  };

  const authKeyData = [
    { id: 1, title: "Go to Twilio's Website", description: "Visit Twilio and <a href='https://www.twilio.com/login' style='color:#2977FF' target='_blank' rel='noopener noreferrer'>log in</a> to your account." },
    { id: 2, title: "Access Twilio Console", description: "After logging in, you'll be directed to the Twilio Console." },
    { id: 3, title: "Go to Dashboard", description: "In the Twilio Console, navigate to the Dashboard." },
    { id: 4, title: "Find Your Account Info", description: "A unique identifier for your Twilio account." },
    { id: 5, title: "Reveal Your Auth Token", description: "Click on the eye icon 🔒 to reveal your Auth Token." },
    { id: 5, title: "Disclaimer:", description: " We are not responsible for changes made by third-party applications. Any updates may affect the process, and users may need to adjust accordingly. We will update the steps once informed." }

  ];

  const secretKeyData = [
    { id: 1, title: "Go to Twilio's Website", description: "Visit Twilio and <a href='https://www.twilio.com/login' style='color:#2977FF' target='_blank' rel='noopener noreferrer'>log in</a> to your account." },
    { id: 2, title: "Access Twilio Console", description: "After logging in, you'll be directed to the Twilio Console." },
    { id: 3, title: "Go to Dashboard", description: "In the Twilio Console, navigate to the Dashboard." },
    { id: 4, title: "Find Your Account Info", description: "A secret key used for authentication." },
    { id: 5, title: "Disclaimer:", description: " We are not responsible for changes made by third-party applications. Any updates may affect the process, and users may need to adjust accordingly. We will update the steps once informed." }

  ];
  return (
    <Tabs variant="enclosed" w="100%" isFitted colorScheme='gray' size="md"
      onChange={handleTabChanges}
      index={
        ['Auth Token', 'Secret Key'].indexOf(currentStep)
      }
    >
      <TabList borderBottom={'2px solid #DEE2E6 !important'}>
        <Tab
          id="tab-0"
          isDisabled={isSubmittings}
          _focus={{ outline: "none" }}
          _disabled={{ cursor: "not-allowed", opacity: "0.4" }}
          _selected={{ borderTop: "0", borderLeft: "0", borderRight: "0" }}
          style={{
            backgroundColor: currentStep === "Auth Token" ? '#fff' : '',
            color: currentStep === "Auth Token" ? '#2977ff' : '#495057',
            borderBottom: currentStep === "Auth Token" ? '2px solid #2977ff' : '0px',
            fontSize: '16px',
          }}
          onClick={() => setCurrentStep("Auth Token")}
        >
          Auth Token
        </Tab>
        <Tab
          id="tab-1"
          isDisabled={isSubmittings}
          _focus={{ outline: "none" }}
          _disabled={{ cursor: "not-allowed", opacity: "0.4" }}
          _selected={{ borderTop: "0", borderLeft: "0", borderRight: "0" }}
          style={{
            backgroundColor: currentStep === "Secret Key" ? '#fff' : '',
            color: currentStep === "Secret Key" ? '#2977ff' : '#495057',
            borderBottom: currentStep === "Secret Key" ? '2px solid #2977ff' : '0px',
            fontSize: '16px',
          }}
          onClick={() => setCurrentStep("Secret Key")}
        >
          Secret Key
        </Tab>

      </TabList>
      <TabPanels bg="#fff">
        <TabPanel pt="8">
          <Box textAlign={"center"}>
            <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" pb="8px">How to find the Auth Token</Text>
            <Divider mt="24px" mb="24px" color="#E2E8F0" />
          </Box>
          <Box>
            {authKeyData.map((item: any) => (
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
                  <Text fontWeight="400" color="#6C757D" fontSize="14px" dangerouslySetInnerHTML={{ __html: item.description }} />
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
                  <Text fontWeight="400" color="#6C757D" fontSize="14px" dangerouslySetInnerHTML={{ __html: item.description }} />
                </Box>
              </Flex>
            ))}
          </Box>
          <HStack mt="24px" justifyContent="flex-end">
            <Button
              mr={3}
              onClick={onClose}
              fontWeight="500">
              Close
            </Button>
          </HStack>

        </TabPanel>
      </TabPanels>
    </Tabs>
  );
};

export default HowToUseTwilio;