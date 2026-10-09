import {
  Box, Heading, Button, FormControl, FormLabel,
  FormErrorMessage, Select, Textarea, Switch, Flex, useToast,
  Spinner, FormHelperText
} from "@chakra-ui/react";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { updateEmailSettings } from '../../../services/emailassistantservice'; // Import your API function

const EmailSetting = ({ settingData, isFetching }: any) => {
  // console.log("settingDataEmailSetting", JSON.parse(settingData?.content), "settingDataEmailSetting");
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<any>();

  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leadCollection, setLeadCollection] = useState({
    isName: false,
    isPhone: false,
    isAddress: false
  });

  React.useEffect(() => {
    if (settingData) {
      let parsedContent = "";
      if (settingData?.content) {
        try {
          parsedContent = JSON.parse(settingData.content);
        } catch (error) {
          // console.error("Invalid JSON in settingData.content:", error);
          parsedContent = settingData.content; // fallback if JSON is invalid
        }
      }
      reset({
        size: settingData?.size?.toString(), // Convert number to string for Select
        language: settingData.language,
        content: parsedContent || ""
      });

      setLeadCollection(settingData.leadCollectionInputFields || {
        isName: false,
        isPhone: false,
        isAddress: false
      });
    }
  }, [settingData, reset]);

  const onSubmit = async (data: any) => {
    const payload = {
      size: Number(data.size),
      language: data.language,
      content: data.content,
      isLeadCollection: Object.values(leadCollection).some(value => value), // If any field is true, set it to true
      leadCollectionInputFields: leadCollection
    };

    try {
      setIsSubmitting(true);
      const res: any = await updateEmailSettings(payload);

      if (res.status === 200) {
        toast({
          title: "Email settings updated successfully",
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
      <Box mt={'24px'}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormControl
            // maxW={'600px'}
            mt={'24px'} isInvalid={!!errors.size}>
            <FormLabel fontSize="16px" m="0px" pb="8px">Size</FormLabel>
            <Select {...register('size', { required: 'Size is required' })}>
              <option value="">Select email size of words</option>
              <option value="250">250 words</option>
              <option value="500">500 words</option>
            </Select>
            <FormHelperText fontSize={"14px"} color={"#6C757D"} mt='5px'>Sets the maximum length for your email responses. Select a suitable word count that provides complete information without being excessive.</FormHelperText>
            <FormErrorMessage>{errors.size?.message}</FormErrorMessage>
          </FormControl>

          <FormControl
            // maxW={'600px'}
            mt={'24px'} isInvalid={!!errors.language}>
            <FormLabel fontSize="16px" m="0px" pb="8px">Select Email Language</FormLabel>
            <Select {...register('language', { required: 'Language is required' })}>
              <option value="">Select Language</option>
              <option value="English">English</option>
              <option value="French">French</option>
            </Select>
            <FormHelperText fontSize={"14px"} color={"#6C757D"} mt='5px'>Defines the primary language for all email communications. Choose the language most appropriate for your recipients.</FormHelperText>
            <FormErrorMessage>{errors.language?.message}</FormErrorMessage>
          </FormControl>

          <FormControl
            // maxW={'600px'}
            mt={'24px'} isInvalid={!!errors.content}>
            <FormLabel fontSize="16px" m="0px" pb="8px">Content Of The Response</FormLabel>
            <Textarea
              {...register('content', { required: 'Prompt is required' })}
              placeholder="Enter email prompt"
              rows={4}
            />
            <FormHelperText fontSize={"14px"} color={"#6C757D"} mt='5px'>Enter your default email reply text here. This template will be used for automated responses when activated.</FormHelperText>
            <FormErrorMessage>{errors.content?.message}</FormErrorMessage>
          </FormControl>

          <Box mt={'24px'}>
            <Box borderBottom={'1px solid #E2E8F0'} />
          </Box>

          <FormControl
            // maxW={'600px'}
            mt={'24px'}>
            <FormLabel fontSize="18px!important" fontWeight={"600!important"} lineHeight={"26px"} mb={'5px'}>Lead Collection Data</FormLabel>
            <FormHelperText fontSize={"14px"} color={"#6C757D"} mt="0">Configure which contact information fields to collect from email recipients. Enable only the data points necessary for your communication needs.</FormHelperText>
            {["isName", "isPhone", "isAddress"].map((field) => (
              <FormControl key={field} mt={'18px'}>
                <Flex justifyContent="space-between" w="100%" alignItems="center">
                  <FormLabel fontWeight="400" fontSize="16px" margin={0} color="#212529">
                    {field.replace("is", "")}
                  </FormLabel>
                  <Switch
                    isChecked={leadCollection[field as keyof typeof leadCollection]}
                    onChange={() =>
                      setLeadCollection(prev => ({
                        ...prev,
                        [field]: !prev[field as keyof typeof leadCollection]
                      }))
                    }
                    colorScheme="blue"
                    size="lg"
                  // height={"28px"}
                  // mr="2"
                  />
                </Flex>
              </FormControl>
            ))}
          </FormControl>

          <FormControl
            // maxW={'600px'}
            mt={'24px'} textAlign={'right'}>
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

export default EmailSetting;
