import * as React from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  Text,
  VStack,
  Table,
  Thead,
  Tr,
  Td,
  Tbody,
  Th,
  Select,
  TableContainer,
  InputGroup,
  InputLeftElement,
  Input,
  useToast,
  Image,
  Spinner,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalFooter,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow
} from "@chakra-ui/react";
import styles from "./EmailCampaignsAdmin.module.scss";
import { IoIosSearch } from "react-icons/io";
import { getEmailsByUserId, pauseCampaign } from "../../services/emailCampaigns";
import { colors } from '../../utils/constant';
import { Link, NavLink } from "react-router-dom";
import { DetailsOfCampaignModal } from "./Modal/DetailsOfCampaignModal";
import { ReadIcon } from "../../components/Icons/ReadIcon";
import { CreateNewCampaignModal } from "./Modal/CreateNewCampaignModal";
import { campaignGetAllCampaign } from "../../services/emailCampaigns";
import { PaginatorTwo } from "../../widgets/Paginator/PaginatorTwo";
import { useLocation } from 'react-router-dom';
import { AddTargetAudience } from "./Modal/AddTargetAudience";
import { useHistory } from 'react-router-dom';
import { GoInfo } from "react-icons/go";
import CreateCampaign from "../../components/Icons/campaign/mail-add.svg";

import ScrapedHistory from "./scrapedHistory.svg";
import CampaignEmailList from "./Modal/CampaignEmailList";
import { checkProjectAndNumber } from "../../services/VoiceBot";
import { ModifyYourCampaign } from "./Modal/ModifyYourCampaign";
import { AddMoreTargetAudienceModal } from "./Modal/AddMoreTargetAudienceModal";
import { hi } from "date-fns/locale";
import { checkCanCreateChatbot } from "../../services/knowledgebaseService";

export const EmailCampaignsAdmin = () => {
  const toast = useToast();
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [itemsPerPages, setItemsPerPage] = React.useState<number>(10);
  const [searchValue, setSearchValue] = React.useState('');
  const [inviteUsersData, setInviteUsersData] = React.useState<any>();
  const [isOpens, setIsOpens] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [modalData, setModalData] = React.useState(null);
  const [debouncedSearchValue, setDebouncedSearchValue] = React.useState(searchValue);
  const [isSearchActive, setIsSearchActive] = React.useState<boolean>(false);
  const [forcePage, setForcePage] = React.useState<number>(0);
  const [isOpenTargetAudience, setIsOpenTargetAudience] = React.useState<boolean>(false);
  const [isCampaignTrigger, setIsCampaignTrigger] = React.useState<boolean>(false);
  const [campaignId, setCampaignId] = React.useState<any>(null);
  const [campaignName, setCampaignName] = React.useState<any>(null);
  const [isReviewOpen, setIsReviewOpen] = React.useState<boolean>(false);
  const [emailExists, setEmailExists] = React.useState<boolean>(false);
  const [projectExists, setProjectExists] = React.useState<boolean>(false);
  const [isEmailModalOpens, setIsEmailModalOpens] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const location = useLocation();
  const history = useHistory();
  const [emails, setemails] = React.useState([]);


  React.useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const cId = searchParams.get('campaignId'); // Replace 'pid' with your parameter key if needed
    setCampaignId(cId);
    const cName = searchParams.get('campaignName'); // Another parameter
    setCampaignName(cName);

    // Apply a condition based on the parameter's existence
    if (cId && cName) {
      setIsOpenTargetAudience(true);
    }
  }, [inviteUsersData]);

  const onCloseTargetAudience = () => {
    setIsOpenTargetAudience(false);
  };

  const handlePageChange = (page: number) => {
    let pages: number = page + 1;
    setCurrentPage(pages);
    setForcePage(page);
  };
  const handleItemsPerPageChange = (event: any) => {
    setItemsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(1);
    setForcePage(0);
  };


  const onCloses = () => {
    setIsOpens(false);
  };

  const onEmailModalCloses = () => {
    setCampaignId(null);
    setIsEmailModalOpens(false);
  };



  const handleURLClick = React.useCallback(async (data) => {
    setModalData(data);
    setIsOpens(true);
  }, [isOpens]);

  const handleCampaignEmailModal = React.useCallback(async (id) => {
    setCampaignId(id);
    setIsEmailModalOpens(true);
  }, [isEmailModalOpens]);


  const handleInputChange = (event: any) => {
    setSearchValue(event.target.value); // Update state with the input value
  };

  const onClose = () => {
    // Clear fields if necessar
    setIsOpen(false);

  };


  const fetchData = async (page: number, pageSize: number, searchKeyword: string) => {

    try {
      setIsLoading(true);
      const response: any = await campaignGetAllCampaign(pageSize, page, searchKeyword);
      setInviteUsersData(response);

    } catch (error: any) {

    } finally {
      setIsLoading(false);
    }
  };


  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchValue(searchValue);

      if (searchValue !== "") {
        setIsSearchActive(true);
        setCurrentPage(1);
        setForcePage(0);
      } else {
        setIsSearchActive(false);
      }
    }, 1500);

    return () => clearTimeout(handler);
  }, [searchValue]);

  React.useEffect(() => {
    fetchData(currentPage, itemsPerPages, debouncedSearchValue);
  }, [debouncedSearchValue, itemsPerPages, currentPage]);

  const checkProjectAndEmailData = async () => {
    try {
      const response: any = await checkProjectAndNumber();
      if (response?.status === 200) {
        // console.log("response", response?.data?.data);
        setProjectExists(response?.data?.data?.projectExists);
        setEmailExists(response?.data?.data?.emailExists);
      } else {
        toast({
          title: "Error",
          description: response?.data?.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return false;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong!",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return false;
    }
  }

  React.useEffect(() => {
    checkProjectAndEmailData();
  }, []);

  const [openModifyYourCampaign, setOpenModifyYourCampaign] = React.useState<any>({}); // [openModifyYourCampaign]
  const [addMoretargetModal, setAddMoretargetModal] = React.useState<any>({}); // [openModifyYourCampaign]
  const [pauseCampaignModal, setPauseCampaign] = React.useState<any>({}); // [openModifyYourCampaign]
  const [canCreateChatbot, setCanCreateChatbot] = React.useState<boolean>(false);

  const checkCanCreateChatbotData = React.useCallback(async () => {
    try {
      const response: any = await checkCanCreateChatbot()
      setCanCreateChatbot(response?.data?.data?.allowed || false);
    } catch (error) {
      // console.log("res", error);
    }
  }, []);

  React.useEffect(() => {
    checkCanCreateChatbotData();
  }, []);
  const handleNoClick = async () => {
    const pauseCampaignData = { campaignId: pauseCampaignModal?._id };
    // console.log("pauseCampaignData", pauseCampaignData);
    try {
      const response = await pauseCampaign(pauseCampaignData);
      // console.log("response", response);
      toast({
        title: `${response?.data?.message}`,
        status: "success",
        isClosable: true,
      })
      setPauseCampaign({});
      fetchData(currentPage, itemsPerPages, '');

    } catch (error: any) {
      // console.log("error", error);
      toast({
        title: `${error?.response?.data?.message || error.message}`,
        status: "error",
        isClosable: true,
      })
    }

  }


  const checkSmtps = async () => {
    try {
      const responses = await getEmailsByUserId(); // Replace with your API endpoint;
      const updatedData = responses?.data?.data?.map((item: any) => ({
        ...item,
        status: "inactive",
      }));
      // console.log("updatedData", updatedData);

      setemails(updatedData);

    } catch (error) {
      // console.log(error);

    }
  }

  React.useEffect(() => {
    checkSmtps()
  }, [])

  // console.log("openModifyYourCampaign", openModifyYourCampaign);
  return (
    <>
      <Box
        w="100%"
        p="6"
        pb={"2px"}
        shadow="sm"
        h="100%"
        position="relative"
        overflow="auto"
      >
        <VStack w="100%" spacing="10">
          <Flex
            shrink={0}
            w="100%"
            direction="column"
            justifyContent="space-between"
          >
            <Flex width="100%" alignItems={"center"} justifyContent="space-between">
              <Box>
                <Heading fontSize="24px" color="#1A202C">UltimaMail Campaigns</Heading>
              </Box>
              <Box display={"flex"} gap={"12px"} alignItems={"center"}>

                <Flex justifyContent="flex-end">
                  {
                    // inviteUsersData?.data?.pagination?.totalCount != 0 &&
                    <InputGroup
                      width="240px"
                      borderRadius="4px"
                      outline={"none"}
                      background={"#fff"}
                    // borderColor="#6C757D"
                    >
                      <InputLeftElement pointerEvents='none'>
                        <IoIosSearch color="#6C757D" />
                      </InputLeftElement>
                      <Input type='text' border="1px solid #CED4DA!important" placeholder='Search' color="#CED4DA!important" value={searchValue}
                        onChange={handleInputChange} />
                    </InputGroup>
                  }
                </Flex>
                <Button
                  color="white"
                  // mr="12px"
                  backgroundColor="#2977FF"
                  size="md"
                  fontWeight={500}
                  className="btn-hover-pri"
                  onClick={() => {

                    if (emails?.length == 0) {
                      const toastId = toast({
                        title: "Error",
                        description: (
                          <>
                            You need to add SMTP email details to create a campaign. Please add them by{" "}
                            <Text
                              as="span"
                              textDecoration="underline"
                              cursor="pointer"
                              onClick={() => {
                                if (toastId) {
                                  toast.close(toastId);
                                }
                                history.push('/app/smtp-settings/create');
                              }}
                            >
                              clicking here
                            </Text>
                            .
                          </>
                        ),
                        status: "error",
                        duration: null,
                        isClosable: true,
                      });
                      return;
                    }

                    if (!projectExists) {
                      const toastId = toast({
                        title: "Error",
                        description: (
                          <>
                            Please create a project first.{" "}
                            <Text
                              as="span"
                              textDecoration="underline"
                              cursor="pointer"
                              onClick={() => {
                                if (toastId) {
                                  toast.close(toastId);
                                }
                                history.push('/app/create-bot');
                              }}
                            >
                              Click here
                            </Text>
                            .
                          </>
                        ),
                        status: "error",
                        duration: null,
                        isClosable: true,
                      });
                      return;
                    } else if (!emailExists) {
                      const toastId = toast({
                        title: "Info",
                        description: (
                          <>
                            Please add an email for campaign first.{" "}
                            <Text
                              as="span"
                              textDecoration="underline"
                              cursor="pointer"
                              onClick={() => {
                                if (toastId) {
                                  toast.close(toastId);
                                }
                                history.push('/app/postmark-settings');
                              }}
                            >
                              Click here
                            </Text>
                            .
                          </>
                        ),
                        status: "info",
                        duration: null,
                        isClosable: true,
                      });
                      return;
                    } else if (!canCreateChatbot) {
                      toast({
                        title: "Bot limit reached",
                        description:
                          "You’ve reached your bot limit. Please upgrade your plan to create more chatbots.",
                        status: "warning",
                        duration: 4000,
                        isClosable: true,
                      });
                    } else {
                      history.push(`/app/email-campaigns/create?subTab=set-up`);
                      // setIsOpen(true);
                    }
                  }}
                  sx={{
                    _focus: {
                      boxShadow: 'none',  // Removes the focus box shadow
                    }
                  }}
                >
                  <Image src={CreateCampaign} alt="Create Campaign" />
                  <Text as="span" ms="8px">
                    Create New Campaign
                  </Text>
                </Button>

              </Box>
            </Flex>

          </Flex>
        </VStack>

        <Box mt="24px"
          backgroundColor="white" boxShadow="sm" borderRadius="8px">
          <TableContainer
            maxH={"calc(100vh - 245px)"} // height for vertical scroll
            mt={'24px'}
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
              <Thead sx={{
                position: 'sticky',
                top: -1,
                zIndex: 1,
                fontSize: '14px',
                fontWeight: '600'
              }} bg={colors.tableHeadingBg}  >
                <Tr >
                  <Th width="70px">#</Th>
                  <Th>Campaign Name</Th>
                  <Th textAlign="start" colSpan={5}>Reports</Th>
                </Tr>
              </Thead>
              <Tbody>
                {isLoading ? <Tr><Td colSpan={7} textAlign="center"><Spinner /></Td></Tr> :
                  inviteUsersData?.data?.data?.length > 0 ?
                    inviteUsersData?.data?.data.map((data: any, index: number) => (
                      <Tr key={data._id}>
                        <Td > {index + 1 + (currentPage - 1) * itemsPerPages}</Td>
                        <Td >
                          <Box maxWidth={"80%"}>
                            <Flex align="start" gap={1}>
                              <Text
                                fontWeight="700"
                                fontSize="14px"
                                pb="2px"
                                whiteSpace="normal"       // allow wrapping
                                wordBreak="break-word"    // break long email/URLs
                                noOfLines={2}
                                color="#2977FF"           // optionally limit lines
                              >
                                {data?.campaignName || "-"}
                                {/* Akash Email Campaign to Check email sending with support@cvinfotech.app 4th July 25 */}
                              </Text>
                              <Link to="#" onClick={() => {
                                history.push(`/app/email-campaigns/campaign-details/${data?._id}`);
                              }} color="blue.500">
                                <Image src="/icons/outgoing.svg" maxW={"40px"} alt="arrow-right" />
                              </Link>
                            </Flex>
                            <Flex justifyContent="flex-start" pt="2px" pb={"6px"} gap="8px">
                              {data?.status === "completed" ? (
                                <Text as="span" className={styles.Completed}>Completed</Text>
                              ) : data?.status === "running" ? (
                                <Text as="span" className={styles.Running}>Running</Text>
                              ) : data?.status === "scheduled" ? (
                                <Text as="span" className={styles.Schedule}>Scheduled</Text>
                              ) : data?.status === "initiated" ? (
                                <Text as="span" className={styles.initiated}>Initiated</Text>
                              ) : data?.status === "paused" ? (
                                <Text as="span" className={styles.paused}>Paused</Text>
                              ) : data?.status === "failed" ? (
                                <Text as="span"
                                  minW={"58px"}
                                  display="flex" gap="5px" alignItems="center" className={styles.failed}>
                                  {
                                    // data?.failedReason &&
                                    < Popover placement="bottom" trigger="click">
                                      <PopoverTrigger>
                                        {/* <Image
                                          src="/icons/i-icon.svg"
                                          alt="icon"
                                          cursor="pointer"
                                          /> */}
                                        <Box>
                                          <GoInfo color="red" />

                                        </Box>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        sx={{
                                          outline: "none",
                                          bg: "#efefef",
                                          width: "300px",
                                          fontSize: "11px",
                                          border: "none",
                                          padding: "10px",
                                          _focus: {
                                            boxShadow: 'none',  // Removes the focus box shadow
                                            outline: "none"
                                          }
                                        }}
                                      >
                                        <PopoverArrow bg="#efefef" />
                                        <Box whiteSpace="pre-wrap">
                                          {data?.failedReason || "Failed"}
                                        </Box>
                                      </PopoverContent>
                                    </Popover>
                                  }Failed</Text>
                              ) : null}
                              <NavLink style={{ display: "flex" }} to={`/app/edit-bot/${data?.campaignProject?.projectId}`}>
                                <Box
                                  _hover={{ color: "#2977FF" }}
                                  display="flex"
                                  gap="4px"
                                  fontSize={"12px"}
                                  // padding={"4px 8px"}
                                  justifyContent="center"
                                  alignItems="center"
                                  color={'#888888'}
                                >
                                  {/* <Image src="/icons/file-icon.svg" width={"16px"} alt="arrow-right" /> */}
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clip-path="url(#clip0_8164_65613)">
                                      <rect width="16" height="16" fill="white" fill-opacity="0.01" />
                                      <path d="M6.17203 0.998779C6.70228 0.998992 7.21119 1.21068 7.58609 1.58569L8.41324 2.41284C8.78814 2.78786 9.29704 2.99857 9.8273 2.99878H13.8097C14.0875 2.99881 14.3622 3.05761 14.6164 3.16968C14.8705 3.28177 15.0989 3.44505 15.2863 3.65015C15.4737 3.85536 15.6166 4.09769 15.7052 4.36108C15.7939 4.62446 15.8261 4.90366 15.8009 5.18042L15.1642 12.1804C15.119 12.6771 14.8898 13.1389 14.5216 13.4753C14.1533 13.8119 13.672 13.9986 13.173 13.9988H2.82535C2.32639 13.9986 1.84509 13.8119 1.47672 13.4753C1.10865 13.1389 0.879308 12.6771 0.834139 12.1804L0.19742 5.18042C0.172269 4.90364 0.205422 4.62448 0.2941 4.36108C0.352763 4.18689 0.436014 4.02286 0.539217 3.87183L0.499178 2.99878C0.499304 2.46852 0.710155 1.95968 1.08512 1.58472C1.46008 1.20976 1.96892 0.998905 2.49918 0.998779H6.17203ZM2.18961 3.99878C2.05087 3.99877 1.91326 4.02785 1.78629 4.08374C1.65918 4.13977 1.54503 4.2224 1.45133 4.32495C1.35768 4.42743 1.28574 4.54791 1.24137 4.67944C1.19699 4.81108 1.18101 4.95125 1.19351 5.0896L1.83023 12.0896C1.85276 12.3379 1.96751 12.5688 2.15152 12.7371C2.33561 12.9054 2.57588 12.9985 2.82535 12.9988H13.173C13.4224 12.9985 13.6628 12.9053 13.8468 12.7371C14.0308 12.5688 14.1456 12.3379 14.1681 12.0896L14.8048 5.0896C14.8173 4.95125 14.8014 4.81108 14.757 4.67944C14.7127 4.54809 14.6415 4.42734 14.548 4.32495C14.4543 4.22242 14.3401 4.13977 14.213 4.08374C14.0861 4.02776 13.9485 3.99883 13.8097 3.99878H2.18961ZM2.49918 1.99878C2.23746 1.99886 1.98585 2.10166 1.79898 2.28491C1.61199 2.46835 1.50416 2.71832 1.49918 2.98022L1.50504 3.12183C1.72421 3.04196 1.95566 2.99876 2.18961 2.99878H7.58609L6.87808 2.29272C6.69116 2.10575 6.43738 1.99946 6.17301 1.99878H2.49918Z" fill="currentColor" />
                                    </g>
                                    <defs>
                                      <clipPath id="clip0_8164_65613">
                                        <rect width="16" height="16" fill="white" />
                                      </clipPath>
                                    </defs>
                                  </svg>
                                  {data?.campaignProject?.projectName || "-"}
                                </Box>
                              </NavLink>

                            </Flex>
                          </Box>
                        </Td>
                        <Td>
                          <Box>
                            <Text mb={"4px"} color={colors.tableTextColor} fontWeight={"600"}>{data?.totalAudience}</Text>
                            <Box
                              display="flex"
                              gap="4px"
                              alignItems="center"
                              color={'#888888'}
                            >
                              <svg width="20" height="15" viewBox="0 0 20 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M18.75 15C18.75 15 20 15 20 13.75C20 12.5 18.75 8.75 13.75 8.75C8.75 8.75 7.5 12.5 7.5 13.75C7.5 15 8.75 15 8.75 15H18.75ZM8.7775 13.75H18.7225C18.7284 13.7493 18.7342 13.7485 18.74 13.7475L18.75 13.745C18.7475 13.415 18.5412 12.4575 17.8 11.595C17.11 10.7863 15.8975 10 13.75 10C11.6037 10 10.3913 10.7875 9.7 11.595C8.95875 12.4575 8.75125 13.4163 8.75 13.745C8.75915 13.7468 8.76832 13.7484 8.7775 13.75V13.75ZM13.75 6.25C14.413 6.25 15.0489 5.98661 15.5178 5.51777C15.9866 5.04893 16.25 4.41304 16.25 3.75C16.25 3.08696 15.9866 2.45107 15.5178 1.98223C15.0489 1.51339 14.413 1.25 13.75 1.25C13.087 1.25 12.4511 1.51339 11.9822 1.98223C11.5134 2.45107 11.25 3.08696 11.25 3.75C11.25 4.41304 11.5134 5.04893 11.9822 5.51777C12.4511 5.98661 13.087 6.25 13.75 6.25ZM17.5 3.75C17.5 4.24246 17.403 4.73009 17.2145 5.18506C17.0261 5.64003 16.7499 6.05343 16.4017 6.40165C16.0534 6.74987 15.64 7.02609 15.1851 7.21455C14.7301 7.403 14.2425 7.5 13.75 7.5C13.2575 7.5 12.7699 7.403 12.3149 7.21455C11.86 7.02609 11.4466 6.74987 11.0983 6.40165C10.7501 6.05343 10.4739 5.64003 10.2855 5.18506C10.097 4.73009 10 4.24246 10 3.75C10 2.75544 10.3951 1.80161 11.0983 1.09835C11.8016 0.395088 12.7554 0 13.75 0C14.7446 0 15.6984 0.395088 16.4017 1.09835C17.1049 1.80161 17.5 2.75544 17.5 3.75V3.75ZM8.67 9.1C8.16998 8.94255 7.65454 8.83904 7.1325 8.79125C6.83916 8.76336 6.54466 8.74959 6.25 8.75C1.25 8.75 0 12.5 0 13.75C0 14.5837 0.41625 15 1.25 15H6.52C6.33469 14.6098 6.24228 14.1819 6.25 13.75C6.25 12.4875 6.72125 11.1975 7.6125 10.12C7.91625 9.7525 8.27 9.40875 8.67 9.1ZM6.15 10C4.065 10.025 2.88125 10.8 2.2 11.595C1.45375 12.4625 1.25 13.4237 1.25 13.75H5C5 12.4438 5.40375 11.1425 6.15 10ZM1.875 4.375C1.875 3.38044 2.27009 2.42661 2.97335 1.72335C3.67661 1.02009 4.63044 0.625 5.625 0.625C6.61956 0.625 7.57339 1.02009 8.27665 1.72335C8.97991 2.42661 9.375 3.38044 9.375 4.375C9.375 5.36956 8.97991 6.32339 8.27665 7.02665C7.57339 7.72991 6.61956 8.125 5.625 8.125C4.63044 8.125 3.67661 7.72991 2.97335 7.02665C2.27009 6.32339 1.875 5.36956 1.875 4.375V4.375ZM5.625 1.875C4.96196 1.875 4.32607 2.13839 3.85723 2.60723C3.38839 3.07607 3.125 3.71196 3.125 4.375C3.125 5.03804 3.38839 5.67393 3.85723 6.14277C4.32607 6.61161 4.96196 6.875 5.625 6.875C6.28804 6.875 6.92393 6.61161 7.39277 6.14277C7.86161 5.67393 8.125 5.03804 8.125 4.375C8.125 3.71196 7.86161 3.07607 7.39277 2.60723C6.92393 2.13839 6.28804 1.875 5.625 1.875Z" fill="#2977FF" />
                              </svg>
                              <Text ml="8px" fontSize="12px">
                                Audience
                              </Text>
                            </Box>
                          </Box>
                        </Td>
                        <Td>
                          <Box>
                            <Text mb={"4px"} color={colors.tableTextColor} fontWeight={"600"}>{data?.failedEmails}</Text>
                            <Box
                              display="flex"
                              gap="4px"
                              alignItems="center"
                              color={'#888888'}
                            >
                              <Image src="/icons/mailfailed.svg" alt="arrow-right" />
                              <Text ml="8px" fontSize="12px">
                                Failed Email
                              </Text>
                            </Box>
                          </Box>
                        </Td>
                        <Td>
                          <Box>
                            <Text mb={"4px"} color={colors.tableTextColor} fontWeight={"600"}>{data?.successEmails}</Text>
                            <Box
                              display="flex"
                              alignItems="center"
                              color={'#888888'}
                            >
                              <Image src="/icons/mailsuccess.svg" width={"26px"} alt="arrow-right" />
                              <Text ml="8px" fontSize="12px">
                                Success Emails
                              </Text>
                            </Box>
                          </Box>
                        </Td>

                        <Td>
                          {/* Modify Campaign ,Add More Leads  */}
                          <Flex justifyContent={'flex-end'} gap={2}>
                            {
                              data?.status === "paused" || data?.status === "failed" ?
                                <Tooltip label={data?.status === "completed" ? "This campaign is already completed" : "Modify Campaign"} fontSize={'10px'}>
                                  <Button
                                    colorScheme="gray"
                                    disabled={data?.status === "completed"}
                                    onClick={() => {
                                      // setOpenModifyYourCampaign(data)
                                      history.push(`/app/email-campaigns/edit/${data?._id}`)
                                    }}
                                    size="sm"
                                  >
                                    <Image src={`/icons/edit.svg`} alt='icon' />
                                  </Button>
                                </Tooltip> :
                                <Tooltip label={"Pause"} fontSize={'10px'}>
                                  <Button
                                    sx={{
                                      "_focus": {
                                        outline: "none",
                                      }
                                    }}
                                    disabled={data?.status === "completed"}
                                    // backgroundColor={actionName === 'delete' ? 'red' : ''}
                                    onClick={() => {
                                      setPauseCampaign(data)
                                    }}
                                    size="sm"
                                  >
                                    <Image src={`/icons/pause.svg`} alt='icon' />
                                  </Button>
                                </Tooltip>
                            }

                            <Tooltip label={"Add More Leads"} fontSize={'10px'}>
                              <Button
                                sx={{
                                  "_focus": {
                                    outline: "none",
                                  }
                                }}
                                disabled={data?.status === "completed"}
                                onClick={() => {
                                  // console.log("data", data);
                                  history.push(`/app/email-campaigns/create?subTab=add-more-lead&id=${data?._id}&campaignName=${data?.campaignName}`)
                                  // setAddMoretargetModal(data)
                                }}
                                size="sm"
                              >
                                <Image src={`/icons/addlead.svg`} alt='icon' />
                              </Button>
                            </Tooltip>
                            {/* <Tooltip label="Campaign Details" fontSize="11px" hasArrow>
                            <Button
                              size="sm"
                              fontSize={12}
                              onClick={() => {
                                handleURLClick(data);
                              }}
                              className={styles.readBtn}
                              sx={{
                                _focus: {
                                  boxShadow: 'none',  // Removes the focus box shadow
                                }
                              }}
                            >
                              <ReadIcon />
                            </Button>
                          </Tooltip>
                          <Tooltip label="Audience emails" fontSize="11px" hasArrow>
                            <Button
                              size="sm"
                              fontSize={12}
                              onClick={() => {
                                handleCampaignEmailModal(data._id);
                              }}
                              className={styles.readBtn}
                              sx={{
                                _focus: {
                                  boxShadow: 'none',  // Removes the focus box shadow
                                }
                              }}
                            >
                              <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M0 1.99915C0 1.46871 0.210714 0.960005 0.585786 0.584932C0.960859 0.209859 1.46957 -0.000854492 2 -0.000854492H14C14.5304 -0.000854492 15.0391 0.209859 15.4142 0.584932C15.7893 0.960005 16 1.46871 16 1.99915V9.99915C16 10.5296 15.7893 11.0383 15.4142 11.4134C15.0391 11.7884 14.5304 11.9991 14 11.9991H2C1.46957 11.9991 0.960859 11.7884 0.585786 11.4134C0.210714 11.0383 0 10.5296 0 9.99915V1.99915ZM2 0.999146C1.73478 0.999146 1.48043 1.1045 1.29289 1.29204C1.10536 1.47958 1 1.73393 1 1.99915V2.21615L8 6.41615L15 2.21615V1.99915C15 1.73393 14.8946 1.47958 14.7071 1.29204C14.5196 1.1045 14.2652 0.999146 14 0.999146H2ZM15 3.38215L10.292 6.20715L15 9.10415V3.38215ZM14.966 10.2581L9.326 6.78715L8 7.58215L6.674 6.78715L1.034 10.2571C1.09083 10.4699 1.21632 10.658 1.39099 10.7922C1.56566 10.9264 1.77975 10.9991 2 10.9991H14C14.2201 10.9992 14.4341 10.9266 14.6088 10.7926C14.7834 10.6586 14.909 10.4708 14.966 10.2581ZM1 9.10415L5.708 6.20715L1 3.38215V9.10415Z" fill="#6C757D" />
                              </svg>

                            </Button>
                          </Tooltip> */}
                          </Flex>
                        </Td>
                      </Tr>
                    )) : <Tr><Td colSpan={8} textAlign="center">No data found</Td></Tr>}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
        {
          inviteUsersData?.data?.pagination?.totalCount > 10 &&
          <Box>
            <HStack w="100%" justifyContent="space-between" pt={4}>
              <Flex alignItems="center">
                <Text mr="8px" fontSize="16px" fontWeight="400" color="#212529">Total&nbsp;{inviteUsersData?.data?.pagination?.totalCount}&nbsp;items</Text>
                <PaginatorTwo forcePage={forcePage} onPageChange={handlePageChange} pageRangeDisplayed={5} pageCount={inviteUsersData?.data?.pagination?.totalPages} />
              </Flex>
              <Flex alignItems="center">
                <Select
                  value={itemsPerPages}
                  onChange={handleItemsPerPageChange}
                  width="auto"
                  color="#6C757D"
                  bg={"#fff"}
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </Select>
              </Flex>
            </HStack>
          </Box>
        }
        <CreateNewCampaignModal fetchData={fetchData} isOpen={isOpen} onClose={onClose} />
        <DetailsOfCampaignModal isOpens={isOpens} onCloses={onCloses} data={modalData} fetchData={fetchData} currentPage={currentPage} itemsPerPages={itemsPerPages} />
        <AddTargetAudience isOpenTargetAudience={isOpenTargetAudience} setIsOpenTargetAudience={setIsOpenTargetAudience} fetchData={fetchData} currentPage={currentPage} itemsPerPages={itemsPerPages} onCloseTargetAudience={onCloseTargetAudience} campaignId={campaignId} campaignNames={campaignName} />
        <CampaignEmailList isEmailModalOpens={isEmailModalOpens} onEmailModalCloses={onEmailModalCloses} campaignId={campaignId} />

        {/* acording to updated figma design  */}
        <ModifyYourCampaign
          isopenModifyYourCampaign={openModifyYourCampaign?._id ? true : false}
          isCloseModifyYourCampaign={() => setOpenModifyYourCampaign({})}
          campaignId={openModifyYourCampaign._id}
          fetchData={fetchData}
          urrentPage={currentPage} itemsPerPages={itemsPerPages} />
        <AddMoreTargetAudienceModal
          isOpened={addMoretargetModal?._id ? true : false}
          onClose={() => { setAddMoretargetModal({}) }} data={addMoretargetModal}
          fetchData={fetchData} itemsPerPages={itemsPerPages} currentPage={currentPage} />

        {/* <CreateNewCampaignModal isOpen={isOpen} onClose={onClose} /> */}
        {/* <DetailsOfCampaignModal isOpens={isOpens} onCloses={onCloses} data={modalData} /> */}
      </Box >
      {/* pause confirm modal */}
      <Modal
        isCentered
        onClose={() => { setPauseCampaign({}) }}
        isOpen={pauseCampaignModal?._id ? true : false}
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
              <Image src={"/icons/error.svg"} alt='deleteicon' w="56px" h="56px" />
              <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" mb="8px" mt="24px">Are you sure?</Text>
              <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D">You want to Pause this campaign?</Text>
            </Box>

          </ModalBody>
          <ModalFooter>
            <Button mr={3}
              onClick={() => handleNoClick()}
              fontWeight={"500"}>
              Yes
            </Button>
            <Button colorScheme="blue" mr={3} fontWeight="500" onClick={() => { setPauseCampaign({}) }}
            >
              <Text as="span" ms="4px" fontSize="16px">No</Text>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
