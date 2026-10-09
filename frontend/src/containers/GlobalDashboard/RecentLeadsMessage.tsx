import {
  Box,
  Flex,
  Text,
  Avatar,
  VStack,
  HStack,
  Link,
  Image,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
} from "@chakra-ui/react";
import { PhoneIcon } from "@phosphor-icons/react";
import { GoInfo } from "react-icons/go";

const ChannelLegend = ({ items }: any) => (
  <HStack spacing={2}>
    {items.map((item: any) => (
      <HStack key={item.label} spacing={1}>
        <Box w="14px" h="14px" bg={item.color} />
        <Text fontSize="12px">{item.label}</Text>
      </HStack>
    ))}
  </HStack>
);

const formatTime = (dateStr: string, timeZone: string) => {
  const date = new Date(dateStr);

  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone,
  });
};

const LeadsCard = ({ data }: { data: any }) => {
  return (
    <Box
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="12px"
      p={4}
      h="100%"
    >
      <Text fontSize="16px" fontWeight="600" mb={3} display="flex" alignItems="center" gap={1}>
        Recent Leads Generated
        <Popover>
          <PopoverTrigger>
            <Box
              cursor="pointer"
              as="span"
            >
              <GoInfo color="#6C757D" />
            </Box>
          </PopoverTrigger>
          <PopoverContent
            bg="#efefef"
            fontWeight={500}
            color="#333"
            p={3}
            width="250px"
            fontSize="12px"
            border="1px solid #ccc"
            lineHeight="20px"
            style={{ boxShadow: 'none' }}
            borderRadius="4px"
          >
            <PopoverArrow bg="#efefef" transform="scale(1.5)" />
            {/* <PopoverCloseButton /> */}
            <Box whiteSpace="pre-wrap">Date-based filtering is not available for this table.
            </Box>
          </PopoverContent>
        </Popover>
      </Text>

      <Box border="1px solid"
        borderColor="gray.200"
        borderRadius="12px">
        <Flex
          px={4}
          py={3}
          bg="#EEF2FA"
          justify="space-between"
          align="center"
          borderTopRadius="12px"
          width={"100%"}
          overflowX={"scroll"}
          overflowY="auto"
          sx={{
            scrollbarWidth: "none",
          }}
        >
          <Text fontWeight="600" minW="60px" fontSize="14px">
            Leads
          </Text>

          <ChannelLegend
            items={[
              { label: "Chat", color: "blue.500" },
              { label: "Email", color: "purple.500" },
              { label: "Voice", color: "orange.400" },
            ]}
          />
        </Flex>

        {
          data?.length === 0 ? (
            <Flex
              direction="column"
              align="center"
              justify="center"
              py={10}
              borderBottom="1px solid"
              borderColor="gray.200"
            >
              {/* <Image src="/icons/ic-no-data.svg" boxSize="80px" mb={4} /> */}
              <Text fontSize="14px" color="gray.500">
                No data found
              </Text>
            </Flex>
          ) : <>
            <Box
              maxH="180px" // adjust as needed
              // maxW={"320px"}
              width={"100%"}
              overflowX={"scroll"}
              overflowY="auto"
              sx={{
                scrollbarWidth: "none",
              }}
            >
              <VStack spacing={0} align="stretch">
                {data?.map((lead: any, index: any) => (
                  <Flex
                    key={index}
                    px={4}
                    py={3}
                    minW={"380px"}
                    width={"100%"}
                    borderTop="1px solid"
                    borderColor="gray.200"
                    justify="space-between"
                    align="center"
                  >
                    <HStack spacing={3}>
                      <Avatar
                        size="40px"
                        width={"40px"}
                        borderRadius={"4px"}
                        height={"40px"}
                        bg={lead?.IsLeadType?.toLowerCase() == "chatbot" ? "#007AFF" : lead?.IsLeadType === "emailOutreach" || lead?.IsLeadType === "emailAssistant" || lead?.IsLeadType?.toLowerCase() == "mailBot" ? "#7C2FF1" : lead?.IsLeadType?.toLowerCase() == "voicebot" ? "#FF9500" : "#2977ff"}
                        color="white"
                        name={lead.name?.substring(0, 1) || "L"}
                      />

                      <Box >
                        <Text fontWeight="700" width={"220px"} fontSize="14px" noOfLines={1}>
                          {lead.name || "No Name Provided"}
                        </Text>

                        <Flex gap={1} alignItems="center" color="#1A202C" maxW="100%">
                          {lead.IsLeadType?.toLowerCase() === "mailbot" ? (
                            // <Image src="/icons/ic-mailbot.svg" boxSize="14px" flexShrink={0} />
                            <Image src="/icons/ic-phone.svg" boxSize="14px" flexShrink={0} />
                          ) : (
                            <Image src="/icons/ic-email.svg" boxSize="14px" flexShrink={0} />
                          )}

                          <Text
                            fontSize="12px"
                            fontWeight="400"
                            // width="220px"
                            wordBreak="break-word"
                            overflowWrap="anywhere"
                          >
                            {lead.email || "No Email Provided"}
                          </Text>
                        </Flex>
                      </Box>
                      <Text color="#6C757D" minW={"80px"} textAlign={"center"} fontSize="10px" fontWeight={"400"}>
                        {lead?.createdAt ? formatTime(lead?.createdAt, (lead?.timeZone || 'UTC')) : "NA"}
                      </Text>
                    </HStack>

                  </Flex>
                ))}
              </VStack>
            </Box>

            {/* Footer */}
            <Flex justify="center" py={4} alignItems={"center"} gap="5px">
              <Link href="/app/all-leads" color="blue.500" fontSize={"14px"} fontWeight="500">
                View More
              </Link>
              <svg style={{ marginTop: "2px" }} width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.23633 0.000164509C6.37052 -0.00327361 6.48934 0.0471455 6.59277 0.150555L9.5791 3.13688C9.64131 3.19919 9.68544 3.26509 9.71094 3.33415C9.73648 3.40315 9.74897 3.47774 9.74902 3.55778C9.74902 3.63801 9.73654 3.71325 9.71094 3.78239C9.68544 3.85145 9.64131 3.91734 9.5791 3.97966L6.59277 6.96598C6.49356 7.06506 6.37546 7.11369 6.23926 7.11247C6.10317 7.11104 5.98319 7.05934 5.87988 6.95622C5.78339 6.85284 5.73397 6.73534 5.73047 6.60466C5.72702 6.4739 5.77647 6.35653 5.87988 6.25309L8.0752 4.05778H0.5C0.358327 4.05767 0.240088 4.00989 0.144531 3.91423C0.0487535 3.81856 0 3.69967 0 3.55778C0.000108597 3.41611 0.0488622 3.29787 0.144531 3.20231C0.240089 3.10664 0.358325 3.05789 0.5 3.05778H8.0752L5.87988 0.863446C5.7808 0.764233 5.73218 0.647682 5.7334 0.514813C5.73484 0.382109 5.78344 0.263647 5.87988 0.160321C5.98329 0.0570996 6.10229 0.00360705 6.23633 0.000164509Z" fill="#2977FF" />
              </svg>
            </Flex>

          </>
        }
      </Box>
    </Box>
  );
};
const ConversationsCard = ({ data }: { data: any }) => {

  const getMessagePreview = (html: string, maxLength = 50) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const text = doc.body.textContent?.replace(/\s+/g, " ").trim() || "";

    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };
  return (
    <Box
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="12px"
      p={4}
      h="100%"
    >
      {/* <Text fontSize="16px" fontWeight="600" mb={3}>
        Recent Conversations
        </Text> */}

      <Text fontSize="16px" fontWeight="600" mb={3} display="flex" alignItems="center" gap={1}>
        Recent Conversations
        <Popover>
          <PopoverTrigger>
            <Box
              cursor="pointer"
              as="span"
            >
              <GoInfo color="#6C757D" />
            </Box>
          </PopoverTrigger>
          <PopoverContent
            bg="#efefef"
            fontWeight={500}
            color="#333"
            p={3}
            width="250px"
            fontSize="12px"
            border="1px solid #ccc"
            lineHeight="20px"
            style={{ boxShadow: 'none' }}
            borderRadius="4px"
          >
            <PopoverArrow bg="#efefef" transform="scale(1.5)" />
            {/* <PopoverCloseButton /> */}
            <Box whiteSpace="pre-wrap">Date-based filtering is not available for this table.
            </Box>
          </PopoverContent>
        </Popover>
      </Text>

      <Box border="1px solid"
        borderColor="gray.200"
        borderRadius="12px">
        <Flex
          px={4}
          py={3}
          bg="#EEF2FA"
          justify="space-between"
          align="center"
          borderTopRadius="12px"
          // minW={"320px"}
          width={"100%"}
          overflowX={"scroll"}
          overflowY="auto"
          sx={{
            scrollbarWidth: "none",
          }}
        >
          <Text fontWeight="600" minW="100px" fontSize="14px">
            Messages
          </Text>

          <ChannelLegend
            items={[
              { label: "Chat", color: "blue.500" },
              { label: "Email", color: "purple.500" },
            ]}
          />
        </Flex>
        {
          data?.length === 0 ? (
            <Flex
              direction="column"
              align="center"
              justify="center"
              py={10}
              borderBottom="1px solid"
              borderColor="gray.200"
            >
              {/* <Image src="/icons/ic-no-data.svg" boxSize="80px" mb={4} /> */}
              <Text fontSize="14px" color="gray.500">
                No data found
              </Text>
            </Flex>
          ) : <>
            <Box
              maxH="180px" // adjust as needed
              // maxW={"320px"}
              // width={"100%"}
              overflowX={"scroll"}
              overflowY="auto"
              sx={{
                scrollbarWidth: "none",
              }}
            >
              <VStack spacing={0} align="stretch">
                {data?.map((lead: any, index: any) => (
                  <Flex
                    key={index}
                    px={4}
                    py={3}
                    minW={"320px"}
                    borderTop="1px solid"
                    borderColor="gray.200"
                    justify="space-between"
                    align="center"
                  >
                    <HStack spacing={3}>
                      <Avatar
                        size="40px"
                        borderRadius={"4px"}
                        width={"40px"}
                        height={"40px"}
                        bg={lead?.IsLeadType?.toLowerCase() == "chatbot" ? "#007AFF" : lead?.IsLeadType === "emailOutreach" || lead?.IsLeadType === "emailAssistant" || lead?.IsLeadType?.toLowerCase() == "mailBot" ? "#7C2FF1" : lead?.IsLeadType?.toLowerCase() == "voicebot" ? "#FF9500" : "#2977ff"}
                        color="white"
                        name={lead.name?.substring(0, 1) || "L"}
                      />

                      <Box maxW={"200px"}>
                        <Text fontWeight="700" width={"170px"}
                          whiteSpace="nowrap"
                          overflow="hidden"
                          textOverflow="ellipsis"
                          fontSize="14px">
                          {lead.name || "No Name Provided"}
                        </Text>

                        <HStack spacing={1} color="#1A202C">
                          <Text fontSize="12px" noOfLines={1}>
                            {lead?.IsLeadType === "emailOutreach" || lead?.IsLeadType === "emailAssistant"
                              ? getMessagePreview(lead?.lastMessage || "")
                              : lead?.lastMessage || "No message"}
                          </Text>
                        </HStack>
                      </Box>
                    </HStack>

                    <Text color="#6C757D" minW={"80px"} textAlign={"end"} fontSize="10px" fontWeight={"400"}>
                      {lead?.createdAt || lead?.updatedAt ? formatTime(lead?.createdAt || lead?.updatedAt, (lead?.timeZone || 'UTC')) : "NA"}
                    </Text>
                  </Flex>
                ))}
              </VStack>
            </Box>

            {/* Footer */}
            <Flex justify="center" alignItems={"center"} gap="5px" py={4}>
              <Link href="/app/email/email-conversation" color="blue.500" fontSize={"14px"} fontWeight="500">
                View More
              </Link>
              <svg style={{ marginTop: "2px" }} width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.23633 0.000164509C6.37052 -0.00327361 6.48934 0.0471455 6.59277 0.150555L9.5791 3.13688C9.64131 3.19919 9.68544 3.26509 9.71094 3.33415C9.73648 3.40315 9.74897 3.47774 9.74902 3.55778C9.74902 3.63801 9.73654 3.71325 9.71094 3.78239C9.68544 3.85145 9.64131 3.91734 9.5791 3.97966L6.59277 6.96598C6.49356 7.06506 6.37546 7.11369 6.23926 7.11247C6.10317 7.11104 5.98319 7.05934 5.87988 6.95622C5.78339 6.85284 5.73397 6.73534 5.73047 6.60466C5.72702 6.4739 5.77647 6.35653 5.87988 6.25309L8.0752 4.05778H0.5C0.358327 4.05767 0.240088 4.00989 0.144531 3.91423C0.0487535 3.81856 0 3.69967 0 3.55778C0.000108597 3.41611 0.0488622 3.29787 0.144531 3.20231C0.240089 3.10664 0.358325 3.05789 0.5 3.05778H8.0752L5.87988 0.863446C5.7808 0.764233 5.73218 0.647682 5.7334 0.514813C5.73484 0.382109 5.78344 0.263647 5.87988 0.160321C5.98329 0.0570996 6.10229 0.00360705 6.23633 0.000164509Z" fill="#2977FF" />
              </svg>
            </Flex>

          </>
        }
      </Box>
    </Box>
  );
};

export default function RecentLeadsMessage({ data }: { data: any }) {
  // console.log(data);

  return (
    <>
      {
        data?.recentLeads?.isVisible &&
        <Box flex="1" maxW={"50%"} >
          <LeadsCard data={data?.recentLeads?.data} />
        </Box>

      }
      {
        data?.recentConversations?.isVisible &&
        <Box flex="1" maxW={"50%"}>
          <ConversationsCard data={data?.recentConversations?.data} />
        </Box>
      }
    </>
  );
}