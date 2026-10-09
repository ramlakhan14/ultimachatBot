import React, { useEffect } from "react";
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
  Spacer,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Flex,
  useToast,
  FormErrorMessage,
  ModalCloseButton,
} from "@chakra-ui/react";
import { useForm } from 'react-hook-form';
import { resumeCampaign } from "../../../services/VoiceBot";
import { is } from "date-fns/locale";

type Steps = "Trigger Now" | "Schedule for Later";

export const ResumeCampaignModal = ({ isOpen, onClose, fetchData, currentPage, itemsPerPages, campaignData }: any) => {
  const [isSubmittings, setIsSubmittings] = React.useState<boolean>(false);
  const [currentStep, setCurrentStep] = React.useState<Steps>("Trigger Now");
  const toast = useToast();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset
  } = useForm();

  const handleTabChanges = (index: number) => {
    const steps: Steps[] = ['Trigger Now', 'Schedule for Later'];
    setCurrentStep(steps[index]);
    // Reset form when switching tabs
    reset();
  };

  const handleTriggerNow = async () => {
    setIsSubmittings(true);
    try {
      // Add your trigger now logic here
      const response = await resumeCampaign(campaignData._id);
      toast({
        title: `${response?.data?.message}`,
        status: "success",
        isClosable: true,
      });
      onClose();
      fetchData(currentPage, itemsPerPages, "");
    } catch (error: any) {
      toast({
        title: error?.response?.data?.message,
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsSubmittings(false);
    }
  };

  const onSubmit = async (data: any) => {
    setIsSubmittings(true);
    try {

      const response = await resumeCampaign(campaignData._id, data);
      toast({
        title: `${response?.data?.message}`,
        status: "success",
        isClosable: true,
      });
      onClose();
      fetchData(currentPage, itemsPerPages, "");
    } catch (error: any) {
      toast({
        title: error?.response?.data?.message,
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsSubmittings(false);
    }
  };

  const currentDate = new Date().toISOString().split('T')[0];

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setCurrentStep("Trigger Now");
      setIsSubmittings(false);
    }
  }, [isOpen, reset]);

  return (
    <>
      <Modal isOpen={isOpen} size="xl" onClose={onClose} scrollBehavior="inside" closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent bg="#F7FAFC">
          <ModalCloseButton _focus={{ outline: "none" }} onClick={onClose} />
          <ModalHeader textAlign="center" fontSize="18px" fontWeight="700" color="#1A202C" pb="8px">
            Campaign Trigger Date & Time
          </ModalHeader>
          <Text as="span" textAlign="center" fontSize="14px" fontWeight="400" color="#6C757D" pb="24px">
            Please select the trigger date and time for this campaign
          </Text>
          <ModalBody>
            <Tabs
              variant="enclosed"
              w="100%"
              isFitted
              colorScheme='gray'
              size="md"
              onChange={handleTabChanges}
              index={['Trigger Now', 'Schedule for Later'].indexOf(currentStep)}
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
                >
                  {isSubmittings ? "Loading..." : "Schedule for Later"}
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
                    {/* <Image src={TriggerNow} alt='deleteicon' w="71px" h="71px" /> */}
                    <Text as="p" fontSize="16px" fontWeight="500" color="#1A202C" mb="8px" mt="24px">
                      Campaign will be triggered<br />immediately
                    </Text>
                  </Box>
                  <HStack mt="24px">
                    <Spacer />
                    <Button
                      colorScheme="blue"
                      mr={3}
                      onClick={handleTriggerNow}
                      isLoading={isSubmittings}
                      loadingText="Triggering..."
                      sx={{
                        _focus: {
                          boxShadow: 'none',
                        }
                      }}
                    >
                      <Text as="span" ms="4px" fontSize="16px" fontWeight="400">
                        {isSubmittings ? 'Triggering...' : 'Trigger Now'}
                      </Text>
                    </Button>
                  </HStack>
                </TabPanel>

                <TabPanel pt="8">
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <Flex direction="column" width="100%">
                      <Flex width="100%" gap="16px">
                        <FormControl mb="26px" isInvalid={!!errors.scheduleDate}>
                          <FormLabel mb="8px">Select Date</FormLabel>
                          <Input
                            type="date"
                            {...register('scheduleDate', {
                              required: 'Date is required',
                              validate: (value) => {
                                if (!value) return 'Date is required';
                                return value >= currentDate || "You can't select a previous date.";
                              }
                            })}
                          />
                          <FormErrorMessage>
                            {errors.scheduleDate?.message as string}
                          </FormErrorMessage>
                        </FormControl>

                        <FormControl mb="26px" isInvalid={!!errors.scheduleTime}>
                          <FormLabel mb="8px">Select Time</FormLabel>
                          <Input
                            type="time"
                            {...register('scheduleTime', {
                              required: 'Time is required',
                              validate: (value) => {
                                if (!value) return 'Time is required';

                                const selectedDate = watch('scheduleDate');
                                if (!selectedDate) return true; // Don't validate time if no date selected

                                const now = new Date();
                                const selectedDateTime = new Date(`${selectedDate}T${value}`);

                                if (selectedDateTime <= now) {
                                  return "You can't select a previous date and time.";
                                }
                                return true;
                              }
                            })}
                          />
                          <FormErrorMessage>
                            {errors.scheduleTime?.message as string}
                          </FormErrorMessage>
                        </FormControl>
                      </Flex>
                    </Flex>

                    <HStack mt="24px">
                      <Spacer />
                      <Button
                        type="submit"
                        colorScheme="blue"
                        mr={3}
                        isLoading={isSubmittings}
                        loadingText="Scheduling..."
                        sx={{
                          _focus: {
                            boxShadow: 'none',
                          }
                        }}
                      >
                        <Text as="span" ms="4px" fontSize="16px" fontWeight="400">
                          Schedule Now
                        </Text>
                      </Button>
                    </HStack>
                  </form>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};