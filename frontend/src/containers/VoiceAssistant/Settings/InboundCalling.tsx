import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Radio,
  RadioGroup,
  Text,
  VStack,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  Icon,
  Image,
  useToast,
  Spinner,
  Textarea,
  FormLabel,
  PopoverArrow,
  PopoverContent,
  PopoverTrigger,
  Popover,
  Switch,
  NumberInput,
  NumberInputField,
  NumberIncrementStepper,
  NumberInputStepper,
  NumberDecrementStepper,
  Tooltip,
} from '@chakra-ui/react';
import saveIcon from "../Images/saveBtn.svg";
import React, { useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { settingsGet, settingsInbound } from '../../../services/VoiceBot';
import { useLocation } from 'react-router-dom';
import { ButtonGroupsDA } from '../../../components/ButtonGroups';



interface ObjSample {
  name: string;
  number: string;
  customMessage: string;
}

// Define the form values type
type InboundCallingFormValues = {
  transferCall: 'blind' | 'warm';
  customTransferMessage?: string;
  fallbackAction: 'voicemail' | 'callbackRequest';
  callForwardingNumber: string;
  waitTimeBeforeSpeak: string;
  callForwardingNumbers: ObjSample[];
  defaultPrompt: string;
  leadCollectionData: any
};

interface LeadCollectionData {
  contactNumber: boolean;
  address: boolean;
  fullName: boolean;
  email: boolean;
}

const InboundCallingSettings = () => {
  // Initialize react-hook-form without default values
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InboundCallingFormValues>({
    defaultValues: {
      callForwardingNumbers: [{ name: '', number: '', customMessage: '' }],
      waitTimeBeforeSpeak: "2.0",
      leadCollectionData: {
        "fullName": "true",
        "email": "true"
      }
    }
  });
  const toast = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const subtab = queryParams.get('subtab');
  const transferMode = watch('transferCall');
  const [leadCollectionData, setLeadCollectionData] = React.useState<LeadCollectionData>({
    contactNumber: false,
    fullName: false,
    email: false,
    address: false
  });
  if (transferMode === 'blind') {
    setValue("customTransferMessage", "");
  }

  const {
    fields: callForwardingNumbersFields,
    append: appendcallForwardingNumbers,
    remove: removecallForwardingNumbers,
    replace: replacecallForwardingNumbers
  } = useFieldArray({
    control,
    name: "callForwardingNumbers"
  });

  // Form submission handler
  const onSubmit = async (data: InboundCallingFormValues) => {
    // console.log("data", data);
    const payload = {
      ...data, leadCollectionData,
      callForwardingNumbers: data.callForwardingNumbers.filter(item => item.name.trim() !== '' && item.number.trim() !== '') || []
    }
    try {
      const response = await settingsInbound(payload);
      toast({
        title: `${response.data.message}`,
        status: "success",
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: `${error.response?.data?.message || error?.message}`,
        status: "error",
        isClosable: true,
      });

    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response: any = await settingsGet();


      const updateData = response?.data?.data?.inBoundSettings;
      setValue("callForwardingNumbers", updateData?.callForwardingNumbers?.length > 0 ? updateData?.callForwardingNumbers : [{ name: '', number: '', customMessage: '' }]);
      replacecallForwardingNumbers(updateData?.callForwardingNumbers?.length > 0 ? updateData?.callForwardingNumbers : [{ name: '', number: '', customMessage: '' }]);
      setValue("customTransferMessage", updateData?.customTransferMessage);
      setValue("waitTimeBeforeSpeak", updateData?.waitTimeBeforeSpeak);
      setValue("defaultPrompt", updateData?.defaultPrompt);
      setLeadCollectionData(updateData?.leadCollect || updateData?.leadCollectionData);
      setValue("transferCall", updateData?.transferCall);
      setValue("customTransferMessage", updateData?.customTransferMessage);
      setValue("fallbackAction", updateData?.fallbackAction);
    } catch (error: any) {

    } finally {
      setIsLoading(false);
    }
  };
  const handleToggle = (e: any, field: keyof LeadCollectionData): void => {
    // console.log(e?.target?.checked, "<<<", field);
    setLeadCollectionData(prev => ({
      ...prev,
      [field]: e?.target?.checked
    }));
  };

  useEffect(() => {
    if (subtab === 'inboundCalling' || subtab === null) {
      fetchData();
    }
  }, [subtab]);

  return (
    <Box >
      {isLoading === true ? <Box display={"flex"} justifyContent={"center"}><Spinner /></Box> :
        <>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Heading size="md" fontWeight={600} mb={"24px"} color={"#1A202C"}>
              Inbound Calling Settings
            </Heading>

            <Box>
              <Flex gap={'7px'} mb="10px" alignItems={"center"} >
                <Text fontWeight={600} fontSize="18px" color={"#212529"}>
                  Transfer Bot Call
                </Text>
                <ButtonGroupsDA
                  style={{ padding: '0px 0 0 0' }}
                  addHandler={() => {
                    if (callForwardingNumbersFields.length <= 3) {
                      appendcallForwardingNumbers({ name: '', number: '', customMessage: '' });
                    }
                  }}
                  addDisabled={callForwardingNumbersFields.length >= 5}
                />
              </Flex>
              <Text fontWeight={400} fontSize="14px" color="#6C757D" mb={"24px"}>
                Please provide the necessary details to complete UltimaBot call transfer.
              </Text>
              {
                callForwardingNumbersFields?.map((item: any, index: any) => {
                  return (
                    <Box key={index}>
                      <Flex gap={"20px"}>
                        <FormControl mb="24px" isInvalid={!!errors.callForwardingNumbers?.[index]?.name}>
                          <FormLabel mb={"8px"} fontWeight={400} fontSize="18px" color={"#212529"}>Designation
                            <Text as="span" fontSize="16px" fontWeight="400" style={{ color: "#DC3545" }}>
                              {/* * */}
                            </Text> </FormLabel>
                          <Input
                            type='text'
                            placeholder="Enter name"
                            {...register(`callForwardingNumbers.${index}.name`)}
                          />
                          {errors.callForwardingNumbers?.[index]?.name && (
                            <FormErrorMessage>{errors.callForwardingNumbers?.[index]?.name?.message}</FormErrorMessage>
                          )}
                          <FormHelperText fontWeight={400} fontSize="14px" color="#6C757D">
                            The recipients label or title
                          </FormHelperText>

                        </FormControl>
                        <FormControl mb="24px" isInvalid={!!errors.callForwardingNumbers?.[index]?.number}>
                          <FormLabel mb={"8px"} fontWeight={400} fontSize="18px" color={"#212529"}>Number<Text as="span" fontSize="16px" fontWeight="400" style={{ color: "#DC3545" }}>
                            {/* * */}
                          </Text></FormLabel>
                          <Input
                            type='tel'
                            placeholder="Eg: +3234567890"
                            {...register(`callForwardingNumbers.${index}.number`, {
                              // required: "Phone number is required",
                              validate: {
                                validFormat: (value) => {
                                  // Validate it starts with a + sign
                                  if (!value || value.trim() === "") return true;

                                  if (!value.startsWith('+')) {
                                    return "Phone number must start with a country code eg: +32";
                                  }

                                  // Validate it contains only digits after the + sign
                                  if (!/^\+\d+$/.test(value)) {
                                    return "Please enter a valid phone number";
                                  }

                                  return true;
                                }
                              },
                              minLength: {
                                value: 10,
                                message: "Please enter a valid phone number"
                              },
                              maxLength: {
                                value: 15,
                                message: "Phone number cannot exceed 15 characters"
                              },
                              onChange: (e) => {
                                // Allow only + at the beginning and digits elsewhere
                                const value = e.target.value;

                                // Keep the + if it's at the beginning and only digits elsewhere
                                if (value.length > 0) {
                                  const firstChar = value.charAt(0) === '+' ? '+' : '';
                                  const remainingChars = value.substring(firstChar === '+' ? 1 : 0).replace(/\D/g, '');
                                  e.target.value = (firstChar + remainingChars).slice(0, 15);
                                }
                              }
                            })}
                          />
                          {errors.callForwardingNumbers?.[index]?.number?.message && (
                            <FormErrorMessage>{errors.callForwardingNumbers?.[index]?.number?.message}</FormErrorMessage>
                          )}
                          <FormHelperText fontWeight={400} fontSize="14px" color="#6C757D">
                            Redirect calls to a live agent when the UltimaBot can't assist. Please enter phone no.
                          </FormHelperText>

                        </FormControl>

                        <FormControl mb="24px" isInvalid={!!errors.callForwardingNumbers?.[index]?.customMessage}>
                          <FormLabel mb={"10px"} fontWeight={400} fontSize="18px" color={"#212529"}>Custom Message(Optional)</FormLabel>
                          <Textarea
                            rows={1}
                            minH={"2.5rem"}
                            placeholder="Enter Message "
                            {...register(`callForwardingNumbers.${index}.customMessage`)}
                          />
                          {errors.callForwardingNumbers?.[index]?.customMessage?.message && (
                            <FormErrorMessage>{errors.callForwardingNumbers?.[index]?.customMessage?.message}</FormErrorMessage>
                          )}
                          <FormHelperText fontWeight={400} fontSize="14px" color="#6C757D">
                            Add an optional message before transferring the call to provide context
                          </FormHelperText>
                        </FormControl>
                        {
                          callForwardingNumbersFields.length > 1 &&
                          <Flex justifyContent={"end"} pb="20px">

                            <ButtonGroupsDA
                              style={{ padding: '30px 0 0 0' }}
                              deleteHandler={() => removecallForwardingNumbers(index)}
                              // addHandler={() => {
                              //   if (callForwardingNumbersFields.length <= 3) {
                              //     appendcallForwardingNumbers({ name: '', number: '', customMessage: '' });
                              //   }
                              // }}
                              deleteDisabled={callForwardingNumbersFields.length === 1}
                            // addDisabled={callForwardingNumbersFields.length >= 5}
                            />
                          </Flex>
                        }
                      </Flex>
                    </Box>
                  )
                })
              }

            </Box>

            <hr style={{ color: "#EEF4FA" }} />

            <Box mb={'24px'} mt="24px">
              <Heading size="18px" fontWeight={600} color={"#1A202C"} mb={"4px"}>
                Speech Configuration Customization
              </Heading>
              <Text fontWeight={400} fontSize="14px" color="#6C757D" mb={"24px"}>
                Implement settings for Wait Time Before Speaking
              </Text>

              <FormControl isInvalid={!!errors.waitTimeBeforeSpeak}>
                <FormLabel mb={"8px"} fontWeight={400} fontSize="16px" color={"#212529"}>Set Timer
                  <Text as="span" color="gray.500" fontSize="sm">(miliseconds from 1 to 5)</Text>
                </FormLabel>

                <NumberInput min={1} max={5} step={1} clampValueOnBlur>
                  <NumberInputField
                    {...register("waitTimeBeforeSpeak", {
                      required: "Timer setting is required",
                      max: {
                        value: 5,
                        message: "Value cannot be greater than 5",
                      },
                    })}
                    placeholder="Enter time in milliseconds"
                    onInput={(e: any) => {
                      if (e.target.value > 5) {
                        e.target.value = 5;
                      }
                    }}
                  />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text fontWeight={400} fontSize="14px" color="#6C757D" mt={2}>
                  Set the wait time before the UltimaBot starts speaking. Default is 2 miliseconds.
                </Text>
                {errors.waitTimeBeforeSpeak && <FormErrorMessage>{errors.waitTimeBeforeSpeak.message}</FormErrorMessage>}
              </FormControl>
            </Box>
            <hr style={{ color: "#EEF4FA" }} />
            {/* Lead Collection Data */}
            <Box mt="24px" mb="24px">
              <Heading size="18px" fontWeight={600} color={"#212529"} mb={"4px"}>
                Lead collection data
              </Heading>
              <Text fontWeight={400} fontSize="14px" color="#6C757D" mb={"24px"}>
                Which data you would like to get from the VoiceBot?
              </Text>

              <Flex justify="space-between" align="center" mb={4}>
                <Text size="16px" fontWeight={400} color={"#212529"} mb={"4px"}>Name</Text>
                <Switch
                  colorScheme="blue"
                  size="lg"
                  isChecked={leadCollectionData?.fullName}
                  onChange={(e) => handleToggle(e, 'fullName')}
                  // isDisabled
                  defaultChecked
                />
              </Flex>
              <Flex justify="space-between" align="center" mb={4}>
                <Text size="16px" fontWeight={400} color={"#212529"} mb={"4px"}>Phone</Text>
                <Switch
                  colorScheme="blue"
                  size="lg"
                  isChecked={leadCollectionData?.contactNumber}
                  onChange={(e) => handleToggle(e, 'contactNumber')}
                  // isDisabled
                  defaultChecked
                />
              </Flex>

              <Flex justify="space-between" align="center" mb={4}>
                <Text size="16px" fontWeight={400} color={"#212529"} mb={"4px"}>Email</Text>
                <Switch
                  colorScheme="blue"
                  size="lg"
                  isChecked={leadCollectionData?.email}
                  onChange={(e) => handleToggle(e, 'email')}
                  // isDisabled
                  defaultChecked
                />
              </Flex>
              <Flex justify="space-between" align="center" mb={4}>
                <Text size="16px" fontWeight={400} color={"#212529"} mb={"4px"}>Address</Text>
                <Switch
                  colorScheme="blue"
                  size="lg"
                  isChecked={leadCollectionData?.address}
                  onChange={(e) => handleToggle(e, 'address')}
                />
              </Flex>
            </Box>
            {/* <hr style={{ color: "#EEF4FA", marginTop: "16px", marginBottom: "16px" }} /> */}
            {/* Default Based Prompt */}
            {/* <FormControl mb={6} isInvalid={!!errors.defaultPrompt}>
              <Flex align="center" mb={1}>
                <FormLabel m={0} size="16px" fontWeight={400} color={"#212529"} mb={"4px"}>Your Default Based Prompt</FormLabel>

              </Flex>
              <Textarea
                // placeholder={defaultPrompt}
                rows={6}
                // {...register("defaultPrompt")}
                readOnly
                style={{ color: "#6C757D", borderColor: "#CED4DA" }}
              />
              {errors.defaultPrompt && (
                <FormErrorMessage>{errors.defaultPrompt.message}</FormErrorMessage>
              )}
            </FormControl> */}


            {/* Custom Transfer Message Section - Only show when Warm Transfer is selected */}
            {transferMode === 'warm' && (
              <Box>
                <Text fontWeight={400} fontSize="16px" color={"#212529"} mb={"8px"}>
                  Custom Transfer Message
                </Text>
                <FormControl isInvalid={!!errors.customTransferMessage}>
                  <Controller
                    name="customTransferMessage"
                    control={control}
                    rules={{
                      required: 'A transfer message is required for warm transfers',
                      maxLength: {
                        value: 100,
                        message: 'Message cannot exceed 100 characters',
                      },
                      minLength: {
                        value: 10,
                        message: 'Message must be at least 10 characters',
                      },
                    }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="Eg: Your call is transferring to manager"
                        size="md"
                        mb={1}
                      />
                    )}
                  />
                  {errors.customTransferMessage ? (
                    <FormErrorMessage>{errors.customTransferMessage.message}</FormErrorMessage>
                  ) : (
                    <FormHelperText fontWeight={400} fontSize="sm" color="#6C757D">
                      Add an optional message before transferring the call to provide context
                    </FormHelperText>
                  )}
                </FormControl>
              </Box>
            )}

            {/* Save Button */}
            <Flex justifyContent="flex-end" mt="15px">
              <Button
                type="submit"
                size="md"
                isLoading={isSubmitting}
                colorScheme="blue"
              >
                <Image src={saveIcon} alt='Save & Continue' />
                <Text as="span" fontSize="16px" ms="8px" fontWeight="500">Save</Text>
              </Button>
            </Flex>
          </form>
        </>}
    </Box>
  );
};

export default InboundCallingSettings;