import React, { useEffect, useState } from "react";
import {
  Box,
  Text,
  Progress,
  Heading,
  Stack,
  StackDivider,
  Flex,
  SimpleGrid,
  Icon,
  VStack,
  Image,
} from "@chakra-ui/react";

interface GdprData {
  canRecoverUntil: string;
  deletionReason: string;
  deletionRequestedAt: string;
  deletionScheduledFor: string;
  pendingDeletion: boolean;
}

interface TimelineData {
  percent: number;
  daysLeft: number;
  hoursLeft: number;
}

const GdprTimeline: React.FC<{ gdpr: GdprData }> = ({ gdpr }) => {
  const [timeData, setTimeData] = useState<TimelineData>({
    percent: 0,
    daysLeft: 0,
    hoursLeft: 0,
  });

  const calculateTimeline = () => {
    const requestedAt = new Date(gdpr.deletionRequestedAt);
    const scheduledFor = new Date(gdpr.deletionScheduledFor);
    const now = new Date();

    const total = scheduledFor.getTime() - requestedAt.getTime();
    const passed = now.getTime() - requestedAt.getTime();
    const remaining = Math.max(scheduledFor.getTime() - now.getTime(), 0);

    const percent = Math.min((passed / total) * 100, 100);
    const daysLeft = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hoursLeft = Math.floor(
      (remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    setTimeData({ percent, daysLeft, hoursLeft });
  };

  useEffect(() => {
    calculateTimeline();
    const timer = setInterval(calculateTimeline, 60000); // update every minute
    return () => clearInterval(timer);
  }, [gdpr]);

  return (
    <>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <Flex
          align="center"
          border="1px solid #E2E8F0"
          bg={"#FFFFFF"}
          p={4}
          borderRadius="md"
          boxShadow="sm"
          gap={4}
        >
          <Flex
            align="center"
            justify="center"
            // bg={iconBg}
            borderRadius="md"
            p={3}
            minW="40px"
          >
            <Image src="/icons/reques.svg" />
          </Flex>
          <VStack align="start" spacing={0}>
            <Text color="#6C757D">
              Deletion Requested :
            </Text>
            <Text color={"#1A202C"}>{new Date(gdpr.deletionRequestedAt).toLocaleString()}</Text>
          </VStack>
        </Flex>
        <Flex
          align="center"
          border="1px solid #E2E8F0"
          bg={"#FFFFFF"}
          p={4}
          borderRadius="md"
          boxShadow="sm"
          gap={4}
        >
          <Flex
            align="center"
            justify="center"
            // bg={iconBg}
            borderRadius="md"
            p={3}
            minW="40px"
          >
            <Image src="/icons/schdule.svg" />
          </Flex>
          <VStack align="start" spacing={0}>
            <Text color="#6C757D">
              Deletion Scheduled:
            </Text>
            <Text color={"#1A202C"}>{new Date(gdpr.deletionScheduledFor).toLocaleString()}</Text>
          </VStack>
        </Flex>
        <Flex
          align="center"
          p={4}
          border="1px solid #E2E8F0"
          bg={"#FFFFFF"}
          borderRadius="md"
          boxShadow="sm"
          gap={4}
        >
          <Flex
            align="center"
            justify="center"
            // bg={iconBg}
            borderRadius="md"
            p={3}
            minW="40px"
          >
            <Image src="/icons/recover.svg" />
          </Flex>
          <VStack align="start" spacing={0}>
            <Text color="#6C757D">
              Can Recover Until:
            </Text>
            <Text color={"#1A202C"}>
              {timeData.daysLeft} days {timeData.hoursLeft} hours
            </Text>

            {/* <Text fontWeight="medium">{"value"}</Text> */}
          </VStack>
        </Flex>
      </SimpleGrid>
    </>
  );
};

export default GdprTimeline;
