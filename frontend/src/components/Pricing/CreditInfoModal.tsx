import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Text,
  UnorderedList,
  ListItem,
  VStack,
  Heading,
  Box,
  useDisclosure,
  Button,
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Td,
  Tbody,
} from '@chakra-ui/react';

const CreditInfoModal: React.FC = () => {
  // Hook to handle modal state
  const { isOpen, onOpen, onClose } = useDisclosure();
  const tableData = [
    { plan: 'Starter', credits: '1,000', duration: '1 - 2 Months', example: 'Scraping 300 leads + validating 200 emails.' },
    { plan: 'Pro', credits: '2,500', duration: '3 - 4 Months', example: 'Scraping 800 leads + validating 400 emails.' },
    { plan: 'Agency', credits: '5,000', duration: '6+ Months', example: 'High-volume scraping (1,500+ leads) + warmup.' },
    { plan: 'Ultimate', credits: '10,000', duration: '12+ Months', example: 'Enterprise-level scraping and continuous warmup.' },
  ];
  return (
    <>
      <Text fontSize={"14px"} color={"#2977FF"} textDecoration={"underline"} fontWeight={"400"} cursor={"pointer"} onClick={onOpen}>
        Read More
      </Text>

      <Modal isOpen={isOpen} onClose={onClose} size="4xl" isCentered>
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(2px)" />
        <ModalContent border="1px solid #DEE2E6" borderRadius="md" maxH="600px" p={4} mx={4}>
          <ModalHeader textAlign="center" lineHeight={"28px"} borderBottom={"1px solid #E2E8F0"} fontSize="18px" fontWeight="700">
            How our credits work
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody pb={8} px="0" mt="24px" maxHeight={"600px"} overflowY={"scroll"}>

            <VStack align="start" spacing={"10px"} px="0">
              {/* Introduction */}
              <Text color="gray.700" lineHeight="tall">
                All services within UltimaBot run on a unified credit system where{' '}
                <Text as="span" fontWeight="bold">1 credit = $0.01</Text>. Your one-time bonus credits
                can be used across all modules as you see fit.
              </Text>

              {/* Section 1: Usage */}
              <Box w="full">
                <Heading size="sm" mb={3} fontWeight="bold">
                  What can you do with your credits?
                </Heading>
                <UnorderedList spacing={2} ml={5} color="gray.700">
                  <ListItem>
                    <Text as="span" fontWeight="bold">Lead Scraping:</Text> 1 to 4 credits per record (e.g., GMB, LinkedIn, or Facebook).
                  </ListItem>
                  <ListItem>
                    <Text as="span" fontWeight="bold">Email Validation:</Text> 2 credits per email checked.
                  </ListItem>
                  <ListItem>
                    <Text as="span" fontWeight="bold">Email Warmup:</Text> 5 credits per message sent.
                  </ListItem>
                  <ListItem>
                    <Text as="span" fontWeight="bold">Vector Embeddings:</Text> 1 credit per 1,000 tokens for your bot's intelligence.
                  </ListItem>
                </UnorderedList>
              </Box>

              {/* Section 2: Definitions */}
              <Box w="full">
                <Heading size="sm" mb={3} fontWeight="bold">
                  Bot definition & voice:
                </Heading>
                <UnorderedList spacing={2} ml={5} color="gray.700">
                  <ListItem>
                    <Text as="span" fontWeight="bold">What is a "Bot"?:</Text> 1 Bot slot can be used for either: 1 Chatbot, 1 Email Assistant, 1 Inbound VoiceBot, 1 Outbound Voice Campaign, or 1 Email Outreach Campaign.
                  </ListItem>
                  <ListItem>
                    <Text as="span" fontWeight="bold">Voice Costs:</Text> Voice calls are handled via your own Twilio key at transparent market rates (starting at <Text as="span" fontWeight="bold">$0.25/min</Text> for standard or <Text as="span" fontWeight="bold">$0.30/min</Text> for voice cloning).
                  </ListItem>
                </UnorderedList>
              </Box>

              {/* Section 3: Good to know */}
              <Box w="full">
                <Heading size="sm" mb={3} fontWeight="bold">
                  Good to know:
                </Heading>
                <UnorderedList spacing={2} ml={5} color="gray.700">
                  <ListItem>
                    <Text as="span" fontWeight="bold">Full Feature Access:</Text> Every plan includes access to all features, including Google Calendar integration, Lead Scraping, Zapier, and Voice Cloning.
                  </ListItem>
                  <ListItem>
                    <Text as="span" fontWeight="bold">External Costs:</Text> For AI (OpenAI) and Voice (Twilio), you 'bring your own' keys, ensuring you pay the lowest market rates without any markups from us.
                  </ListItem>
                  <ListItem>
                    <Text as="span" fontWeight="bold">Flexibility:</Text> Use your credits for scraping today and email validation tomorrow. Bonus credits are added immediately after payment.
                  </ListItem>
                </UnorderedList>
              </Box>
            </VStack>
            <VStack align="start" spacing={4} mb={6}>
              <Heading size="md" color="#1A202C">
                How long will my credits last (Normal Usage) ?
              </Heading>

              <Text color="gray.700" fontSize="md">
                Credits are one-time bonuses and never expire.
              </Text>

              <Text color="gray.700" fontSize="md">
                For a typical user (a mix of lead scraping and email checks), the Starter credits usually last 1-2 months, while the Agency credits often cover 6+ months of activity.
              </Text>

              <Text color="gray.700" fontSize="md">
                Since you 'bring your own' API keys for AI and Voice, your credits are saved purely for high-value tasks like scraping and validation.
              </Text>
            </VStack>

            <TableContainer border="1px solid" borderColor="gray.100" borderRadius="lg">
              <Table variant="simple" size="md">
                <Thead bg="#F9F9FF">
                  <Tr>
                    <Th color="gray.800" textTransform="none" fontSize="sm" py={4}>Plan</Th>
                    <Th color="gray.800" textTransform="none" fontSize="sm" py={4}>Bonus Credits</Th>
                    <Th color="gray.800" textTransform="none" fontSize="sm" py={4}>Estimated Duration</Th>
                    <Th color="gray.800" textTransform="none" fontSize="sm" py={4}>Typical Activity Example</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {tableData.map((row, index) => (
                    <Tr key={index}>
                      <Td fontSize="sm" color="gray.700" py={4}>{row.plan}</Td>
                      <Td fontSize="sm" color="gray.700" py={4}>{row.credits}</Td>
                      <Td fontSize="sm" color="gray.700" py={4}>{row.duration}</Td>
                      <Td fontSize="sm" color="gray.700" py={4} whiteSpace="normal">
                        {row.example}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>

            <VStack align="start" spacing={6} mt={6} pb={6}>
              {/* Disclaimer Section from image_c7d8ab.png */}
              <Box>
                <Text fontSize="sm" color="gray.700" lineHeight="tall">
                  <Text as="span" fontWeight="bold">Note:</Text> These durations are{' '}
                  <Text as="span" fontWeight="bold" fontStyle="italic">examples only</Text> and intended for illustrative purposes. Actual longevity depends entirely on your{' '}
                  <Text as="span" fontWeight="bold">personal usage</Text> and the specific features you use. UltimaBot is in no way responsible for the actual duration of credits, as consumption is determined by your individual account activity.
                </Text>
              </Box>

              {/* Monitoring Section from image_c7d8ab.png */}
              <Box w="full">
                <Heading size="sm" mb={3} color="#1A202C" fontWeight="bold">
                  Monitoring your Credits
                </Heading>
                <Text fontSize="sm" color="gray.700" mb={4}>
                  To help you stay in control of your usage, we have built-in smart alerts.
                </Text>
                <Text fontSize="sm" color="gray.700" mb={4}>
                  You can easily set a personal credit threshold in your settings. Once your balance reaches this level, you will receive an automatic email reminder and a notification in your dashboard.
                </Text>

                <Heading size="xs" mb={3} color="#1A202C" fontStyle="italic">
                  How it works:
                </Heading>
                <UnorderedList spacing={2} ml={5} color="gray.700">
                  <ListItem fontSize="sm">
                    <Text as="span" fontWeight="bold" fontStyle="italic">Set your own limit:</Text> You decide when you want to be notified (e.g., at 100 or 500 credits).
                  </ListItem>
                  <ListItem fontSize="sm">
                    <Text as="span" fontWeight="bold" fontStyle="italic">Stay informed:</Text> You'll receive both an email and a dashboard alert so you never run out of credits unexpectedly during a campaign.
                  </ListItem>
                  <ListItem fontSize="sm">
                    <Text as="span" fontWeight="bold" fontStyle="italic">Available in all tools:</Text> This monitoring system is active across both UltimaBot and UltimaWriter.
                  </ListItem>
                </UnorderedList>
              </Box>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default CreditInfoModal;