import * as React from "react";
import {
  Button,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalHeader,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  Flex,
  Select,
  HStack,
  Box,
  useToast,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverCloseButton,
} from "@chakra-ui/react";
import { Controller, useForm } from "react-hook-form";
import { addPhoneNumber, fetchAllPhoneNumber, getAssistant, twilioPhoneNumber } from "../../../services/VoiceBot";
import { log } from "console";
import { GoInfo } from "react-icons/go";

const AddNewNumberModal = ({ isOpen, onClose, fetchData }: any) => {
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [isOptions, setOptions] = React.useState([]);
  const [isOptionsForNumber, setOptionsForNumber] = React.useState([]);
  const toast = useToast();
  const [isPopover1Open, setIsPopover1Open] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const { register, handleSubmit, reset, formState: { errors }, control } = useForm();
  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      const response = await addPhoneNumber(data);
      if (response.status === 201) {
        fetchData();
        toast({
          title: `${response?.data?.message}`,
          status: "success",
          isClosable: true,
        })
        reset();
        onClose();
      }
    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      })
    } finally {
      setIsSubmitting(false);
    }
  }
  React.useEffect(() => {
    const fetchData = async () => {

      try {
        setIsLoading(true);
        const response: any = await getAssistant();
        setOptions(response.data.data);
        const responeTwilioPhoneNumber = await twilioPhoneNumber();
        // const userData = await fetchAllPhoneNumber();
        // Create a set of phone numbers from array b for faster lookup
        // const bPhoneNumbers = new Set(userData?.data?.data?.map((item: any) => item.phoneNumber));

        // Update array a with isSelected property
        // const updatedA = responeTwilioPhoneNumber?.data?.data?.map((item: any) => ({
        //   ...item,
        //   // isSelected: bPhoneNumbers.has(item.phoneNumber)
        // }));
        setOptionsForNumber(responeTwilioPhoneNumber?.data?.data);
        // console.log(responeTwilioPhoneNumber.data.data.phoneNumber)
      } catch (error: any) {

      } finally {
        setIsLoading(false);
      }
    };
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);


  return (
    <>
      <Modal isOpen={isOpen} size="xl" onClose={onClose} scrollBehavior="inside" closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent bg="#F7FAFC">
          <ModalCloseButton _focus={{ outline: "none" }} />
          <ModalHeader textAlign="center" fontSize="18px" fontWeight="700" color="#1A202C" pb="8px">Add Number</ModalHeader>
          <Text as="span" textAlign="center" fontSize="14px" fontWeight="400" color="#6C757D" pb="16px" paddingLeft={'15px'} paddingRight={'15px'}>Add number to help the VoiceBot connect with the user more easily during the process.</Text>
          <ModalBody>
            <form onSubmit={handleSubmit(onSubmit)}>
              <FormControl mb="16px" isInvalid={!!errors.phoneNumber}>
                <FormLabel display="flex" alignItems="center" gap="4px">Phone Number <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text>

                  <Popover isOpen={isPopover1Open} onClose={() => setIsPopover1Open(false)}>
                    <PopoverTrigger>
                      <Box
                        cursor="pointer"
                        as="span"
                        onClick={() => setIsPopover1Open(!isPopover1Open)}
                      >
                        <GoInfo color="#6C757D" />
                      </Box>
                    </PopoverTrigger>
                    <PopoverContent
                      bg="#efefef"
                      fontWeight={500}
                      color="#333"
                      p={4}
                      width="250px"
                      fontSize="12px"
                      border="1px solid #ccc"
                      lineHeight="20px"
                      style={{ boxShadow: 'none' }}
                      borderRadius="4px"
                    >
                      <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                      {/* <PopoverCloseButton /> */}
                      <Box whiteSpace="pre-wrap">{'This is the Twilio phone number used for making calls in the campaigns'}</Box>
                    </PopoverContent>
                  </Popover>
                </FormLabel>

                <Controller
                  name="phoneNumber"
                  control={control}
                  rules={{ required: "Phone number is required" }}
                  render={({ field }) => (
                    <Select placeholder="Select your phone number" {...field}>
                      {isLoading ? <option>Loading...</option> : isOptionsForNumber?.map((value: any, index: number) => <option key={index} value={value.phoneNumber}>{value.phoneNumber}</option>)}
                    </Select>
                  )}
                />
                {errors.phoneNumber && <FormErrorMessage>{errors.phoneNumber.message}</FormErrorMessage>}
              </FormControl>
              <HStack spacing={4} mb="16px" width="100%" alignItems="flex-start">
                <FormControl isInvalid={!!errors.assistantId}>
                  <FormLabel fontWeight={400}>Assign Assistant <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
                  <Controller
                    name="assistantId"
                    control={control}
                    rules={{ required: "Voice assistant is required" }}
                    render={({ field }) => (
                      <Select placeholder="Select your voice assistant" {...field}>
                        {isOptions?.map((value: any, index: number) => <option key={index} value={value.assistantId}>{value.assistantName}</option>)}
                      </Select>
                    )}
                  />
                  {errors.assistantId && <FormErrorMessage>{errors.assistantId.message}</FormErrorMessage>}
                </FormControl>

                <FormControl isInvalid={!!errors.callType}>
                  <FormLabel fontWeight={400}>Call Status <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
                  <Controller
                    name="callType"
                    control={control}
                    rules={{ required: "Call status is required" }}
                    render={({ field }) => (
                      <Select placeholder="Select call status" {...field}>
                        {/* <option value="Inbound">Inbound Call</option> */}
                        <option value="Outbound">Outbound Call</option>
                      </Select>
                    )}
                  />
                  {errors.callType && <FormErrorMessage>{errors.callType.message}</FormErrorMessage>}
                </FormControl>
              </HStack>
              <Box textAlign="right" mb="24px">
                <Button
                  type="submit"
                  size="md"
                  fontWeight={500}
                  colorScheme="blue"
                  className="btn-hover-pri"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  loadingText="Submitting"
                  _focus={{ outline: "none" }}
                  _active={{
                    bg: "#2977FF",
                    transform: "scale(0.98)",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 6C12 6.13261 11.9473 6.25979 11.8536 6.35355C11.7598 6.44732 11.6326 6.5 11.5 6.5H6.5V11.5C6.5 11.6326 6.44732 11.7598 6.35355 11.8536C6.25979 11.9473 6.13261 12 6 12C5.86739 12 5.74021 11.9473 5.64645 11.8536C5.55268 11.7598 5.5 11.6326 5.5 11.5V6.5H0.5C0.367392 6.5 0.240215 6.44732 0.146447 6.35355C0.0526785 6.25979 0 6.13261 0 6C0 5.86739 0.0526785 5.74021 0.146447 5.64645C0.240215 5.55268 0.367392 5.5 0.5 5.5H5.5V0.5C5.5 0.367392 5.55268 0.240215 5.64645 0.146447C5.74021 0.0526785 5.86739 0 6 0C6.13261 0 6.25979 0.0526785 6.35355 0.146447C6.44732 0.240215 6.5 0.367392 6.5 0.5V5.5H11.5C11.6326 5.5 11.7598 5.55268 11.8536 5.64645C11.9473 5.74021 12 5.86739 12 6Z" fill="#fff" />
                  </svg>&nbsp;
                  Add
                </Button>
              </Box>
            </form>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
};

export default AddNewNumberModal;