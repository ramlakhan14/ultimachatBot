import { Box, Heading, Radio, RadioGroup, Text, VStack, Button, useToast, Spinner, FormLabel } from "@chakra-ui/react";
import React, { useState } from "react";
import { autoRepliesSetting } from '../../../services/emailassistantservice';

const AutoReplies = ({ settingData, isFetching }: any) => {
  const [selectedOption, setSelectedOption] = useState("1"); // Default to Manual Approval
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  // console.log(settingData, "settingDataAutoReplies");

  React.useEffect(() => {
    let isMounted = true; // Track mounted state

    if (settingData) {
      if (isMounted) {
        if (settingData.isAutoReply) {
          setSelectedOption("2");
        } else if (settingData.manualReply) {
          setSelectedOption("1");
        }
      }
    }

    return () => {
      isMounted = false; // Cleanup function to avoid state updates on unmount
    };
  }, [settingData]); // Runs when settingData changes
  const handleSubmit = async () => {
    const payload = {
      isAutoReply: selectedOption === "2",  // Auto Approval is selected
      manualReply: selectedOption === "1", // Manual Approval is selected
      noReplyAutoFollowup: selectedOption === "3", // Manual Approval is selected
    };

    try {
      setIsSubmitting(true);
      const res: any = await autoRepliesSetting(payload);

      if (res.status === 200) {
        toast({
          title: "Settings updated successfully",
          status: "success",
          isClosable: true,
        });
      }
    } catch (error: any) {
      toast({
        title: `${error.response?.data?.message || "An error occurred"}`,
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFetching) {
    return (<Spinner display={'flex'} alignItems={'center'} justifyContent={'center'} margin={'auto'} marginTop={'100px'} marginBottom={'100px'} />)
  }

  return (
    <Box w="100%">
      <Heading fontSize={"20px"} lineHeight={"28px"} fontWeight={600}>Customize Settings</Heading>

      <RadioGroup mt={"24px"} value={selectedOption} onChange={setSelectedOption}>
        <VStack gap="2" alignItems={'flex-start'} justifyContent={'flex-start'}>
          <Box display="flex" gap={3} alignItems="flex-start">
            <Radio value="1" disabled={selectedOption === "3"} mt={1} id="manual"></Radio>
            <Box>
              <FormLabel mb={'2px'} fontWeight={400} htmlFor="manual" color={"#1A202C"}>Manual Approval:</FormLabel >
              <Text fontWeight={"400"} fontSize="14px" color="#6C757D" maxW="900px">
                With Manual Approval enabled, the AI generates email drafts and saves them as concepts in your mailbox.
                You can review, edit, and approve these drafts before sending, ensuring complete control over your communications.
              </Text>
            </Box>
          </Box>
          {/* <Box borderBottom="1px solid #E2E8F0" /> */}
          <Box display="flex" py="10px" gap={3} borderTop={"1px solid #EEF4FA"} borderBottom={"1px solid #EEF4FA"} alignItems="flex-start">
            <Radio value="2" mt={1} id="auto"></Radio>
            <Box>
              <FormLabel mb={'2px'} fontWeight={400} htmlFor="auto" color={"#1A202C"}>Auto Approval:</FormLabel>
              <Text fontWeight={"400"} fontSize="14px" color="#6C757D" maxW="900px">
                Let the AI handle your emails autonomously. Replies will be generated and sent automatically, saving time and ensuring prompt communication.
              </Text>
            </Box>
          </Box>
          {/* <Box borderBottom="1px solid #E2E8F0" /> */}
          <Box display="flex" gap={3} alignItems="flex-start">
            <Radio value="3" mt={1} id="auto"></Radio>
            <Box>
              <FormLabel mb={'2px'} fontWeight={400} htmlFor="auto" color={"#1A202C"}>No Auto Reply:</FormLabel>
              {/* <Text fontSize="15px" color="#6C757D" maxW="900px">
                Let the AI handle your emails autonomously. Replies will be generated and sent automatically, saving time and ensuring prompt communication.
              </Text> */}
            </Box>
          </Box>
        </VStack>
      </RadioGroup>
      <Box textAlign={'end'}>
        <Button
          mt={5}
          colorScheme="blue"
          fontWeight={500}
          onClick={handleSubmit}
          isLoading={isSubmitting}
        >
          Save Settings
        </Button>
      </Box>
    </Box>
  );
};

export default AutoReplies;
