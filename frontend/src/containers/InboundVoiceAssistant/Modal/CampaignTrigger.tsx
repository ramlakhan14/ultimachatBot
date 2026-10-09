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
} from "@chakra-ui/react";
import TriggerNow from "./images/TriggerNow.svg"
import { CancelThisCampaign } from "./CancelThisCampaign";
import { ReviewTheCampaign } from "./ReviewTheCampaign";
import { Link, useHistory } from "react-router-dom";
import { useForm } from 'react-hook-form';
import { campaignScheduler } from "../../../services/emailCampaigns";
type Steps =
  | "Trigger Now"
  | "Schedule for Later";


export const CampaignTrigger = ({ isOpenCampaignTrigger, onCloseCampaignTrigger, campaignId, setIsOpenTargetAudience, campaignName, fetchData, currentPage, itemsPerPages }: any) => {
  const [isSubmittings, setIsSubmittings] = React.useState<boolean>(false);
  const [isCancelThisCampaign, setIsCancelThisCampaign] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = React.useState<boolean>(false);

  const [currentStep, setCurrentStep] = React.useState<Steps>(
    "Trigger Now"
  );
  const history = useHistory();
  const toast = useToast();
  const mountedRef = useRef(false);


  const handleTabChanges = (index: number) => {
    const steps = [
      'Trigger Now',
      'Schedule for Later'
    ];
  };

  const onCancelThisCampaign = () => {
    setIsCancelThisCampaign(false);
  }

  const handleChildData = () => {
    history.push(`/app/email-campaigns`);
    onCloseCampaignTrigger();
  };

  const handleClose = () => {
    setIsCancelThisCampaign(true);
  }

  const handleBackCampaign = () => {
    history.push(`/app/email-campaigns?campaignId=${campaignId}&campaignName=${campaignName}`);
    setIsCancelThisCampaign(false);
    setIsOpenTargetAudience(true);
  }

  const onCloseReview = () => {
    setIsReviewOpen(false);
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data: any) => {
    const campaignData = {
      campaignId: campaignId,
      campaignName: campaignName,
      ...data
    };
    try {
      const response = await campaignScheduler(campaignData);
      if (response?.data?.statusCode === 200) {
        toast({
          title: `${response?.data?.message}`,
          status: "success",
          isClosable: true,
        })
        history.push(`/app/email-campaigns?campaignId=${campaignId}&campaignName=${campaignName}&targetAudience=${true}&review=${true}`);
        setIsReviewOpen(true);
        onCloseCampaignTrigger();
      } else {
        toast({
          title: `${response?.data?.message}`,
          status: "error",
          isClosable: true,
        })
      }

    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      });
    } finally {
      // setIsOpeneds(true);
    }

  };

  const handleURLClick = async () => {
    // Call onSubmit with form data using handleSubmit
    // Additional logic for handleURLClick can go here
    if (currentStep === "Schedule for Later") {
      await handleSubmit(onSubmit)(); // This executes the onSubmit with form data
    } else if (currentStep === "Trigger Now") {
      onCloseCampaignTrigger();
      history.push(`/app/email-campaigns?campaignId=${campaignId}&campaignName=${campaignName}&targetAudience=${true}&review=${true}`);
      setIsReviewOpen(true);
    }
  };

  const currentDate = new Date().toISOString().split('T')[0];

  // console.log("dataScrappingForCampaign", data, "")

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
      <Modal isOpen={isOpenCampaignTrigger} size="xl" onClose={onCloseCampaignTrigger} scrollBehavior="inside" closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent bg="#F7FAFC">
          <ModalCloseButton _focus={{ outline: "none" }} as={Link} to="/app/email-campaigns" />
          <ModalHeader textAlign="center" fontSize="18px" fontWeight="700" color="#1A202C" pb="8px">Campaign Trigger Date & Time</ModalHeader>
          <Text as="span" textAlign="center" fontSize="14px" fontWeight="400" color="#6C757D" pb="24px">Please select the trigger date and time for this campaign</Text>
          <ModalBody>
            <Tabs variant="enclosed" w="100%" isFitted colorScheme='gray' size="md"
              onChange={handleTabChanges}
              index={
                ['Trigger Now', 'Schedule for Later'].indexOf(currentStep)
              }
            >
              <TabList>
                <Tab
                  id="tab-0"
                  isDisabled={isSubmittings}
                  _focus={{ outline: "none" }}
                  _disabled={{ cursor: "not-allowed", opacity: "0.4" }}
                  style={{
                    backgroundColor: currentStep === "Trigger Now" ? '#fff' : '',
                    color: currentStep === "Trigger Now" ? '#495057' : '#2977FF',
                    fontSize: '16px',
                  }}
                  onClick={() => setCurrentStep("Trigger Now")}
                >
                  Trigger Now
                </Tab>
                <Tab
                  id="tab-1"
                  isDisabled={isSubmittings}
                  _focus={{ outline: "none" }}
                  _disabled={{ cursor: "not-allowed", opacity: "0.4" }}
                  style={{
                    backgroundColor: currentStep === "Schedule for Later" ? '#fff' : '',
                    color: currentStep === "Schedule for Later" ? '#495057' : '#2977FF',
                    fontSize: '16px',
                  }}
                  onClick={() => setCurrentStep("Schedule for Later")}
                >
                  Schedule for Later
                </Tab>

              </TabList>
              <TabPanels border="1px solid #DEE2E6" bg="#fff">
                <TabPanel pt="8">
                  <Box
                    textAlign="center"
                    display="flex"
                    flexDirection="column"
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Image src={TriggerNow} alt='deleteicon' w="71px" h="71px" />
                    <Text as="p" fontSize="16px" fontWeight="500" color="#1A202C" mb="8px" mt="24px">Campaign will be triggered<br />immediately</Text>
                    {/* <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D">You want to Cancel this campaign?</Text> */}
                  </Box>
                  <HStack mt="24px">
                    <Button colorScheme="blue" variant="ghost" onClick={handleClose} fontWeight="500"
                    >
                      Close
                    </Button>
                    <Spacer />
                    <Button mr={3}
                      onClick={handleBackCampaign}
                      fontWeight="500"
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
                  </HStack>
                </TabPanel>
                <TabPanel pt="8">
                  <Box
                    textAlign="center"
                    display="flex"
                    flexDirection="column"
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" mb="8px" mt="24px">Schedule Campaign</Text>
                    <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D" pb="24px">Select the campaign day and time</Text>
                    <Divider orientation='horizontal' color="#E2E8F0" mb="24px" />
                  </Box>
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <Flex direction="column" width="100%">
                      <Flex width="100%" gap="16px">
                        <FormControl mb="26px" isInvalid={!!errors.scheduleDate}>
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

                        <FormControl mb="26px" isInvalid={!!errors.scheduleTime}>
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
                  <HStack mt="24px">
                    <Button colorScheme="blue" variant="ghost" onClick={handleClose} fontWeight="500"

                    >
                      Close
                    </Button>
                    <Spacer />
                    <Button mr={3}
                      onClick={handleBackCampaign}
                      fontWeight="500"
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

                      <Text as="span" ms="4px" fontSize="16px" fontWeight="400" >Review The Campaign</Text>
                    </Button>
                  </HStack>

                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
      <CancelThisCampaign sendData={handleChildData}
        isCancelThisCampaign={isCancelThisCampaign} onCancelThisCampaign={onCancelThisCampaign}
      />
      <ReviewTheCampaign
        isReviewOpen={isReviewOpen}
        onCloseReview={onCloseReview}
        campaignId={campaignId}
        campaignName={campaignName}
        fetchData={fetchData} currentPage={currentPage} itemsPerPages={itemsPerPages}
      />

    </>
  )
}
