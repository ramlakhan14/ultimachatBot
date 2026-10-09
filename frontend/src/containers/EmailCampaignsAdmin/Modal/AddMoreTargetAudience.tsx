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
  Alert, AlertIcon, AlertDescription
} from "@chakra-ui/react";
import "../EmailCampaignsAdmin.module.scss";
import "./style.css";
import ExcelLogo from "./images/excelLogo.svg"
import { useForm } from "react-hook-form";
import { CancelThisCampaign } from "./CancelThisCampaign";
import { csvParseAndSaveData, duplicateLead, getAllLeadsWithCount, triggerCampaign, deleteUnverifiedEmail, getAllCSVUploadedData } from "../../../services/emailCampaigns";
import CsvFile from "./csv_data_sample.csv";
import { SuccessfullyModal } from "./SuccessfullyModal";
import { GMBSearchForDetailsCampaign } from "./GMBSearchForDetailsCampaign";
import { IoIosSearch, IoIosAdd } from "react-icons/io";
import FacebookLeadsForDetailsCampaign from "../FacebookLeadsForDetailsCampaign";
import { colors } from "../../../utils/constant";
import { useHistory, useLocation } from "react-router-dom";
import EmailDataPreviewModal from "../../VoiceAssistant/Campaign/EmailDataPreviewModal";
import EmailDataPreviewOnFileUpload from "../../VoiceAssistant/Campaign/EmailDataPreviewOnFileUpload";
import LinkedInLeads from "../../VoiceAssistant/Campaign/LinkedInLeads";
import { callApi } from "../../../services/callApi";
import { YellowLeadsForDetailsCampaign } from "./YellowLeadsForDetailsCampaign";
interface EmailItem {
  email: string;
  _id?: string;
  id?: string;
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
  setSourceChecks: React.Dispatch<React.SetStateAction<any>>;
  sourceChecks: any;
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
  type: string
}


type EmailItemUns = {
  email: string;
  id: number;
};


export const AddMoreTargetAudience: React.FC<AddMoreTargetAudienceProps> = ({ handleHeaderSteps, setSourceChecks, sourceChecks }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isOpens, setIsOpens] = useState(false);
  const onClose = () => { }
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [campaignEmailList, setCampaignEmailList] = useState<EmailItem[]>([]);
  const [email, setEmail] = useState<string>("");
  const [searchEMailQuery, setSearchEmailQuery] = useState<string>("");
  const [selectedEmails, setSelectedEmails] = useState<any[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isCancelThisCampaign, setIsCancelThisCampaign] = useState(false);
  const [selectedCatOptions, setSelectedCatOptions] = useState<any>([]);
  const [selectedUnSusCatOptions, setSelectedUnSusCatOptions] = useState<any>([]);
  const [filePreview, setFilePreview] = useState<FilePreviewType>({ isOpen: false, data: {}, type: "all" });
  const [showQuery, setShowQuery] = useState<boolean>(false);
  const [count, setCount] = useState<number>(0);
  // const [data, setData] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const history = useHistory();
  const [currentStep, setCurrentStep] = React.useState('previousCampaigns');
  const [allmergedLeads, setAllMergedLeads] = React.useState<any[]>([]);

  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [parsedEmails, setParsedEmails] = useState<any>([]);
  const [fileData, setfileData] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [mergedVerifieddata, setmergedVerifieddata] = useState<any>({});
  const [leadsForFacebook, setLeadsForFacebook] = useState<any>([]);
  const [mergeLoading, setmergeLoading] = useState<any>(false);
  const [isUnsubscribedModalOpen, setisUnsubscribedModalOpen] = useState<any>({
    isOpen: false,
    forceContinue: false,
    skipDuplicatesFromActiveCampaigns: false,
  });

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
    const steps = ['previousCampaigns', 'uploadLeads', 'scrapeNewLeads', 'facebookLeads', "linkedinLeads", "yellowLeads"];
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
        handleMergeLeads(response?.data?.data?.validEmails, "csvUploadLeads")
        // setParsedEmails(response?.data?.data?.parsedEmails);
        setfileData(response?.data?.data)

        if (response?.data?.statusCode === 200) {

        } else {
          toast({
            title: `${response?.data?.message}`,
            status: "error",
            isClosable: true,
          });
        }

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
      // handleMergeLeads(response?.data?.data?.allEmails, "csvUploadLeads")
      const leadsData = response?.data?.data?.validEmails || response?.data?.data?.allEmails || [];
      handleMergeLeads(leadsData, "csvUploadLeads");

      setfileData(response?.data?.data)
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

  const onCloseOpens = () => {
    setIsOpens(false);
    setEmail("");
  }

  // Update handleDrag to check if upload is disabled
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    // Only process drag events if upload is enabled
    if (sourceChecks?.csvUploadsAudiance) {
      if (e.type === 'dragenter' || e.type === 'dragover') {
        setDragActive(true);
      } else if (e.type === 'dragleave') {
        setDragActive(false);
      }
    }
  }, [sourceChecks?.csvUploadsAudiance]);

  // Update handleDrop to check if upload is disabled
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    // Only process drop if upload is enabled
    if (sourceChecks?.csvUploadsAudiance) {
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
    }
  }, [sourceChecks?.csvUploadsAudiance, processDroppedFile, toast]);

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
      const allEmails = campaignEmailList.map(item => { return { email: item.email } });
      // console.log("allEmails", allEmails);

      setSelectedEmails(allEmails);
    } else {
      setSelectedEmails([]);
    }
    setSelectAll(!selectAll);
  };
  // Delete selected emails
  const handleDeleteSelected = () => {
    // console.log("selectedEmails", selectedEmails, campaignEmailList);
    const selectedEmailValues = selectedEmails.map(
      (item: { email: string }) => item.email
    );
    const updatedList = campaignEmailList.filter(
      (item: EmailItem) => !selectedEmailValues.includes(item.email)
    );
    // console.log("selectedEmails", updatedList);
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
  // useEffect(() => {
  //   if (data?.campaignId !== null || subTab != "add-more-lead") {
  //     getAllUploadedData(data?.campaignId || "");
  //   }
  // }, []);

  useEffect(() => {
    // Only fetch if we have a campaignId
    if (data?.campaignId) {
      getAllUploadedData(data?.campaignId || "");
    }
  }, [data?.campaignId]);

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
  const [unsubscribedEmailList, setUnsubscribedEmailList] = useState<EmailItemUns[]>([]);

  const onSelectCatOptions = (selectedCatList: any) => {
    // console.log(selectedCatList, "selectedCatList");
    const newEmails = selectedCatList
      .flatMap((item: any) => item.data);
    const newUnsubscribedEmails: EmailItem[] = selectedCatList.flatMap(
      (item: any, index: any) => {
        const emails = Array.isArray(item.unsubscriptions) ? item.unsubscriptions : [item.unsubscriptions];
        return emails.map((email: any) => ({ email, id: index }));
      }
    );

    setUnsubscribedEmailList((prev: EmailItemUns[]) => {
      // Use a Set to keep unique emails
      const emailSet = new Set(prev?.map((item) => item.email));

      newUnsubscribedEmails.forEach((emailObj) => {
        if (!emailSet.has(emailObj.email)) {
          emailSet.add(emailObj.email);
        }
      });

      // Convert back to EmailItem[]
      return Array.from(emailSet).map((email, index) => ({
        email,
        id: index,
      }));
    });
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

  const unsubscribedDataOptions = (selectedCatList: any) => {
    // console.log(selectedCatList, "selectedCatList");
    setSelectedUnSusCatOptions(selectedCatList);
  };
  const removeUnsubscribedDataOptions = (selectedCatList: any) => {
    setSelectedUnSusCatOptions(selectedCatList);
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
      setPreviousCampaigns(campaigns); // Updated her

    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      });
    }
  };
  React.useEffect(() => {
    fetchData();
  }, []);

  const dataForCloseModal = () => {
    onClose();
  }

  const onCloseCanceled = () => {
    setIsOpen(false);
  }

  const handleOpenModal = () => {
    setIsOpen(true);
  };

  const onCancelCampaign = () => {
    setIsCancelThisCampaign(true)
    // handleHeaderSteps("reset")
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

  const handleMergeLeads = (data: any, sourceName: string) => {
    setAllMergedLeads((prev: any) => {
      return {
        ...prev,
        [sourceName]: data
      }
    })
  }

  const params = new URLSearchParams(location.search);
  const previewOpened = params.get("preview-tab");

  // console.log("previewOpened", previewOpened)

  const [mergeLoadingbtn, setmergeLoadingbtn] = useState(false)

  const validateMergedLeads = async (payloadData: any, isAction: any, fc: any, sdAC: any) => {
    if (!data?.campaignId) {
      toast({
        title: "Campaign ID is missing",
        description: "Please go back and create the campaign first",
        status: "error",
        isClosable: true,
      });
      return;
    }
    try {
      setmergeLoadingbtn(true)
      setmergeLoading(sdAC ? "yes" : "no")
      // console.log("payloadData to merge", payloadData, sourceArray);
      const targetLeads: any = {
        campaignId: data?.campaignId,
        forceContinue: fc || false,
        skipDuplicatesFromActiveCampaigns: sdAC || false,
        unsubscriptions: selectedUnSusCatOptions
      };
      // Check which sources exist in the sourceArray and add accordingly
      targetLeads.csvUploadLeads = (sourceChecks?.csvUploadsAudiance && payloadData?.csvUploadLeads?.length > 0) ? payloadData.csvUploadLeads : [];
      targetLeads.facebookLeads = (sourceChecks?.facebookAudiance && payloadData?.facebookLeads?.length > 0) ? payloadData.facebookLeads : [];
      targetLeads.linkedinLeads = (sourceChecks?.linkedinAudiance && payloadData?.linkedinLeads?.length > 0) ? payloadData.linkedinLeads : [];
      targetLeads.gmbLeads = (sourceChecks?.gmbAudiance && payloadData?.gmbLeads?.length > 0) ? payloadData.gmbLeads : [];
      const rawYellowLeads = (sourceChecks?.yellowAudiance && (payloadData?.yellowLeads?.length > 0 || payloadData?.yellowpageLeads?.length > 0))
        ? (payloadData?.yellowpageLeads || payloadData?.yellowLeads || [])
        : [];
      targetLeads.yellowpageLeads = rawYellowLeads.map((item: any) => ({
        email: item?.email ?? "",
        websiteUrl: item?.websiteUrl ?? "",
        companyName: item?.companyName ?? item?.businessName ?? "",
        websiteName: item?.websiteName ?? item?.companyName ?? item?.businessName ?? "",
        isEmailInvalid: item?.isEmailInvalid,
        isPhoneInvalid: item?.isPhoneInvalid,
        isWebsiteInvalid: item?.isWebsiteInvalid,
      }));
      targetLeads.previousCampaigns = sourceChecks?.duplicateAudiance ? selectedEmails : [];

      // console.log("mer", allmergedLeads);
      const response = await callApi("campaign/merge-leads", "post", targetLeads)
      // console.log("response", response);
      setmergeLoadingbtn(false)
      if (isAction === "true") {
        toast({
          title: `Leads merged and validated successfully!`,
          status: "success",
          isClosable: true,
        });
        if (subTab == "add-more-lead") {

          history.push(`/app/email-campaigns/create?subTab=add-more-lead&id=${data?.campaignId}&campaignName=${data?.campaignName}&preview-tab=opened`);
        } else {
          history.push(`/app/email-campaigns/create?subTab=target-audience&id=${data?.campaignId}&campaignName=${data?.campaignName}&preview-tab=opened`);

        }
        setFilePreview({
          isOpen: true,
          data: response?.data, type: "all"
        })
      }
      setmergedVerifieddata(response?.data)

      setisUnsubscribedModalOpen((prev: any) => ({
        isOpen: false,
      }))

      setmergeLoading(false)
      // if (response?.data?.validRows)

    } catch (error: any) {
      setmergeLoadingbtn(false)
      setmergeLoading(false)
      // console.log(error);
      // console.log(error?.response, "<<<<<<<<sdfs");
      if (error?.response?.status == 409) {
        setisUnsubscribedModalOpen((prev: any) => ({
          ...prev,
          isOpen: true,
          message: error.response?.data?.message
        }))
      }
      if (error?.response?.status == 400) {
        setisUnsubscribedModalOpen((prev: any) => ({
          ...prev,
          isOpen: false,
          message: error.response?.data?.message
        }))
      }
      toast({
        title: error.response?.data?.message || error?.message,
        status: "warning",
        isClosable: true,
      });

    }
  }


  const handleSourceCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setSourceChecks((prev: any) => ({
      ...prev,
      [name]: checked,
    }));
  };


  // console.log("mergedVerifieddata", mergedVerifieddata);
  const addAudience = async () => {
    try {
      // console.log("mergedVerifieddata", mergedVerifieddata);

      if (mergedVerifieddata?.allEmails?.length == 0) {
        toast({
          title: "Leads can not be empty. Please atlest one !",
          status: "warning",
          isClosable: true,
        });
        return
      }
      const payload = {
        campaignId: data?.campaignId || "",
        leads: mergedVerifieddata?.allEmails || [],

      }
      const response = await callApi("campaign/insertCampaignAudience", "post", payload)
      // console.log(response, "<<<<<<<<<<SADf");
      toast({
        title: response?.message,
        status: "success",
        isClosable: true,
      });
      if (subTab == "add-more-lead") {
        history.goBack()
      } else {
        history.push(`/app/email-campaigns/create?subTab=set-up-review&id=${data?.campaignId}`);
      }

    } catch (error: any) {
      // console.log(error, "<<<<<SADf");
      toast({
        title: error?.response?.data?.message || error?.message,
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
        px="16px"
        py="20px"
      >
        <Text fontSize={'16px'} mb="24px" fontWeight={600}>Select how you want to add leads to your campaign</Text>

        <Box>
          <Tabs
            variant="enclosed"
            w="100%"
            colorScheme="gray"
            size="md"
            position="relative"
            onChange={handleTabChanges}
            index={['previousCampaigns', 'uploadLeads', 'scrapeNewLeads', 'facebookLeads', `linkedinLeads`, `yellowLeads`].indexOf(
              currentStep,
            )}
          >
            <TabList position="relative" w="100%">

              <Tab
                id="tab-previousCampaigns"
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
                <Flex gap="10px" fontSize={'14px'} fontWeight={500}>
                  <Checkbox
                    name="duplicateAudiance"
                    isChecked={sourceChecks.duplicateAudiance}
                    onChange={handleSourceCheck}
                    size="md"
                  ></Checkbox>
                  Duplicate Leads from previous campaigns
                </Flex>
              </Tab>
              <Tab
                id="tab-uploadLeads"
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
                <Flex gap="10px" fontSize={'14px'} fontWeight={500}>
                  <Checkbox
                    name="csvUploadsAudiance"
                    isChecked={sourceChecks.csvUploadsAudiance}
                    onChange={handleSourceCheck}
                    size="md"
                  ></Checkbox>
                  Upload Leads
                </Flex>
              </Tab>
              <Tab
                id="tab-scrapeNewLeads"
                _focus={{ outline: 'none' }}
                _disabled={{ cursor: 'not-allowed', opacity: '0.4' }}
                style={{
                  backgroundColor: currentStep === 'scrapeNewLeads' ? '#fff' : '',
                  color: currentStep === 'scrapeNewLeads' ? '#2977FF' : '#495057',
                }}
                onClick={() => setCurrentStep('scrapeNewLeads')}
              >
                <Flex gap="10px" fontSize={'14px'} fontWeight={500}>
                  <Checkbox
                    name="gmbAudiance"
                    isChecked={sourceChecks.gmbAudiance}
                    onChange={handleSourceCheck}
                    size="md"
                  ></Checkbox>
                  {/* Scrape New Leads */}
                  GMB Leads
                </Flex>
              </Tab>
              <Tab
                id="tab-facebookLeads"
                _focus={{ outline: 'none' }}
                _disabled={{ cursor: 'not-allowed', opacity: '0.4' }}
                style={{
                  backgroundColor: currentStep === 'facebookLeads' ? '#fff' : '',
                  color: currentStep === 'facebookLeads' ? '#2977FF' : '#495057',
                }}
                onClick={() => setCurrentStep('facebookLeads')}
              >
                <Flex gap="10px" fontSize={'14px'} fontWeight={500}>
                  <Checkbox
                    name="facebookAudiance"
                    isChecked={sourceChecks.facebookAudiance}
                    onChange={handleSourceCheck}
                    size="md"
                  ></Checkbox>
                  Facebook Leads
                </Flex>
              </Tab>
              <Tab
                id="tab-linkedinLeads"
                _focus={{ outline: 'none' }}
                _disabled={{ cursor: 'not-allowed', opacity: '0.4' }}
                style={{
                  backgroundColor: currentStep === 'linkedinLeads' ? '#fff' : '',
                  color: currentStep === 'linkedinLeads' ? '#2977FF' : '#495057',
                }}
                onClick={() => setCurrentStep('linkedinLeads')}
              >
                <Flex gap="10px" fontSize={'14px'} fontWeight={500}>
                  <Checkbox
                    name="linkedinAudiance"
                    isChecked={sourceChecks.linkedinAudiance}
                    onChange={handleSourceCheck}
                    size="md"
                  ></Checkbox>
                  Linkedin Leads
                </Flex>
              </Tab>
              <Tab
                id="tab-yellowLeads"
                _focus={{ outline: 'none' }}
                _disabled={{ cursor: 'not-allowed', opacity: '0.4' }}
                style={{
                  backgroundColor: currentStep === 'yellowLeads' ? '#fff' : '',
                  color: currentStep === 'yellowLeads' ? '#2977FF' : '#495057',
                }}
                onClick={() => setCurrentStep('yellowLeads')}
              >
                <Flex gap="10px" fontSize={'14px'} fontWeight={500}>
                  <Checkbox
                    name="yellowAudiance"
                    isChecked={sourceChecks.yellowAudiance}
                    onChange={handleSourceCheck}
                    size="md"
                  ></Checkbox>
                  {/* Scrape New Leads */}
                  Yellow Leads
                </Flex>
              </Tab>
            </TabList>

            <TabPanels >
              <TabPanel border="1px solid #DEE2E6" bg="#fff" px={'20px'} py={'24px'}>
                <Box>
                  <Box textAlign="start"
                    display="flex"
                    flexDirection="column"
                    justifyContent="start"
                    alignItems="center">
                    <Text as="p" fontSize="16px" w={"100%"} fontWeight="600" color="#1A202C" pb="4px">Select your previous campaigns</Text>
                    <Text as="p" fontSize="14px" w={"100%"} lineHeight="150%" fontWeight="400" color="#6C757D" pb="24px">You can choose from your existing campaigns to maintain consistency and save time.</Text>
                  </Box>
                  <Box>
                    <form>

                      <FormControl isRequired isInvalid={!errors.categories} mb="24px">
                        {!showQuery && (
                          <Box>
                            <Multiselect
                              disable={!sourceChecks?.duplicateAudiance}
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


                      <Box
                        bg="gray.50"
                        p="5"
                        borderRadius="md"
                        borderWidth="1px"
                        borderColor="gray.100"
                        my="10px"
                      >
                        <FormControl>
                          <Text fontWeight="semibold" mb={'4px'}>
                            Include contacts from unsubscribed lists (Optional)
                          </Text>
                          <Text fontSize="sm" color="gray.600" mb={'24px'}>
                            Select one or more <Text as="span" fontWeight="bold">'Unsubscribed'</Text> lists.
                            Any matching emails will be included from this campaign.
                          </Text>

                          <Multiselect
                            disable={!sourceChecks?.duplicateAudiance}
                            options={unsubscribedEmailList} // Use updated state
                            onSelect={unsubscribedDataOptions}
                            onRemove={removeUnsubscribedDataOptions}
                            displayValue="email"
                            closeIcon="cancel"
                            placeholder="Choose one or more lists to exclude..."
                            selectedValues={selectedUnSusCatOptions}
                            className="multiSelectContainer"
                          />
                          {/* {errors.categories && (
                            <p style={{ color: 'red', fontSize: '12px' }}>{errors.categories.message}</p>
                          )} */}
                        </FormControl>
                      </Box>
                    </form>
                    {campaignEmailList.length > 0 && (<>
                      <Box display="flex" mt={'24px'} mb="16px" justifyContent="space-between" alignItems={"center"} >
                        <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" >Total lead result: {campaignEmailList.length}</Text>
                        <Flex gap="10px">
                          <Box textAlign="right">
                            <Flex justifyContent="center">
                              <InputGroup
                                outline="none"
                                borderRadius="4px"
                              // borderColor="#6C757D"
                              >
                                <InputLeftElement pointerEvents='none'>
                                  <IoIosSearch color="#6C757D" />
                                </InputLeftElement>
                                <Input
                                  placeholder="Search Email"
                                  value={searchEMailQuery}
                                  // border="1px solid #6C757D"
                                  outline="none"
                                  onChange={(e) => setSearchEmailQuery(e.target.value)}
                                // maxW="300px"
                                />
                              </InputGroup>
                            </Flex>
                          </Box>
                          <Box>
                            <Button colorScheme="blue" fontWeight="500" onClick={() => setIsOpens(true)}>
                              <IoIosAdd size="25px" />
                              Emails
                            </Button>
                          </Box>
                        </Flex>
                      </Box>
                      <TableContainer
                        maxH="400px" // height for vertical scroll
                        // mt={'16px'}
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
                          <Thead bg="#EAF1FF">
                            <Tr>
                              <Th width="50px">
                                <Checkbox
                                  onChange={() => handleSelectAll()}
                                // disabled={selectedEmails.length === 0}
                                />
                              </Th>

                              <Th color="#2D3748" fontWeight="600">
                                Email
                              </Th>

                              <Th width="120px" textAlign="end" fontWeight="600">
                                Action
                              </Th>
                            </Tr>
                          </Thead>
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
                                    ></Checkbox>
                                  </Td>
                                  <Td fontSize="14px">{item?.email}</Td>
                                  <Td textAlign="right">
                                    <Button
                                      size="sm"
                                      fontSize={12}
                                      colorScheme="red"
                                      onClick={() =>
                                        delEmailFromList(item?.email)
                                      }

                                    >
                                      <Image src="/icons/delete.svg" />
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
                              <Text as="span" ms="4px" fontSize="16px" fontWeight="500">{selectAll ? 'Deselect All' : 'Select All'}</Text>
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
                              <Text as="span" ms="4px" fontSize="16px" fontWeight="500">Delete Selected</Text>
                            </Button>
                          </Box>

                        </Box>
                      </Box>
                    </>)}
                  </Box>
                </Box>
              </TabPanel>

              <TabPanel border="1px solid #DEE2E6" bg="#fff" px={'20px'} py={'24px'}>
                <Box>
                  <Box textAlign="start"
                    display="flex"
                    flexDirection="column"
                    justifyContent="start"
                    alignItems="start">
                    <Text as="p" fontSize="16px" fontWeight="600" color="#1A202C" pb="4px">Upload Leads</Text>
                    <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D" pb="24px">The uploaded CSV must follow the format of the sample file. </Text>
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
                      disabled={!sourceChecks?.csvUploadsAudiance}
                      ref={fileInputRef}
                      display="none" // Hide the file input
                      onChange={handleFileChange}
                      accept=".csv" // Only allow CSV files
                    />
                    {!uploadingFile ? (
                      <Box
                        w="100%"
                        h="100%"
                        pt={4}
                        borderRadius="md"
                        border={dragActive ? "2px dashed #2977FF" : "2px dashed #E2E8F0"}
                        bg={dragActive ? "rgba(124, 47, 241, 0.05)" : "transparent"}
                        transition="all 0.2s"
                        opacity={!sourceChecks?.csvUploadsAudiance ? 0.5 : 1}
                        cursor={!sourceChecks?.csvUploadsAudiance ? "not-allowed" : "default"}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}>
                        <Flex justifyContent="center" py="5px">

                          <Image src={ExcelLogo} alt='excel uploads' />
                        </Flex>
                        <Button
                          colorScheme="blue"
                          onClick={handleExcelButton}
                          mb="12px"
                          disabled={!sourceChecks?.csvUploadsAudiance}
                          mt="12px"
                          _focus={{
                            boxShadow: 'none'
                          }}
                        >
                          <Text as="span" ms="4px" fontSize="16px" fontWeight="500">
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
                          {
                            !sourceChecks?.csvUploadsAudiance ? (
                              <Text as={"span"} color="#A0AEC0" cursor="not-allowed">
                                sample CSV
                              </Text>
                            ) : (

                              <Text
                                as={"a"}
                                href={CsvFile}
                                download="sample.csv"
                                color="#2977FF"
                                _hover={{
                                  color: "#2977FF"
                                }}

                              >
                                sample CSV
                              </Text>
                            )
                          }
                        </Text>
                      </Box>
                    ) : (<>
                      <Box w="full" maxW="md" mx="auto" p={4}>
                        <Box
                          w="200px"
                          margin="auto"
                          h="4"
                          overflow="hidden"
                          bg="repeating-linear-gradient(45deg, #2977ff 0px, #2977ff 9px, #efefef 2px, #efefef 15px) 0% 0% / 42.57px 30.87px"
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
                                ({fileData?.count?.valid || "0"})
                              </Text>
                            </Text>
                            <Text fontWeight={"400"} fontSize={"14px"}>
                              Invalid Email: <Text as="span" color="red.500" fontWeight="semibold">
                                ({fileData?.count?.invalid || "0"})
                              </Text>
                            </Text>
                            <Text fontWeight={"400"} fontSize={"14px"}>
                              Duplicate Email: <Text as="span" color="red.500" fontWeight="semibold">
                                ({fileData?.count?.duplicate || "0"})
                              </Text>
                            </Text>
                          </Flex>

                        </Box>

                      </Flex>
                    )
                  }
                  {
                    (fileData?.allEmails?.length > 0 && fileData?.allEmails?.length != fileData?.validEmails?.length) &&
                    <Alert
                      status="warning"
                      variant="left-accent"
                      borderRadius="md"
                      mt={3}
                      fontSize="sm"
                    >
                      <AlertIcon />
                      <AlertDescription>
                        The uploaded CSV contains{" "}
                        <Text as="span" fontWeight="bold">
                          {fileData?.invalidEmails?.length} invalid entries
                        </Text>
                        . These entries will be excluded, and the campaign will be processed using only the valid data.

                      </AlertDescription>
                    </Alert>
                  }

                </Box>
              </TabPanel>
              <TabPanel border="1px solid #DEE2E6" bg="#fff" px={'20px'} py={'24px'}>
                <Box>
                  <GMBSearchForDetailsCampaign
                    disabled={!sourceChecks?.gmbAudiance}
                    subTab={subTab || ""} handleHeaderSteps={handleHeaderSteps} dataForClose={dataForCloseModal} campaignId={data?.campaignId || ""} campaignName={data?.campaignName || ""}
                    onTriggerModal={handleOpenModal} onCancelCampaign={onCancelCampaign}
                    fetchData={fetchData}
                    handleMergeLeads={handleMergeLeads}
                    itemsPerPages={10} currentPage={1}
                  />
                </Box>


              </TabPanel>
              <TabPanel border="1px solid #DEE2E6" bg="#fff" px={'20px'} py={'24px'}>
                <Box>
                  <FacebookLeadsForDetailsCampaign
                    subTab={subTab || ""}
                    disabled={!sourceChecks?.facebookAudiance}
                    handleHeaderSteps={handleHeaderSteps}
                    dataForClose={dataForCloseModal}
                    campaignId={data?.campaignId || ""}
                    campaignName={data?.campaignName || ""}
                    onTriggerModal={handleOpenModal}
                    handleMergeLeads={handleMergeLeads}
                    delCampaignEmail={delCampaignEmail}
                    fetchData={fetchData} itemsPerPages={10} currentPage={1}
                    leadsForFacebook={leadsForFacebook} />
                </Box>



              </TabPanel>
              <TabPanel border="1px solid #DEE2E6" bg="#fff" px={'20px'} py={'24px'}>
                <Box>
                  <LinkedInLeads disabled={!sourceChecks?.linkedinAudiance} type="emails" handleMergeLeads={handleMergeLeads} campaignId={data?.campaignId || ""} />
                </Box>
              </TabPanel>
              <TabPanel border="1px solid #DEE2E6" bg="#fff" px={'20px'} py={'24px'}>
                <Box>
                  <YellowLeadsForDetailsCampaign
                    disabled={!sourceChecks?.yellowAudiance}
                    subTab={subTab || ""} handleHeaderSteps={handleHeaderSteps} dataForClose={dataForCloseModal} campaignId={data?.campaignId || ""} campaignName={data?.campaignName || ""}
                    onTriggerModal={handleOpenModal} onCancelCampaign={onCancelCampaign}
                    fetchData={fetchData}
                    handleMergeLeads={handleMergeLeads}
                    itemsPerPages={10} currentPage={1}
                  />
                </Box>


              </TabPanel>
            </TabPanels>
          </Tabs>

          <Box display="flex" justifyContent="space-between" alignItems="center" pt="12px">

            {
              subTab == "add-more-lead" && parsedEmails.length > 0 ?
                <>
                  <Button
                    fontWeight={500}
                    onClick={() => {
                      history.push("/app/email-campaigns")
                    }}
                  >
                    Back
                  </Button>
                  <Button
                    colorScheme="blue"
                    fontWeight={500}
                    isLoading={mergeLoadingbtn}
                    onClick={() => {
                      validateMergedLeads(allmergedLeads, "true", false, false)
                    }}
                  >
                    {subTab == "add-more-lead" ? "Add" : "Preview Data"}
                  </Button>
                </>
                :
                <>
                  <Flex align={"center"} gap="20px">
                    <Button
                      fontWeight={500}
                      onClick={() => {
                        history.goBack()
                        handleHeaderSteps("back");
                      }}
                    >
                      Back
                    </Button>

                  </Flex>
                  <Button
                    colorScheme="blue"
                    fontWeight={500}
                    isLoading={mergeLoadingbtn}
                    onClick={() => {
                      validateMergedLeads(allmergedLeads, "true", false, false)
                      // handleHeaderSteps("back");
                    }}
                  >
                    Preview Data
                  </Button>
                  {/* {
                    subTab !== "add-more-lead" && (<Box textAlign="right">
                      <Button role="button" colorScheme="blue"
                        onClick={() => {
                          addAudience()
                        }}
                      >Review</Button>
                    </Box>)} */}

                </>
            }
          </Box>
        </Box>
        <Box>
        </Box>
      </Box >

      <SuccessfullyModal isOpens={isOpen} onCloseCancel={onCloseCanceled} />
      <CancelThisCampaign sendData={handleChildData}
        isCancelThisCampaign={isCancelThisCampaign} onCancelThisCampaign={onCancelThisCampaign}
      />
      <Modal isOpen={isOpens} closeOnOverlayClick={false} size={'xl'} onClose={onCloseOpens} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <Text textAlign="center">Add Another Email</Text>
            <Text textAlign="center" fontWeight="400" fontSize="14px">
              Use this option to include additional email addresses for your campaign. Simply enter one or more email IDs, and we’ll add them to your target lead list.</Text>
            <hr style={{ marginTop: "10px" }} />
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

      <Modal isOpen={isUnsubscribedModalOpen?.isOpen} onClose={() => {
        setisUnsubscribedModalOpen({ isOpen: false })
      }} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Notice</ModalHeader>
          <ModalBody>
            <Text fontSize="14px" color="gray.700">
              {/* {unsubscribedModalMessage} */}
              {isUnsubscribedModalOpen?.message || ""}
            </Text>
            <Box mt={6} display="flex" justifyContent="flex-end" gap={3}>
              <Button
                isLoading={mergeLoading == "no"}
                variant="outline" onClick={() => {

                  setTimeout(() => {
                    validateMergedLeads(allmergedLeads, "true", true, false);
                  }, 500);

                }}>
                No
              </Button>
              <Button
                isLoading={mergeLoading == "yes"}
                colorScheme="blue" onClick={() => {
                  setisUnsubscribedModalOpen((prev: any) => ({
                    ...prev,
                    forceContinue: true,
                    skipDuplicatesFromActiveCampaigns: true,
                  }))
                  setTimeout(() => {
                    validateMergedLeads(allmergedLeads, "true", true, true);
                  }, 500);
                }}>
                Yes
              </Button>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>


      {
        previewOpened == "opened" && <>
          {
            filePreview?.type == "upload" ?
              <EmailDataPreviewOnFileUpload modalData={filePreview} onClose={() => { setFilePreview({ isOpen: false, data: {}, type: "all" }) }} /> :
              <EmailDataPreviewModal modalData={filePreview} onClose={() => { setFilePreview({ isOpen: false, data: {}, type: "all" }) }} />
          }
        </>

      }

    </>
  )
}



