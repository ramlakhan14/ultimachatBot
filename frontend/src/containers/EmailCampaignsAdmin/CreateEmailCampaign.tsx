import React, { useState } from "react";
import animationData from './Modal/Animation.json';
import { Link } from 'react-router-dom';

import {
  Box,
  Button,
  HStack,
  Heading,
  Text,
  Select,
  InputGroup,
  Input,
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
  Spinner,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  ModalCloseButton,
  Popover, PopoverTrigger, PopoverContent, PopoverArrow, PopoverCloseButton,
  Flex,
  Tooltip
} from "@chakra-ui/react";
import styles from "./EmailCampaignsAdmin.module.scss";
// import ErrorImg from "./Modal/";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { campaignCreateCampaign, getEmailsByUserId, checkEmailCampaignName, triggerCampaign } from "../../services/emailCampaigns";
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { GoInfo } from "react-icons/go";
import { fetchKnowledgebases } from "../../services/knowledgebaseService";
import { colors } from "../../utils/constant";
import { ButtonGroupsDA } from "../../components/ButtonGroups";
import { AddMoreTargetAudience } from "./Modal/AddMoreTargetAudience";
import { CampaignPreview } from "./Modal/CampaignPreview";
import Lottie from "lottie-react";
import { FaArrowAltCircleLeft } from "react-icons/fa";
import { CurrentUser } from "../../services/appConfig";
import { callApi } from "../../services/callApi";
import { Link as ChakraLink } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";

type FilePreviewType = {
  isOpen: boolean;
  data: Object | null;
}
interface HeaderStep {
  label: string;         // adjust based on your object keys
  status?: string;   // optional field, add more if needed
}

interface CreateCampaignProps {
  handleHeaderSteps: (step: string) => void;
  headerSteps: HeaderStep[]; // now it's an array of objects
}
interface ProjectOption {
  _id: string;
  projectName: string;
  name?: string;
}
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
interface CampaignState {
  data?: {
    campaignId?: string;
    _id?: string;
    campaignName?: string;
    // add other fields as needed
  };
}


export const CreateEmailCampaign: React.FC<CreateCampaignProps> = ({ handleHeaderSteps, headerSteps }) => {
  const [currentSubTab, setSubTab] = useState<any>("set-up");
  const [selectedCTAs, setSelectedCTAs] = useState<any[]>([]);// State for multiple CTA selections
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [emails, setemails] = useState([]);
  const [isPopover1Open, setIsPopover1Open] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const [mailInfoOpen, setMailInfoOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [painOpen, setPainOpen] = useState(false);
  const [isPopover2Open, setIsPopover2Open] = useState(false);
  const [isPopover3Open, setIsPopover3Open] = useState(false);
  const [isAutoReplyOpen, setisAutoReplyOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [step, setStep] = useState<number>(1);
  const [tempCampaignId, setTempCampaignId] = useState<string>("");
  const [formData, setFormData] = useState<any>(null);

  const toast = useToast();
  const history = useHistory();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const subTab = queryParams.get('subTab');
  const params = useParams<{ id: string }>()
  const idForEdit = params?.id || "";

  React.useEffect(() => {
    if (subTab) {
      setSubTab(subTab);
    } else {
      setSubTab(currentSubTab);
    }
    // console.log("subTab", subTab);
  }, [subTab, currentSubTab]);

  React.useEffect(() => {
    if (idForEdit) {
      setIsEditMode(true);
    }
  }, [idForEdit]);

  // 27-07-2026
  // Add useEffect to persist form data when coming back
  // React.useEffect(() => {
  //   // When coming back to setup from target-audience
  //   if (subTab === 'set-up' && formData) {
  //     // Restore all form values
  //     Object.keys(formData).forEach((key) => {
  //       setValue(key as any, formData[key]);
  //     });

  //     // Restore CTAs
  //     if (formData.selectedCTAs) {
  //       setSelectedCTAs(formData.selectedCTAs);
  //     }

  //     // Restore emailAndSenderLimit
  //     if (formData.emailAndSenderLimit) {
  //       // Use replace for field arrays
  //       // You'll need to handle field arrays separately
  //     }
  //   }
  // }, [subTab, formData]);



  const isOpen = true
  const { register, handleSubmit, formState: { errors }, setError, clearErrors, control, reset, watch, getValues, setValue } = useForm<FormValues>({
    mode: "onSubmit",        // 🔥 validate on submit
    reValidateMode: "onChange",
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


  const campaignName = watch("campaignName"); // Watch campaign name for real-time validation

  React.useEffect(() => {
    // Restore saved form data when coming back to the setup step.
    // Also wait for `projects` to be available so the project select can reflect the selected value.
    if (subTab === 'set-up' && formData) {
      Object.keys(formData).forEach((key) => {
        if (key === 'campaignProject' && formData[key]) {
          // Try to map to an existing project from the fetched list so the Select shows correctly
          const savedProjectId = formData[key].projectId || formData[key]._id;
          const matched = projects.find((p: any) => p._id === savedProjectId);
          if (matched) {
            setValue('campaignProject', { projectId: matched._id, projectName: matched.name || matched.projectName });
          } else {
            // fallback: set whatever was saved
            setValue('campaignProject', {
              projectId: formData[key].projectId || formData[key]._id,
              projectName: formData[key].projectName || formData[key].name,
            });
          }
        } else {
          setValue(key as any, formData[key]);
        }
      });

      if (formData.selectedCTAs) {
        setSelectedCTAs(formData.selectedCTAs);
      }
    }
  }, [subTab, formData, setValue, projects]);

  // Real-time campaign name validation (similar to voice bot)
  // name validation logic is commented out for now, but can be enabled if needed
  React.useEffect(() => {
    const handler = setTimeout(() => {
      const fetchCampaignName = async () => {
        // Don't validate if:
        // 1. Campaign name is empty
        // 2. We're in edit mode (editing existing campaign)
        if (campaignName === undefined || campaignName.trim() === "" || isEditMode) {
          return;
        }

        const name = { campaignName: campaignName.trim() };
        try {
          // Check if campaign name already exists
          await checkEmailCampaignName(name);
          // If no error, clear any existing error
          clearErrors("campaignName");
        } catch (error: any) {
          // Set error if campaign name already exists
          setError("campaignName", {
            type: "server",
            message: error?.response?.data?.message || "Campaign name already exists"
          });
        }
      };

      fetchCampaignName();
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(handler); // Clean up the timeout on value change/unmount
    };
  }, [campaignName, clearErrors, setError, isEditMode]); // Add isEditMode to dependencies

  const findActiveStep: HeaderStep | undefined = headerSteps?.find((step: any) => step.status == "active");

  const selectedCTAsValid = watch("selectedCTAs");

  // Encryption function


  // handle setupsubmit

  const handleSetupSubmit = async (formData: any) => {
    // Validate form
    if (selectedCTAs.length === 0) {
      setError("selectedCTAs", {
        type: "manual",
        message: "Please select at least one CTA"
      });
      return;
    }

    // Prepare the payload for creating campaign
    const callOfAction: any = {
      email: formData.emailAddress || "",
      phone: formData.phoneNumber || "",
      customLink: formData.customLink || ""
    };

    const {
      emailAddress,
      phoneNumber,
      customLink,
      ...rest
    } = formData;

    const payload = {
      ...rest,
      selectedCTAs: selectedCTAs,
      callOfAction,
      maxEmailsPerDay: parseInt(formData.maxEmailsPerDay),
      maxEmailsPerLead: parseInt(formData.maxEmailsPerLead),
      followUpFrequency: parseInt(formData.followUpFrequency),
      totalFollowUps: parseInt(formData.totalFollowUps),
      emailAndSenderLimit: formData.emailAndSenderLimit.map((item: any) => ({
        ...item,
      })),
      campaignProject: formData.campaignProject ? {
        projectId: formData.campaignProject.projectId || formData.campaignProject._id,
        projectName: formData.campaignProject.projectName || formData.campaignProject.name
      } : null
    };

    try {
      setIsLoading(true);
      // Create the campaign first
      const response = await campaignCreateCampaign(payload);

      if (response?.data?.statusCode === 200) {
        const campaignId = response?.data?.data?.campaignId || response?.data?.data?._id;
        const campaignName = response?.data?.data?.campaignName || formData.campaignName;

        toast({
          title: `${response?.data?.message}`,
          status: "success",
          isClosable: true,
        });

        // Save form data to state (for persistence)
        const dataToSave = {
          ...formData,
          selectedCTAs: selectedCTAs,
          campaignProject: formData.campaignProject ? {
            projectId: formData.campaignProject.projectId || formData.campaignProject._id,
            projectName: formData.campaignProject.projectName || formData.campaignProject.name
          } : null
        };
        setFormData(dataToSave);

        // Navigate with campaignId in URL
        history.push(`/app/email-campaigns/create?subTab=target-audience&id=${campaignId}&campaignName=${campaignName}`);
        setSubTab('target-audience');
        handleHeaderSteps('next');
      }
    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message || "Error creating campaign"}`,
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Final submit on last step
  const handleFinalSubmit = async () => {
    try {
      setIsLoading(true);

      // Get the campaignId from URL
      const campaignId = queryParams.get('id') || idForEdit;

      if (!campaignId) {
        toast({
          title: "Campaign ID is missing",
          description: "Please go back and create the campaign first",
          status: "error",
          isClosable: true,
        });
        return;
      }

      // Don't create campaign again - just start/trigger it
      // Use the trigger API to start the campaign
      const triggerPayload = { campaignId: campaignId };
      const response = await triggerCampaign(triggerPayload); // You need to import this

      if (response?.data?.statusCode === 200) {
        toast({
          title: `${response?.data?.message || "Campaign started successfully!"}`,
          status: "success",
          isClosable: true,
        });

        // Navigate to complete
        history.push(`/app/email-campaigns/create?subTab=complete&id=${campaignId}`);
        setSubTab('complete');
        handleHeaderSteps('next');
      }
    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message || "Error starting campaign"}`,
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Back navigation with data persistence
  const handleBack = () => {
    if (subTab === 'target-audience') {
      // Go back to setup with data preserved
      history.push(`/app/email-campaigns/create?subTab=set-up`);
      setSubTab('set-up');
      handleHeaderSteps('back');
    } else if (subTab === 'set-up-review') {
      history.push(`/app/email-campaigns/create?subTab=target-audience`);
      setSubTab('target-audience');
      handleHeaderSteps('back');
    }
  };


  const onSubmit = async (formData: any) => {
    // Check if at least one CTA is selected
    // console.log("error", selectedCTAs, errors?.selectedCTAs, "<<< selectedCTAsValid")

    if (selectedCTAs.length == 0) {
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

    const {
      emailAddress,
      phoneNumber,
      customLink,
      ...rest
    } = formData;

    const encryptedData = {
      ...rest,
      selectedCTAs: selectedCTAs,
      callOfAction,
      maxEmailsPerDay: parseInt(formData.maxEmailsPerDay),
      maxEmailsPerLead: parseInt(formData.maxEmailsPerLead),
      followUpFrequency: parseInt(formData.followUpFrequency),
      totalFollowUps: parseInt(formData.totalFollowUps),
      emailAndSenderLimit: formData.emailAndSenderLimit.map((item: any) => ({
        ...item,
      }))
    };
    try {
      setIsLoading(true);
      const response = await campaignCreateCampaign(encryptedData); // Replace with your API endpoint
      toast({
        title: `${response?.data?.message}`,
        status: "success",
        isClosable: true,
      })
      setIsLoading(false);
      if (response?.data?.statusCode === 200) {
        // reset();
        // setSelectedCTAs([]);
        history.push(`/app/email-campaigns/create?subTab=target-audience&id=${response?.data?.data?.campaignId}&campaignName=${response?.data?.data?.campaignName}`);
        setSubTab('target-audience')
        handleHeaderSteps('next');

      }
      // Assuming `response` is an array of project objects
    } catch (error: any) {
      // console.error("Error fetching projects:", error);
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      })
      setIsLoading(false);
    }
  };



  // console.log("error", errors?.selectedCTAs, selectedCTAsValid)


  const {
    fields: targetAudienceFields,
    append: appendTargetAudience,
    remove: removeTargetAudience,
  } = useFieldArray({
    control,
    name: 'targetAudience',
  });
  const {
    fields: painPointsFields,
    append: appendPainPoints,
    remove: removePainPoints,
  } = useFieldArray({
    control,
    name: 'painPoints',
  });

  const [sourceChecks, setSourceChecks] = useState<any>({
    duplicateAudiance: false,
    csvUploadsAudiance: false,
    facebookAudiance: false,
    gmbAudiance: false,
    linkedinAudiance: false,
  })

  const {
    fields: solutionOfferFields,
    append: appendSolutionOffer,
    remove: removeSolutionOffer,
  } = useFieldArray({
    control,
    name: 'solutionOffer',
  });

  const {
    fields: emailAndSenderLimitFields,
    append: appendEmailAndSenderLimit,
    remove: removeEmailAndSenderLimit,
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
  const userRole = CurrentUser.get();

  // Fetch projects from API
  const fetchProjects = async () => {
    try {
      const response = await fetchKnowledgebases(1, 10, true, "allprojectX", false); // Replace with your API endpoint
      setProjects(response?.data?.data); // Assuming `response` is an array of project objects

      const responses = await getEmailsByUserId(); // Replace with your API endpoint;
      const updatedData = responses?.data?.data?.map((item: any) => ({
        ...item,
        status: "inactive",
      }));
      setemails(updatedData); // Assuming `response` is an array of project objects
    } catch (error) {
      // console.error("Error fetching projects:", error);
    }
  };

  React.useEffect(() => {
    if (userRole?.role) {
      fetchProjects();
    }
  }, [userRole?.role]);
  React.useEffect(() => {
    if (subTab == "complete") {
      setTimeout(() => {
        handleHeaderSteps("reset")
        history.replace('/app/email-campaigns');
      }, 5000);
    }
  }, [subTab]);

  const handleSelectCTA = (cta: any) => {
    setSelectedCTAs((prev) =>
      prev.includes(cta) ? prev.filter((item) => item !== cta) : [...prev, cta]
    );
    if (selectedCTAs.length > 0) {
      clearErrors("selectedCTAs");
    }
  };
  const onCancelCampaigs = () => {
    history.push('/app/email-campaigns');
  }
  const [warningMsg, setWarningmsg] = useState({ documentExists: true, projectId: "" })
  const validateProjectDoc = async (projectId: any) => {
    try {
      const response = await callApi(`/voicebot/check-document-exists/${projectId}`, "get", "");
      setWarningmsg({ ...response?.data, projectId })
      // console.log(response, "<<<<<<<ADsf");

    } catch (error) {
      // console.error("Error validating project document:", error);
      // return {
      //   success: false,
      //   message: error?.response?.data?.message || "Something went wrong"
      // };
    }
  };



  return (

    <React.Fragment>
      <Box
        w="100%"
        p="6"
        h="100%"
        position="relative"
        overflow="auto"
        marginBottom={"30px!important"}
      >
        {
          findActiveStep?.label == "Complete Campaign" || subTab == "complete" ? "" :
            <Box
              sx={{
                background: '#2977FF',
                padding: "16px 24px",
                borderRadius: "8px",
                mb: "10px",
                mt: "18px",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}
            >
              {
                subTab == "add-more-lead" &&
                <Tooltip label="Go Back" fontSize="11px">
                  <Button
                    onClick={() => {
                      history.push("/app/email-campaigns")

                    }}
                    sx={{
                      height: "30px",
                      padding: "0px"
                    }}>
                    {/* <RightArrow */}
                    <FaArrowAltCircleLeft />
                  </Button>
                </Tooltip>
              }

              <Text fontSize="20px" fontWeight={600} color={"#fff"}>
                {
                  subTab == "add-more-lead" ? "Add more Target Audience" :
                    (findActiveStep?.label == "Set-up Review" || subTab == "set-up-review") ? "Review Campaign Or Schedule date & time" :
                      "Enter the following details to create a new email campaign."
                }

              </Text>
            </Box>
        }
        <Box height="100%">
          {
            /* findActiveStep?.label == "Complete Campaign" && */
            subTab == "complete" ?
              <Box
                height={"100%"}
                textAlign="center"
                display="flex"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
              >
                <Lottie animationData={animationData} style={{ width: 130, height: 130 }} />
                <Text as="p" fontSize="20px" fontWeight="600" color="#1A202C" mb="4px" mt="21px">Great!</Text>
                <Text as="p" fontSize="16px" fontWeight="400" color="#6C757D" mb="24px">Your campaign has been created successfully.
                </Text>
                <Button
                  colorScheme="blue"
                  mr={3} onClick={() => {
                    handleHeaderSteps("reset")
                    history.replace('/app/email-campaigns');
                  }} sx={{
                    _focus: {
                      boxShadow: 'none',
                    }
                  }}
                >
                  <Text as="span" fontSize="16px" color="white" fontWeight="500">Okay</Text>
                </Button>
              </Box> :
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  // Validate CTAs first
                  if (selectedCTAs.length === 0) {
                    setError("selectedCTAs", {
                      type: "manual",
                      message: "Please select at least one CTA",
                    });
                    return;
                  }

                  // Choose submit handler based on current subTab so we don't call create API prematurely
                  if (subTab === 'set-up') {
                    handleSubmit(handleSetupSubmit)(e);
                  } else if (subTab === 'set-up-review') {
                    handleFinalSubmit();
                    e.preventDefault();
                  } else if (subTab === 'target-audience' || subTab === 'add-more-lead') {
                    // Do nothing - these tabs handle their own submissions
                    e.preventDefault();
                    return;
                  }
                }}
              >
                {
                  // findActiveStep?.label == "Set-up" &&
                  subTab == "set-up"
                  && (
                    <React.Fragment>
                      <Box
                        borderRadius={'8px'}
                        background={colors.white}
                        border={`1px solid ${colors.borderColor}`}
                        px="20px" py="24px">
                        <Flex gap={"16px"}>
                          {/* Campaign Name */}
                          <FormControl mb="20px" isInvalid={!!errors.campaignName}>
                            <FormLabel>Campaign Name <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
                            <Input placeholder="Enter campaign name" maxLength={50} {...register("campaignName", { required: "Campaign Name is required" })} />
                            {errors.campaignName && <FormErrorMessage>{errors.campaignName.message}</FormErrorMessage>}
                          </FormControl>

                          {/* Campaign Project */}
                          <FormControl isInvalid={!!errors.campaignProject}>
                            <FormLabel>Campaign Project <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
                            <Controller
                              name="campaignProject"
                              control={control}
                              rules={{ required: "Campaign Project is required" }}
                              render={({ field }: any) => {
                                // derive a string id to use as Select value from possible shapes
                                const fieldVal = field.value;
                                const selectedId = typeof fieldVal === 'string'
                                  ? fieldVal
                                  : (fieldVal?.projectId || fieldVal?._id || "");
                                return (
                                  <Select
                                    placeholder="Please select the project / website URL for this campaign"
                                    value={selectedId}
                                    color={selectedId ? "black" : "gray.500"}
                                    onChange={(e) => {
                                      const selectedProject: any = projects.find(
                                        (project: any) => project._id === e.target.value
                                      );
                                      // normalize stored value to an object with projectId/projectName
                                      field.onChange(selectedProject ? { projectId: selectedProject._id, projectName: selectedProject.name || selectedProject.projectName } : null);
                                    }}
                                  >
                                    {projects.map((project: any) => (
                                      <option key={project._id} value={project._id}>
                                        {project.name}
                                      </option>
                                    ))}
                                  </Select>
                                );
                              }}
                            />
                            {
                              !warningMsg?.documentExists &&
                              <HStack spacing={1} fontSize="13px" my="3px" color="orange.600">
                                <Text>⚠ Document missing. Upload now </Text>
                                <ChakraLink
                                  as={RouterLink}
                                  to={`/app/edit-bot/${warningMsg?.projectId}/?tab=documents`}
                                  fontWeight="500"
                                  display="flex"
                                  gap="4px"
                                  alignItems="center"
                                >
                                  <img style={{ width: "14px" }} src="/icons/outgoing.svg" />
                                </ChakraLink>
                              </HStack>

                            }

                            {errors.campaignProject && <FormErrorMessage>{errors.campaignProject.message}</FormErrorMessage>}
                          </FormControl>

                          {/* Language of the Campaign */}
                          <FormControl mb="20px" isInvalid={!!errors.campaignLanguage}>
                            <FormLabel>Campaign Language <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
                            <Controller
                              name="campaignLanguage"
                              control={control}
                              rules={{ required: "Campaign Language is required" }}
                              render={({ field }) => (
                                <Select placeholder="Select campaign language"
                                  color={field?.value ? "black" : "gray.500"}
                                  {...field}>
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
                          <FormControl mb="20px" isInvalid={!!errors.emailLength}>
                            <FormLabel>Email Length <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
                            <Controller
                              name="emailLength"
                              control={control}
                              rules={{ required: "Email Length is required" }}
                              render={({ field }) => (
                                <Select color={field?.value ? "black" : "gray.500"} placeholder="Select email length" {...field}>
                                  <option value="Short (Upto 500 words)">Short (Upto 500 words)</option>
                                  <option value="Medium (Upto 750 words)">Medium (Upto 750 words)</option>
                                  <option value="Long (Upto 1000 words)">Long (Upto 1000 words)</option>
                                </Select>
                              )}
                            />
                            {errors.emailLength && <FormErrorMessage>{errors.emailLength.message}</FormErrorMessage>}
                          </FormControl>
                        </Flex>

                        <Flex gap={"16px"} mb={"24px"}>

                          {/* Max Emails Per Day */}

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

                            <Controller
                              name="maxEmailsPerDay"
                              control={control}
                              rules={{
                                required: "Max Emails Per Day is required",
                                validate: (value: any) =>
                                  value >= 1 || "Max Emails Per Day must be at least 1",
                              }}
                              render={({ field }) => (
                                <NumberInput
                                  min={1}
                                  step={1}
                                  max={100000}
                                  value={field.value || ""}
                                  onChange={(_, valueNumber) => {
                                    if (valueNumber > 100000) {
                                      field.onChange(100000);
                                    } else if (valueNumber < 1) {
                                      field.onChange(1);
                                    } else {
                                      field.onChange(valueNumber);
                                    }
                                  }}
                                >
                                  <NumberInputField
                                    placeholder="Set a daily send limit (e.g. 100)"
                                    inputMode="numeric"
                                  />
                                  <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                  </NumberInputStepper>
                                </NumberInput>
                              )}
                            />
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
                            <Controller
                              name="maxEmailsPerLead"
                              control={control}
                              rules={{
                                required: "Max Emails Per Lead is required",
                                validate: (value: any) =>
                                  value >= 1 || "Max Emails Per Lead must be at least 1",
                                min: {
                                  value: 1,
                                  message: "Minimum allowed is 1",
                                },
                                max: {
                                  value: 5,
                                  message: "Maximum allowed is 5",
                                },
                              }}

                              render={({ field }) => (
                                <NumberInput
                                  min={1}
                                  max={5}
                                  step={1}
                                  value={field.value || ""}
                                  onChange={(_, valueNumber) => {
                                    if (valueNumber > 5) {
                                      field.onChange(5);
                                    } else if (valueNumber < 1) {
                                      field.onChange(1);
                                    } else {
                                      field.onChange(valueNumber);
                                    }
                                  }}
                                  position="relative"
                                >
                                  {!field.value && (
                                    <Box
                                      position="absolute"
                                      left="19px"
                                      right="40px"
                                      top="50%"
                                      transform="translateY(-50%)"
                                      overflow="hidden"
                                      whiteSpace="nowrap"
                                      pointerEvents="none"
                                      zIndex={1}
                                      fontSize="14px"
                                      fontWeight="400"
                                      color="gray.500"
                                    >
                                      <Box
                                        display="inline-block"
                                        fontWeight="400"
                                        animation="placeholderScroll 8s linear infinite"
                                        sx={{
                                          "@keyframes placeholderScroll": {
                                            "0%": {
                                              transform: "translateX(0)",
                                            },
                                            "100%": {
                                              transform: "translateX(-100%)",
                                            },
                                          },
                                        }}
                                      >
                                        Maximum emails allowed per lead (e.g. 5)
                                      </Box>
                                    </Box>
                                  )}

                                  <NumberInputField
                                    placeholder=""
                                    inputMode="numeric"
                                    autoComplete="off"
                                  />

                                  <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                  </NumberInputStepper>
                                </NumberInput>
                              )}


                            />
                            {errors.maxEmailsPerLead && <FormErrorMessage>{errors.maxEmailsPerLead.message}</FormErrorMessage>}
                          </FormControl>

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


                            <Controller
                              name="followUpFrequency"
                              control={control}
                              rules={{
                                required: "Follow-up frequency is required",
                                validate: (value: any) =>
                                  value >= 1 || "Follow-up frequency must be at least 1",
                              }}
                              render={({ field }) => (
                                <NumberInput
                                  min={1}
                                  step={1}
                                  max={100000}
                                  value={field.value || ""}
                                  onChange={(_, valueNumber) => {
                                    if (valueNumber > 100000) {
                                      field.onChange(100000);
                                    } else if (valueNumber < 1) {
                                      field.onChange(1);
                                    } else {
                                      field.onChange(valueNumber);
                                    }
                                  }}
                                  position="relative"
                                >
                                  {/* Auto-scrolling placeholder */}
                                  {!field.value && (
                                    <Box
                                      position="absolute"
                                      left="19px"
                                      right="40px"
                                      top="50%"
                                      transform="translateY(-50%)"
                                      overflow="hidden"
                                      whiteSpace="nowrap"
                                      pointerEvents="none"
                                      zIndex={1}
                                      fontSize="14px"
                                      fontWeight="400"
                                      color="gray.500"
                                    >
                                      <Box
                                        display="inline-block"
                                        fontWeight="400"
                                        animation="placeholderScroll 8s linear infinite"
                                        sx={{
                                          "@keyframes placeholderScroll": {
                                            "0%": {
                                              transform: "translateX(0)",
                                            },
                                            "100%": {
                                              transform: "translateX(-100%)",
                                            },
                                          },
                                        }}
                                      >
                                        How long to wait before sending a follow-up?
                                      </Box>
                                    </Box>
                                  )}

                                  {/* Actual input */}
                                  <NumberInputField
                                    placeholder=""
                                    inputMode="numeric"
                                  // autoComplete="off"
                                  />

                                  <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                  </NumberInputStepper>
                                </NumberInput>
                              )}
                            />



                            {errors.followUpFrequency && <FormErrorMessage>{errors.followUpFrequency.message}</FormErrorMessage>}
                          </FormControl>



                          <FormControl isInvalid={!!errors.totalFollowUps}>
                            <FormLabel display="flex" alignItems="center" gap="4px">
                              Number of Follow-ups
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


                            <Controller
                              name="totalFollowUps"
                              control={control}
                              rules={{
                                required: "Number of follow-up is required",
                                validate: (value: any) =>
                                  value >= 1 || "Number of follow-up must be at least 1",
                              }}
                              render={({ field }) => (
                                <NumberInput
                                  min={1}
                                  step={1}
                                  max={100000}
                                  value={field.value || ""}
                                  onChange={(_, valueNumber) => {
                                    if (valueNumber > 100000) {
                                      field.onChange(100000);
                                    } else if (valueNumber < 1) {
                                      field.onChange(1);
                                    } else {
                                      field.onChange(valueNumber);
                                    }
                                  }}
                                >
                                  <NumberInputField
                                    placeholder="Enter number of follow-up emails"
                                    inputMode="numeric"
                                  />
                                  <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                  </NumberInputStepper>
                                </NumberInput>
                              )}
                            />
                            {errors.totalFollowUps && <FormErrorMessage>{errors.totalFollowUps.message}</FormErrorMessage>}
                          </FormControl>

                        </Flex>
                        <Box>
                          {/* Call To Action (CTA) */}
                          <FormControl mb="0px" isInvalid={(!!errors.selectedCTAs)}>
                            <FormLabel>Call To Action (CTA) <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
                            <Menu closeOnSelect={false}>
                              <MenuButton
                                as={Button}
                                width="100%"
                                textAlign="left"
                                minHeight="38px"
                                h="auto"
                                border={`1px solid ${(!!errors.selectedCTAs) ? "red" : "#E2E8F0"}`}
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
                                {["Email", "Phone Number", "Custom Links"].map((cta) => (
                                  <MenuItem key={cta} onClick={() => handleSelectCTA(cta)} display="flex" justifyContent="space-between">
                                    <Checkbox
                                      isChecked={selectedCTAs.includes(cta)}
                                      onChange={() => handleSelectCTA(cta)}
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
                                mt="4"
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
                      <Box mt="24px"
                        borderRadius={'8px'}
                        background={colors.white}
                        border={`1px solid ${colors.borderColor}`}
                        px="20px" py="24px">

                        {/* Target Audience */}
                        <FormControl mb="16px" isInvalid={!!errors.targetAudience}>
                          <FormLabel display="flex" alignItems={"center"} gap={"4px"}>
                            Target Audience
                            <Popover isOpen={targetOpen} onClose={() => setTargetOpen(false)}>
                              <PopoverTrigger>
                                <Box
                                  cursor="pointer"
                                  as="span"
                                  onClick={() => setTargetOpen(!targetOpen)}
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
                                <Box whiteSpace="pre-wrap">The specific group of people or businesses your product or service is meant for.
                                </Box>
                              </PopoverContent>
                            </Popover>
                            <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text>
                          </FormLabel>
                          {targetAudienceFields.map((field, index) => (
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


                              </Box>
                              {errors.targetAudience?.[index]?.value && (
                                <FormErrorMessage>{errors?.targetAudience[index]?.value?.message}</FormErrorMessage>
                              )}
                            </FormControl>
                          ))}
                          {/* {targetAudienceFields.length < 5 && <Button size="sm" onClick={() => appendTargetAudience({ value: '' })}>+ Add</Button>} */}
                        </FormControl>
                        {/* Pain Points */}
                        <FormControl mb="16px" isInvalid={!!errors.painPoints}>
                          <FormLabel display="flex" alignItems={"center"} gap={"4px"}>
                            Pain Points / Problems
                            <Popover isOpen={painOpen} onClose={() => setPainOpen(false)}>
                              <PopoverTrigger>
                                <Box
                                  cursor="pointer"
                                  as="span"
                                  onClick={() => setPainOpen(!painOpen)}
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
                                <Box whiteSpace="pre-wrap">The problems or challenges your target audience is facing.
                                </Box>
                              </PopoverContent>
                            </Popover>
                            <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text>
                          </FormLabel>
                          {painPointsFields.map((field, index: any) => (
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
                        </FormControl>

                        {/* Solution / Offer */}
                        <FormControl isInvalid={!!errors.solutionOffer}>
                          <FormLabel display="flex" alignItems={"center"} gap={"4px"}>
                            Solutions / Offers
                            <Popover isOpen={solutionOpen} onClose={() => setSolutionOpen(false)}>
                              <PopoverTrigger>
                                <Box
                                  cursor="pointer"
                                  as="span"
                                  onClick={() => setSolutionOpen(!solutionOpen)}
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
                                <Box whiteSpace="pre-wrap">The product or service you provide to solve those problems.
                                </Box>
                              </PopoverContent>
                            </Popover>
                            <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text>
                          </FormLabel>
                          {solutionOfferFields.map((field, index) => (
                            <FormControl
                              key={index}
                              isInvalid={!!errors.solutionOffer?.[index]?.value}
                            // mb="12px"
                            >
                              <Box display="flex" alignItems="center" gap="10px">
                                <Input
                                  placeholder="Enter the Solution / Offer"
                                  {...register(`solutionOffer.${index}.value`, { required: "Solution / Offer is required" })}
                                />

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
                        px="20px" py="24px">
                        <HStack spacing={1} mb="10px" >
                          <Heading as="h3" size="sm" fontWeight="600">Select Mailboxes <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></Heading>
                        </HStack>
                        <Box mb="24px">
                          {emailAndSenderLimitFields.map((field: any, index: number) => (
                            <React.Fragment key={field.id}>
                              <HStack mb="8px" width="100%" spacing="16px" alignItems="flex-start">
                                <FormControl isInvalid={!!errors?.emailAndSenderLimit?.[index]?.email}>
                                  <FormLabel display="flex" alignItems={"center"} gap={"4px"}>

                                    Email {index + 1}
                                    <Popover isOpen={mailInfoOpen} onClose={() => setMailInfoOpen(false)}>
                                      <PopoverTrigger>
                                        <Box
                                          cursor="pointer"
                                          as="span"
                                          onClick={() => setMailInfoOpen(!mailInfoOpen)}
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
                                        <Box whiteSpace="pre-wrap">List of available SMTP servers from which you can choose the email account that will be used to send emails to recipients.</Box>
                                      </PopoverContent>
                                    </Popover>
                                    <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text>
                                  </FormLabel>
                                  <Controller
                                    name={`emailAndSenderLimit.${index}.email`}
                                    control={control}
                                    rules={{ required: "Please enter a valid email" }}
                                    render={({ field: controllerField }) => (
                                      <Select
                                        placeholder="Please select the email"
                                        value={controllerField.value}
                                        color={controllerField.value ? "black" : "gray.500"}
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
                                  <FormLabel display="flex" alignItems={"center"} gap={"4px"}>

                                    Maximum Limit
                                    <Popover isOpen={limitOpen} onClose={() => setLimitOpen(false)}>
                                      <PopoverTrigger>
                                        <Box
                                          cursor="pointer"
                                          as="span"
                                          onClick={() => setLimitOpen(!limitOpen)}
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
                                        <Box whiteSpace="pre-wrap">Set the maximum number of emails this campaign can make.</Box>
                                      </PopoverContent>
                                    </Popover>
                                    <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text>
                                  </FormLabel>

                                  <Controller
                                    name={`emailAndSenderLimit.${index}.maxLimit`}
                                    control={control}
                                    rules={{
                                      required: "Max Limit is required",
                                      validate: (value: any) =>
                                        value >= 1 || "Max Limit  must be at least 1",
                                    }}
                                    render={({ field }) => (
                                      <NumberInput
                                        min={1}
                                        step={1}
                                        max={100000}
                                        value={field.value || ""}
                                        onChange={(_, valueNumber) => {
                                          if (valueNumber > 100000) {
                                            field.onChange(100000);
                                          } else if (valueNumber < 1) {
                                            field.onChange(1);
                                          } else {
                                            field.onChange(valueNumber);
                                          }
                                        }}
                                      >
                                        <NumberInputField
                                          placeholder="Set the maximum number of contacts to reach"
                                          inputMode="numeric"
                                        />
                                        <NumberInputStepper>
                                          <NumberIncrementStepper />
                                          <NumberDecrementStepper />
                                        </NumberInputStepper>
                                      </NumberInput>
                                    )}
                                  />
                                  {errors?.emailAndSenderLimit?.[index]?.maxLimit && (
                                    <FormErrorMessage>
                                      {errors.emailAndSenderLimit[index]?.maxLimit?.message}
                                    </FormErrorMessage>
                                  )}
                                </FormControl>

                                <ButtonGroupsDA
                                  // style={{ paddingTop: "0" }}
                                  deleteHandler={() => {
                                    // Get the email value before removing the field
                                    const emailToRemove = watch(`emailAndSenderLimit.${index}.email`);
                                    // Reset the status of the email being removed
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
                                  addHandler={() => appendEmailAndSenderLimit({ email: "", maxLimit: "" })}
                                  deleteDisabled={emailAndSenderLimitFields.length === 1}
                                  addDisabled={!(emailAndSenderLimitFields.length < 5)}
                                />

                              </HStack>
                            </React.Fragment>
                          ))}

                        </Box>
                      </Box>
                      <Box mt="20px" display="flex" justifyContent="space-between">
                        <Button mr={3} color="#2977ff"
                          colorScheme="gray"
                          fontWeight={500}
                          onClick={onCancelCampaigs} >Cancel</Button>
                        <Button
                          colorScheme="blue"
                          type="submit" disabled={isLoading}>
                          {isLoading ? <Spinner color='gray.700' />
                            :
                            <>
                              {/* <Image src={saveIcon} alt='Save & Continue' /> */}
                              <Text as="span" fontSize="16px" ms="8px" fontWeight="500">Save & Continue</Text>
                            </>
                          }
                        </Button>
                      </Box>
                    </React.Fragment>
                  )
                }
                {
                  // findActiveStep?.label == "Target Audience" &&
                  (subTab == "target-audience" || subTab == "add-more-lead") &&
                  (
                    <AddMoreTargetAudience sourceChecks={sourceChecks} setSourceChecks={setSourceChecks} handleHeaderSteps={handleHeaderSteps} />
                  )
                }
                {
                  // findActiveStep?.label == "Set-up Review" &&
                  subTab == "set-up-review"
                  && (
                    <CampaignPreview sourceChecks={sourceChecks} setSourceChecks={setSourceChecks} handleHeaderSteps={handleHeaderSteps} onFinalSubmit={handleFinalSubmit}  // Pass the final submit handler
                      isSubmittingProp={isLoading} />
                  )
                }

              </form>
          }
        </Box>

      </Box>
    </React.Fragment >
  )
}