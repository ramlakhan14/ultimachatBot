import React, { useState, useEffect, useRef } from "react";
import Multiselect from "multiselect-react-dropdown";
import {
  Button,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalHeader,
  ModalFooter,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Box,
  Image,
  Spacer,
  HStack,
  Divider,
  FormControl,
  FormLabel,
  Input,
  Flex,
  useToast,
  FormErrorMessage,
  ModalCloseButton,
  Spinner,
} from "@chakra-ui/react";
import TriggerNow from "./images/TriggerNow.svg"
import { CancelThisCampaign } from "./CancelThisCampaign";
import { ReviewTheCampaign } from "./ReviewTheCampaign";
import { Link, useHistory } from "react-router-dom";
import { useForm } from 'react-hook-form';
import { campaignScheduler } from "../../../services/emailCampaigns";


export const CampaignTriggerShedule = ({ isOpened, onCloseCampaignTrigger, campaignData }: any) => {
  const [isSubmittings, setIsSubmittings] = React.useState<boolean>(false);
  const [isCancelThisCampaign, setIsCancelThisCampaign] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = React.useState<boolean>(false);

  const history = useHistory();
  const toast = useToast();
  const mountedRef = useRef(false);


  const handleClose = () => {
    setIsCancelThisCampaign(true);
  }

  const handleBackCampaign = () => {
    history.push(`/app/email-campaigns?campaignId=${campaignData?.campaignId || ""}&campaignName=${campaignData?.campaignName || ""}`);
    setIsCancelThisCampaign(false);
    // setIsOpenTargetAudience(true);
  }

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data: any) => {
    const scheduledDateTime = new Date(`${data.scheduleDate}T${data.scheduleTime}`);
    const now = new Date();

    // Check if scheduled date and time is in the past
    if (scheduledDateTime < now) {
      toast({
        title: "Scheduled time cannot be in the past.",
        status: "error",
        isClosable: true,
      });
      return; // Stop submission
    }
    const campaignDataPost = {
      campaignId: campaignData?.campaignId || "",
      campaignName: campaignData?.campaignName || "",
      ...data
    };
    // console.log("campaignDataPost", campaignDataPost);
    try {
      setIsSubmittings(true);
      const response = await campaignScheduler(campaignDataPost);
      setIsSubmittings(false);
      if (response?.data?.statusCode === 200) {
        toast({
          title: `${response?.data?.message}`,
          status: "success",
          isClosable: true,
        })
        history.push(`/app/email-campaigns/create?subTab=complete&id=${campaignData?.campaignId}&campaignName=${campaignData?.campaignName || ""}`);
        // history.push(`/app/email-campaigns?campaignId=${campaignData?.campaignId || ""}&campaignName=${campaignData?.campaignName || ""}&targetAudience=${true}&review=${true}`);
        // setIsReviewOpen(true);
        // onCloseCampaignTrigger();
      } else {
        toast({
          title: `${response?.data?.message}`,
          status: "error",
          isClosable: true,
        })
      }

    } catch (error: any) {
      setIsSubmittings(false);
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      });
    }

  };

  const handleURLClick = async () => {
    await handleSubmit(onSubmit)(); // This executes the onSubmit with form data
  };

  const currentDate = new Date().toISOString().split('T')[0];


  useEffect(() => {
    // Set mounted to true when component mounts
    mountedRef.current = true;

    // const init = async () => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const review = searchParams.get('review');
      const modify = searchParams.get('modify');
      if (review === 'true') {
        // Only proceed if still mounted
        if (mountedRef.current) {
          onCloseCampaignTrigger();
          // Check again before setting state
          if (mountedRef.current && modify === null) {
            setIsReviewOpen(true);
          }
        }
      }
    } catch (error) {
      // console.error('Error:', error);
    }

  }, [onCloseCampaignTrigger]);



  return (
    <>
      <Modal isOpen={isOpened} size="xl" onClose={onCloseCampaignTrigger} scrollBehavior="inside" closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent bg="#F7FAFC">
          <ModalCloseButton _focus={{ outline: "none" }}
            onClick={() => {
              onCloseCampaignTrigger();
            }}
          />
          <ModalHeader textAlign="center" fontSize="18px" fontWeight="700" color="#1A202C" pb="8px">Campaign Trigger Date & Time</ModalHeader>
          <Text as="span" textAlign="center" fontSize="14px" fontWeight="400" color="#6C757D" pb="24px">Please select the trigger date and time for this campaign</Text>
          <ModalBody pb="24px" pt="0">
            <Box p="16px" borderRadius="8px" bg="#fff" border="1px solid #DEE2E6">
              {/* <Box
                textAlign="center"
                display="flex"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
              >
                <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" mb="8px" mt="24px">Schedule Campaign</Text>
                <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D" pb="24px">Select the campaign day and time</Text>
                <Divider orientation='horizontal' color="#E2E8F0" mb="24px" />
              </Box> */}
              <form onSubmit={handleSubmit(onSubmit)}>
                <Flex direction="column" width="100%">
                  <Flex width="100%" gap="16px">
                    <FormControl mb="24px" isInvalid={!!errors.scheduleDate}>
                      <FormLabel mb="8px">Select Date</FormLabel>
                      <Input
                        type="date"
                        min={new Date().toISOString().split("T")[0]} // Set minimum date to today
                        {...register('scheduleDate', {
                          required: 'Date is required', validate: (value) => value >= currentDate || "You can't select the previous date.",
                        })}
                      />
                      <FormErrorMessage>{errors.scheduleDate?.message}</FormErrorMessage>
                    </FormControl>

                    <FormControl mb="24px" isInvalid={!!errors.scheduleTime}>
                      <FormLabel mb="8px">Select Time</FormLabel>
                      <Input
                        type="time"
                        {...register('scheduleTime', {
                          required: 'Time is required',
                          validate: (value) => {
                            const selectedDate = watch('scheduleDate');
                            const currentTime = new Date().toTimeString().slice(0, 5); // Get current time in HH:MM format

                            // If selected date is today, validate time
                            if (selectedDate === currentDate) {
                              return value > currentTime || "You can't select a previous time for today.";
                            }
                            return true;
                          }
                        })}
                      />
                      <FormErrorMessage>{errors.scheduleTime?.message}</FormErrorMessage>
                    </FormControl>
                  </Flex>
                </Flex>
              </form>
              <HStack>
                <Button colorScheme="gray" color="#2977ff" fontWeight="500" onClick={() => {
                  onCloseCampaignTrigger();
                }} sx={{
                  _focus: {
                    boxShadow: 'none'
                  }
                }}

                >
                  Cancel
                </Button>
                <Spacer />
                <Button mr={3}
                  onClick={handleBackCampaign}
                  style={{ backgroundColor: "#6C757D", color: "#fff" }} fontSize="16px" fontWeight="500" sx={{
                    _focus: {
                      boxShadow: 'none',  // Removes the focus box shadow
                    }
                  }}

                >
                  Back
                </Button>
                <Button colorScheme="blue" mr={3}
                  onClick={() => {
                    if (isSubmittings) {
                      return;
                    }
                    handleURLClick()
                  }}
                  sx={{
                    _focus: {
                      boxShadow: 'none',  // Removes the focus box shadow
                    }
                  }}
                  fontWeight="500"
                >

                  <Text as="span" ms="4px" fontSize="16px" fontWeight="500" >
                    {
                      isSubmittings && (
                        <Spinner size="sm" />
                      )
                    }
                    Schedule
                  </Text>
                </Button>
              </HStack>
              {/* <HStack mt="24px">
                <Button colorScheme="blue" variant="ghost" onClick={handleClose} sx={{
                  _focus: {
                    boxShadow: 'none'
                  }
                }}

                >
                  Close
                </Button>
                <Spacer />
                <Button mr={3}
                  onClick={handleBackCampaign}
                  style={{ backgroundColor: "#6C757D", color: "#fff" }} fontSize="16px" fontWeight="400" sx={{
                    _focus: {
                      boxShadow: 'none',  // Removes the focus box shadow
                    }
                  }}

                >
                  Back
                </Button>
                <Button colorScheme="blue" mr={3}
                  onClick={handleURLClick}
                  sx={{
                    _focus: {
                      boxShadow: 'none',  // Removes the focus box shadow
                    }
                  }}
                >

                  <Text as="span" ms="4px" fontSize="16px" fontWeight="400"
                  >Review The Campaign</Text>
                </Button>
              </HStack> */}
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}
