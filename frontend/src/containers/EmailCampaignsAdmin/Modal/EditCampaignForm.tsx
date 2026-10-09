import React, { useState } from "react";
import {
  Box,
  Button,
  HStack,
  Heading,
  Text,
  Select,
  InputGroup,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalOverlay,
  Checkbox,
  useToast,
  FormControl, Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Tag,
  TagLabel,
  FormLabel,
  NumberInput,
  NumberInputField,
  Image,
  FormErrorMessage,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  Flex,
  Spinner,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from "@chakra-ui/react";
import { GoInfo } from "react-icons/go";
import styles from "../EmailCampaignsAdmin.module.scss";
import DeleteIconRed from "./images/deleteIcon.svg"
import ErrorImg from "./images/error.svg"
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { fetchKnowledgebases } from "../../../services/knowledgebaseService";
import { getCampaignDetails, getEmailsByUserId, triggerCampaign, updateCampaign } from "../../../services/emailCampaigns";
import { Link, useHistory, useLocation, useParams } from 'react-router-dom';
import saveIcon from "./images/saveBtn.svg"
import { colors } from "../../../utils/constant";
import { ButtonGroupsDA } from "../../../components/ButtonGroups";

interface Project {
  projectId: string;
  projectName: string;
}

interface AudienceField {
  value: string;
}

interface EmailAndSenderLimit {
  email: string;
  maxLimit: string;
}
interface FormValues {
  campaignName: string;
  campaignProject: Project | null;
  campaignLanguage: string;
  emailLength: string;
  maxEmailsPerDay: string;
  maxEmailsPerLead: string;
  followUpFrequency: string;
  totalFollowUps: string;
  targetAudience: AudienceField[];
  painPoints: AudienceField[];
  solutionOffer: AudienceField[];
  selectedCTAs: string[]; // update type if using objects instead of strings
  emailAddress: string;
  phoneNumber: string;
  customLink: string;
  emailAndSenderLimit: EmailAndSenderLimit[];
}

export const EditCampaignForm = () => {
  const [selectedCTAs, setSelectedCTAs] = useState<string[]>([]);// State for multiple CTA selections
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [emails, setemails] = useState([]);
  const [isPopover1Open, setIsPopover1Open] = useState(false);
  const [isAutoReplyOpen, setisAutoReplyOpen] = useState(false);
  const [isPopover2Open, setIsPopover2Open] = useState(false);
  const [isPopover3Open, setIsPopover3Open] = useState(false);
  const toast = useToast();
  const history = useHistory();
  const params = useParams<{ id: string }>()
  const campaignId = params?.id || "";



  const { register, handleSubmit, formState: { errors }, setError, clearErrors, control, setValue, watch, reset } = useForm<FormValues>({
    defaultValues: {
      campaignName: "",
      campaignProject: null,  // or { projectId: '', projectName: '' } based on your logic
      campaignLanguage: "",
      emailLength: "",
      maxEmailsPerDay: "", // or 100 if you want to give initial value
      maxEmailsPerLead: "", // or 5
      followUpFrequency: "",
      totalFollowUps: "",
      targetAudience: [{ value: '' }],
      painPoints: [{ value: '' }],
      solutionOffer: [{ value: '' }],
      selectedCTAs: [],
      emailAddress: "",
      phoneNumber: "",
      customLink: "",
      emailAndSenderLimit: [{ email: '', maxLimit: '' }]
    },
  });

  const maxEmailsPerDay = watch("maxEmailsPerDay");
  const maxEmailsPerLead = watch("maxEmailsPerLead");
  const emailAndSenderLimit = watch("emailAndSenderLimit");
  const followUpFrequency = watch("followUpFrequency");
  const totalFollowUps = watch("totalFollowUps");

  const onSubmit = async (formData: any) => {
    // Check if at least one CTA is selected
    if (selectedCTAs.length === 0) {
      setError("selectedCTAs", {
        type: "manual",
        message: "Please select at least one CTA"
      });
      return; // Prevent form submission
    }
    const callOfAction: any = { email: "", phone: "", customLink: "" };
    if (formData.emailAddress) {
      callOfAction.email = formData.emailAddress;
    }
    if (formData.phoneNumber) {
      callOfAction.phone = formData.phoneNumber;
    }
    if (formData.customLink) {
      callOfAction.customLink = formData.customLink;
    }

    // Remove individual fields from formData
    delete formData.emailAddress;
    delete formData.phoneNumber;
    delete formData.customLink;

    // Append callOfAction object to formData
    formData.callOfAction = callOfAction;
    formData.maxEmailsPerDay = parseInt(formData.maxEmailsPerDay);
    formData.maxEmailsPerLead = parseInt(formData.maxEmailsPerLead);
    formData.followUpFrequency = parseInt(formData.followUpFrequency);
    formData.totalFollowUps = parseInt(formData.totalFollowUps);
    formData.campaignId = campaignId
    // Encrypting passKeys in emailAndSenderLimit
    const encryptedData = {
      ...formData,
      emailAndSenderLimit: formData.emailAndSenderLimit.map((item: any) => ({
        ...item,

      }))
    };
    const triggerCampaignId = { campaignId: campaignId }
    try {
      setIsLoading(true);
      const response = await updateCampaign(encryptedData); // Replace with your API endpoint
      if (response?.data?.statusCode === 200) {
        const responses = await triggerCampaign(triggerCampaignId);
        reset();
        // fetchData(currentPage, itemsPerPages, '');
        history.push(`/app/email-campaigns`);
      }
      // Assuming `response` is an array of project objects
    } catch (error: any) {
      // console.error("Error fetching projects:", error);
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      })
    } finally {
      setIsLoading(false);
    }
  };

  const {
    fields: targetAudienceFields,
    append: appendTargetAudience,
    remove: removeTargetAudience,
    replace: replaceTargetAudience
  } = useFieldArray({
    control,
    name: 'targetAudience',
  });

  const {
    fields: painPointsFields,
    append: appendPainPoints,
    remove: removePainPoints,
    replace: replacePainPoints
  } = useFieldArray({
    control,
    name: 'painPoints',
  });

  const {
    fields: solutionOfferFields,
    append: appendSolutionOffer,
    remove: removeSolutionOffer,
    replace: replaceSolutionOffer
  } = useFieldArray({
    control,
    name: 'solutionOffer',
  });

  const {
    fields: emailAndSenderLimitFields,
    append: appendEmailAndSenderLimit,
    remove: removeEmailAndSenderLimit,
    replace: replaceEmailAndSenderLimit
  } = useFieldArray({
    control,
    name: 'emailAndSenderLimit',
  });

  const handleRemoveField = (index: any, fieldArrayType: any) => {
    if (fieldArrayType === 'targetAudience') {
      removeTargetAudience(index);
    } else if (fieldArrayType === 'painPoints') {
      removePainPoints(index);
    } else if (fieldArrayType === 'solutionOffer') {
      removeSolutionOffer(index);
    } else if (fieldArrayType === 'emailAndSenderLimit') {
      removeEmailAndSenderLimit(index);
    }
  };
  // Fetch projects from API
  React.useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetchKnowledgebases(); // Replace with your API endpoint
        setProjects(response.data.data); // Assuming `response` is an array of project objects
        const responses = await getEmailsByUserId(); // Replace with your API endpoint
        setemails(responses?.data?.data); // Assuming `response` is an array of project objects
        const updatedData = responses?.data?.data?.map((item: any) => ({
          ...item,
          // status: "inactive",
        }));
        setemails(updatedData); // Assuming `response` is an array of project objects

      } catch (error: any) {
        // console.error("Error fetching projects:", error);
      }
    };
    fetchProjects();
  }, []);

  React.useEffect(() => {
    const fetchCampaignDetails = async () => {
      try {
        const response = await getCampaignDetails(campaignId);
        const campaignData = response.data.data;
        // Set form values
        setValue('campaignName', campaignData.campaignName);
        if (campaignData?.campaignProject?.projectId) {
          const projectToSelect: any = projects.find(
            (project: any) => project._id === campaignData.campaignProject.projectId
          );

          if (projectToSelect) {
            setValue('campaignProject', {
              projectId: projectToSelect._id,
              projectName: projectToSelect.name
            }, {
              shouldValidate: true,
              shouldDirty: true
            });
          }
        }
        setValue('campaignLanguage', campaignData.campaignLanguage);
        setValue('emailLength', campaignData.emailLength);
        setValue('maxEmailsPerDay', campaignData.maxEmailsPerDay);
        setValue('maxEmailsPerLead', campaignData.maxEmailsPerLead);
        setValue('followUpFrequency', campaignData.followUpFrequency);
        setValue('totalFollowUps', campaignData.totalFollowUps);

        // Handle arrays with useFieldArray
        if (campaignData.targetAudience) {
          // Assuming campaignData.targetAudience is an array of objects like { value: 'some value' }
          const updatedTargetAudience = campaignData.targetAudience.map((item: any) => ({ value: item.value || item }));

          // Replace the target audience fields with the new data
          replaceTargetAudience(updatedTargetAudience);

          // Set the form values manually to ensure the input fields are filled correctly
          updatedTargetAudience.forEach((item: any, index: any) => {
            setValue(`targetAudience.${index}.value`, item.value); // This ensures that only the 'value' is used
          });
        }
        if (campaignData.painPoints) {
          const updatedPainPoints = campaignData.painPoints.map((item: any) => ({ value: item.value || item }));
          replacePainPoints(updatedPainPoints);
          updatedPainPoints.forEach((item: any, index: any) => {
            setValue(`painPoints.${index}.value`, item.value); // This ensures that only the 'value' is used
          });;
        }
        if (campaignData.solutionOffer) {
          const updatedSolutionOffer = campaignData.solutionOffer.map((item: any) => ({ value: item.value || item }));
          replaceSolutionOffer(updatedSolutionOffer);
          updatedSolutionOffer.forEach((item: any, index: any) => {
            setValue(`solutionOffer.${index}.value`, item.value); // This ensures that only the 'value' is used
          });;
        }
        if (campaignData.emailAndSenderLimit) {
          const updatedEmailAndSenderLimit = Array.isArray(campaignData.emailAndSenderLimit)
            ? campaignData.emailAndSenderLimit.map((item: any) => ({
              email: item?.email || '',          // Ensure correct mapping of `email`
              maxLimit: item?.maxLimit || 1,     // Ensure correct mapping of `maxLimit`
              // passKey: item?.passKey ? decryptPasskey(item.passKey) : "" // Decrypt passKey if exists
            }))
            : [{
              email: campaignData.emailAndSenderLimit.email || '',
              maxLimit: campaignData.emailAndSenderLimit.maxLimit || 1,
            }];

          replaceEmailAndSenderLimit(updatedEmailAndSenderLimit);

          // Set individual values for each emailAndSenderLimit entry
          updatedEmailAndSenderLimit.forEach((item: any) => {

            updatedEmailAndSenderLimit.forEach((item: any, index: any) => {
              if (item.email) {
                setValue(`emailAndSenderLimit.${index}.email`, item.email);
                setemails((prevEmails: any) =>
                  prevEmails.map((emailObj: any) =>
                    emailObj.email === item.email
                      ? { ...emailObj, status: "active" } // Update the status of the selected email
                      : emailObj // Leave other email objects unchanged
                  )
                );
              }
              setValue(`emailAndSenderLimit.${index}.maxLimit`, item.maxLimit); // Set maxLimit
            });
          });
        }
        // Handle CTAs
        if (campaignData.callOfAction) {
          const ctas: any = [];
          if (campaignData.callOfAction.email) {
            ctas.push('Email');
            setValue('emailAddress', campaignData.callOfAction.email);
          }
          if (campaignData.callOfAction.phone) {
            ctas.push('Phone Number');
            setValue('phoneNumber', campaignData.callOfAction.phone);
          }
          if (campaignData.callOfAction.customLink) {
            ctas.push('Custom Links');
            setValue('customLink', campaignData.callOfAction.customLink);
          }
          setSelectedCTAs(ctas);
        }

      } catch (error) {
        // console.error("Error fetching campaign details:", error);
        toast({
          title: "Error fetching campaign details",
          status: "error",
          isClosable: true,
        });
      } finally {
        setIsLoadingData(false);
      }
    };

    if (campaignId && projects.length > 0) {
      fetchCampaignDetails();
    }
  }, [campaignId, projects, setValue]);




  const handleSelectCTA = (e: any, cta: string) => {
    const { target } = e;
    setSelectedCTAs((prev: any) =>
      prev.includes(cta) ? prev.filter((item: any) => item !== cta) : [...prev, cta]
    );

    if (cta === 'Email' && !target.checked) {
      setValue('emailAddress', "");
    }
    if (cta === 'Phone Number' && !target.checked) {
      setValue('phoneNumber', "");
    }
    if (cta == 'Custom Links' && !target.checked) {
      setValue('customLink', "");
    }


    if (selectedCTAs.length > 0) {
      clearErrors("selectedCTAs");
    }
  };



  const isCloseModifyYourCampaign = () => {
    setIsOpen(true)
    // ModifyYourCampaignClose();
  }

  const onClose = () => {
    setIsOpen(false)
  }

  const onClosePause = () => {
    setIsOpen(false)
  }

  const handleNoClick = () => {
    // ModifyYourCampaignClose();
    setIsOpen(false);
    history.push(`/app/email-campaigns`);
  }

  // Enter the following details to modify your campaign.



  return (
    <React.Fragment>
      <Box
        w="100%"
        p="6"
        shadow="sm"
        h="100%"
        position="relative"
        overflow="auto"
      >
        <Box
          sx={{
            background: '#2977FF',
            padding: "16px 24px",
            borderRadius: "8px",
            mb: "8px"
          }}
        >
          <Text mt={1} fontSize="20px" color={"#fff"}>
            Enter the following details to modify your campaign.
          </Text>
        </Box>
        <Box height="100%">
          {isLoadingData ? <>
            <Spinner color='gray.700' m={'25vh auto'} d={'block'} />
          </> :
            <form onSubmit={handleSubmit(onSubmit)}>
              <Box mt="16px"
                borderRadius={'8px'}
                background={colors.white}
                border={`1px solid ${colors.borderColor}`}
                px="16px" py="20px">
                <Flex gap={"10px"}>

                  <FormControl mb="26px" isInvalid={!!errors.campaignName}>
                    <FormLabel>Campaign Name <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
                    <Input placeholder="Enter campaign name" {...register("campaignName", { required: "Campaign Name is required" })} />
                    {errors.campaignName && <FormErrorMessage>{errors.campaignName.message}</FormErrorMessage>}
                  </FormControl>

                  {/* Campaign Project */}
                  <FormControl mb="24px" isInvalid={!!errors.campaignProject}>
                    <FormLabel>Campaign Project <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
                    <Controller
                      name="campaignProject"
                      control={control}
                      rules={{ required: "Campaign Project is required" }}
                      render={({ field: { onChange, value } }) => (
                        <Select
                          placeholder="Please select the project / website URL for this campaign"
                          value={value?.projectId || ""}
                          onChange={(e) => {
                            const selectedProject: any = projects.find(
                              (project: any) => project._id === e.target.value
                            );
                            onChange(
                              selectedProject
                                ? {
                                  projectId: selectedProject._id,
                                  projectName: selectedProject.name
                                }
                                : null
                            );
                          }}
                        >
                          {(projects as { _id: string; name: string }[]).map((project: any) => (
                            <option key={project._id} value={project._id}>
                              {project.name}
                            </option>
                          ))}
                        </Select>
                      )}
                    />
                    {errors.campaignProject && <FormErrorMessage>{errors.campaignProject.message}</FormErrorMessage>}
                  </FormControl>

                  {/* Language of the Campaign */}
                  <FormControl mb="16px" isInvalid={!!errors.campaignLanguage}>
                    <FormLabel>Campaign Language <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
                    <Controller
                      name="campaignLanguage"
                      control={control}
                      rules={{ required: "Campaign Language is required" }}
                      render={({ field }) => (
                        <Select placeholder="Select campaign language" {...field}>
                          <option value="English">English</option>
                          <option value="Spanish">Spanish</option>
                          <option value="French">French</option>
                          <option value="German">German</option>
                        </Select>
                      )}
                    />
                    {errors.campaignLanguage && <FormErrorMessage>{errors.campaignLanguage.message}</FormErrorMessage>}
                  </FormControl>

                  {/* Email Length */}
                  <FormControl mb="16px" isInvalid={!!errors.emailLength}>
                    <FormLabel>Email Length <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
                    <Controller
                      name="emailLength"
                      control={control}
                      rules={{ required: "Email Length is required" }}
                      render={({ field }) => (
                        <Select placeholder="Select email length" {...field}>
                          <option value="Short (Upto 500 words)">Short (Upto 500 words)</option>
                          <option value="Medium (Upto 750 words)">Medium (Upto 750 words)</option>
                          <option value="Long (Upto 1000 words)">Long (Upto 1000 words)</option>
                        </Select>
                      )}
                    />
                    {errors.emailLength && <FormErrorMessage>{errors.emailLength.message}</FormErrorMessage>}
                  </FormControl>


                </Flex>

                <Flex gap={"10px"} mb={"10px"}>
                  {/* Max Emails Per Day */}
                  <HStack spacing={4} width="100%" mb="24px">
                    <FormControl isInvalid={!!errors.maxEmailsPerDay}>
                      <FormLabel display="flex" alignItems="center" gap="4px">
                        Max Emails Per Day
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
                            <Box whiteSpace="pre-wrap">{'Set the Maximum number of emails this campaign can send per day.'}</Box>
                          </PopoverContent>
                        </Popover>
                        <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text>
                      </FormLabel>
                      <NumberInput step={1} min={1} value={maxEmailsPerDay || ""}
                        onChange={(valueString) => {
                          setValue("maxEmailsPerDay", valueString)
                        }}
                      >
                        <NumberInputField
                          {...register("maxEmailsPerDay", { required: "Max Emails Per Day is required" })}
                          placeholder="Set a daily send limit (e.g. 100)"
                        />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                      {errors.maxEmailsPerDay && <FormErrorMessage>{errors.maxEmailsPerDay.message}</FormErrorMessage>}
                    </FormControl>

                    {/* Max Emails Per Lead */}
                    <FormControl isInvalid={!!errors.maxEmailsPerLead}>
                      <FormLabel display="flex" alignItems="center" gap="4px">

                        Max Emails Per Lead
                        <Popover isOpen={isAutoReplyOpen} onClose={() => setisAutoReplyOpen(false)}>
                          <PopoverTrigger>
                            <Box
                              cursor="pointer"
                              as="span"
                              onClick={() => setisAutoReplyOpen(!isAutoReplyOpen)}
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
                            <Box whiteSpace="pre-wrap">{'Auto Reply'}</Box>
                          </PopoverContent>
                        </Popover>

                        <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text>

                      </FormLabel>
                      <NumberInput defaultValue={100} step={1} min={1}
                        value={maxEmailsPerLead || ""}
                        onChange={(valueString) => {
                          setValue("maxEmailsPerLead", valueString)
                        }}
                      >
                        <NumberInputField
                          {...register("maxEmailsPerLead", { required: "Max Emails Per Lead is required" })}
                          placeholder="Maximum emails allowed per lead (e.g. 5)"
                        />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                      {errors.maxEmailsPerLead && <FormErrorMessage>{errors.maxEmailsPerLead.message}</FormErrorMessage>}
                    </FormControl>
                  </HStack>

                  {/* Follow ups */}
                  <HStack spacing={4} width="100%" mb="24px">
                    <FormControl isInvalid={!!errors.followUpFrequency}>
                      <FormLabel display="flex" alignItems="center" gap="4px">
                        Follow-up Frequency
                        <Popover isOpen={isPopover2Open} onClose={() => setIsPopover2Open(false)}>
                          <PopoverTrigger>
                            <Box
                              cursor="pointer"
                              as="span"
                              onClick={() => setIsPopover2Open(!isPopover2Open)}
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
                            <Box whiteSpace="pre-wrap">{'Specify the number of days to wait before sending a follow-up email, in case of no response.'}</Box>
                          </PopoverContent>
                        </Popover>
                        <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text>
                      </FormLabel>
                      <NumberInput step={1} min={1} value={followUpFrequency || ""}
                        onChange={(valueString) => setValue("followUpFrequency", valueString)}
                      >
                        <NumberInputField
                          {...register("followUpFrequency", { required: "Follow-up frequency is required" })}
                          placeholder="How long to wait before sending a follow-up?"
                        />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                      {errors.followUpFrequency && <FormErrorMessage>{errors.followUpFrequency.message}</FormErrorMessage>}
                    </FormControl>


                    <FormControl isInvalid={!!errors.totalFollowUps}>
                      <FormLabel display="flex" alignItems="center" gap="4px">
                        Number of Follow-up
                        <Popover isOpen={isPopover3Open} onClose={() => setIsPopover3Open(false)}>
                          <PopoverTrigger>
                            <Box
                              cursor="pointer"
                              as="span"
                              onClick={() => setIsPopover3Open(!isPopover3Open)}
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
                            <Box whiteSpace="pre-wrap">{'Set how many follow-up emails to send if there’s no response.'}</Box>
                          </PopoverContent>
                        </Popover>
                        <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text>
                      </FormLabel>
                      <NumberInput defaultValue={''} step={1} min={1}
                        value={totalFollowUps || ""}
                        onChange={(valueString) => setValue("totalFollowUps", valueString)}
                      >
                        <NumberInputField
                          {...register("totalFollowUps", { required: "Number of follow-up is required" })}
                          placeholder="Enter number of follow-up emails"
                        />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                      {errors.totalFollowUps && <FormErrorMessage>{errors.totalFollowUps.message}</FormErrorMessage>}
                    </FormControl>
                  </HStack>
                </Flex>
                <Box>
                  {/* Call To Action (CTA) */}
                  <FormControl mb="16px" isInvalid={!!errors.selectedCTAs}>
                    <FormLabel sx={{ pointerEvents: "none" }}>Select Call To Action (CTA)  doing changes<Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
                    <Menu closeOnSelect={false}>
                      <MenuButton
                        as={Button}
                        width="100%"
                        textAlign="left"
                        minHeight="38px"
                        h="auto"
                        border="1px solid #E2E8F0"
                        bg="#fff"
                        sx={{
                          _hover: { backgroundColor: "#fff" },
                          _active: { backgroundColor: "#fff", boxShadow: "none" },
                          _focus: { boxShadow: "none" },
                        }}
                      >
                        {selectedCTAs.length > 0 ? (
                          <HStack spacing={2} wrap="wrap" maxHeight="60px" overflowY="auto" gap="5px" mt="5px" mb="5px">
                            {selectedCTAs.map((cta) => (
                              <Tag key={cta} size="sm" borderRadius="full" variant="solid" colorScheme="blue" marginInlineStart="0px !important">
                                <TagLabel>{cta}</TagLabel>
                              </Tag>
                            ))}
                          </HStack>
                        ) : (
                          <Text as="span" className={styles.newCampaigPara}>Select CTAs</Text>
                        )}
                      </MenuButton>
                      <MenuList>
                        {["Email", "Phone Number", "Custom Links"].map((cta: any) => (
                          <MenuItem key={cta}
                            // onClick={() => handleSelectCTA(cta)} 
                            display="flex" justifyContent="space-between">
                            <Checkbox
                              isChecked={selectedCTAs.includes(cta)}
                              onChange={(e) => handleSelectCTA(e, cta)}
                            >
                              {cta}
                            </Checkbox>
                          </MenuItem>
                        ))}
                      </MenuList>
                    </Menu>
                    {errors.selectedCTAs && (
                      <FormErrorMessage>{errors.selectedCTAs.message}</FormErrorMessage>
                    )}
                  </FormControl>

                  {/* Render input fields based on selected CTAs */}
                  {selectedCTAs.includes("Email") && (
                    <FormControl mb="16px" isInvalid={!!errors.emailAddress}>
                      <Input
                        // mt="4"
                        placeholder="Enter Email Address"
                        {...register("emailAddress", {
                          required: "Email address is required",
                          pattern: {
                            value: /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/,
                            message: "Enter a valid email address",
                          },
                        })}
                      />
                      <FormErrorMessage>{errors.emailAddress?.message}</FormErrorMessage>
                    </FormControl>
                  )}

                  {selectedCTAs.includes("Phone Number") && (
                    <FormControl mb="16px" isInvalid={!!errors.phoneNumber}>
                      <InputGroup mt="4">
                        <Input
                          type="tel"
                          placeholder="Phone Number"
                          {...register("phoneNumber", {
                            required: "Phone number is required",
                            pattern: {
                              value: /^\d{10}$/,
                              message: "Enter a valid 10-digit phone number",
                            },
                          })}
                        />
                      </InputGroup>
                      <FormErrorMessage>{errors.phoneNumber?.message}</FormErrorMessage>
                    </FormControl>
                  )}

                  {selectedCTAs.includes("Custom Links") && (
                    <FormControl mb="16px" isInvalid={!!errors.customLink}>
                      <Input
                        // mt="4"
                        placeholder="Enter Custom Link"
                        {...register("customLink", {
                          required: "Custom link is required",
                          pattern: {
                            value: /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/,
                            message: "Enter a valid URL",
                          },
                        })}
                      />
                      <FormErrorMessage>{errors.customLink?.message}</FormErrorMessage>
                    </FormControl>
                  )}

                </Box>
              </Box>

              <Box mt="16px"
                borderRadius={'8px'}
                background={colors.white}
                border={`1px solid ${colors.borderColor}`}
                px="16px" py="20px">

                {/* Target Audience */}
                <FormControl mb="8px" isInvalid={!!errors.targetAudience}>
                  <FormLabel>Target Audience <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
                  {targetAudienceFields.map((field, index: number) => (
                    <FormControl
                      key={index}
                      isInvalid={!!errors.targetAudience?.[index]?.value}
                      mb="12px"
                    >
                      <Box display="flex" alignItems="center" gap="10px">
                        <Input
                          placeholder="Enter target audience"
                          {...register(`targetAudience.${index}.value`, { required: "Target Audience is required" })}
                        />

                        {/* <Button
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => handleRemoveField(index, 'targetAudience')}
                          disabled={targetAudienceFields.length === 1}
                        >
                          <Image src={DeleteIconRed} alt="deleteicon" />
                        </Button> */}
                      </Box>
                      {errors.targetAudience?.[index]?.value && (
                        <FormErrorMessage>{errors.targetAudience[index]?.value?.message}</FormErrorMessage>
                      )}
                    </FormControl>
                  ))}
                  {/* {targetAudienceFields.length < 5 && <Button size="sm" onClick={() => appendTargetAudience({ value: '' })}>+ Add</Button>} */}
                </FormControl>


                {/* pain-point / problem */}
                <FormControl mb="8px" isInvalid={!!errors.painPoints}>
                  <FormLabel>Pain-point / Problem <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
                  {painPointsFields.map((field, index: number) => (
                    <FormControl
                      key={index}
                      isInvalid={!!errors.painPoints?.[index]?.value}
                      mb="12px"
                    >
                      <Box display="flex" alignItems="center" gap="10px">
                        <Input
                          placeholder="Enter pain-point / problem"
                          {...register(`painPoints.${index}.value`, { required: "pain-point / problem are required" })}
                        />

                        {/* <Button
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => handleRemoveField(index, 'painPoints')}
                          disabled={painPointsFields.length === 1}
                        >
                          <Image src={DeleteIconRed} alt="deleteicon" />
                        </Button> */}
                        <ButtonGroupsDA
                          style={{ paddingTop: "0px" }}
                          deleteHandler={() => handleRemoveField(index, 'painPoints')}
                          deleteDisabled={painPointsFields.length === 1}
                          addHandler={() => appendPainPoints({ value: '' })}
                          addDisabled={!(painPointsFields?.length < 5)}
                        />
                      </Box>
                      {errors.painPoints?.[index]?.value && (
                        <FormErrorMessage>{errors.painPoints[index]?.value?.message}</FormErrorMessage>
                      )}
                    </FormControl>
                  ))}
                  {/* {painPointsFields.length < 5 && <Button size="sm" onClick={() => appendPainPoints({ value: '' })}>+ Add</Button>} */}
                </FormControl>

                {/* Solution / Offer */}
                <FormControl mb="8px" isInvalid={!!errors.solutionOffer}>
                  <FormLabel>Solution / Offer <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
                  {solutionOfferFields.map((field, index) => (
                    <FormControl
                      key={index}
                      isInvalid={!!errors.solutionOffer?.[index]?.value}
                      mb="12px"
                    >
                      <Box display="flex" alignItems="center" gap="10px">
                        <Input
                          placeholder="Enter the Solution / Offer"
                          {...register(`solutionOffer.${index}.value`, { required: "Solution / Offer is required" })}
                        />

                        {/* <Button
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => handleRemoveField(index, 'solutionOffer')}
                          disabled={solutionOfferFields.length === 1}
                        >
                          <Image src={DeleteIconRed} alt="deleteicon" />
                        </Button> */}
                        <ButtonGroupsDA
                          style={{ paddingTop: "0px" }}
                          deleteHandler={() => handleRemoveField(index, 'solutionOffer')}
                          deleteDisabled={solutionOfferFields.length === 1}
                          addHandler={() => appendSolutionOffer({ value: '' })}
                          addDisabled={!(solutionOfferFields?.length < 5)}
                        />
                      </Box>
                      {errors.solutionOffer?.[index]?.value && (
                        <FormErrorMessage>{errors.solutionOffer[index]?.value?.message}</FormErrorMessage>
                      )}
                    </FormControl>
                  ))}
                  {/* {solutionOfferFields.length < 5 && <Button size="sm" onClick={() => appendSolutionOffer({ value: '' })}>+ Add</Button>} */}
                </FormControl>

              </Box>



              <Box mt="16px"
                borderRadius={'8px'}
                background={colors.white}
                border={`1px solid ${colors.borderColor}`}
                px="16px" py="20px">

                {/* Emails for this campaign */}
                <HStack spacing={1} mb="8px" >
                  <Heading as="h3" size="sm" mb="8px">Select Mailboxes <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></Heading>
                </HStack>
                <Box >
                  {emailAndSenderLimitFields.map((field: any, index: number) => (
                    <React.Fragment key={field.id}>
                      <HStack mb="8px" width="100%" spacing="12px" alignItems="flex-start">
                        <FormControl isInvalid={!!errors?.emailAndSenderLimit?.[index]?.email}>
                          <FormLabel>Email {index + 1}</FormLabel>
                          <Controller
                            name={`emailAndSenderLimit.${index}.email`}
                            control={control}
                            rules={{ required: "Please enter a valid email" }}
                            render={({ field: controllerField }) => (
                              <Select
                                placeholder="Please select the email"
                                value={controllerField.value}
                                onChange={(e) => {
                                  const selectedTargetValue = e.target.value;
                                  const selectedProject: any = emails.find(
                                    (project: any) => project.email === selectedTargetValue
                                  );

                                  // Update email statuses
                                  setemails((prevEmails: any) =>
                                    prevEmails.map((emailObj: any) => ({
                                      ...emailObj,
                                      status: emailObj.email === selectedTargetValue
                                        ? "active"
                                        : emailObj.email === controllerField.value
                                          ? "inactive"
                                          : emailObj.status
                                    }))
                                  );

                                  // Update the controller field
                                  controllerField.onChange(
                                    selectedProject?.email ? selectedProject.email : null
                                  );
                                }}
                              >
                                {emails.map((project: any) => (
                                  <option
                                    key={project.email}
                                    value={project.email}
                                    disabled={project.status === "active"}
                                  >
                                    {project.email}
                                  </option>
                                ))}
                              </Select>
                            )}
                          />
                          {errors?.emailAndSenderLimit?.[index]?.email && (
                            <FormErrorMessage>
                              {errors.emailAndSenderLimit[index]?.email?.message}
                            </FormErrorMessage>
                          )}
                        </FormControl>

                        <FormControl isInvalid={!!errors?.emailAndSenderLimit?.[index]?.maxLimit}>
                          <FormLabel>Maximum limit</FormLabel>
                          <NumberInput defaultValue={2} step={1} min={1}>
                            <NumberInputField
                              {...register(`emailAndSenderLimit.${index}.maxLimit`, {
                                required: "Max Limit is required",
                              })}
                              placeholder="Set the maximum number of contacts to reach"
                            />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                          {errors?.emailAndSenderLimit?.[index]?.maxLimit && (
                            <FormErrorMessage>
                              {errors.emailAndSenderLimit[index]?.maxLimit?.message}
                            </FormErrorMessage>
                          )}
                        </FormControl>


                        <ButtonGroupsDA
                          // style={{ paddingTop: "0px" }}
                          deleteHandler={() => {
                            // Get the email value before removing the field
                            const emailToRemove: any = watch(`emailAndSenderLimit.${index}.email`);

                            setemails((prevEmails: any) =>
                              prevEmails.map((emailObj: any) =>
                                emailObj.email === emailToRemove
                                  ? { ...emailObj, status: "inactive" }
                                  : emailObj
                              )
                            );

                            // Remove the field
                            handleRemoveField(index, 'emailAndSenderLimit');
                          }}
                          deleteDisabled={emailAndSenderLimitFields.length === 1}
                          addHandler={() => appendEmailAndSenderLimit({ email: "", maxLimit: "100" })}
                          addDisabled={!(emailAndSenderLimitFields?.length < 5)}
                        />

                        {/* <Button
                          colorScheme="red"
                          variant="ghost"
                          disabled={emailAndSenderLimitFields.length === 1}
                          onClick={() => {
                            // Get the email value before removing the field
                            const emailToRemove = watch(`emailAndSenderLimit.${index}.email`);
                            // if (!emailToRemove) {
                            //   console.error(`Email not found at index: ${index}`);
                            //   return;
                            // }
                            // Reset the status of the email being removed
                            setemails((prevEmails) =>
                              prevEmails.map((emailObj) =>
                                emailObj.email === emailToRemove
                                  ? { ...emailObj, status: "inactive" }
                                  : emailObj
                              )
                            );

                            // Remove the field
                            handleRemoveField(index, 'emailAndSenderLimit');
                          }}
                          sx={{
                            _focus: {
                              boxShadow: 'none',
                            },
                            marginTop: "25px !important"
                          }}
                        >
                          <Image src={DeleteIconRed} alt='deleteicon' h="35px" />
                        </Button> */}
                      </HStack>
                    </React.Fragment>
                  ))}

                </Box>

              </Box>
              <Box display="flex" justifyContent="space-between" py="24px">
                <Button mr={3}
                  color="#2977ff"
                  bg="#fff"
                  fontWeight="500"
                  shadow={"md"}
                  onClick={isCloseModifyYourCampaign}

                >Cancel</Button>
                <Button colorScheme="blue" type="submit" fontWeight="500" disabled={isLoading}>
                  {isLoading ? <Spinner color='gray.700' />
                    :
                    <>
                      <Image src={saveIcon} alt='Save & Continue' /><Text as="span" fontSize="16px" ms="8px">Save & Submit</Text>
                    </>
                  }

                </Button>
              </Box>
            </form>
          }
        </Box>
      </Box>
      <Modal
        isCentered
        onClose={onClose}
        isOpen={isOpen}
      >
        <ModalOverlay />
        <ModalContent>
          {/* <ModalHeader>Modal Title</ModalHeader> */}
          <ModalBody>
            <Box
              textAlign="center"
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
            >
              <Image src={ErrorImg} alt='deleteicon' w="56px" h="56px" />
              <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" mb="8px" mt="24px">Are you Cancel?</Text>
              <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D">You want to Pause this campaign?</Text>
            </Box>

          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={handleNoClick} fontWeight="500">
              Yes
            </Button>
            <Button colorScheme="blue" mr={3} onClick={onClosePause} fontWeight="500">
              <Text as="span" ms="4px" fontSize="16px" >No</Text>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {/* </Box> */}
    </React.Fragment >
  )
}
