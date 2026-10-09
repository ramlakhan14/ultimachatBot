import React from 'react';
import { Box, Button, Flex, Heading, Image, Input, InputGroup, InputLeftElement, Text, VStack, Checkbox, useToast, Spinner } from '@chakra-ui/react';
import { Link, useParams } from 'react-router-dom';
import { PaginatorTwo } from "../../../../widgets/Paginator/PaginatorTwo";
import { IoIosSearch, IoIosCalendar, IoMdTime } from 'react-icons/io';
import DeleteMail from "../../../../components/Icons/email-assistant/deletemail.svg";
import DelIcon from "../../../../components/Icons/email-assistant/delicon.svg";
import BotLogo from "../../../../components/Icons/email-assistant/botlogo.svg";
import DeleteAlertDialog from "../../Modal/DeleteAlertDialog/DeleteAlertDialog";
import { emailConversationListing, deleteEmailsFromChatSummary } from '../../../../services/emailassistantservice';

type Params = {
  id: string;
};

const AutoReplies = () => {
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [forcePage, setForcePage] = React.useState<number>(0);
  const [pageCount, setPageCount] = React.useState<number>(0);
  const [isFetchingEmailList, setIsFetchingEmailList] = React.useState<boolean>(true);
  const [chatData, setChatData] = React.useState<any>(null);
  const [emailData, setEmailData] = React.useState<any>(null);
  const [selectedEmailIds, setSelectedEmailIds] = React.useState<string[]>([]);
  const [allSelected, setAllSelected] = React.useState<boolean>(false);
  const [dateAndTime, setDateAndTime] = React.useState<string>("");
  const [searchEmailQuery, setSearchEmailQuery] = React.useState<string>("");
  const [filteredEmailData, setFilteredEmailData] = React.useState<any>(null);
  const [activeItem, setActiveItem] = React.useState<any>(null);

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState<boolean>(false);
  const [emailToDelete, setEmailToDelete] = React.useState<string | null>(null);
  const [isBulkDelete, setIsBulkDelete] = React.useState<boolean>(false);
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const toast = useToast();
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState<string>("");

  // Search debounce effect
  React.useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchQuery(searchEmailQuery);
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(timerId);
    };
  }, [searchEmailQuery]);

  const { id } = useParams<Params>();

  const handlePageChange = React.useCallback((page) => {
    setCurrentPage(page + 1);
    setForcePage(page)
  }, [setCurrentPage]);

  React.useEffect(() => {
    const getEmailConversationListing = async () => {
      try {
        setIsFetchingEmailList(true);
        const response: any = await emailConversationListing(currentPage, 10, id, 'auto replies', debouncedSearchQuery);
        setEmailData(response.data);
        if (response.data.data.length > 0) {
          setActiveItem(0)
          setDateAndTime(response.data.data[0]?.emailConversation.at(-1).dateAndTime)
          setChatData(response.data.data[0]?.emailConversation)
        }
        setPageCount(response.data.pagination.totalPages)
      } catch (error: any) {

      } finally {
        setIsFetchingEmailList(false);
      }
    }
    getEmailConversationListing();
  }, [currentPage, id, debouncedSearchQuery]);

  const toggleSelectEmail = (emailId: string) => {
    if (selectedEmailIds.includes(emailId)) {
      setSelectedEmailIds(selectedEmailIds.filter(id => id !== emailId));
    } else {
      setSelectedEmailIds([...selectedEmailIds, emailId]);
    }
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedEmailIds([]);
      setAllSelected(false);
    } else {
      if (emailData && emailData.data) {
        const allEmailIds = emailData.data.map((email: any) => email._id);
        setSelectedEmailIds(allEmailIds);
        setAllSelected(true);
      }
    }
  };

  const handleDeleteEmails = async () => {
    if (selectedEmailIds.length === 0) return;

    try {
      const deletePayload = {
        ids: selectedEmailIds,
        folderName: "auto replies"
      };

      const response = await deleteEmailsFromChatSummary(deletePayload);
      if (response.status === 200) {
        toast({
          title: "Emails deleted successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });

        const updatedResponse: any = await emailConversationListing(currentPage, 10, id, 'auto replies', debouncedSearchQuery);
        setEmailData(updatedResponse.data);

        setSelectedEmailIds([]);
        setAllSelected(false);
        setActiveItem(null);
        setChatData(null);
      }
    } catch (error) {
      toast({
        title: "Error deleting emails",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleSingleDelete = async (emailId: string) => {
    try {
      const deletePayload = {
        ids: [emailId],
        folderName: "auto replies"
      };

      const response = await deleteEmailsFromChatSummary(deletePayload);

      if (response.status === 200) {
        toast({
          title: "Email deleted successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });

        const updatedResponse: any = await emailConversationListing(currentPage, 10, id, 'auto replies', debouncedSearchQuery);
        setEmailData(updatedResponse.data);

        setSelectedEmailIds(selectedEmailIds.filter(id => id !== emailId));

        if (allSelected && updatedResponse.data.data.length !== selectedEmailIds.length - 1) {
          setAllSelected(false);
        }
        setActiveItem(null);
        setChatData(null);
      }
    } catch (error) {
      toast({
        title: "Error deleting email",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  function timeAgo(timestamp: any) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    const timeIntervals = [
      { label: "year", seconds: 31536000 },
      // { label: "month", seconds: 2592000 },
      { label: "week", seconds: 604800 },
      { label: "day", seconds: 86400 },
      { label: "hour", seconds: 3600 },
      { label: "minute", seconds: 60 },
      { label: "second", seconds: 1 },
    ];

    for (const interval of timeIntervals) {
      const count = Math.floor(diffInSeconds / interval.seconds);
      if (count >= 1) {
        return `${count}${interval.label.charAt(0)} ago`; // Formats as "2h ago", "1d ago"
      }
    }

    return "Just now";
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return { date: null, time: null, day: null };

    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) return { date: null, time: null, day: null };

    // ✅ Date: dd/mm/yyyy
    const dayNum = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();

    // ✅ Day name: Wednesday
    const day = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
    }).format(dateObj);

    // ✅ Time: 10:12 AM
    const time = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(dateObj);

    return {
      date: `${dayNum}/${month}/${year}  ${day}`,
      time,
    };
  };

  const { date, time } = formatDateTime(dateAndTime);

  React.useEffect(() => {
    if (!emailData || !emailData.data) {
      setFilteredEmailData(null);
      return;
    }

    if (!searchEmailQuery.trim()) {
      // If search is empty, use original data
      setFilteredEmailData(emailData);
      return;
    }

    // Filter emails based on search query
    const filtered = {
      ...emailData,
      data: emailData.data.filter((email: any) =>
        email.receiverEmail.toLowerCase().includes(searchEmailQuery.toLowerCase())
      )
    };

    setFilteredEmailData(filtered);
  }, [searchEmailQuery, emailData]);

  const openDeleteAlert = (emailId?: string) => {
    if (emailId) {
      setEmailToDelete(emailId);
      setIsBulkDelete(false);
    } else {
      setIsBulkDelete(true);
    }
    setIsDeleteAlertOpen(true);
  };

  const closeDeleteAlert = () => {
    setIsDeleteAlertOpen(false);
    setEmailToDelete(null);
  };

  const confirmDelete = () => {
    if (isBulkDelete) {
      handleDeleteEmails();
    } else if (emailToDelete) {
      handleSingleDelete(emailToDelete);
    }
    closeDeleteAlert();
  };

  return (<>
    <Box
      w="100%"
      maxW="100%"
      p="6"
      shadow="sm"
      h="100%"
      position="relative"
      overflow="auto"
      overflowX="hidden"
    >
      <VStack w="100%" spacing="10">
        <Box w="100%">
          <Box>
            <Text as="span" fontSize="16px" fontWeight="400">
              <Link to="/app/email/email-conversation">
                <Text as="span" color="#2977FF" textDecoration="underline">Email Conversation</Text>
              </Link>
              <Text as={'span'} mx={'5px'}>/</Text>
              <Text as="span" color="#6C757D">
                Auto Replies
              </Text>
            </Text>
          </Box>
          <Box mt="24px" mb="24px">
            <Flex w="100%" justifyContent="space-between" alignItems={"center"}>
              <Box>
                <Heading fontSize="24px" color="#1A202C" style={{ textTransform: "capitalize" }}>
                  Auto Replies
                </Heading>
              </Box>
              <Flex fontSize="12px" gap={3} fontWeight="400" color="#6C757D">
                <Button colorScheme="blue" borderRadius="4px" _focus={{ boxShadow: "none" }} fontWeight={500} width="150px" onClick={toggleSelectAll}>
                  {allSelected ? "Deselect All" : "Select All"}
                </Button>
                <Button
                  colorScheme='red'
                  padding={'5px'}
                  fontWeight={500}
                  _focus={{ boxShadow: "none" }}
                  // onClick={handleDeleteEmails}
                  onClick={() => openDeleteAlert()}
                  isDisabled={selectedEmailIds.length === 0}
                >
                  <Image src={DeleteMail} />
                </Button>
                <InputGroup
                  // border="1px solid #6C757D"
                  borderRadius="4px"
                  // borderColor="#6C757D"
                  bg={'white'}
                >
                  <InputLeftElement pointerEvents='none'>
                    <IoIosSearch color="#6C757D" />
                  </InputLeftElement>
                  <Input
                    placeholder="Search"
                    value={searchEmailQuery}
                    onChange={(e) => setSearchEmailQuery(e.target.value)}
                  // maxW="300px"
                  />
                </InputGroup>
              </Flex>
            </Flex>
          </Box>
        </Box>
      </VStack>
      <Box p={'20px'} bg={'#fff'} border="1px solid #DEE2E6" borderRadius="4px">
        <Text fontWeight="600!important" fontSize={"20px!important"}>Email Leads : {emailData?.pagination?.totalItems || 0}</Text>
        <Text color="#6C757D" mt={1}>All the auto replies with your customers.</Text>
        <Box border="1px solid #E2E8F0" borderRadius="8px" mt={6}>
          <Flex>
            <Box width="35%" maxW={"40%"}>
              <Box
                borderTopLeftRadius="8px"
                // borderBottomLeftRadius="8px"
                minH={'400px'}
                // height={'calc(100vh - 430px)'}
                overflowY={'auto'}
                borderBottom="1px solid #e2e8f0"
                borderRight="1px solid #e2e8f0"
              >
                {isFetchingEmailList ?
                  <Spinner display={'flex'} alignItems={'center'} justifyContent={'center'} margin={'auto'} marginTop={'100px'} />
                  : (emailData?.data?.length > 0) ?
                    emailData && emailData?.data.map((email: any, index: number) => (
                      <Box
                        key={index}
                        bg={email.id === 1 ? "#EAF1FF" : 'transparent'}
                        display="flex"
                        alignItems="center"
                        p="6px 8px"
                        border={activeItem === index ? "1px solid #E2E8F0" : 'unset'}
                        borderRight={activeItem === index ? "2px solid #2977ff" : 'unset'}
                      // borderBottom="1px solid #e2e8f0"
                      // background={activeItem === index ? '#EAF1FF' : ''}
                      >

                        <Box width="30px">
                          <Checkbox
                            borderColor="#6C757D"
                            sx={{
                              ".chakra-checkbox__control": {
                                border: "1px solid #6C757D",
                              },
                            }}

                            isChecked={selectedEmailIds.includes(email._id)}
                            onChange={(e: any) => {
                              toggleSelectEmail(email._id);
                            }}
                          />
                        </Box>

                        <Box
                          flex="1"
                          mx="5px"
                          maxW={"75%"}
                          cursor={'pointer'}
                          onClick={() => {
                            setActiveItem(index)
                            setDateAndTime(email?.emailConversation.at(-1).dateAndTime)
                            setChatData(email?.emailConversation)
                          }}
                        >
                          <Text fontSize="12px" margin={"0px!important"} color="#6C757D">
                            {timeAgo(email?.updatedAt)}
                          </Text>
                          <Text
                            fontSize="14px"
                            color="#1A202C"
                            whiteSpace="nowrap"
                            overflow="hidden"
                            textOverflow="ellipsis"
                            width="100%"
                            margin={"0px!important"}
                            title={email.receiverEmail}
                          >
                            {email.receiverEmail}
                          </Text>
                        </Box>

                        <Box width="35px">
                          <Image
                            role="button"
                            width="18px"
                            margin={'auto'}
                            src={DelIcon}
                            cursor="pointer"
                            onClick={(e: any) => {
                              // handleSingleDelete(email._id);
                              openDeleteAlert(email._id);
                            }}
                          />
                        </Box>
                      </Box>
                    ))
                    : (emailData?.data?.length === 0 && searchEmailQuery.trim()) ? (
                      <Box display="flex" justifyContent="center" alignItems="center" height="300px">
                        <Text color="#6C757D" fontSize="14px">No emails match your search criteria</Text>
                      </Box>
                    ) : (emailData?.data?.length === 0) ? (
                      <Box display="flex" justifyContent="center" alignItems="center" height="300px">
                        <Text color="#6C757D" fontSize="14px">No emails available</Text>
                      </Box>
                    ) : null}
              </Box>
              {emailData && emailData?.pagination?.totalItems > 10 && <Box
                maxW={"100%"}
                overflow={"auto"} borderRight="1px solid #e2e8f0"
              >
                <PaginatorTwo onPageChange={handlePageChange} pageRangeDisplayed={5} pageCount={pageCount} />
              </Box>}
            </Box>
            <Box width="65%" maxW={"65%"} minHeight={'480px'} padding={'20px'} position="relative">
              <Flex justifyContent="space-between" alignItems="center" gap={3} mb={5}>
                {date !== null && <Text fontSize="12px" color="#6C757D" display="flex" alignItems="center" gap={1}><svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">

                  <path d="M11.375 1.75H10.0625V1.3125C10.0625 1.19647 10.0164 1.08519 9.93436 1.00314C9.85231 0.921094 9.74103 0.875 9.625 0.875C9.50897 0.875 9.39769 0.921094 9.31564 1.00314C9.23359 1.08519 9.1875 1.19647 9.1875 1.3125V1.75H4.8125V1.3125C4.8125 1.19647 4.76641 1.08519 4.68436 1.00314C4.60231 0.921094 4.49103 0.875 4.375 0.875C4.25897 0.875 4.14769 0.921094 4.06564 1.00314C3.98359 1.08519 3.9375 1.19647 3.9375 1.3125V1.75H2.625C2.39294 1.75 2.17038 1.84219 2.00628 2.00628C1.84219 2.17038 1.75 2.39294 1.75 2.625V11.375C1.75 11.6071 1.84219 11.8296 2.00628 11.9937C2.17038 12.1578 2.39294 12.25 2.625 12.25H11.375C11.6071 12.25 11.8296 12.1578 11.9937 11.9937C12.1578 11.8296 12.25 11.6071 12.25 11.375V2.625C12.25 2.39294 12.1578 2.17038 11.9937 2.00628C11.8296 1.84219 11.6071 1.75 11.375 1.75ZM3.9375 2.625V3.0625C3.9375 3.17853 3.98359 3.28981 4.06564 3.37186C4.14769 3.45391 4.25897 3.5 4.375 3.5C4.49103 3.5 4.60231 3.45391 4.68436 3.37186C4.76641 3.28981 4.8125 3.17853 4.8125 3.0625V2.625H9.1875V3.0625C9.1875 3.17853 9.23359 3.28981 9.31564 3.37186C9.39769 3.45391 9.50897 3.5 9.625 3.5C9.74103 3.5 9.85231 3.45391 9.93436 3.37186C10.0164 3.28981 10.0625 3.17853 10.0625 3.0625V2.625H11.375V4.375H2.625V2.625H3.9375ZM11.375 11.375H2.625V5.25H11.375V11.375ZM7.65625 7.21875C7.65625 7.34854 7.61776 7.47542 7.54565 7.58334C7.47354 7.69126 7.37105 7.77538 7.25114 7.82505C7.13122 7.87472 6.99927 7.88771 6.87197 7.86239C6.74467 7.83707 6.62774 7.77457 6.53596 7.68279C6.44418 7.59101 6.38168 7.47408 6.35636 7.34678C6.33104 7.21948 6.34403 7.08753 6.3937 6.96761C6.44337 6.8477 6.52749 6.74521 6.63541 6.6731C6.74333 6.60099 6.87021 6.5625 7 6.5625C7.17405 6.5625 7.34097 6.63164 7.46404 6.75471C7.58711 6.87778 7.65625 7.0447 7.65625 7.21875ZM10.0625 7.21875C10.0625 7.34854 10.024 7.47542 9.9519 7.58334C9.87979 7.69126 9.7773 7.77538 9.65739 7.82505C9.53747 7.87472 9.40552 7.88771 9.27822 7.86239C9.15092 7.83707 9.03399 7.77457 8.94221 7.68279C8.85043 7.59101 8.78793 7.47408 8.76261 7.34678C8.73729 7.21948 8.75028 7.08753 8.79995 6.96761C8.84962 6.8477 8.93374 6.74521 9.04166 6.6731C9.14958 6.60099 9.27646 6.5625 9.40625 6.5625C9.5803 6.5625 9.74722 6.63164 9.87029 6.75471C9.99336 6.87778 10.0625 7.0447 10.0625 7.21875ZM5.25 9.40625C5.25 9.53604 5.21151 9.66292 5.1394 9.77084C5.06729 9.87876 4.9648 9.96288 4.84489 10.0125C4.72497 10.0622 4.59302 10.0752 4.46572 10.0499C4.33842 10.0246 4.22149 9.96207 4.12971 9.87029C4.03793 9.77851 3.97543 9.66158 3.95011 9.53428C3.92479 9.40698 3.93778 9.27503 3.98745 9.15511C4.03712 9.0352 4.12124 8.93271 4.22916 8.8606C4.33708 8.78849 4.46396 8.75 4.59375 8.75C4.7678 8.75 4.93472 8.81914 5.05779 8.94221C5.18086 9.06528 5.25 9.2322 5.25 9.40625ZM7.65625 9.40625C7.65625 9.53604 7.61776 9.66292 7.54565 9.77084C7.47354 9.87876 7.37105 9.96288 7.25114 10.0125C7.13122 10.0622 6.99927 10.0752 6.87197 10.0499C6.74467 10.0246 6.62774 9.96207 6.53596 9.87029C6.44418 9.77851 6.38168 9.66158 6.35636 9.53428C6.33104 9.40698 6.34403 9.27503 6.3937 9.15511C6.44337 9.0352 6.52749 8.93271 6.63541 8.8606C6.74333 8.78849 6.87021 8.75 7 8.75C7.17405 8.75 7.34097 8.81914 7.46404 8.94221C7.58711 9.06528 7.65625 9.2322 7.65625 9.40625ZM10.0625 9.40625C10.0625 9.53604 10.024 9.66292 9.9519 9.77084C9.87979 9.87876 9.7773 9.96288 9.65739 10.0125C9.53747 10.0622 9.40552 10.0752 9.27822 10.0499C9.15092 10.0246 9.03399 9.96207 8.94221 9.87029C8.85043 9.77851 8.78793 9.66158 8.76261 9.53428C8.73729 9.40698 8.75028 9.27503 8.79995 9.15511C8.84962 9.0352 8.93374 8.93271 9.04166 8.8606C9.14958 8.78849 9.27646 8.75 9.40625 8.75C9.5803 8.75 9.74722 8.81914 9.87029 8.94221C9.99336 9.06528 10.0625 9.2322 10.0625 9.40625Z" fill="#6C757D" />

                </svg>
                  {/* 2024-07-10, Wednesday */}
                  {date}
                </Text>}
                {time !== null && <Text fontSize="12px" color="#6C757D" display="flex" alignItems="center" gap={1}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">

                    <path d="M5.6875 0C4.56262 0 3.463 0.333566 2.5277 0.958517C1.59239 1.58347 0.863411 2.47173 0.432938 3.51099C0.00246431 4.55024 -0.110167 5.69381 0.109286 6.79708C0.32874 7.90034 0.870421 8.91376 1.66583 9.70917C2.46124 10.5046 3.47466 11.0463 4.57793 11.2657C5.68119 11.4852 6.82476 11.3725 7.86401 10.9421C8.90327 10.5116 9.79153 9.78261 10.4165 8.8473C11.0414 7.912 11.375 6.81238 11.375 5.6875C11.3734 4.17957 10.7737 2.73386 9.70741 1.66759C8.64114 0.601321 7.19543 0.0015924 5.6875 0ZM5.6875 10.5C4.73568 10.5 3.80523 10.2178 3.01382 9.68895C2.22241 9.16014 1.60558 8.40853 1.24133 7.52916C0.877085 6.64979 0.781782 5.68216 0.967473 4.74863C1.15316 3.81509 1.61151 2.95759 2.28455 2.28455C2.95759 1.61151 3.8151 1.15316 4.74863 0.967471C5.68216 0.781779 6.6498 0.877083 7.52917 1.24133C8.40854 1.60558 9.16015 2.22241 9.68895 3.01382C10.2178 3.80523 10.5 4.73568 10.5 5.6875C10.4986 6.96341 9.99106 8.18665 9.08885 9.08885C8.18665 9.99106 6.96341 10.4986 5.6875 10.5ZM9.1875 5.6875C9.1875 5.80353 9.14141 5.91481 9.05936 5.99686C8.97731 6.07891 8.86603 6.125 8.75 6.125H5.6875C5.57147 6.125 5.46019 6.07891 5.37814 5.99686C5.2961 5.91481 5.25 5.80353 5.25 5.6875V2.625C5.25 2.50897 5.2961 2.39769 5.37814 2.31564C5.46019 2.23359 5.57147 2.1875 5.6875 2.1875C5.80353 2.1875 5.91481 2.23359 5.99686 2.31564C6.07891 2.39769 6.125 2.50897 6.125 2.625V5.25H8.75C8.86603 5.25 8.97731 5.29609 9.05936 5.37814C9.14141 5.46019 9.1875 5.57147 9.1875 5.6875Z" fill="#6C757D" />

                  </svg>
                  {/* 11:53 am */}
                  {time}
                </Text>}
              </Flex>
              <Box maxHeight={'470px'}
                //  maxW={"660px"}
                sx={{
                  overflowY: "auto",
                  scrollbarWidth: "none", // Firefox
                  "&::-webkit-scrollbar": {
                    display: "none" // Chrome, Safari
                  }
                }}>
                {chatData && chatData.map((chat: any, index: number) => (
                  <React.Fragment key={index}>
                    <Box className='autoRepliesChat' maxW={"100%"} overflowX={"auto"}>
                      <div className="userAlign">
                        <div style={{ width: "fit-content" }} className="chat-message">
                          <div
                            className="chat-message-text"
                            style={{
                              backgroundColor: "rgb(227, 243, 255)",
                              marginLeft: "50px",
                              marginBottom: "20px",
                              width: "fit-content", // Make the width fit the message content
                              overflowY: "scroll",
                              scrollbarWidth: "none",
                              maxWidth: "475px",
                              wordBreak: "break-word"
                            }}
                          >

                            <div
                              style={{ textAlign: "left", wordBreak: "break-word" }}
                              className="message-chat"
                              dangerouslySetInnerHTML={{
                                __html: (chat?.emailTextContent)
                                  .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold text inside ** **
                                  .replace(/(\s|^)([1-9]|1[0-9]|20)\./g, '<b><br>$&</b>') // Line break before list items
                              }}
                            />
                          </div>
                          <img src={BotLogo} alt="Logo" className="chat-message-logo" />
                        </div>
                      </div>
                    </Box>
                  </React.Fragment>
                ))}
                {!chatData && <Text color="#212529" textAlign={'center'}>No email selected to view the auto replies chat content.</Text>}
              </Box>
            </Box>
          </Flex>
        </Box>
      </Box>
    </Box>
    <DeleteAlertDialog
      isOpen={isDeleteAlertOpen}
      leastDestructiveRef={cancelRef}
      onClose={closeDeleteAlert}
      onDelete={confirmDelete}
      isBulkDelete={isBulkDelete}
      alertTitle={`Delete ${isBulkDelete ? 'Emails' : 'Email'}`}
      alertMessage={`Are you sure you want to delete ${isBulkDelete ? 'these emails' : 'this email'}? 
                  <br/><br/>If you delete the ${isBulkDelete ? 'emails' : 'email'} from here, it will be deleted from Chat Summary also.`}
    />
  </>);
};

export default AutoReplies;