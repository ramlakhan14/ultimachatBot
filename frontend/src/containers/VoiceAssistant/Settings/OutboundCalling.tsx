import React, { useEffect, useState } from 'react';
import {
  Box,
  FormLabel,
  Heading,
  Input,
  FormControl,
  Text,
  Switch,
  Textarea,
  Button,
  Flex,
  FormHelperText,
  FormErrorMessage,
  NumberInputStepper,
  NumberInput,
  NumberInputField,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Image,
  PopoverArrow,
  useToast,
  Spinner
} from '@chakra-ui/react';
import { useFieldArray, useForm } from "react-hook-form";
import { GoInfo } from 'react-icons/go';
import saveIcon from "../Images/saveBtn.svg";
import { settingsGet, settingsOutbound } from '../../../services/VoiceBot';
import { useLocation } from 'react-router-dom';
import { ButtonGroupsDA } from '../../../components/ButtonGroups';
import { Tooltip } from 'recharts';


interface ObjSample {
  name: string;
  number: string;
  customMessage: string;
}

interface FormData {
  callForwardingNumber: string;
  customTransferMessage?: string;
  waitTimeBeforeSpeak: string;
  callForwardingNumbers: ObjSample[];
  defaultPrompt: string;
}

interface LeadCollectionData {
  phone: boolean;
  address: boolean;
}

const OutboundCalling: React.FC = () => {
  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    defaultValues: {
      callForwardingNumbers: [{ name: '', number: '', customMessage: '' }],
      waitTimeBeforeSpeak: "2.0"
    }
  });
  const toast = useToast();
  const [isPopoverOpen, setIsPopoverOpen] = React.useState<boolean>(false);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const subtab = queryParams.get('subtab');
  const [isLoading, setIsLoading] = useState(false);
  const [leadCollectionData, setLeadCollectionData] = useState<LeadCollectionData>({
    phone: false,
    address: false
  });

  const handleToggle = (field: keyof LeadCollectionData): void => {
    setLeadCollectionData(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const onSubmit = async (formData: FormData): Promise<void> => {
    try {
      const finalData = {
        ...formData,
        leadCollectionData,
        callForwardingNumbers: formData.callForwardingNumbers.filter(item => item.name.trim() !== '' && item.number.trim() !== '') || []
      };
      if (finalData.customTransferMessage === "" || finalData.customTransferMessage === undefined) {
        delete finalData?.customTransferMessage;
      }
      const response = await settingsOutbound(finalData);
      // console.log(response);
      toast({
        title: `${response.data.message}`,
        status: "success",
        isClosable: true,
      })

    } catch (error: any) {
      toast({
        title: `${error.response?.data?.message}`,
        status: "error",
        isClosable: true,
      });
    }
  };


  const {
    fields: callForwardingNumbersFields,
    append: appendcallForwardingNumbers,
    remove: removecallForwardingNumbers,
    replace: replacecallForwardingNumbers
  } = useFieldArray({
    control,
    name: "callForwardingNumbers"
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response: any = await settingsGet();
      const updateData = response?.data?.data?.outBoundSettings;
      setValue("callForwardingNumbers", updateData?.callForwardingNumbers?.length > 0 ? updateData?.callForwardingNumbers : [{ name: '', number: '', customMessage: '' }]);
      replacecallForwardingNumbers(updateData?.callForwardingNumbers?.length > 0 ? updateData?.callForwardingNumbers : [{ name: '', number: '', customMessage: '' }]);
      setValue("customTransferMessage", updateData?.customTransferMessage);
      setValue("waitTimeBeforeSpeak", updateData?.waitTimeBeforeSpeak);
      setValue("defaultPrompt", updateData?.defaultPrompt);
      setLeadCollectionData(updateData?.leadCollect || updateData?.leadCollectionData);
    } catch (error: any) {

    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (subtab == 'outboundCalling') {
    }
  }, [subtab]);

  return (
    <Box maxW={"100%"}>
      {isLoading ? <Box display={"flex"} justifyContent={"center"}><Spinner /></Box> : <>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Heading size="md" fontWeight={600} mb={"24px"} color={"#1A202C"}>
            Outbound Calling Settings
          </Heading>
          {/* Call Forwards now this will be na array */}
          <Box>
            <Flex gap={'7px'} mb="10px" alignItems={"center"}>
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
            {
              callForwardingNumbersFields?.map((item: any, index: any) => {
                return (
                  <Box key={index}>
                    <Flex gap={"20px"}>
                      <FormControl mb="24px" isInvalid={!!errors.callForwardingNumbers?.[index]?.name}>
                        <FormLabel mb={"8px"} fontWeight={400} fontSize="18px" color={"#212529"}>Designation
                          <Text as="span" fontSize="16px" fontWeight="400" style={{ color: "#DC3545" }}>
                            {/* * */}
                          </Text>
                        </FormLabel>
                        <Input
                          type='text'
                          placeholder="Enter name"
                          {...register(`callForwardingNumbers.${index}.name`)}
                        />
                        {errors.callForwardingNumbers?.[index]?.name && (
                          <FormErrorMessage>{errors.callForwardingNumbers?.[index]?.name?.message}</FormErrorMessage>
                        )}

                      </FormControl>
                      <FormControl mb="24px" isInvalid={!!errors.callForwardingNumbers?.[index]?.number}>
                        <FormLabel mb={"8px"} fontWeight={400} fontSize="18px" color={"#212529"}>Number
                          <Text as="span" fontSize="16px" fontWeight="400" style={{ color: "#DC3545" }}>
                            {/* * */}
                          </Text>
                        </FormLabel>
                        <Input
                          type='tel'
                          placeholder="Eg: +3234567890"
                          {...register(`callForwardingNumbers.${index}.number`, {
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
                        <FormHelperText fontWeight={400} fontSize="11px" color="#6C757D">
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
                        <FormHelperText fontWeight={400} fontSize="11px" color="#6C757D">
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
                            addDisabled={callForwardingNumbersFields.length >= 5}
                          />
                        </Flex>
                      }
                    </Flex>
                    {/* <Flex>
                    </Flex> */}

                  </Box>
                )
              })
            }
          </Box>

          <hr style={{ color: "#EEF4FA" }} />

          <Box mt="24px" mb="24px">
            <Heading size="18px" fontWeight={600} color={"#1A202C"} mb={"4px"}>
              Speech Configuration Customization
            </Heading>
            <Text fontWeight={400} fontSize="14px" color="#6C757D" mb={"24px"}>
              Implement settings for Wait Time Before Speaking
            </Text>

            <FormControl isInvalid={!!errors.waitTimeBeforeSpeak}>
              <FormLabel mb={"8px"} fontWeight={400} fontSize="16px" color={"#212529"}>Set Timer
                <Text as="span" color="gray.500" fontSize="sm">(miliseconds from 1 to 5)</Text></FormLabel>

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
          <hr style={{ color: "#EEF4FA", marginTop: "16px", marginBottom: "16px" }} />
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
                isDisabled defaultChecked
              />
            </Flex>

            <Flex justify="space-between" align="center" mb={4}>
              <Text size="16px" fontWeight={400} color={"#212529"} mb={"4px"}>Email</Text>
              <Switch
                colorScheme="blue"
                size="lg"
                isDisabled defaultChecked
              />
            </Flex>

            <Flex justify="space-between" align="center" mb={4}>
              <Text size="16px" fontWeight={400} color={"#212529"} mb={"4px"}>Address</Text>
              <Switch
                colorScheme="blue"
                size="lg"
                isChecked={leadCollectionData?.address}
                onChange={() => handleToggle('address')}
              />
            </Flex>
          </Box>
          <hr style={{ color: "#EEF4FA" }} />
          {/* Default Based Prompt */}
          <FormControl mt={'24px'} mb={'24px'} isInvalid={!!errors.defaultPrompt}>
            <Flex align="center" mb={1}>
              <FormLabel m={0} size="16px" fontWeight={400} color={"#212529"} mb={"4px"}>Your Default Based Prompt</FormLabel>
              <Popover isOpen={isPopoverOpen} onClose={() => setIsPopoverOpen(false)}>
                <PopoverTrigger>
                  <Box
                    cursor="pointer"
                    as="span"
                    onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                    ml="10px"
                  >
                    <GoInfo />
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
                  style={{ boxShadow: "none" }}
                  borderRadius="4px"
                >
                  <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                  {/* <PopoverCloseButton /> */}
                  <Box whiteSpace="pre-wrap">This is your default base prompt, pre-set for use in your campaign. It cannot be modified.</Box>
                </PopoverContent>
              </Popover>
            </Flex>
            <Textarea
              // placeholder={defaultPrompt}
              rows={6}
              {...register("defaultPrompt")}
              readOnly
              style={{ color: "#6C757D", borderColor: "#CED4DA", lineHeight: "150%" }}
            />
            {errors.defaultPrompt && (
              <FormErrorMessage>{errors.defaultPrompt.message}</FormErrorMessage>
            )}
          </FormControl>

          {/* Save Button */}
          <Flex justify="flex-end">
            <Button
              type="submit"
              size="md"
              isLoading={isSubmitting}
              colorScheme="blue"
            // className="btn-hover-pri"
            >
              <Image src={saveIcon} alt='Save & Continue' />
              <Text as="span" fontSize="16px" ms="8px" fontWeight="500">Save</Text>
            </Button>

          </Flex>
        </form></>}
    </Box>
  );
};

export default OutboundCalling;