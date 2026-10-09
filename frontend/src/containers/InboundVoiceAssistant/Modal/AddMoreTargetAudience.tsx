import React, { useEffect, useState, useCallback } from "react";
import Multiselect from "multiselect-react-dropdown";
import {
  Button,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalHeader,
  Checkbox,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Box, HStack, Radio,
  Divider,
  FormControl,
  Image,
  Input,
  useToast,
  FormLabel,
  keyframes,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  InputGroup,
  InputLeftElement,
  Flex,
  RadioGroup,
} from "@chakra-ui/react";
import ExcelLogo from "./images/excelLogo.svg"
import { useForm } from "react-hook-form";
import { CancelThisCampaign } from "./CancelThisCampaign";
import { csvParseAndSaveData, duplicateLead, getAllLeadsWithCount, triggerCampaign, deleteUnverifiedEmail, getAllCSVUploadedData } from "../../../services/emailCampaigns";
import CsvFile from "./csv_data_sample.csv";
import { SuccessfullyModal } from "./SuccessfullyModal";
import { IoIosSearch, IoIosAdd } from "react-icons/io";
import { colors } from "../../../utils/constant";
import TableComponent from "../../TableComponent";
import { useHistory, useLocation } from "react-router-dom";
import EmailDataPreviewModal from "../../VoiceAssistant/Campaign/EmailDataPreviewModal";
import { callApi } from "../../../services/callApi";
interface EmailItem {
  email: string;
  _id?: string;
  isVerified?: boolean;
  addedFromInput?: boolean;
  campaignId?: string;
}

interface CampaignData {
  _id: string;
  campaignName: string;
  [key: string]: any;
}

interface PreviousCampaign {
  campaignId: string;
  campaignName: string;
  data?: string[];
  count?: number;
}

type Steps =
  | "previous campaigns"
  | "Upload Leads"
  | "Scrape New Leads"
  | "Facebook Leads";

const moveStripes = keyframes`
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 56.57px 0;
  }
`;
interface AddMoreTargetAudienceProps {
  handleHeaderSteps: (step: string) => void;
}
interface CampaignState {
  data?: {
    campaignId?: string;
    _id?: string;
    campaignName?: string;
    // add other fields as needed
  };
}
type FilePreviewType = {
  isOpen: boolean;
  data: Object | null;
}

export const AddMoreTargetAudience: React.FC<AddMoreTargetAudienceProps> = ({ handleHeaderSteps }) => {
  const [isSubmittings, setIsSubmittings] = React.useState<boolean>(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isOpens, setIsOpens] = useState(false);
  const onClose = () => { }
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [campaignEmailList, setCampaignEmailList] = useState<EmailItem[]>([]);
  const [email, setEmail] = useState<string>("");
  const [searchEMailQuery, setSearchEmailQuery] = useState<string>("");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isCancelThisCampaign, setIsCancelThisCampaign] = useState(false);
  const [selectedCatOptions, setSelectedCatOptions] = useState<any>([]);
  const [filePreview, setFilePreview] = useState<FilePreviewType>({ isOpen: false, data: {} });
  const [showQuery, setShowQuery] = useState<boolean>(false);
  const [count, setCount] = useState<number>(0);
  // const [data, setData] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const history = useHistory();
  const [currentStep, setCurrentStep] = React.useState('previousCampaigns');
  const [sourceArray, setSourceArray] = React.useState<string[]>([]);
  const [allmergedLeads, setAllMergedLeads] = React.useState<any[]>([]);

  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [parsedEmails, setParsedEmails] = useState<any>([]);
  const [fileData, setfileData] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [leadsForFacebook, setLeadsForFacebook] = useState<any>([]);
  const [selectedOption, setSelectedOption] = useState("0");
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const campId = queryParams.get('id');
  const CampName = queryParams.get('campaignName') || "";
  const subTab = queryParams.get('subTab');

  const data = { campaignId: campId || "", campaignName: CampName || "" };
  // console.log("Campaign Name from state: campaignId ,campaignName", data);


  const toast = useToast();
  const animation = `${moveStripes} 1s linear infinite`;

  const handleTabChanges = (index: any) => {
    // 'uploadLeads',
    const steps = ['previousCampaigns', 'uploadLeads', 'scrapeNewLeads', 'facebookLeads', "linkedinLeads"];
    const newStep: any = steps[index];
    setCurrentStep(newStep);
    // history.push(`?subtab=${newStep}`);
  };
  // Filter the emails based on the search query
  const filteredEmails = parsedEmails.filter((email: any) =>
    email?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCampaignEmails = campaignEmailList.filter((email: any) =>
    email?.email?.toLowerCase().includes(searchEMailQuery.toLowerCase())
  );
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };
  // Handle add button click
  const handleAddEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Regex to validate email format

    if (!email) {
      toast({
        title: "Email field cannot be empty.",
        status: "error",
        isClosable: true,
      });
      return;
    }

    if (!emailRegex.test(email)) {
      toast({
        title: "Please enter a valid email address.",
        status: "error",
        isClosable: true,
      });
      return;
    }

    // Check if the email already exists
    const emailExists = campaignEmailList.some((item: any) => item.email === email);
    if (emailExists) {
      toast({
        title: "This email is already in the list.",
        status: "error",
        isClosable: true,
      });
      return;
    }

    // Add email to the list
    setCampaignEmailList((prev: any) => [{ email, addedFromInput: true }, ...prev]);
    onCloseOpens(); // Close the modal
  };

  // Explicitly type the ref as a mutable reference to an HTMLInputElement or null
  const fileInputRef: React.MutableRefObject<HTMLInputElement | null> = React.useRef(null);

  const handleExcelButton = () => {
    fileInputRef.current?.click(); // Safely calls click if fileInputRef.current is not null
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileInput = event.target;
    const file = fileInput.files?.[0];
    try {
      setUploadingFile(true);
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("campaignId", data?.campaignId || "");
        formData.append("campaignName", data?.campaignName || "");
        const response: any = await csvParseAndSaveData(formData);
        // console.log(response.data.data, "parses emails");
        handleMergeLeads(response?.data?.data?.parsedEmails, "csvUploadLeads")
        // setParsedEmails(response?.data?.data?.parsedEmails);
        setfileData(response?.data?.data)

        if (response?.data?.statusCode === 200) {
          // setTimeout(() => {
          //   toast({
          //     title: subTab == "add-more-lead" ? `New Audience has been added successfully to the campaign` : `${response?.data?.message}`,
          //     status: "success",
          //     isClosable: true,
          //   });
          //   // history.push(`/app/email-campaigns`);
          // }, 3000);

        } else {
          toast({
            title: `${response?.data?.message}`,
            status: "error",
            isClosable: true,
          });
        }

        // const ResponseOFtrigger :any = await triggerCampaign( data?.campaignId)

        // Process or upload the file here
      }
    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      })
    } finally {
      setUploadingFile(false);
      fileInput.value = "";
    }

  };

  // Process file dropped via drag and drop
  const processDroppedFile = async (file: File) => {
    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("campaignId", data?.campaignId || "");
      formData.append("campaignName", data?.campaignName || "");
      const response: any = await csvParseAndSaveData(formData);
      handleMergeLeads(response?.data?.data?.parsedEmails, "csvUploadLeads")

      // setParsedEmails(response?.data?.data?.parsedEmails);
      setfileData(response?.data?.data)
      if (response?.data?.statusCode === 200) {
        // toast({
        //   title: `${response?.data?.message}`,
        //   status: "success",
        //   isClosable: true,
        // });
      } else {
        toast({
          title: `${response?.data?.message}`,
          status: "error",
          isClosable: true,
        });
      }
    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const onCloseOpens = () => {
    setIsOpens(false);
    setEmail("");
  }

  // Handle drag events
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Handle drop event
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      // Check if file is CSV
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        processDroppedFile(file);
      } else {
        toast({
          title: "Invalid file format",
          description: "Please upload a CSV file",
          status: "error",
          isClosable: true,
        });
      }
    }
  }, [data, setParsedEmails, toast]);

  // Handle individual checkbox change
  const handleCheckboxChange = (email: string) => {
    // console.log("filteredCampaignEmails", filteredCampaignEmails, selectedEmails);

    setSelectedEmails((prev: any) => {
      if (prev.includes(email)) {
        return prev.filter((e: any) => e !== email);
      } else {
        return [...prev, email];
      }
    });
  };
  // Handle select/deselect all
  const handleSelectAll = () => {
    if (!selectAll) {
      const allEmails = campaignEmailList.map(item => item.email);
      setSelectedEmails(allEmails);
    } else {
      setSelectedEmails([]);
    }
    setSelectAll(!selectAll);
  };
  // Delete selected emails
  const handleDeleteSelected = () => {
    const updatedList = campaignEmailList.filter(
      (item: EmailItem) => !selectedEmails.includes(item.email)
    );
    setCampaignEmailList(updatedList);
    setSelectedEmails([]);
    setSelectAll(false);
  };
  function delEmailFromList(emailid: string) {
    setCampaignEmailList((prevList: any[]) =>
      prevList.filter((emailItem) => emailItem.email !== emailid)
    );
  }



  async function delCampaignEmail(emailid: string, campaignId: string) {
    try {
      const response = await deleteUnverifiedEmail({ email: emailid, campaignId: campaignId });
      setParsedEmails(response?.data?.data);
      setLeadsForFacebook(response?.data?.data);
      toast({
        title: `${response?.data?.message}`,
        status: "success",
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      })
    }
  }

  const getAllUploadedData = async (id: string) => {
    try {
      const response: any = await getAllCSVUploadedData(id);
      const allData = response?.data?.data;
      setParsedEmails(allData); // Updated here
      handleMergeLeads(allData, "csvUploadLeads")
    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      });
    }
  }
  useEffect(() => {
    if (data?.campaignId !== null || subTab != "add-more-lead") {
      getAllUploadedData(data?.campaignId || "");
    }
  }, []);

  const {
    setError,
    clearErrors,
    formState: { errors },
  } = useForm();


  const onCancelThisCampaign = () => {
    setIsCancelThisCampaign(false);
  }

  const handleChildData = () => {
    onClose();
  };
  const [previousCampaigns, setPreviousCampaigns] = useState([]);

  const onSelectCatOptions = (selectedCatList: any) => {
    // console.log(selectedCatList, "selectedCatList");
    const newEmails = selectedCatList
      .flatMap((item: any) => item.data);

    setCampaignEmailList((prev: EmailItem[]) => {
      const emailSet = new Set(prev.map((emailItem: any) => emailItem.email));
      newEmails.forEach((email: any) => emailSet.add(email));
      return Array.from(emailSet).map((email) => ({ email }));
    });
    setSelectedCatOptions(selectedCatList);
    if (selectedCatList.length > 0) {
      clearErrors('categories');
    }
  };

  const onRemoveCatOptions = (selectedCatList: any) => {
    const remainingEmails = selectedCatList.flatMap((item: any) => item.data || []);
    setCampaignEmailList((prev: EmailItem[]) => {
      const emailSet = new Set(remainingEmails);

      return prev.filter((emailItem) => emailSet.has(emailItem.email));
    });
    setSelectedCatOptions(selectedCatList);
    if (selectedCatList.length === 0 && !showQuery) {
      setError('categories', { type: 'manual', message: 'previous campaigns are required' });
      setCount(0);
    }
  };

  const fetchData = async () => {
    try {
      const response: any = await getAllLeadsWithCount();
      const campaigns = response?.data?.data;
      setPreviousCampaigns(campaigns); // Updated here

    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      });
    }
  };
  React.useEffect(() => {
    // if (isOpened) {
    fetchData();
    // }
  }, []);



  const onCloseCanceled = () => {
    setIsOpen(false);
  }

  const previouscampaignsBtn = async () => {
    if (!showQuery) {
      if (selectedCatOptions.length === 0) {
        setError('categories', { type: 'manual', message: 'previous campaign are required' });
        return;
      }
    }
    const formData: any = {};

    if (!showQuery && selectedCatOptions && selectedCatOptions.length > 0) {
      formData.categories = selectedCatOptions.map((category: any) => category);
    }

    // Separate the emails into new and old campaign audiences
    const newCampaignAudiences = campaignEmailList
      .filter((emailObj: any) => emailObj.addedFromInput) // Filter emails with `addedFromInput: true`
      .map((emailObj: any) => emailObj.email); // Extract the email property

    const oldCampaignAudiences = campaignEmailList
      .filter((emailObj: any) => !emailObj.addedFromInput) // Filter emails without `addedFromInput` or with it undefined
      .map((emailObj: any) => emailObj.email); // Extract the email property

    const formattedData = {
      currentCampaignId: data?.campaignId,
      previousCampaign: formData.categories.slice(0).map((campaign: any) => ({
        campaignId: campaign.campaignId,
        campaignName: campaign.campaignName
      })),
      oldCampaignAudiences,
      newCampaignAudiences,
    };
    // const triggerCampaignId = { campaignId: data?.campaignId }
    try {
      setIsSubmitting(true);
      const response = await duplicateLead(formattedData);
      if (response?.data?.statusCode === 200) {
        // this we be decide by user trigger imidiate or want to schedule
        // const responses = await triggerCampaign(triggerCampaignId);
        // fetchData(currentPage, itemsPerPages, '');

        setSelectedCatOptions([]);
        if (subTab == "add-more-lead") {
          setTimeout(() => {
            toast({
              title: `${response?.data?.message}`,
              status: "success",
              isClosable: true,
            });
            history.push(`/app/email-campaigns`);
          }, 3000);
        } else {
          toast({
            title: `${response?.data?.message}`,
            status: "success",
            isClosable: true,
          });
          history.push(`/app/email-campaigns/create?subTab=set-up-review&id=${data?.campaignId}`);
        }

        setCampaignEmailList([]);
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
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (selectedCatOptions.length === 0) {
      return undefined
    } else {
      const totalCountCamp = selectedCatOptions.reduce((total: number, campaign: any) => total + campaign.count, 0);
      setCount(totalCountCamp); // This will only run when selectedCatOptions changes
    }
  }, [selectedCatOptions]);

  const id: any = { id: "" }


  const handleIncludesLeads = (leadType: string, isChecked: boolean) => {
    if (isChecked) {
      setSourceArray((prev) => [...prev, leadType]);
    } else {
      setSourceArray((prev) => prev.filter((item) => item !== leadType));
    }
  };

  const handleMergeLeads = (data: any, sourceName: string) => {
    setAllMergedLeads((prev: any) => {
      return {
        ...prev,
        [sourceName]: data
      }
    })
  }



  useEffect(() => {
    if (Object.keys(allmergedLeads).length || sourceArray.length) {
      validateMergedLeads(allmergedLeads, "false");
    }
  }, [allmergedLeads, sourceArray])


  const validateMergedLeads = async (payloadData: any, isAction: any) => {
    try {
      // console.log("payloadData to merge", payloadData, sourceArray);
      const targetLeads: any = { campaignId: data?.campaignId };

      // Check which sources exist in the sourceArray and add accordingly
      if (sourceArray.includes("csv")) {
        targetLeads.csvUploadLeads = payloadData?.csvUploadLeads?.length ? payloadData.csvUploadLeads : [];
      }

      if (sourceArray.includes("facebook")) {
        targetLeads.facebookLeads = payloadData?.facebookLeads?.length ? payloadData.facebookLeads : [];
      }

      if (sourceArray.includes("linkedin")) {
        targetLeads.linkedinLeads = payloadData?.linkedinLeads?.length ? payloadData.linkedinLeads : [];
      }

      if (sourceArray.includes("gmb")) {
        targetLeads.gmbLeads = payloadData?.gmbLeads?.length ? payloadData.gmbLeads : [];
      }
      if (sourceArray.includes("previousCampaigns")) {//gmbLeads

        targetLeads.previousCampaigns = selectedEmails || []
      }

      const payload = { targetLeads };
      const response = await callApi("campaign/merge-leads", "post", payload)
      // console.log("response", response);
      // setParsedEmails(response?.data);
      if (isAction === "true") {
        toast({
          title: `Leads merged and validated successfully!`,
          status: "success",
          isClosable: true,
        });
        history.push(`/app/email-campaigns/create?subTab=target-audience&id=${data?.campaignId}&campaignName=${data?.campaignName}&preview-tab=opened`);
        setFilePreview({ isOpen: true, data: response?.data })
      }
      // if (response?.data?.validRows)

    } catch (error: any) {
      // console.log(error);
      toast({
        title: error.response?.data?.message || error?.message || `Something went wrong while merging leads!`,
        status: "error",
        isClosable: true,
      });

    }
  }

  return (
    <>
      <Box mt="26px"
        borderRadius={'8px'}
        background={colors.white}
        border={`1px solid ${colors.borderColor}`}
        px="16px" py="20px">


        <Box>
          <Tabs
            variant="enclosed"
            w="100%"
            colorScheme="gray"
            size="md"
            position="relative"
            onChange={handleTabChanges}
            index={['previousCampaigns', 'uploadLeads', 'scrapeNewLeads', 'facebookLeads', `linkedinLeads`].indexOf(
              currentStep,
            )}
          >
            <TabList position="relative" w="100%">

              <Tab
                id="tab-previousCampaigns"
                border="none"
                _focus={{ outline: 'none' }}
                _disabled={{ cursor: 'not-allowed', opacity: '0.4' }}
                style={{
                  backgroundColor:
                    currentStep === 'previousCampaigns' ? '#fff' : '',
                  color:
                    currentStep === 'previousCampaigns' ? '#2977FF' : '#495057',
                }}
                onClick={() => setCurrentStep('previousCampaigns')}
              >
                Duplicate Leads from previous campaigns
              </Tab>
              <Tab
                id="tab-uploadLeads"
                border="none"
                _focus={{ outline: 'none' }}
                _disabled={{ cursor: 'not-allowed', opacity: '0.4' }}
                style={{
                  backgroundColor:
                    currentStep === 'uploadLeads' ? '#fff' : '',
                  color:
                    currentStep === 'uploadLeads' ? '#2977FF' : '#495057',
                }}
                onClick={() => setCurrentStep('uploadLeads')}
              >
                Upload Leads
              </Tab>
              <Tab
                id="tab-scrapeNewLeads"
                border="none"
                _focus={{ outline: 'none' }}
                _disabled={{ cursor: 'not-allowed', opacity: '0.4' }}
                style={{
                  backgroundColor: currentStep === 'scrapeNewLeads' ? '#fff' : '',
                  color: currentStep === 'scrapeNewLeads' ? '#2977FF' : '#495057',
                }}
                onClick={() => setCurrentStep('scrapeNewLeads')}
              >
                Scrape New Leads
              </Tab>
              <Tab
                id="tab-facebookLeads"
                border="none"
                _focus={{ outline: 'none' }}
                _disabled={{ cursor: 'not-allowed', opacity: '0.4' }}
                style={{
                  backgroundColor: currentStep === 'facebookLeads' ? '#fff' : '',
                  color: currentStep === 'facebookLeads' ? '#2977FF' : '#495057',
                }}
                onClick={() => setCurrentStep('facebookLeads')}
              >
                Facebook Leads
              </Tab>
              <Tab
                id="tab-linkedinLeads"
                border="none"
                _focus={{ outline: 'none' }}
                _disabled={{ cursor: 'not-allowed', opacity: '0.4' }}
                style={{
                  backgroundColor: currentStep === 'linkedinLeads' ? '#fff' : '',
                  color: currentStep === 'linkedinLeads' ? '#2977FF' : '#495057',
                }}
                onClick={() => setCurrentStep('linkedinLeads')}
              >
                Linkedin Leads
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel border="1px solid #DEE2E6" bg="#fff" pt="16px">

                <Checkbox
                  onChange={(e) => handleIncludesLeads("previousCampaigns", e.target.checked)}
                  size="md"
                  isChecked={sourceArray.includes("previousCampaigns")}
                >
                  Includes Leads
                </Checkbox>
                <Box pt="16px">
                  <Box textAlign="start"
                    display="flex"
                    flexDirection="column"
                    justifyContent="start"
                    alignItems="center">
                    <Text as="p" fontSize="18px" w={"100%"} fontWeight="700" color="#1A202C" pb="8px">Select your previous campaigns</Text>
                    <Text as="p" fontSize="14px" w={"100%"} fontWeight="400" color="#6C757D" pb="24px">You can choose from your existing campaigns to maintain consistency and save time.</Text>
                  </Box>
                  <Box>
                    <form>
                      <FormControl isRequired mb="32px">
                        {!showQuery && (
                          <Box mb="15px">
                            <Multiselect
                              options={previousCampaigns} // Use updated state
                              onSelect={onSelectCatOptions}
                              onRemove={onRemoveCatOptions}
                              displayValue="campaignName"
                              closeIcon="cancel"
                              placeholder="Select Options"
                              selectedValues={selectedCatOptions}
                              className="multiSelectContainer"
                            />
                            {errors.categories && (
                              <p style={{ color: 'red', fontSize: '12px' }}>{errors.categories.message}</p>
                            )}
                          </Box>)}
                      </FormControl>
                    </form>
                    {campaignEmailList.length > 0 && (<>
                      <Box display="flex" justifyContent="space-between" alignItems={"center"} pb="15px">
                        <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" >Total lead result: {campaignEmailList.length}</Text>
                        <Flex gap="10px">
                          <Box textAlign="right">
                            <Flex justifyContent="center">
                              <InputGroup
                                // border="1px solid #6C757D"
                                borderRadius="4px"
                                borderColor="#6C757D"
                              >
                                <InputLeftElement pointerEvents='none'>
                                  <IoIosSearch color="#6C757D" />
                                </InputLeftElement>
                                <Input
                                  placeholder="Search Email"
                                  value={searchEMailQuery}
                                  onChange={(e) => setSearchEmailQuery(e.target.value)}
                                // maxW="300px"
                                />
                              </InputGroup>
                            </Flex>
                          </Box>
                          <Box>
                            <Button colorScheme="blue" variant="outline" fontWeight="400" onClick={() => setIsOpens(true)}>
                              <IoIosAdd size="25px" />
                              Emails
                            </Button>
                          </Box>
                        </Flex>
                      </Box>
                      <TableContainer
                        maxH="400px" // height for vertical scroll
                        mt={'20px'}
                        w="100%"
                        boxShadow={"0px 1px 4px 0px #0C0C0D0D"}
                        bg={'#fff'}
                        border="1px solid #E2E8F0"
                        borderRadius="8px"
                        sx={{
                          overflow: "scroll!important",
                          "::-webkit-scrollbar": {
                            display: "none"
                          }
                        }}
                      >
                        <Table variant="simple">
                          <Tbody>
                            {filteredCampaignEmails.length > 0 ? (
                              filteredCampaignEmails.map((item: any, index: number) => (
                                <Tr key={index}>
                                  <Td width="40px">
                                    <Checkbox
                                      isChecked={selectedEmails.findIndex((itemE: any) => itemE?.email == item?.email) != -1}
                                      onChange={() => handleCheckboxChange(item)}
                                      width={"100%"}
                                      mt="2px"
                                      size="lg"
                                    ></Checkbox>
                                  </Td>
                                  <Td fontSize="14px">{item?.email}</Td>
                                  <Td textAlign="right">
                                    <Button
                                      size="sm"
                                      fontSize={12}
                                      variant="outline"
                                      borderColor="transparent"
                                      onClick={() =>
                                        delEmailFromList(item?.email)
                                      }
                                      sx={{
                                        _focus: {
                                          boxShadow: "none", // Removes the focus box shadow
                                        },
                                      }}
                                    >
                                      <svg
                                        width="14"
                                        height="16"
                                        viewBox="0 0 14 16"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          d="M4.5 5.99921C4.63261 5.99921 4.75979 6.05189 4.85355 6.14565C4.94732 6.23942 5 6.3666 5 6.49921V12.4992C5 12.6318 4.94732 12.759 4.85355 12.8528C4.75979 12.9465 4.63261 12.9992 4.5 12.9992C4.36739 12.9992 4.24021 12.9465 4.14645 12.8528C4.05268 12.759 4 12.6318 4 12.4992V6.49921C4 6.3666 4.05268 6.23942 4.14645 6.14565C4.24021 6.05189 4.36739 5.99921 4.5 5.99921ZM7 5.99921C7.13261 5.99921 7.25979 6.05189 7.35355 6.14565C7.44732 6.23942 7.5 6.3666 7.5 6.49921V12.4992C7.5 12.6318 7.44732 12.759 7.35355 12.8528C7.25979 12.9465 7.13261 12.99921 7 12.99921C6.86739 12.99921 6.74021 12.9465 6.64645 12.8528C6.55268 12.759 6.5 12.6318 6.5 12.4992V6.49921C6.5 6.3666 6.55268 6.23942 6.64645 6.14565C6.74021 6.05189 6.86739 5.99921 7 5.99921ZM10 6.49921C10 6.3666 9.94732 6.23942 9.85355 6.14565C9.75979 6.05189 9.63261 5.99921 9.5 5.99921C9.36739 5.99921 9.24021 6.05189 9.14645 6.14565C9.05268 6.23942 9 6.3666 9 6.49921V12.4992C9 12.6318 9.05268 12.759 9.14645 12.8528C9.24021 12.9465 9.36739 12.99921 9.5 12.99921C9.63261 12.99921 9.75979 12.9465 9.85355 12.8528C9.94732 12.759 10 12.6318 10 12.4992V6.49921Z"
                                          fill="#DC3545"
                                        />
                                        <path
                                          fillRule="evenodd"
                                          clipRule="evenodd"
                                          d="M13.5 3.49921C13.5 3.76442 13.3946 4.01878 13.2071 4.20631C13.0196 4.39385 12.7652 4.49921 12.5 4.49921H12V13.4992C12 14.0296 11.7893 14.5383 11.4142 14.9134C11.0391 15.2885 10.5304 15.4992 10 15.4992H4C3.46957 15.4992 2.96086 15.2885 2.58579 14.9134C2.21071 14.5383 2 14.0296 2 13.4992V4.49921H1.5C1.23478 4.49921 0.98043 4.39385 0.792893 4.20631C0.605357 4.01878 0.5 3.76442 0.5 3.49921V2.49921C0.5 2.23399 0.605357 1.97964 0.792893 1.7921C0.98043 1.60456 1.23478 1.49921 1.5 1.49921H5C5 1.23399 5.10536 0.979636 5.29289 0.7921C5.48043 0.604563 5.73478 0.499207 6 0.499207H8C8.26522 0.499207 8.51957 0.604563 8.70711 0.7921C8.89464 0.979636 9 1.23399 9 1.49921H12.5C12.7652 1.49921 13.0196 1.60456 13.2071 1.7921C13.3946 1.97964 13.5 2.23399 13.5 2.49921V3.49921ZM3.118 4.49921L3 4.55821V13.4992C3 13.7644 3.10536 14.0188 3.29289 14.2063C3.48043 14.3938 3.73478 14.4992 4 14.4992H10C10.2652 14.4992 10.5196 14.3938 10.7071 14.2063C10.8946 14.0188 11 13.7644 11 13.4992V4.55821L10.882 4.49921H3.118ZM1.5 3.49921V2.49921H12.5V3.49921H1.5Z"
                                          fill="#DC3545"
                                        />
                                      </svg>
                                    </Button>
                                  </Td>
                                </Tr>
                              ))
                            ) : (
                              <Tr>
                                <Td colSpan={4} textAlign="center">No data available</Td>
                              </Tr>
                            )}
                            {campaignEmailList.length > 0 && campaignEmailList.length === 0 && (
                              campaignEmailList.map((item: any, index: number) => (
                                <Tr key={item?._id}>
                                  <Td> {index + 1}</Td>
                                  <Td>{item?.email}</Td>
                                  <Td>
                                    {item?.isVerified === true ? (
                                      <Text as="span" borderRadius={'50px'} padding={"2px 10px"} fontSize={"13px"} color="#198754" bg="#1987541A">Verified</Text>
                                    ) : (
                                      <Text as="span" borderRadius={'50px'} padding={"2px 10px"} fontSize={"13px"} color="#991B1B" bg="#FEE2E2">Unverified</Text>
                                    )}

                                  </Td>
                                  <Td>
                                    <Button
                                      size="sm"
                                      fontSize={12}
                                      variant="outline"
                                      borderColor="transparent"
                                      onClick={() => {
                                        delEmailFromList(item?.email)
                                      }}
                                      mr={2}

                                      sx={{
                                        _focus: {
                                          boxShadow: 'none',  // Removes the focus box shadow
                                        }
                                      }}
                                    >
                                      <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M4.5 5.99921C4.63261 5.99921 4.75979 6.05189 4.85355 6.14565C4.94732 6.23942 5 6.3666 5 6.49921V12.4992C5 12.6318 4.94732 12.759 4.85355 12.8528C4.75979 12.9465 4.63261 12.9992 4.5 12.9992C4.36739 12.9992 4.24021 12.9465 4.14645 12.8528C4.05268 12.759 4 12.6318 4 12.4992V6.49921C4 6.3666 4.05268 6.23942 4.14645 6.14565C4.24021 6.05189 4.36739 5.99921 4.5 5.99921ZM7 5.99921C7.13261 5.99921 7.25979 6.05189 7.35355 6.14565C7.44732 6.23942 7.5 6.3666 7.5 6.49921V12.4992C7.5 12.6318 7.44732 12.759 7.35355 12.8528C7.25979 12.9465 7.13261 12.9992 7 12.9992C6.86739 12.9992 6.74021 12.9465 6.64645 12.8528C6.55268 12.759 6.5 12.6318 6.5 12.4992V6.49921C6.5 6.3666 6.55268 6.23942 6.64645 6.14565C6.74021 6.05189 6.86739 5.99921 7 5.99921ZM10 6.49921C10 6.3666 9.94732 6.23942 9.85355 6.14565C9.75979 6.05189 9.63261 5.99921 9.5 5.99921C9.36739 5.99921 9.24021 6.05189 9.14645 6.14565C9.05268 6.23942 9 6.3666 9 6.49921V12.4992C9 12.6318 9.05268 12.759 9.14645 12.8528C9.24021 12.9465 9.36739 12.9992 9.5 12.9992C9.63261 12.9992 9.75979 12.9465 9.85355 12.8528C9.94732 12.759 10 12.6318 10 12.4992V6.49921Z" fill="#DC3545" />
                                        <path fillRule="evenodd" clipRule="evenodd" d="M13.5 3.49921C13.5 3.76442 13.3946 4.01878 13.2071 4.20631C13.0196 4.39385 12.7652 4.49921 12.5 4.49921H12V13.4992C12 14.0296 11.7893 14.5383 11.4142 14.9134C11.0391 15.2885 10.5304 15.4992 10 15.4992H4C3.46957 15.4992 2.96086 15.2885 2.58579 14.9134C2.21071 14.5383 2 14.0296 2 13.4992V4.49921H1.5C1.23478 4.49921 0.98043 4.39385 0.792893 4.20631C0.605357 4.01878 0.5 3.76442 0.5 3.49921V2.49921C0.5 2.23399 0.605357 1.97964 0.792893 1.7921C0.98043 1.60456 1.23478 1.49921 1.5 1.49921H5C5 1.23399 5.10536 0.979636 5.29289 0.7921C5.48043 0.604563 5.73478 0.499207 6 0.499207H8C8.26522 0.499207 8.51957 0.604563 8.70711 0.7921C8.89464 0.979636 9 1.23399 9 1.49921H12.5C12.7652 1.49921 13.0196 1.60456 13.2071 1.7921C13.3946 1.97964 13.5 2.23399 13.5 2.49921V3.49921ZM3.118 4.49921L3 4.55821V13.4992C3 13.7644 3.10536 14.0188 3.29289 14.2063C3.48043 14.3938 3.73478 14.4992 4 14.4992H10C10.2652 14.4992 10.5196 14.3938 10.7071 14.2063C10.8946 14.0188 11 13.7644 11 13.4992V4.55821L10.882 4.49921H3.118ZM1.5 3.49921V2.49921H12.5V3.49921H1.5Z" fill="#DC3545" />
                                      </svg>
                                    </Button>
                                  </Td>
                                </Tr>
                              ))
                            )
                            }
                          </Tbody>
                        </Table>
                      </TableContainer>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        {
                          subTab == "add-more-lead" ? "" :
                            <Button
                              onClick={() => {
                                history.goBack();
                                handleHeaderSteps("back");
                              }}
                            >
                              Back
                            </Button>}
                        <Box display="flex" justifyContent="flex-end" gap="15px" mt="24px">
                          <Box display="flex" justifyContent="flex-end">
                            <Button colorScheme="gray"
                              onClick={handleSelectAll}
                              sx={{
                                _focus: {
                                  boxShadow: 'none',  // Removes the focus box shadow
                                }
                              }}
                            >
                              <Text as="span" ms="4px" fontSize="16px" fontWeight="400">{selectAll ? 'Deselect All' : 'Select All'}</Text>
                            </Button>
                          </Box>
                          <Box display="flex" justifyContent="flex-end">
                            <Button colorScheme="gray"
                              onClick={handleDeleteSelected}
                              disabled={selectedEmails.length === 0}
                              sx={{
                                _focus: {
                                  boxShadow: 'none',  // Removes the focus box shadow
                                }
                              }}
                            >
                              <Text as="span" ms="4px" fontSize="16px" fontWeight="400">Delete Selected</Text>
                            </Button>
                          </Box>
                          <Box display="flex" justifyContent="flex-end">
                            <Button colorScheme="blue"
                              onClick={previouscampaignsBtn}
                              disabled={isSubmitting}
                              sx={{
                                _focus: {
                                  boxShadow: 'none',  // Removes the focus box shadow
                                }
                              }}
                            >
                              <Text as="span" ms="4px" fontSize="16px" fontWeight="400">Proceed</Text>
                            </Button>
                          </Box>
                        </Box>
                      </Box>
                    </>)}
                  </Box>
                </Box>
              </TabPanel>

              <TabPanel border="1px solid #DEE2E6" bg="#fff" pt="16px">

                <Checkbox
                  onChange={(e) => handleIncludesLeads("csv", e.target.checked)}
                  size="md"
                  isChecked={sourceArray.includes("csv")}
                >
                  Includes Leads
                </Checkbox>

                <Box pt="16px">
                  <Box textAlign="start"
                    display="flex"
                    flexDirection="column"
                    justifyContent="start"
                    alignItems="start">
                    <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" pb="8px">Upload Leads</Text>
                    <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D" pb="24px">Upload your email list in a CSV file format to start your campaign. Simply drag and drop or select your file—CSV is the only supported format. </Text>
                    {/* <Divider orientation='horizontal' color="#E2E8F0" mb="24px" /> */}
                  </Box>
                  <Box textAlign="center"
                    display="flex"
                    flexDirection="column"
                    justifyContent="center"
                    alignItems="center"
                    position="relative"
                    onDragEnter={handleDrag}>
                    <Image src={ExcelLogo} alt='deleteicon' />
                    <Input
                      type="file"
                      ref={fileInputRef}
                      display="none" // Hide the file input
                      onChange={handleFileChange}
                      accept=".csv" // Only allow CSV files
                    />
                    {!uploadingFile ? (
                      <Box
                        w="100%"
                        h="100%"
                        py={4}
                        borderRadius="md"
                        border={dragActive ? "2px dashed #2977FF" : "2px dashed #E2E8F0"}
                        bg={dragActive ? "rgba(124, 47, 241, 0.05)" : "transparent"}
                        transition="all 0.2s"
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}>
                        <Button
                          colorScheme="blue"
                          onClick={handleExcelButton}
                          mb="12px"
                          mt="12px"
                          _focus={{
                            boxShadow: 'none'
                          }}
                        >
                          <Text as="span" ms="4px" fontSize="16px" fontWeight="400">
                            Upload file
                          </Text>
                        </Button>

                        <Text
                          as="p"
                          fontSize="12px"
                          fontWeight="400"
                          color="#6C757D"
                          pb="24px"
                        >
                          or drag and drop it here
                        </Text>

                        <Text
                          as="p"
                          fontSize="12px"
                          fontWeight="400"
                          color="#6C757D"
                          pb="24px"
                        >
                          Download a{' '}
                          <Text
                            as="a"
                            href={CsvFile}
                            download="sample.csv"
                            color="#2977FF"
                            _hover={{
                              color: "#2977FF"
                            }}
                          >
                            sample CSV
                          </Text>
                        </Text>
                      </Box>
                    ) : (<>
                      <Box w="full" maxW="md" mx="auto" p={4}>
                        <Box
                          w="200px"
                          margin="auto"
                          h="4"
                          overflow="hidden"
                          bg="repeating-linear-gradient(45deg, rgb(168, 85, 247) 0px, rgb(168, 85, 247) 9px, #efefef 2px, #efefef 15px) 0% 0% / 42.57px 30.87px"
                          bgSize="20.57px 19.57px"
                          animation={animation}
                        />
                      </Box>
                      <Box><Text textAlign="center" color="gray" fontSize={"14px"} mb="10px">Uploading file...</Text></Box>
                    </>
                    )}

                  </Box>

                  {
                    fileData?.allEmails?.length > 0 && (
                      <Flex justifyContent={"space-between"} alignItems={"center"}>
                        <Box
                          border="1px solid #D6BFFB"
                          bg="#e3f3ff"
                          my="15px"
                          p={"4px 8px"}
                          w="fit-content"
                          color={"#6C757D"}
                          borderRadius="md"
                        >
                          <Flex wrap="wrap" gap={4} align="center">
                            <Text fontWeight={"400"} fontSize={"14px"}>
                              Valid Email: <Text as="span" color="green.500" fontWeight="semibold">
                                ({fileData?.validEmailsCount || "0"})
                              </Text>
                            </Text>
                            <Text fontWeight={"400"} fontSize={"14px"}>
                              Invalid Email: <Text as="span" color="red.500" fontWeight="semibold">
                                ({fileData?.invalidEmailsCount || "0"})
                              </Text>
                            </Text>
                            <Text fontWeight={"400"} fontSize={"14px"}>
                              Duplicate Email: <Text as="span" color="red.500" fontWeight="semibold">
                                ({fileData?.duplicateEmails?.length || "0"})
                              </Text>
                            </Text>
                          </Flex>

                        </Box>
                        <Text
                          sx={{
                            cursor: "pointer",
                            fontSize: "13px",
                            color: "#2977FF",
                            transition: "all .2s ease-in-out",
                            ":hover": { textDecoration: "underline", color: "#2977FF" }
                          }}
                          onClick={() => { setFilePreview({ isOpen: true, data: fileData }) }}
                        >
                          Preview File Table
                        </Text>

                      </Flex>
                    )
                  }

                </Box>



              </TabPanel>
              <TabPanel border="1px solid #DEE2E6" bg="#fff" pt="16px">

                <Checkbox
                  onChange={(e) => handleIncludesLeads("gmb", e.target.checked)}
                  size="md"
                  isChecked={sourceArray.includes("gmb")}
                >
                  Includes Leads
                </Checkbox>
                <Box pt="16px">

                </Box>


              </TabPanel>
              <TabPanel border="1px solid #DEE2E6" bg="#fff" pt="16px">

                <Checkbox
                  onChange={(e) => handleIncludesLeads("facebook", e.target.checked)}
                  size="md"
                  isChecked={sourceArray.includes("facebook")}
                >
                  Includes Leads
                </Checkbox>



              </TabPanel>
              <TabPanel border="1px solid #DEE2E6" bg="#fff" pt="16px">

                <Checkbox
                  onChange={(e) => handleIncludesLeads("linkedin", e.target.checked)}
                  size="md"
                  isChecked={sourceArray.includes("linkedin")}
                >
                  Includes Leads
                </Checkbox>
                <Box pt="16px">
                </Box>


              </TabPanel>



            </TabPanels>
          </Tabs>

          <Box display="flex" justifyContent="space-between" alignItems="center" pt="12px">

            {
              subTab == "add-more-lead" && parsedEmails.length > 0 ?
                <>
                  <Button onClick={() => {
                    history.goBack()
                    // handleHeaderSteps("back");
                  }}>OK</Button>
                  <Button
                    colorScheme="blue"
                    onClick={() => {
                      validateMergedLeads(allmergedLeads, "true")
                      // handleHeaderSteps("back");
                    }}
                  >
                    Preview Data
                  </Button>
                </>
                :
                <>
                  <Flex align={"center"} gap="20px">
                    <Button
                      onClick={() => {
                        history.goBack()
                        handleHeaderSteps("back");
                      }}
                    >
                      Back
                    </Button>
                    <Button
                      colorScheme="blue"
                      onClick={() => {
                        validateMergedLeads(allmergedLeads, "true")
                        // handleHeaderSteps("back");
                      }}
                    >
                      Preview Data
                    </Button>

                  </Flex>
                  {
                    // parsedEmails.length > 0
                    subTab !== "add-more-lead" && (<Box textAlign="right">
                      <Button role="button" colorScheme="blue"
                        disabled={!(parsedEmails.length > 0)}
                        onClick={() => {
                          history.push(`/app/email-campaigns/create?subTab=set-up-review&id=${data?.campaignId}`);
                          // handleHeaderSteps("next");
                        }}
                      >Review</Button>
                    </Box>)}

                </>
            }
          </Box>

        </Box>

      </Box>

      <SuccessfullyModal isOpens={isOpen} onCloseCancel={onCloseCanceled} />
      <CancelThisCampaign sendData={handleChildData}
        isCancelThisCampaign={isCancelThisCampaign} onCancelThisCampaign={onCancelThisCampaign}
      />
      <Modal isOpen={isOpens} closeOnOverlayClick={false} size={'xl'} onClose={onCloseOpens} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <Text textAlign="center">Add Another Email</Text>
            <Text textAlign="center" fontWeight="400" fontSize="14px"
            >Use this option to include additional email addresses for your campaign. Simply enter one or more email IDs, and we’ll add them to your target lead list.</Text>
            <hr style={{ marginTop: "20px" }} />
          </ModalHeader>
          <ModalBody>
            <form>
              <Input
                type="email"
                placeholder="Enter another email"
                name="email"
                value={email}
                onChange={handleInputChange}
                // required
                mb="20px"
              />
              <Box textAlign="right">
                <Button colorScheme="blue" mr={3} fontWeight={400} onClick={(e) => {
                  e.preventDefault(); // Prevent form submission
                  handleAddEmail();
                }}>
                  <IoIosAdd size="25px" />
                  Add
                </Button>
                <Button onClick={onCloseOpens}>Cancel</Button>
              </Box>
            </form>
          </ModalBody>
        </ModalContent>
      </Modal>

      <EmailDataPreviewModal modalData={filePreview} onClose={() => { setFilePreview({ isOpen: false, data: {} }) }} />

    </>
  )
}



