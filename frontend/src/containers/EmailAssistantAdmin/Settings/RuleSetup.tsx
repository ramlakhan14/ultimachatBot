import {
  Box, Heading, Button, FormControl, FormLabel, Image, Input, FormHelperText, Text, RadioGroup, VStack, Radio, Select, Flex, IconButton, useToast, InputGroup, InputLeftElement,
  TableContainer, Table, Tbody, Tr, Td, Checkbox,
  Textarea,
  Spinner,
  Divider
} from "@chakra-ui/react";
import React from "react";
import { useForm } from 'react-hook-form';
import styles from "./setting.module.scss";
import Enter from "../../../components/Icons/enter.svg";
import DeleteIcon from "../../../components/Icons/delete2.svg";
import AddIcon from "../../../components/Icons/add.svg";
import { IoIosSearch } from "react-icons/io";
import { time } from "console";
import { updateRuleSetupSettings } from '../../../services/emailassistantservice';

interface TimeRange {
  id: string;
  from: string;
  to: string;
}
interface EmailItem {
  email: string;
}
const RuleSetup = ({ settingData, isFetching }: any) => {
  // console.log(settingData, "settingDataRuleSetting");
  const getCurrentDateTime = () => {
    return new Date().toISOString().slice(0, 16);
  }
  const [currentDateTime, setCurrentDateTime] = React.useState(getCurrentDateTime());
  const [archieveEmails, setArchieveEmails] = React.useState<string[]>(settingData?.archiveManaged?.senderDetails || []);
  const [newArchieveEmail, setNewArchieveEmail] = React.useState('');
  const [timeRanges, setTimeRanges] = React.useState<TimeRange[]>(() => {
    if (settingData?.archiveManaged?.timebasedArchiveValue?.length > 0) {
      return settingData.archiveManaged.timebasedArchiveValue.map((range: any, index: number) => ({
        id: index.toString(),
        from: range.from,
        to: range.to
      }));
    }
    return [{ id: '1', from: '', to: '' }];
  });
  const [emails, setEmails] = React.useState<string[]>(settingData?.customizeSettings?.emailExclusion || []);
  const [newEmail, setNewEmail] = React.useState('');
  const [selectedOption, setSelectedOption] = React.useState(() => {
    if (settingData?.fallbackMechanism?.FALLBACK_MECHANISM_1) return "1";
    if (settingData?.fallbackMechanism?.FALLBACK_MECHANISM_2) return "2";
    if (settingData?.fallbackMechanism?.FALLBACK_MECHANISM_3?.isForward) return "3";
    return "2";
  });
  const [keywords, setKeywords] = React.useState<string[]>(settingData?.customizeSettings?.keywords || []);
  const [newKeyword, setNewKeyword] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [emailError, setEmailError] = React.useState("");
  const [emailArchieveError, setEmailArchieveError] = React.useState("");
  const toast = useToast();
  // console.log('newArchieveEmail', newArchieveEmail)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    trigger,
  } = useForm<any>({
    defaultValues: {
      emailContent: settingData?.archiveManaged?.emailContent || "",
      fallbackEmail: settingData?.fallbackMechanism?.FALLBACK_MECHANISM_3?.forwardTo || "",
    }
  });


  const openDateTimePicker = (
    e: React.MouseEvent<HTMLInputElement>
  ) => {
    const input = e.currentTarget;

    if (typeof input.showPicker === "function") {
      input.showPicker();
    }
  };


  // Effect to update form values when settingData changes
  React.useEffect(() => {
    if (settingData) {
      // Update form values
      setValue('emailContent', settingData?.archiveManaged?.emailContent || "");
      setValue('fallbackEmail', settingData?.fallbackMechanism?.FALLBACK_MECHANISM_3?.forwardTo || "");

      // Update state values
      setKeywords(settingData?.customizeSettings?.keywords || []);
      setEmails(settingData?.customizeSettings?.emailExclusion || []);
      setArchieveEmails(settingData?.archiveManaged?.senderDetails || []);

      // Update time ranges
      const timebasedValue = settingData?.archiveManaged?.timebasedArchiveValue;
      if (Array.isArray(timebasedValue) && timebasedValue.length > 0) {
        setTimeRanges(timebasedValue.map((range: any, index: number) => ({
          id: index.toString(),
          from: range.from || '',
          to: range.to || ''
        })));
      }

      // Update selected option
      if (settingData.fallbackMechanism) {
        if (settingData.fallbackMechanism.FALLBACK_MECHANISM_1) setSelectedOption("1");
        else if (settingData.fallbackMechanism.FALLBACK_MECHANISM_2) setSelectedOption("2");
        else if (settingData.fallbackMechanism.FALLBACK_MECHANISM_3?.isForward) setSelectedOption("3");
      }
    }
  }, [settingData, setValue]);

  // const addTimeRange = () => {
  //   setTimeRanges([
  //     ...timeRanges,
  //     { id: Date.now().toString(), from: '', to: '' }
  //   ]);
  // };

  const addTimeRange = () => {
    // Validate all existing time ranges have both from and to filled
    const allRangesFilled = timeRanges.every(range => range.from && range.to);

    if (!allRangesFilled) {
      // Show error message - you can use toast or any other feedback mechanism
      toast({
        title: "Validation Error",
        description: "Please fill both 'From' and 'To' fields for all existing time ranges before adding a new one.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // If validation passes, add a new empty time range
    setTimeRanges([
      ...timeRanges,
      { id: Date.now().toString(), from: '', to: '' }
    ]);
  };

  const transformTimeRangePayload = (data: TimeRange[]): Omit<TimeRange, 'id'>[] => {
    return data.map(({ id, ...rest }) => rest);
  };

  // console.log(timeRanges, 'timeRanges')

  const removeTimeRange = (id: string) => {
    if (timeRanges.length === 1) {
      toast({
        title: "Cannot remove",
        description: "At least one Date / Time range is required",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setTimeRanges(timeRanges.filter(range => range.id !== id));
  };

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(getCurrentDateTime());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const updateTimeRange = (id: string, field: 'from' | 'to', value: string) => {
    if (value > currentDateTime) {
      toast({
        title: "Invalid Date / Time",
        description: "You can only select dates and times in the past.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return; // Don't update if future date / time
    }
    // If updating the "to" field, make sure it's not before the "from" field
    if (field === 'to') {
      const range = timeRanges.find(r => r.id === id);
      if (range && range.from && value < range.from) {
        toast({
          title: "Invalid Time Range",
          description: "'To' date / time cannot be earlier than 'From' date / time.",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
    }

    // If updating the "from" field, make sure it's not after the "to" field
    if (field === 'from') {
      const range = timeRanges.find(r => r.id === id);
      if (range && range.to && value > range.to) {
        toast({
          title: "Invalid Time Range",
          description: "'From' date / time cannot be later than 'To' date / time.",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
    }
    setTimeRanges(timeRanges.map(range =>
      range.id === id ? { ...range, [field]: value } : range
    ));
  };

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (keywordToRemove: any) => {
    setKeywords(keywords.filter(keyword => keyword !== keywordToRemove));
  };

  const handleKeyPress = (e: any) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleExclusion = () => {
    if (newEmail.trim()) {
      setEmails([newEmail.trim(), ...emails]);
      setNewEmail('');
    }
  };

  const handleEmailArchieve = () => {
    if (newArchieveEmail.trim()) {
      setArchieveEmails([newArchieveEmail.trim(), ...archieveEmails]);
      setNewArchieveEmail('');
    }
  };

  const handleRemoveEmail = (index: any) => {
    const updatedEmails = emails.filter((_, i: any) => i !== index);
    setEmails(updatedEmails);
  };
  const handleRemoveArchieveEmail = (index: any) => {
    const updatedEmails = archieveEmails.filter((_, i) => i !== index);
    setArchieveEmails(updatedEmails);
  };

  const handleEmailKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // const regex = /^[a-zA-Z0-9._%+-@]+$/; // Allow valid email characters

    // if (!regex.test(e.key) && e.key !== "Enter") {
    //   e.preventDefault(); // Block invalid characters
    // }

    if (e.key === "Enter") {
      e.preventDefault();

      // Validate email format
      if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(newEmail)) {
        setEmailError(""); // Clear error
        handleExclusion();
      } else {
        setEmailError("Invalid email format"); // Show error message below input
      }
    }
  };

  const handleEmailArchieveKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();

      // Validate email format
      if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(newArchieveEmail)) {
        setEmailArchieveError(""); // Clear error
        handleEmailArchieve();
      } else {
        setEmailArchieveError("Invalid email format"); // Show error message below input
      }
    }
  };

  const handleValueChange = (value: string) => {
    setSelectedOption(value);
  };

  const onSubmit = async (data: any) => {
    // console.log(data);
    const payload = {
      customizeSettings: {
        keywords: keywords,
        emailExclusion: emails
      },
      fallbackMechanism: {
        FALLBACK_MECHANISM_1: selectedOption === "1",
        FALLBACK_MECHANISM_2: selectedOption === "2",
        FALLBACK_MECHANISM_3: {
          isForward: selectedOption === "3",
          forwardTo: selectedOption === "3" ? data.fallbackEmail : ''
        }
      },
      archiveManaged: {
        timebasedArchive: timeRanges?.length > 0 ? true : false,
        timebasedArchiveValue: transformTimeRangePayload(timeRanges),
        senderDetails: archieveEmails
      }
    };
    // console.log('payload', payload);

    try {
      setIsSubmitting(true);
      const res: any = await updateRuleSetupSettings(payload);

      if (res.status === 200) {
        toast({
          title: "Rule setup settings updated successfully",
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
    <Box>
      <Heading fontSize={"20px"} lineHeight={"28px"} fontWeight={600}>Customize Settings</Heading>
      <Box mt={'24px'}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormControl
            // maxW={'600px'}
            mt={'24px'}>
            <FormLabel fontSize="16px" m="0px" pb="8px">Keyword</FormLabel>
            <Box display={'flex'} gap={'10px'}>
              <Input
                placeholder="Add your Keywords"
                type="text"
                {...register('keyword', {
                  // required: 'Keyword is required',
                })}
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <Button
                onClick={handleAddKeyword}
                colorScheme="blue"
                fontWeight={500}
              >
                <Image src={Enter} />
              </Button>
            </Box>
            <FormHelperText fontSize={"14px"} mt='5px' color={"#6C757D"} >Prevent the Al from responding to emails containing specific keywords. The Al will automatically skip generating replies for emails that include these keywords, allowing you to filter out unwanted or irrelevant communications.</FormHelperText>

            <Box display={'flex'} flexWrap={'wrap'} gap={'10px'} mt={'10px'}>
              {keywords?.map((keyword, index) => (
                <Box
                  key={index}
                  display={'flex'}
                  alignItems={'center'}
                  gap={'10px'}
                  border={'1px solid #E2E8F0'}
                  borderColor={'#2977FF'}
                  borderRadius={'50px'}
                  color={'#2977FF'}
                  fontSize={'12px'}
                  textAlign={'center'}
                  padding={'2px 2px 2px 8px'}
                // className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
                >
                  <Text as="span">{keyword}</Text>
                  <Text as="span"
                    onClick={() => handleRemoveKeyword(keyword)}
                    aria-label="Remove keyword"
                    width={'22px'}
                    height={'22px'}
                    lineHeight={1}
                    bg={'#2977FF'}
                    color={'#fff'}
                    padding={'5px'}
                    borderRadius={'50%'}
                    role="button"
                  >
                    x
                  </Text>
                </Box>
              ))}
            </Box>
          </FormControl>

          <FormControl
            // maxW={'600px'}
            mt={'24px'}>
            <FormLabel fontSize="16px" m="0px" pb="8px">Email ID’s Exclusion</FormLabel>
            <Box display={'flex'} gap={'10px'}>
              <Input
                type="text"
                {...register('emailExclusion', {
                  // required: 'Keyword is required',
                  pattern: {
                    value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                    message: "Invalid email format",
                  },
                })}
                value={newEmail}
                onChange={(e) => {

                  setNewEmail(e.target.value);
                  setEmailError(""); // Clear error on typing
                  setValue("emailExclusion", e.target.value); // Update form value
                  trigger("emailExclusion"); // Trigger validation

                }}
                onKeyPress={handleEmailKeyPress}
              />
              <Button
                onClick={handleExclusion}
                colorScheme="blue"
                fontWeight={500}
              >
                <Image src={Enter} />
              </Button>
            </Box>
            {emailError && (
              <Text color="red.500" fontSize="sm" mt={1}>
                {emailError}
              </Text>
            )}
            <FormHelperText fontSize={"14px"} mt='5px' color={"#6C757D"} >Add email addresses to the exclusion list to prevent the Al from generating replies for those contacts. This feature gives you control over who the Al communicates with, ensuring it aligns with your preferences.</FormHelperText>
          </FormControl>
          {emails?.length > 0 && (<FormControl
            // maxW={'600px'}
            mt={'24px'}>
            <Text fontSize="lg" fontWeight={500} mb={3} mt={4}>
              Excluded Email ID's
            </Text>
            <Box className={styles.emailList}>
              {emails?.map((email, index) => (
                <Box key={index} className={styles.emailItem}>
                  <Text>{email}</Text>
                  <Text as="span"
                    className={styles.removeIcon}
                    onClick={() => handleRemoveEmail(index)}
                  >
                    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13.4997 7.4993C13.4985 8.55981 13.0767 9.57656 12.3268 10.3265C11.5769 11.0763 10.5602 11.4981 9.49966 11.4993H3.99966C3.86705 11.4993 
                        3.73988 11.4466 3.64611 11.3529C3.55234 11.2591 3.49966 11.1319 3.49966 10.9993C3.49966 10.8667 3.55234 10.7395 3.64611 10.6457C3.73988 10.552 3.86705 
                        10.4993 3.99966 10.4993H9.49966C10.2953 10.4993 11.0584 10.1832 11.621 9.62062C12.1836 9.05801 12.4997 8.29495 12.4997 7.4993C12.4997 6.70365 12.1836 
                        5.94059 11.621 5.37798C11.0584 4.81537 10.2953 4.4993 9.49966 4.4993H2.20654L4.35341 6.64555C4.44723 6.73937 4.49994 6.86662 4.49994 6.9993C4.49994 
                        7.13198 4.44723 7.25923 4.35341 7.35305C4.25959 7.44687 4.13234 7.49958 3.99966 7.49958C3.86698 7.49958 3.73973 7.44687 3.64591 7.35305L0.645911 
                        4.35305C0.599423 4.30662 0.562543 4.25147 0.537381 4.19077C0.512219 4.13007 0.499268 4.06501 0.499268 3.9993C0.499268 3.93359 0.512219 3.86853 0.537381 
                        3.80783C0.562543 3.74713 0.599423 3.69199 0.645911 3.64555L3.64591 0.645551C3.73973 0.551731 3.86698 0.499023 3.99966 0.499023C4.13234 0.499023 4.25959 
                        0.551731 4.35341 0.645551C4.44723 0.739372 4.49994 0.866619 4.49994 0.999301C4.49994 1.13198 4.44723 1.25923 4.35341 1.35305L2.20654 3.4993H9.49966C10.5602 
                        3.50046 11.5769 3.92226 12.3268 4.67215C13.0767 5.42205 13.4985 6.43879 13.4997 7.4993Z" fill="#6C757D" />
                    </svg>
                  </Text>
                </Box>
              ))}
            </Box>
          </FormControl>)}

          {/* <Divider color={"#EEF4FA"} /> */}
          <FormControl
            // maxW={'600px'}
            mt="18px"
            borderTop={"1px solid #EEF4FA"} borderBottom={"1px solid #EEF4FA"}
            py={"24px"}>
            <Text fontSize="18px!important" fontWeight={"600!important"} lineHeight={"26px"}>
              Fallback Mechanism
            </Text>
            <RadioGroup value={selectedOption} onChange={handleValueChange} mt={6}>
              <VStack gap="2" alignItems={'flex-start'} justifyContent={'flex-start'}>
                <Box display={`flex`} gap={3} alignItems={`flex-start`}>
                  <Radio value="1" mt={1}></Radio>
                  <Box>
                    <Text fontSize={"14px"} fontWeight={"400"}>Don't answer but add mail in a specific map/folder</Text>
                  </Box>
                </Box>

                <Box display={`flex`} gap={3} alignItems={`flex-start`}>
                  <Radio value="2" mt={1}></Radio>
                  <Box>
                    <Text fontSize={"14px"} fontWeight={"400"}>Answer but reply that someone will reach out</Text>
                  </Box>
                </Box>

                <Box display={`flex`} gap={3} alignItems={`flex-start`}>
                  <Radio value="3" mt={1}></Radio>
                  <Box>
                    <Text fontSize={"14px"} fontWeight={"400"}>Forward mail to specific mail Id</Text>
                    {selectedOption === "3" && (
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          size="md"
                          mt={4}
                          minW={'350px'}
                          {...register('fallbackEmail', {
                            required: selectedOption === "3" ? 'Email selection is required' : false,
                            pattern: {
                              value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                              message: "Invalid email format",
                            },
                          })}
                        />
                        {errors.fallbackEmail && (
                          <Text color="red.500" fontSize="sm" mt={1}>
                            {errors.fallbackEmail.message}
                          </Text>
                        )}
                      </FormControl>
                    )}
                  </Box>
                </Box>
              </VStack>
            </RadioGroup>
          </FormControl>
          {/* <Divider color={"#EEF4FA"} /> */}
          <FormControl
            // maxW={'600px'}
            mt={"24px"}>
            <Flex alignItems={"center"} gap={"10px"}>
              <Text fontSize="18px!important" fontWeight={"600!important"} lineHeight={"26px"}>
                Archive Managed
              </Text>
              <IconButton
                aria-label="Add time range"
                icon={<Image src={"/icons/plusicon.svg"} boxSize="14px" />}
                onClick={addTimeRange}
                bg="#6C757D"
                // border="2px dashed #2977FF"
                // borderRadius="8px"
                w="32px"
                h="32px"
                minW="32px"
                borderRadius="50%!important"
                _hover={{ bg: "#6C757D" }}
              />

            </Flex>
            <VStack align="stretch" mt="24px">
              <FormLabel fontSize="16px" mt="0px" mb={0}>Time Based Archiving</FormLabel>
              {timeRanges.map((range) => (
                <Flex key={range.id} gap={4} mt="8px !important" alignItems="center">
                  <Input
                    type="datetime-local"
                    placeholder="From"
                    value={range.from}
                    onClick={openDateTimePicker}
                    onChange={(e) => updateTimeRange(range.id, 'from', e.target.value)}
                    max={currentDateTime}
                  />
                  <Input
                    type="datetime-local"
                    placeholder="To"
                    value={range.to}
                    onClick={openDateTimePicker}
                    onChange={(e) => updateTimeRange(range.id, 'to', e.target.value)}
                    max={currentDateTime}
                  />
                  <IconButton
                    aria-label="Remove time range"
                    icon={<Image src={DeleteIcon} />}
                    disabled={timeRanges.length === 1}
                    onClick={() => removeTimeRange(range.id)}
                    background={"transparent"}
                    colorScheme="gray"
                  />
                </Flex>
              ))}
            </VStack>

          </FormControl>

          <FormControl
            // maxW={'600px'}
            mt={'16px'}>
            <FormLabel fontSize="16px" m="0px" pb="8px">Archive Email</FormLabel>
            <Box display={'flex'} gap={'10px'}>
              <Input
                type="text"
                {...register('emailArchieve', {
                  // required: 'Keyword is required',
                  pattern: {
                    value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                    message: "Invalid email format",
                  },
                })}
                value={newArchieveEmail}
                onChange={(e) => {

                  setNewArchieveEmail(e.target.value);
                  setEmailArchieveError(""); // Clear error on typing
                  setValue("emailArchieve", e.target.value); // Update form value
                  trigger("emailArchieve"); // Trigger validation

                }}
                onKeyPress={handleEmailArchieveKeyPress}
              />
              <Button
                onClick={handleEmailArchieve}
                colorScheme="blue"
                fontWeight={500}
              >
                <Image src={Enter} />
              </Button>
            </Box>
            {emailArchieveError && (
              <Text color="red.500" fontSize="sm" mt={1}>
                {emailArchieveError}
              </Text>
            )}
            <FormHelperText fontSize={"14px"} mt='5px' color={"#6C757D"} >Enter email addresses to archive. This helps retain important communications while decluttering your inbox. Ensure proper formatting for accurate archiving and easy updates.</FormHelperText>
          </FormControl>
          {archieveEmails?.length > 0 && (<FormControl
            // maxW={'600px'}
            mt={'16px'}>
            <Text fontSize="14px" fontWeight={400} mb={'8px'} >
              Archived Email ID's
            </Text>
            <Box className={styles.emailList}>
              {archieveEmails?.map((email, index) => (
                <Box key={index} className={styles.emailItem}>
                  <Text>{email}</Text>
                  <Text as="span"
                    className={styles.removeIcon}
                    onClick={() => handleRemoveArchieveEmail(index)}
                  >
                    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13.4997 7.4993C13.4985 8.55981 13.0767 9.57656 12.3268 10.3265C11.5769 11.0763 10.5602 11.4981 9.49966 11.4993H3.99966C3.86705 11.4993 
                        3.73988 11.4466 3.64611 11.3529C3.55234 11.2591 3.49966 11.1319 3.49966 10.9993C3.49966 10.8667 3.55234 10.7395 3.64611 10.6457C3.73988 10.552 3.86705 
                        10.4993 3.99966 10.4993H9.49966C10.2953 10.4993 11.0584 10.1832 11.621 9.62062C12.1836 9.05801 12.4997 8.29495 12.4997 7.4993C12.4997 6.70365 12.1836 
                        5.94059 11.621 5.37798C11.0584 4.81537 10.2953 4.4993 9.49966 4.4993H2.20654L4.35341 6.64555C4.44723 6.73937 4.49994 6.86662 4.49994 6.9993C4.49994 
                        7.13198 4.44723 7.25923 4.35341 7.35305C4.25959 7.44687 4.13234 7.49958 3.99966 7.49958C3.86698 7.49958 3.73973 7.44687 3.64591 7.35305L0.645911 
                        4.35305C0.599423 4.30662 0.562543 4.25147 0.537381 4.19077C0.512219 4.13007 0.499268 4.06501 0.499268 3.9993C0.499268 3.93359 0.512219 3.86853 0.537381 
                        3.80783C0.562543 3.74713 0.599423 3.69199 0.645911 3.64555L3.64591 0.645551C3.73973 0.551731 3.86698 0.499023 3.99966 0.499023C4.13234 0.499023 4.25959 
                        0.551731 4.35341 0.645551C4.44723 0.739372 4.49994 0.866619 4.49994 0.999301C4.49994 1.13198 4.44723 1.25923 4.35341 1.35305L2.20654 3.4993H9.49966C10.5602 
                        3.50046 11.5769 3.92226 12.3268 4.67215C13.0767 5.42205 13.4985 6.43879 13.4997 7.4993Z" fill="#6C757D" />
                    </svg>
                  </Text>
                </Box>
              ))}
            </Box>
          </FormControl>)}

          <FormControl
            // maxW={'600px'}
            my={'20px'} textAlign={'right'}>
            <Button
              type="submit"
              fontWeight={500}
              colorScheme='blue'
              isLoading={isSubmitting}
            >
              Save
            </Button>
          </FormControl>
        </form>
      </Box>
    </Box>
  );
};

export default RuleSetup;