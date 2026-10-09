import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Box,
  Divider,
  FormControl,
  Image,
  Input,
  useToast,
  ModalCloseButton,
  keyframes,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Flex,
  InputGroup,
  InputLeftElement,
} from "@chakra-ui/react";
import ExcelLogo from "./images/excelLogo.svg"
import { useForm } from "react-hook-form";
import { CancelThisCampaign } from "./CancelThisCampaign";
import { CampaignTrigger } from "./CampaignTrigger";
import { GMBSearchForCreateCampaign } from "./GMBSearchForCreateCampaign";
import CsvFile from "./csv_data_sample.csv";
import { csvParseAndSaveData, duplicateLead, getAllLeadsWithCount, deleteUnverifiedEmail, getAllCSVUploadedData } from "../../../services/emailCampaigns";
import { useHistory, useLocation, Link } from 'react-router-dom';
import { IoIosSearch, IoIosAdd } from "react-icons/io";
import FacebookLeads from "../FacebookLeads";

interface EmailItem {
  email: string;
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

export const AddTargetAudience = ({ isOpenTargetAudience, onCloseTargetAudience, setIsOpenTargetAudience, campaignId, campaignNames, fetchData, currentPage, itemsPerPages }: any) => {
  const [isSubmittings, setIsSubmittings] = React.useState<boolean>(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isOpens, setIsOpens] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [isCancelThisCampaign, setIsCancelThisCampaign] = useState(false);
  const [selectedCatOptions, setSelectedCatOptions] = useState<any>([]);
  const [currentStep, setCurrentStep] = React.useState<Steps>(
    "previous campaigns"
  );
  const [showQuery, setShowQuery] = useState<boolean>(false);
  const [count, setCount] = useState<number>(0);
  const [isOpenCampaignTrigger, setIsOpenCampaignTrigger] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [parsedEmails, setParsedEmails] = useState<any>([]);
  const [campaignEmailList, setCampaignEmailList] = useState<EmailItem[]>([]);
  const [email, setEmail] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchEMailQuery, setSearchEmailQuery] = useState<string>("");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [leadsForFacebook, setLeadsForFacebook] = useState<any>([]);
  // const [targetAudience, setTargetAudience] = useState<any>('false');

  const history = useHistory();
  const mountedRef = useRef(false);
  const toast = useToast();
  const animation = `${moveStripes} 1s linear infinite`;

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


  const onCloseCampaignTrigger = () => {
    setIsOpenCampaignTrigger(false)
  }

  const onCloseOpens = () => {
    setIsOpens(false);
    setEmail("");
  }

  const handleTabChanges = (index: number) => {
    const steps = [
      'previous campaigns',
      'Upload Leads',
      'Scrape New Leads',
      'Facebook Leads'
    ];
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
        formData.append("campaignId", campaignId);
        formData.append("campaignName", campaignNames);
        const response: any = await csvParseAndSaveData(formData)
        // console.log(response.data, "parses emails");
        setParsedEmails(response?.data?.data?.parsedEmails);
        toast({
          title: `${response?.data?.message}`,
          status: "success",
          isClosable: true,
        });

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
      formData.append("campaignId", campaignId);
      formData.append("campaignName", campaignNames);
      const response: any = await csvParseAndSaveData(formData);
      setParsedEmails(response?.data?.data?.parsedEmails);

      if (response?.data?.statusCode === 200) {
        toast({
          title: `${response?.data?.message}`,
          status: "success",
          isClosable: true,
        });
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
  }, [campaignNames, campaignId, setParsedEmails, toast]);


  async function delCampaignEmail(emailid: string, campaignId: string) {
    try {
      const response = await deleteUnverifiedEmail({ email: emailid, campaignId: campaignId });
      // setSearchQuery("");

      // getAllUploadedData(campaignId);
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

  // Handle individual checkbox change
  const handleCheckboxChange = (email: string) => {
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

  const {
    setError,
    clearErrors,
    formState: { errors },
  } = useForm();


  const onCancelThisCampaign = () => {
    setIsCancelThisCampaign(false);
  }

  const handleChildData = () => {
    onCloseTargetAudience();
  };
  const [previousCampaigns, setPreviousCampaigns] = useState([]);

  const onSelectCatOptions = (selectedCatList: any) => {
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
      setError('categories', { type: 'manual', message: 'Previous campaigns are required' });
      setCount(0);
    }
  };



  React.useEffect(() => {
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
    if (isOpenTargetAudience) {
      fetchData();
    }
  }, [isOpenTargetAudience]);

  const dataForCloseModal = () => {
    onCloseTargetAudience();
  }

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
      currentCampaignId: campaignId,
      previousCampaign: formData.categories.slice(0).map((campaign: any) => ({
        campaignId: campaign.campaignId,
        campaignName: campaign.campaignName
      })),
      oldCampaignAudiences,
      newCampaignAudiences,
    };
    try {
      setIsSubmitting(true);
      const response = await duplicateLead(formattedData);
      if (response?.data?.statusCode === 200) {
        setSelectedCatOptions([]);
        toast({
          title: `${response?.data?.message}`,
          status: "success",
          isClosable: true,
        })
        onCloseTargetAudience()
        history.push(`/app/email-campaigns?campaignId=${campaignId}&campaignName=${campaignNames}&targetAudience=${true}`);
        setIsOpenCampaignTrigger(true);
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

  const getAllUploadedData = async (id: string) => {
    try {
      const response: any = await getAllCSVUploadedData(id);
      const allData = response?.data?.data;
      setParsedEmails(allData); // Updated here

    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      });
    }
  }

  useEffect(() => {
    if (campaignId !== null) {
      getAllUploadedData(campaignId);
    }
  }, [campaignId]);

  useEffect(() => {
    if (selectedCatOptions.length === 0) {
      return undefined
    } else {
      const totalCountCamp = selectedCatOptions.reduce((total: number, campaign: any) => total + campaign.count, 0);
      setCount(totalCountCamp); // This will only run when selectedCatOptions changes
    }
  }, [selectedCatOptions]);

  const location = useLocation();

  useEffect(() => {
    // Set mounted to true when component mounts
    mountedRef.current = true;

    const init = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const targetAudience = searchParams.get('targetAudience');
        const review = searchParams.get('review');
        if (targetAudience === 'true') {
          // Only proceed if still mounted
          if (mountedRef.current) {
            await onCloseTargetAudience();
            // Check again before setting state
            if (mountedRef.current && review === null) {
              setIsOpenCampaignTrigger(true);
            }
          }
        }
      } catch (error) {
        // console.error('Error:', error);
      }
    };

    init();

    // Cleanup function that runs when component unmounts
    return () => {
      mountedRef.current = false;
    };
  }, [onCloseTargetAudience]);


  return (
    <>
      <Modal isOpen={isOpenTargetAudience} closeOnOverlayClick={false} size="xl" onClose={onCloseTargetAudience} scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent bg="#F7FAFC">
          <ModalCloseButton _focus={{ outline: "none" }} as={Link} to="/app/email-campaigns" />
          <ModalHeader textAlign="center" fontSize="18px" fontWeight="700" color="#1A202C" pb="8px">Target Audience</ModalHeader>
          <Text as="span" textAlign="center" fontSize="14px" fontWeight="400" color="#6C757D" pb="24px">Please add more target audience for this campaign</Text>
          <ModalBody>
            <Tabs variant="enclosed" w="100%" colorScheme='gray' size="md"
              onChange={handleTabChanges}
              index={
                ['previous campaigns', 'Upload Leads', 'Scrape New Leads', 'Facebook Leads'].indexOf(currentStep)
              }
            >
              <TabList >
                <Tab
                  id="tab-0"
                  isDisabled={isSubmittings}
                  // _focus={{ outline: "none" }}
                  _disabled={{ cursor: "not-allowed", opacity: "0.4" }}
                  style={{
                    backgroundColor: currentStep === "previous campaigns" ? '#fff' : '',
                    color: currentStep === "previous campaigns" ? '#495057' : '#2977FF',
                    fontSize: '16px',
                  }}
                  onClick={() => setCurrentStep("previous campaigns")}
                >
                  Duplicate Leads from<br />previous campaigns
                </Tab>
                <Tab
                  id="tab-1"
                  isDisabled={isSubmittings}
                  // _focus={{ outline: "none" }}
                  _disabled={{ cursor: "not-allowed", opacity: "0.4" }}
                  style={{
                    backgroundColor: currentStep === "Upload Leads" ? '#fff' : '',
                    color: currentStep === "Upload Leads" ? '#495057' : '#2977FF',
                    fontSize: '16px',
                  }}
                  onClick={() => setCurrentStep("Upload Leads")}
                >
                  Upload Leads
                </Tab>
                <Tab
                  id="tab-8"
                  isDisabled={isSubmittings}
                  // _focus={{ outline: "none" }}
                  _disabled={{ cursor: "not-allowed", opacity: "0.4" }}
                  style={{
                    backgroundColor: currentStep === "Scrape New Leads" ? '#fff' : '',
                    color: currentStep === "Scrape New Leads" ? '#495057' : '#2977FF',
                    fontSize: '16px',
                  }}
                  onClick={() => setCurrentStep("Scrape New Leads")}
                >
                  Scrape New Leads
                </Tab>
                <Tab
                  id="tab-2"
                  isDisabled={isSubmittings}
                  // _focus={{ outline: "none" }}
                  _disabled={{ cursor: "not-allowed", opacity: "0.4" }}
                  style={{
                    backgroundColor: currentStep === "Facebook Leads" ? '#fff' : '',
                    color: currentStep === "Facebook Leads" ? '#495057' : '#2977FF',
                    fontSize: '16px',
                  }}
                  onClick={() => setCurrentStep("Facebook Leads")}
                >
                  Facebook Leads
                </Tab>
              </TabList>
              <TabPanels>
                <TabPanel border="1px solid #DEE2E6" bg="#fff">
                  <Box textAlign="center"
                    display="flex"
                    flexDirection="column"
                    justifyContent="center"
                    alignItems="center">
                    <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" pb="8px">Select your previous campaigns</Text>
                    <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D" pb="24px">You can choose from your existing campaigns to maintain consistency and save time. </Text>
                    <Divider orientation='horizontal' color="#E2E8F0" mb="24px" />
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
                      <Box display="flex" justifyContent="space-between" gap="10px">
                        <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" pb="8px" >Total lead result: {campaignEmailList.length}</Text>
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
                          <Button colorScheme="blue" mr={3} variant="outline" fontWeight="400" onClick={() => setIsOpens(true)}>
                            <IoIosAdd size="25px" />
                            Emails
                          </Button>
                        </Box>
                      </Box>

                      <TableContainer overflow="auto" w="100%" maxHeight="260px" overflowY="auto" borderRadius="8px" border="1px solid #E2E8F0">
                        <Table variant="simple" verticalAlign="middle" className="email-table">
                          <Tbody>
                            {filteredCampaignEmails.length > 0 ? (
                              filteredCampaignEmails.map((data: any, index: number) => (
                                <Tr key={data?._id}>
                                  <Td width="40px">
                                    <Checkbox
                                      isChecked={selectedEmails.includes(data.email)}
                                      onChange={() => handleCheckboxChange(data.email)}
                                      width={"100%"}
                                      mt="2px"
                                      size="lg"
                                    ></Checkbox>
                                  </Td>
                                  <Td fontSize="14px">{data?.email}</Td>
                                  <Td textAlign="right">
                                    <Button
                                      size="sm"
                                      fontSize={12}
                                      variant="outline"
                                      borderColor="transparent"
                                      onClick={() =>
                                        delEmailFromList(data?.email)
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
                              campaignEmailList.map((data: any, index: number) => (
                                <Tr key={data?._id}>
                                  <Td> {index + 1}</Td>
                                  <Td>{data?.email}</Td>
                                  <Td>
                                    {data?.isVerified === true ? (
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
                                        delEmailFromList(data?.email)
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
                      <Box display="flex" justifyContent="flex-end" gap="15px" mt="24px">
                        <Box display="flex" justifyContent="flex-end">
                          <Button colorScheme="gray"
                            onClick={handleSelectAll}
                            // onClick={previouscampaignsBtn}
                            // disabled={isSubmitting}
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
                    </>)}
                  </Box>
                </TabPanel>
                <TabPanel border="1px solid #DEE2E6" bg="#fff">
                  <Box textAlign="center">
                    <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" pb="8px">Upload Leads</Text>
                    <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D" pb="24px">The uploaded CSV must follow the format of the sample file.
                    </Text>
                  </Box>
                  <Box textAlign="center"
                    display="flex"
                    flexDirection="column"
                    justifyContent="center"
                    alignItems="center"
                    position="relative"
                    onDragEnter={handleDrag}>

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
                        <Image src={ExcelLogo} alt='excel logo' />
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
                          fontSize="14px"
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
                    </>)}
                  </Box>

                  {parsedEmails.length > 0 && (<>
                    <Box textAlign="right" mt={4} mb={4}>
                      <Flex justifyContent="center">
                        <InputGroup
                          width="400px"
                          // border="1px solid #6C757D"
                          borderRadius="4px"
                          borderColor="#6C757D"
                        >
                          <InputLeftElement pointerEvents='none'>
                            <IoIosSearch color="#6C757D" />
                          </InputLeftElement>
                          <Input
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          // maxW="300px"
                          />
                        </InputGroup>
                      </Flex>

                    </Box>

                    <TableContainer overflow="auto" w="100%" borderRadius="8px" boxShadow="0px 4px 8px rgba(0, 0, 0, 0.05)">
                      <Table variant="simple" >
                        <Thead>
                          <Tr >
                            <Th>#</Th>
                            <Th>Email ID</Th>
                            <Th>Email Status</Th>
                            <Th>Action</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {filteredEmails.length > 0 ? (
                            filteredEmails.map((data: any, index: number) => (
                              <Tr key={data?._id}>
                                <Td>{index + 1}</Td>
                                <Td>{data?.email}</Td>
                                <Td>
                                  {data?.isVerified ? (
                                    <Text
                                      as="span"
                                      borderRadius={"50px"}
                                      padding={"2px 10px"}
                                      fontSize={"13px"}
                                      color="#198754"
                                      bg="#1987541A"
                                    >
                                      Verified
                                    </Text>
                                  ) : (
                                    <Text
                                      as="span"
                                      borderRadius={"50px"}
                                      padding={"2px 10px"}
                                      fontSize={"13px"}
                                      color="#991B1B"
                                      bg="#FEE2E2"
                                    >
                                      Unverified
                                    </Text>
                                  )}
                                </Td>
                                <Td>
                                  <Button
                                    size="sm"
                                    fontSize={12}
                                    variant="outline"
                                    borderColor="transparent"
                                    onClick={() =>
                                      delCampaignEmail(data?.email, data?.campaignId)
                                    }
                                    mr={2}
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
                          {parsedEmails.length > 0 && parsedEmails.length === 0 && (
                            parsedEmails.map((data: any, index: number) => (
                              <Tr key={data?._id}>
                                <Td> {index + 1}</Td>
                                <Td>{data?.email}</Td>
                                <Td>
                                  {data?.isVerified === true ? (
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
                                      delCampaignEmail(data?.email, data?.campaignId);
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
                  </>)}
                  {parsedEmails.length > 0 && (<Box textAlign="right">
                    <Button role="button" colorScheme="blue" mt="12px" onClick={() => {
                      onCloseTargetAudience();
                      history.push(`/app/email-campaigns?campaignId=${campaignId}&campaignName=${campaignNames}&targetAudience=${true}`);
                      setIsOpenCampaignTrigger(true);
                    }}>Proceed</Button>
                  </Box>)}
                </TabPanel>
                <TabPanel border="1px solid #DEE2E6" bg="#fff">
                  <GMBSearchForCreateCampaign dataForClose={dataForCloseModal} campaignId={campaignId} campaignName={campaignNames} />

                </TabPanel>
                <TabPanel border="1px solid #DEE2E6" bg="#fff">
                  <FacebookLeads dataForClose={dataForCloseModal} campaignId={campaignId} campaignName={campaignNames} setIsOpenCampaignTrigger={setIsOpenCampaignTrigger} delCampaignEmail={delCampaignEmail} leadsForFacebook={leadsForFacebook} />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
      <CampaignTrigger isOpenCampaignTrigger={isOpenCampaignTrigger} onCloseCampaignTrigger={onCloseCampaignTrigger} campaignId={campaignId} setIsOpenTargetAudience={setIsOpenTargetAudience} campaignName={campaignNames} fetchData={fetchData} currentPage={currentPage} itemsPerPages={itemsPerPages} />
      <CancelThisCampaign isCancelThisCampaign={isCancelThisCampaign} onCancelThisCampaign={onCancelThisCampaign} sendData={handleChildData}
      />
      <Modal isOpen={isOpens} closeOnOverlayClick={false} size={'xl'} onClose={onCloseOpens} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <Text textAlign="center">Add Another Email</Text>
            <Text textAlign="center" fontWeight="400" fontSize="15px">
              Use this option to include additional email addresses for your campaign. Simply enter one or more email IDs, and we’ll add them to your target lead list
              .</Text>
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
    </>
  )
}
