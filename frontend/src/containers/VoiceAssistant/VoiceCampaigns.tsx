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
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverBody,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalFooter,
} from "@chakra-ui/react";
import styles from "./VoiceAssistant.module.scss";
import { IoIosSearch } from "react-icons/io";
import { Link, NavLink } from "react-router-dom";
import { PaginatorTwo } from "../../widgets/Paginator/PaginatorTwo";
import { useHistory } from 'react-router-dom';
import newCampaign from "./Images/icon-new-campaign.svg";
import { DetailsOfVoiceBotCampaign } from "./Modal/DetailsOfVoiceBotCampaign";
import { getAllCampaigns, checkProjectAndNumber, pauseCampaign, resumeCampaign } from "../../services/VoiceBot";
import editIcon from "./Images/EditIcon.svg";
import stopIcon from "./Images/icon-pause.svg";
import replayIcon from "./Images/icon-replay.svg";
import { ResumeCampaignModal } from "./Modal/ResumeCampaignModal";
import { colors } from "../../utils/constant";
import { checkCanCreateChatbot } from "../../services/knowledgebaseService";
import { GoInfo } from "react-icons/go";

export const VoiceCampaigns = () => {
  const toast = useToast();
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [itemsPerPages, setItemsPerPage] = React.useState<number>(10);
  const [searchValue, setSearchValue] = React.useState('');
  const [debouncedSearchValue, setDebouncedSearchValue] = React.useState(searchValue);
  const [isSearchActive, setIsSearchActive] = React.useState<boolean>(false);
  const [forcePage, setForcePage] = React.useState<number>(0);
  const [campaignData, setCampaignData] = React.useState<any>(null);
  const [isOpens, setIsOpens] = React.useState(false);
  const [inviteUsersData, setInviteUsersData] = React.useState<any>([]);
  const [projectExists, setProjectExists] = React.useState(false);
  const [phoneExists, setPhoneExists] = React.useState(false);
  const history = useHistory();
  const [isLoading, setIsLoading] = React.useState(false);
  const toastIdsRef = React.useRef<string[]>([]);
  const [isOpenResume, setIsOpenResume] = React.useState(false);
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

  const showLimitedToast = (options: any) => {
    if (toastIdsRef.current.length >= 3) {
      const oldestToastId = toastIdsRef.current.shift();
      if (oldestToastId) {
        toast.close(oldestToastId);
      }
    }

    const id: any = toast(options);
    toastIdsRef.current.push(id);
  };



  const handleInputChange = (event: any) => {
    setSearchValue(event.target.value); // Update state with the input value
  };




  const fetchData = async (page: number, pageSize: number, searchKeyword: string) => {
    try {
      setIsLoading(true);
      const response: any = await getAllCampaigns(pageSize, page, searchKeyword);
      setInviteUsersData(response);
    } catch (error: any) {

    } finally {
      setIsLoading(false);
    }
  };

  const checkProjectAndNumberData = async () => {
    try {
      const response: any = await checkProjectAndNumber();
      if (response?.status === 200) {
        // console.log("response", response?.data?.data);
        setProjectExists(response?.data?.data?.projectExists);
        setPhoneExists(response?.data?.data?.phoneExists);
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
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Something went wrong!",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return false;
    }
  }


  React.useEffect(() => {
    checkProjectAndNumberData();
  }, []);


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

  const handleOpenModal = (data: any) => {
    setCampaignData(data);
    setIsOpens(true);
  }

  const handleResumeModal = (data: any) => {
    setCampaignData(data);
    setIsOpenResume(true);
  }

  const handleClose = () => {
    setIsOpens(false);
  }

  const pausedCampaign = async (id: any) => {
    try {
      const respone: any = await pauseCampaign(id);
      showLimitedToast({
        title: `${respone?.data.message}`,
        status: 'success',
        isClosable: true,
      });
      fetchData(currentPage, itemsPerPages, debouncedSearchValue);
    } catch (error: any) {
      showLimitedToast({
        title: `${error?.respone?.data.message}`,
        status: 'error',
        isClosable: true,
      });
    }
  }
  const [canCreateChatbot, setCanCreateChatbot] = React.useState<boolean>(false);

  const checkCanCreateChatbotData = React.useCallback(async () => {
    try {
      const response: any = await checkCanCreateChatbot()
      // console.log(response, "<<<<<<SAdf");
      setCanCreateChatbot(response?.data?.data?.allowed || false);
    } catch (error) {
      // console.log("res", error);
    }
  }, []);

  React.useEffect(() => {
    checkCanCreateChatbotData();
  }, []);


  return (
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
          <Flex width="100%" justifyContent="space-between" alignItems={"center"}>
            <Box>
              <Heading fontSize="24px" color="#1A202C">VoiceBot Campaigns</Heading>
            </Box>
            <Box display={"flex"} gap={"12px"} alignItems={"center"}>

              <Flex justifyContent="flex-end">
                <InputGroup
                  width="240px"
                  borderRadius="4px"
                  background={"#fff"}
                // borderColor="#6C75 7D"
                >
                  <InputLeftElement pointerEvents='none'>
                    <IoIosSearch color="#6C757D" />
                  </InputLeftElement>
                  <Input type='text' border="1px solid #CED4DA!important" placeholder='Search campaign name' color="#6C757D" value={searchValue}
                    onChange={handleInputChange} />
                </InputGroup>
              </Flex>
              <Button color={"white"} mr="12px" backgroundColor={'#2977FF'} size='md' fontWeight={500} className="btn-hover-pri" onClick={() => {
                if (!projectExists) {
                  const toastId = "project-toast";

                  if (!toast.isActive(toastId)) {
                    toast({
                      id: toastId,
                      title: "Error",
                      description: (
                        <>
                          Please create a project first.{" "}
                          <Text
                            as="span"
                            textDecoration="underline"
                            cursor="pointer"
                            onClick={() => {
                              toast.close(toastId);
                              history.push("/app/create-bot");
                            }}
                          >
                            Click here
                          </Text>
                          .
                        </>
                      ),
                      status: "error",
                      duration: 3000,
                      isClosable: true,
                    });
                  }

                  return;
                } else if (!phoneExists) {
                  const toastId = "outbound-phone-toast";

                  if (!toast.isActive(toastId)) {
                    toast({
                      id: toastId,
                      title: "Info",
                      description: (
                        <>
                          Please add an outbound phone number first.{" "}
                          <Text
                            as="span"
                            textDecoration="underline"
                            cursor="pointer"
                            onClick={() => {
                              toast.close(toastId);
                              history.push("/app/voice-campaign/add-number");
                            }}
                          >
                            Click here
                          </Text>
                          .
                        </>
                      ),
                      status: "info",
                      duration: 3000,
                      isClosable: true,
                    });
                  }
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

                  history.push(`/app/voice-campaign/create?subTab=step-up`);
                }
              }}
                sx={{
                  _focus: {
                    boxShadow: 'none',  // Removes the focus box shadow
                  }
                }}
              >
                <Image src={"/icons/mic-icon.svg"} alt='' />
                {/* <Image src={newCampaign} alt='Dan Abramov' /> */}
                <Text as="span" ms="8px">
                  Create New Campaign
                </Text>
              </Button>
            </Box>
          </Flex>
        </Flex>
      </VStack>

      <Box minW="100%" width={"600px"}>
        <TableContainer
          maxH={"calc(100vh - 245px)"} // height for vertical scroll
          mt={'24px'}
          w="100%"
          boxShadow={"0px 1px 4px 0px #0C0C0D0D"}
          bg={'#fff'}
          border="1px solid #E2E8F0"
          borderRadius="4px"
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
              {
                isLoading ? <Tr><Td colSpan={7} textAlign="center"><Spinner /></Td></Tr> :
                  inviteUsersData?.data?.data?.campaigns?.length > 0 ?
                    inviteUsersData?.data?.data?.campaigns.map((data: any, index: number) => (
                      <Tr key={data._id}>
                        <Td > {index + 1 + (currentPage - 1) * itemsPerPages}</Td>
                        <Td >
                          {/* {console.log(data, "data?.campaignName")} */}
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
                              <span role="button" onClick={() => {
                                history.push(`/app/voice-campaign/campaign-details/${data._id}`);
                              }} color="blue.500">
                                <Image src="/icons/outgoing.svg" maxW={"40px"} alt="arrow-right" />
                              </span>
                            </Flex>
                            <Flex justifyContent="flex-start" pt={"3px"} pb={"6px"} gap="8px">
                              {data?.status?.toLowerCase() === "completed" ? (
                                <Text as="span" className={styles.Completed}>Completed</Text>
                              ) : data?.status?.toLowerCase() === "running" ? (
                                <Text as="span" className={styles.Running}>Running</Text>
                              ) : data?.status?.toLowerCase() === "scheduled" ? (
                                <Text as="span" className={styles.Schedule}>Scheduled</Text>
                              ) : data?.status?.toLowerCase() === "initiated" ? (
                                <Text as="span" className={styles.initiated}>Initiated</Text>
                              ) : data?.status?.toLowerCase() === "paused" ? (
                                <Text as="span" className={styles.paused}>Paused</Text>
                              ) : data?.status?.toLowerCase() === "failed" ? (
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
                                        <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                                        <Box whiteSpace="pre-wrap">
                                          {data?.failedReason || "Failed"}
                                        </Box>
                                      </PopoverContent>
                                    </Popover>
                                  }
                                  Failed
                                </Text>
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
                                  color={colors.lightGray}
                                >
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
                            <Text mb={"5px"} color={colors.tableTextColor} fontWeight={"600"}>{data?.totalCalls || 0}</Text>
                            <Box
                              display="flex"
                              gap="4px"
                              alignItems="center"
                              color={colors.lightGray}
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9.3961 1.08812C9.41732 1.0088 9.45395 0.934443 9.50392 0.869288C9.55388 0.804133 9.61619 0.749462 9.68729 0.708397C9.7584 0.667333 9.83689 0.640681 9.9183 0.629963C9.9997 0.619246 10.0824 0.624673 10.1617 0.645936C11.3204 0.948239 12.3775 1.55394 13.2242 2.40065C14.0709 3.24736 14.6766 4.30448 14.9789 5.46312C15.0002 5.54243 15.0056 5.62515 14.9949 5.70655C14.9842 5.78796 14.9575 5.86645 14.9165 5.93755C14.8754 6.00866 14.8207 6.07097 14.7556 6.12093C14.6904 6.1709 14.616 6.20753 14.5367 6.22875C14.4839 6.24264 14.4296 6.24973 14.375 6.24984C14.2373 6.24984 14.1034 6.20434 13.9942 6.12042C13.885 6.0365 13.8066 5.91886 13.7711 5.78578C13.5245 4.83994 13.0302 3.97696 12.3391 3.2858C11.6479 2.59464 10.7849 2.1003 9.83907 1.85375C9.75968 1.83262 9.68524 1.79604 9.61999 1.74611C9.55475 1.69618 9.5 1.63388 9.45885 1.56277C9.41771 1.49166 9.39099 1.41314 9.38022 1.3317C9.36946 1.25025 9.37485 1.16748 9.3961 1.08812ZM9.21407 4.35375C10.2914 4.64125 10.9836 5.33344 11.2711 6.41078C11.3066 6.54386 11.385 6.6615 11.4942 6.74542C11.6034 6.82934 11.7373 6.87484 11.875 6.87484C11.9296 6.87473 11.9839 6.86764 12.0367 6.85375C12.116 6.83253 12.1904 6.7959 12.2556 6.74593C12.3207 6.69597 12.3754 6.63366 12.4165 6.56255C12.4575 6.49145 12.4842 6.41296 12.4949 6.33155C12.5056 6.25015 12.5002 6.16743 12.4789 6.08812C12.0789 4.59125 11.0336 3.54594 9.53673 3.14594C9.37656 3.10315 9.20596 3.12574 9.06245 3.20874C8.91894 3.29174 8.81428 3.42835 8.77149 3.58851C8.7287 3.74868 8.7513 3.91928 8.8343 4.06279C8.91729 4.2063 9.0539 4.31096 9.21407 4.35375ZM15.6156 11.803C15.4763 12.8616 14.9564 13.8333 14.1531 14.5366C13.3497 15.2399 12.3177 15.6268 11.25 15.6248C5.04688 15.6248 7.06925e-06 10.578 7.06925e-06 4.37484C-0.00190698 3.3071 0.384919 2.27517 1.08824 1.47179C1.79155 0.668411 2.76326 0.148519 3.82188 0.00921689C4.08958 -0.0234699 4.36067 0.0312966 4.59468 0.165341C4.8287 0.299385 5.01309 0.505518 5.12032 0.752967L6.77032 4.43656V4.44594C6.85242 4.63535 6.88633 4.84215 6.86901 5.04787C6.8517 5.25359 6.7837 5.45181 6.6711 5.62484C6.65704 5.64594 6.64219 5.66547 6.62657 5.685L5.00001 7.61312C5.58516 8.80219 6.82891 10.035 8.0336 10.6217L9.93516 9.00375C9.95382 8.98803 9.97339 8.97343 9.99376 8.96C10.1666 8.84469 10.3655 8.7743 10.5725 8.7552C10.7794 8.73611 10.9878 8.7689 11.1789 8.85062L11.1891 8.85531L14.8695 10.5045C15.1174 10.6114 15.3241 10.7956 15.4585 11.0297C15.593 11.2637 15.6481 11.535 15.6156 11.803ZM14.375 11.6467H14.3664L10.6945 10.0022L8.79219 11.6202C8.77379 11.6358 8.75448 11.6505 8.73438 11.6639C8.5545 11.7839 8.34657 11.8552 8.1309 11.8708C7.91523 11.8864 7.6992 11.8458 7.50391 11.753C6.04063 11.0459 4.58204 9.59828 3.87423 8.15062C3.7805 7.95676 3.73844 7.74197 3.75213 7.52708C3.76582 7.31218 3.83478 7.10447 3.95235 6.92406C3.96557 6.90285 3.98046 6.88274 3.99688 6.8639L5.62501 4.93344L3.98438 1.26156C3.98407 1.25844 3.98407 1.2553 3.98438 1.25219C3.22677 1.35101 2.53116 1.72263 2.02783 2.29743C1.5245 2.87224 1.24796 3.61081 1.25001 4.37484C1.2529 7.02612 2.3074 9.56797 4.18214 11.4427C6.05687 13.3174 8.59873 14.3719 11.25 14.3748C12.0136 14.3775 12.7519 14.1019 13.3271 13.5997C13.9022 13.0974 14.2747 12.4029 14.375 11.6459V11.6467Z" fill="#2977FF" />
                              </svg>

                              <Text ml="8px" fontSize="12px">
                                Total Calls
                              </Text>
                            </Box>
                          </Box>
                        </Td>
                        <Td>
                          <Box>
                            <Text mb={"5px"} color={colors.tableTextColor} fontWeight={"600"}>{data?.failedCalls || 0}</Text>
                            <Box
                              display="flex"
                              gap="4px"
                              alignItems="center"
                              color={colors.lightGray}
                            >
                              <svg width="20" height="9" viewBox="0 0 20 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10 0C10.4883 0 11.0059 0.0260417 11.5527 0.078125C12.0996 0.130208 12.6562 0.211589 13.2227 0.322266C13.7891 0.432943 14.3457 0.576172 14.8926 0.751953C15.4395 0.927734 15.9733 1.13607 16.4941 1.37695C17.015 1.61784 17.487 1.89779 17.9102 2.2168C18.3333 2.53581 18.7207 2.89062 19.0723 3.28125C19.3522 3.61328 19.5768 3.97461 19.7461 4.36523C19.9154 4.75586 20 5.17578 20 5.625V6.875C20 7.13542 19.9512 7.37956 19.8535 7.60742C19.7559 7.83529 19.6224 8.03385 19.4531 8.20312C19.2839 8.3724 19.0853 8.50586 18.8574 8.60352C18.6296 8.70117 18.3854 8.75 18.125 8.75H15.625C15.3646 8.75 15.1204 8.70117 14.8926 8.60352C14.6647 8.50586 14.4661 8.3724 14.2969 8.20312C14.1276 8.03385 13.9941 7.83529 13.8965 7.60742C13.7988 7.37956 13.75 7.13542 13.75 6.875V5.625C13.75 5.45573 13.6882 5.30924 13.5645 5.18555C13.4408 5.06185 13.2943 5 13.125 5H6.875C6.70573 5 6.55924 5.06185 6.43555 5.18555C6.31185 5.30924 6.25 5.45573 6.25 5.625V6.875C6.25 7.13542 6.20117 7.37956 6.10352 7.60742C6.00586 7.83529 5.8724 8.03385 5.70312 8.20312C5.53385 8.3724 5.33529 8.50586 5.10742 8.60352C4.87956 8.70117 4.63542 8.75 4.375 8.75H1.875C1.61458 8.75 1.37044 8.70117 1.14258 8.60352C0.914714 8.50586 0.716146 8.3724 0.546875 8.20312C0.377604 8.03385 0.244141 7.83529 0.146484 7.60742C0.0488281 7.37956 0 7.13542 0 6.875V5.625C0 5.18229 0.0846354 4.76562 0.253906 4.375C0.423177 3.98438 0.647786 3.61979 0.927734 3.28125C1.25977 2.89062 1.64388 2.53906 2.08008 2.22656C2.51628 1.91406 2.99154 1.63411 3.50586 1.38672C4.02018 1.13932 4.55078 0.93099 5.09766 0.761719C5.64453 0.592448 6.20443 0.449219 6.77734 0.332031C7.35026 0.214844 7.90365 0.130208 8.4375 0.078125C8.97135 0.0260417 9.49219 0 10 0ZM18.75 5.625C18.75 5.28646 18.6686 4.96745 18.5059 4.66797C18.3431 4.36849 18.138 4.0918 17.8906 3.83789C17.6432 3.58398 17.3665 3.35938 17.0605 3.16406C16.7546 2.96875 16.4714 2.79622 16.2109 2.64648C15.7552 2.4056 15.2734 2.19727 14.7656 2.02148C14.2578 1.8457 13.7337 1.70247 13.1934 1.5918C12.653 1.48112 12.1159 1.39648 11.582 1.33789C11.0482 1.2793 10.5208 1.25 10 1.25C9.48568 1.25 8.95833 1.27604 8.41797 1.32812C7.8776 1.38021 7.34049 1.46484 6.80664 1.58203C6.27279 1.69922 5.75195 1.8457 5.24414 2.02148C4.73633 2.19727 4.2513 2.4056 3.78906 2.64648C3.52214 2.78971 3.23893 2.95898 2.93945 3.1543C2.63997 3.34961 2.36654 3.57422 2.11914 3.82812C1.87174 4.08203 1.66341 4.35872 1.49414 4.6582C1.32487 4.95768 1.24349 5.27995 1.25 5.625V6.875C1.25 7.04427 1.31185 7.19076 1.43555 7.31445C1.55924 7.43815 1.70573 7.5 1.875 7.5H4.375C4.54427 7.5 4.69076 7.43815 4.81445 7.31445C4.93815 7.19076 5 7.04427 5 6.875V5.625C5 5.36458 5.04883 5.12044 5.14648 4.89258C5.24414 4.66471 5.3776 4.46615 5.54688 4.29688C5.71615 4.1276 5.91471 3.99414 6.14258 3.89648C6.37044 3.79883 6.61458 3.75 6.875 3.75H13.125C13.3854 3.75 13.6296 3.79883 13.8574 3.89648C14.0853 3.99414 14.2839 4.1276 14.4531 4.29688C14.6224 4.46615 14.7559 4.66471 14.8535 4.89258C14.9512 5.12044 15 5.36458 15 5.625V6.875C15 7.04427 15.0618 7.19076 15.1855 7.31445C15.3092 7.43815 15.4557 7.5 15.625 7.5H18.125C18.2943 7.5 18.4408 7.43815 18.5645 7.31445C18.6882 7.19076 18.75 7.04427 18.75 6.875V5.625Z" fill="#CB4B4B" />
                              </svg>

                              <Text ml="8px" fontSize="12px">
                                Not Answered
                              </Text>
                            </Box>
                          </Box>
                        </Td>
                        <Td>
                          <Box>
                            <Text mb={"5px"} color={colors.tableTextColor} fontWeight={"600"}>{data?.successCalls || 0}</Text>
                            <Box
                              display="flex"
                              alignItems="center"
                              color={colors.lightGray}
                            >
                              <svg width="13" height="17" viewBox="0 0 13 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2.33857 0.390086L3.31107 0.0975861C3.84381 -0.0630608 4.41681 -0.0243888 4.92313 0.206386C5.42946 0.43716 5.83452 0.844272 6.06274 1.35175L6.81441 3.02342C7.01063 3.45992 7.06527 3.9469 6.97066 4.41603C6.87606 4.88517 6.63696 5.31291 6.28691 5.63925L5.04107 6.80009C5.00468 6.834 4.98162 6.87982 4.97607 6.92925C4.93941 7.26009 5.16357 7.90425 5.68107 8.80009C6.05607 9.45092 6.39691 9.90842 6.68607 10.1643C6.88857 10.3434 6.99941 10.3818 7.04691 10.3684L8.72191 9.85592C9.17933 9.716 9.66907 9.72273 10.1225 9.87517C10.5759 10.0276 10.9702 10.3181 11.2502 10.7059L12.3169 12.1859C12.6416 12.6359 12.7921 13.1884 12.7403 13.7409C12.6885 14.2934 12.4379 14.8083 12.0352 15.1901L11.2961 15.8901C10.9042 16.2612 10.4229 16.5245 9.89908 16.6543C9.37524 16.7841 8.82671 16.7761 8.30691 16.6309C6.01191 15.9901 3.9544 14.0534 2.11107 10.8609C0.266072 7.66425 -0.382261 4.91092 0.216072 2.60009C0.350385 2.08037 0.61631 1.604 0.988216 1.21692C1.36012 0.829832 1.82464 0.545072 2.33857 0.390086ZM2.70024 1.58759C2.39181 1.68034 2.11248 1.85098 1.88916 2.08306C1.66584 2.31513 1.50607 2.60082 1.42524 2.91259C0.923572 4.85592 1.49774 7.29675 3.1944 10.2359C4.8894 13.1709 6.71357 14.8884 8.6444 15.4276C8.95631 15.5146 9.28542 15.5193 9.59969 15.4413C9.91397 15.3633 10.2027 15.2053 10.4377 14.9826L11.1761 14.2826C11.3592 14.1091 11.4732 13.875 11.4968 13.6238C11.5204 13.3726 11.4521 13.1213 11.3044 12.9168L10.2377 11.4376C10.1105 11.2611 9.9311 11.1289 9.72484 11.0595C9.51859 10.9902 9.2958 10.9872 9.08774 11.0509L7.40857 11.5651C6.43357 11.8551 5.54941 11.0709 4.59941 9.42509C3.95774 8.31675 3.65941 7.45842 3.73441 6.79092C3.77274 6.44425 3.93441 6.12425 4.18857 5.88592L5.43441 4.72509C5.59345 4.57667 5.70204 4.38218 5.74493 4.16891C5.78782 3.95563 5.76287 3.73429 5.67357 3.53592L4.92274 1.86425C4.81899 1.63358 4.63485 1.44853 4.40469 1.34365C4.17452 1.23876 3.91406 1.22121 3.6719 1.29425L2.70024 1.58759Z" fill="#58BE32" />
                              </svg>

                              <Text ml="8px" fontSize="12px">
                                Success Calls
                              </Text>
                            </Box>
                          </Box>
                        </Td>

                        <Td>
                          <Box display="flex" gap={2} alignItems="center" justifyContent="end">
                            {/* <Tooltip label="View" fontSize={"11px"}>
                              <Button
                                sx={{
                                  padding: "0 8px",
                                  height: "32px",
                                  textTransform: "capitalize",
                                  "_focus": {
                                    outline: "none",
                                  }
                                }}
                                onClick={() => {
                                  handleOpenModal(data);
                                }}
                              >
                                <Image src={Iicon} alt="icon" />
                              </Button>
                            </Tooltip> */}
                            <Tooltip label={data?.status?.toLowerCase() === "completed" ? "This campaign is already completed" : "Edit"} fontSize={"11px"}>
                              <Button
                                padding="6px"
                                size="sm"
                                disabled={data?.status?.toLowerCase() === "completed"}
                                colorScheme="gray"
                                onClick={() => { history.push(`/app/voice-campaign/edit/${data._id}`) }}
                              >
                                <Image src={editIcon} alt="icon" style={{ opacity: "0.5" }} />
                              </Button>
                            </Tooltip>


                            {(data?.status.toLowerCase() === "initiated" || data?.status.toLowerCase() === "scheduled" || data?.status.toLowerCase() === "running") && (
                              <Tooltip label="Pause Campaign" fontSize={"11px"}>
                                <Button
                                  padding="6px"
                                  minW="auto"
                                  sx={{
                                    padding: "0 8px",
                                    height: "32px",
                                    textTransform: "capitalize",
                                    "_focus": {
                                      outline: "none",
                                    }
                                  }}
                                  disabled={data?.status.toLowerCase() === "scheduled"}
                                  // onClick={() => pausedCampaign(data._id)}
                                  onClick={() => handleResumeModal(data)}

                                >
                                  <Image src={stopIcon} alt='Pause Campaign' />
                                </Button>
                              </Tooltip>
                            )}

                            {data?.status.toLowerCase() === "paused" &&
                              <Tooltip label="Resume Campaign" fontSize={"11px"}>
                                <Button
                                  padding="6px"
                                  minW="auto"
                                  sx={{
                                    padding: "0 8px",
                                    height: "32px",
                                    textTransform: "capitalize",
                                    "_focus": {
                                      outline: "none",
                                    }
                                  }}
                                  title="Resume Campaign"
                                  onClick={() => handleResumeModal(data)}
                                >
                                  <Image src={replayIcon} alt='' />
                                </Button>
                              </Tooltip>
                            }

                          </Box>
                        </Td>
                      </Tr>
                    )) : <Tr><Td colSpan={8} textAlign="center">No data found</Td></Tr>
              }

            </Tbody>

          </Table>
        </TableContainer>

      </Box >
      {
        inviteUsersData?.data?.data?.totalCount > 10 &&
        <Box pt={4}>
          <HStack w="100%" pt={2} justifyContent="space-between">
            <Flex alignItems="center" gap={2}>
              <Text fontSize="16px" fontWeight="400" color="#212529">Total&nbsp;{inviteUsersData?.data?.data?.totalCount}&nbsp;items</Text>
              <PaginatorTwo forcePage={forcePage} onPageChange={handlePageChange} pageRangeDisplayed={5} pageCount={inviteUsersData?.data?.data?.totalPages} />
            </Flex>
            <Flex alignItems="center">
              <Select
                value={itemsPerPages}
                onChange={handleItemsPerPageChange}
                width="auto"
                bg={'#fff'}
                color="#6C757D"
                mr="8px"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </Select>
            </Flex>
          </HStack>
        </Box>
      }
      <Modal
        isCentered
        onClose={() => setIsOpenResume(false)}
        isOpen={isOpenResume}
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
              {/* <Image src={ErrorImg} alt='deleteicon' w="56px" h="56px" /> */}
              <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" mb="8px" mt="24px">Are you sure?</Text>
              <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D">You want to {campaignData?.status?.toLowerCase() == 'paused' ? "Resume " : "Pause "} this campaign?</Text>
            </Box>

          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={async () => {
              // setIsSubmittings(true);
              try {
                // Add your trigger now logic here
                const response = campaignData?.status?.toLowerCase() === 'paused' ? await resumeCampaign(campaignData._id) : await pauseCampaign(campaignData._id);

                // const response = campaignData await resumeCampaign(campaignData._id);
                toast({
                  title: `${response?.data?.message}`,
                  status: "success",
                  isClosable: true,
                });
                setIsOpenResume(false)
                fetchData(currentPage, itemsPerPages, "");
              } catch (error: any) {
                toast({
                  title: error?.response?.data?.message,
                  status: "error",
                  isClosable: true,
                });
              } finally {
                // setIsSubmittings(false);
              }
            }} fontWeight={"500"}>
              Yes
            </Button>
            <Button colorScheme="blue" mr={3} onClick={() => setIsOpenResume(false)} fontWeight={"500"}>
              <Text as="span" ms="4px" fontSize="16px" >No</Text>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {/* <ResumeCampaignModal isOpen={isOpenResume} onClose={() => setIsOpenResume(false)} fetchData={fetchData} currentPage={currentPage} itemsPerPages={itemsPerPages} campaignData={campaignData} /> */}
      <DetailsOfVoiceBotCampaign isOpens={isOpens} handleClose={handleClose} campaignData={campaignData} />
    </Box >
  );
};
