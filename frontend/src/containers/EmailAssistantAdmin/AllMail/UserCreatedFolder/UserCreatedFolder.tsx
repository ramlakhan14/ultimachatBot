import { Box, Button, Flex, Heading, Image, Input, InputGroup, InputLeftElement, Text, VStack, TableContainer, Table, Tr, Th, Td, Thead, Tbody, Checkbox, HStack, Select, useToast, Spinner, Tooltip } from '@chakra-ui/react';
import React, { ChangeEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
// import MoveTo from "../../../../components/Icons/email-assistant/moveto.svg";
import DeleteMail from "../../../../components/Icons/email-assistant/deletemail.svg";
import MailView from "../../../../components/Icons/email-assistant/mailview.svg";
// import MailSendBlack from "../../../../components/Icons/email-assistant/mailsendblack.svg";
// import MailDeleteBlack from "../../../../components/Icons/email-assistant/maildeleteblack.svg";
// import MailSend from "../../../../components/Icons/email-assistant/mailsend.svg";
// import MoveTo from "../../../../components/Icons/email-assistant/moveto.svg";
// import MailDraft from  "../../../../components/Icons/email-assistant/maildraft.svg";
// import MailFollowUp from  "../../../../components/Icons/email-assistant/mailfollowup.svg";
import EmailChatModal from "../../Modal/EmailChatModal/EmailChatModal";
import DeleteAlertDialog from "../../Modal/DeleteAlertDialog/DeleteAlertDialog";
// import MailInbox from  "../../../../components/Icons/email-assistant/mailinbox.svg";
// import MailArchive from  "../../../../components/Icons/email-assistant/mailarchive.svg";
// import MailSpam from  "../../../../components/Icons/email-assistant/mailspam.svg";

// import MailDelete from "../../../../components/Icons/email-assistant/maildelete.svg";
import { PaginatorTwo } from "../../../../widgets/Paginator/PaginatorTwo";

import { IoIosSearch } from 'react-icons/io';
import { emailConversationListingUserCreated, manualFolderDeleteEmails } from '../../../../services/emailassistantservice';
import { colors } from '../../../../utils/constant';

interface Params {
  id?: string;
  mailType?: string; // Optional in case it's sometimes missing
}

const UserCreatedFolder = () => {
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [forcePage, setForcePage] = React.useState<number>(0);
  const [itemsPerPages, setItemsPerPage] = React.useState<number>(10);
  const [itemsPerPage, setItemsPerPages] = React.useState<number>(-1);
  const [pageCount, setPageCount] = React.useState<number>(0);
  const [isFetchingEmailList, setIsFetchingEmailList] = React.useState<boolean>(true);
  const [chatData, setChatData] = React.useState<any>(null);
  const [receiverEmail, setReceiverEmail] = React.useState<any>(null);
  const [emailData, setEmailData] = React.useState<any>(null);
  const [selectedEmailIds, setSelectedEmailIds] = React.useState<string[]>([]);
  const [allSelected, setAllSelected] = React.useState<boolean>(false);
  const [dateAndTime, setDateAndTime] = React.useState<string>("");
  const [searchEmailQuery, setSearchEmailQuery] = React.useState<string>("");
  const [filteredEmailData, setFilteredEmailData] = React.useState<any>(null);
  const [isOpen, setIsOpen] = React.useState<boolean>(false);

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState<boolean>(false);
  const [emailToDelete, setEmailToDelete] = React.useState<string | null>(null);
  const [isBulkDelete, setIsBulkDelete] = React.useState<boolean>(false);
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const toast = useToast();

  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);

  const { id, mailType } = useParams<Params>();

  function isEmail(value: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  const formattedMailType = mailType?.replace(/-/g, " ") ?? "";
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState<string>("");

  const validMailTypes = ["draft", "unresolved", "followup conversations"];

  // const formatHeading = (text: string) => {
  //   return text
  //     .split('-') // Split by hyphen
  //     .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
  //     .join(' '); // Join with space
  // };

  // Search debounce effect
  React.useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchQuery(searchEmailQuery);
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(timerId);
    };
  }, [searchEmailQuery]);

  const formatHeading = (text: string) => {
    if (!text) return "";

    // ✅ check if it's an email
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
    if (isEmail) return text?.toLocaleLowerCase(); // return as it is

    // otherwise format
    return text
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleItemsPerPageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(1);
    setForcePage(0);
  };

  const handlePageChange = React.useCallback((page) => {
    setCurrentPage(page + 1);
    setForcePage(page)
  }, [setCurrentPage]);

  React.useEffect(() => {
    const getEmailConversationListingByEmailUserCreated = async (value: string) => {
      try {
        setIsFetchingEmailList(true);
        const response: any = await emailConversationListingUserCreated(currentPage, itemsPerPages, id as string, value, "", debouncedSearchQuery);
        setEmailData(response.data);
        setPageCount(response.data.pagination.totalPages)
      } catch (error: any) {

      } finally {
        setIsFetchingEmailList(false);
      }
    }

    const getEmailConversationListingByCategoryUserCreated = async (value: string) => {
      try {
        setIsFetchingEmailList(true);
        const response: any = await emailConversationListingUserCreated(currentPage, itemsPerPages, id as string, "", value, debouncedSearchQuery);
        setEmailData(response.data);
        setPageCount(response.data.pagination.totalPages)
      } catch (error: any) {

      } finally {
        setIsFetchingEmailList(false);
      }
    }

    if (isEmail(formattedMailType)) {
      getEmailConversationListingByEmailUserCreated(formattedMailType);
    } else {
      getEmailConversationListingByCategoryUserCreated(formattedMailType);
    }
    //  if (validMailTypes.includes(formattedMailType)) {
    //   getEmailConversationListing();
    // }else{
    //   alert('wrong foldername with id')
    //  }
  }, [currentPage, id, formattedMailType, itemsPerPages, debouncedSearchQuery]);

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
        ids: selectedEmailIds
      };

      const response = await manualFolderDeleteEmails(deletePayload);
      if (response.status === 200) {
        toast({
          title: "Emails deleted successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        if (isEmail(formattedMailType)) {
          const updatedResponse: any = await emailConversationListingUserCreated(currentPage, itemsPerPages, id as string, formattedMailType, "", debouncedSearchQuery);
          setEmailData(updatedResponse.data);
        } else {
          const updatedResponse: any = await emailConversationListingUserCreated(currentPage, itemsPerPages, id as string, "", formattedMailType, debouncedSearchQuery);
          setEmailData(updatedResponse.data);
        }
        setSelectedEmailIds([]);
        setAllSelected(false);
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
        ids: [emailId]
      };

      const response = await manualFolderDeleteEmails(deletePayload);

      if (response.status === 200) {
        toast({
          title: "Email deleted successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });

        if (isEmail(formattedMailType)) {
          const updatedResponse: any = await emailConversationListingUserCreated(currentPage, itemsPerPages, id as string, formattedMailType, "", debouncedSearchQuery);
          setEmailData(updatedResponse.data);
          if (allSelected && updatedResponse.data.data.length !== selectedEmailIds.length - 1) {
            setAllSelected(false);
          }
        } else {
          const updatedResponse: any = await emailConversationListingUserCreated(currentPage, itemsPerPages, id as string, "", formattedMailType, debouncedSearchQuery);
          setEmailData(updatedResponse.data);
          if (allSelected && updatedResponse.data.data.length !== selectedEmailIds.length - 1) {
            setAllSelected(false);
          }
        }

        setSelectedEmailIds(selectedEmailIds.filter(id => id !== emailId));
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




  const formatDateTime = (dateString?: string) => {
    if (!dateString) return { date: null, time: null };

    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) return { date: null, time: null };

    const dayNum = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();

    const formattedDate = `${dayNum}/${month}/${year}`;

    const day = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(dateObj);
    const time = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(dateObj);

    return { date: `${formattedDate}, ${day}`, time };
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
                {formatHeading(mailType as string)}
              </Text>
            </Text>
          </Box>
          <Box mt="24px">
            <Flex w="100%" justifyContent="space-between" alignItems="center">
              <Box>
                <Heading fontSize="24px" color="#1A202C" style={{ textTransform: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailType as string) ? "none" : "capitalize" }}>
                  {formatHeading(mailType as string)}
                </Heading>
              </Box>
              <Flex fontSize="12px" gap={3} alignItems={"center"} fontWeight="400" color="#6C757D">


                {mailType?.toLowerCase() !== 'draft' ? (<>
                  <Button
                    colorScheme='red'
                    p={'4px 8px'}
                    size='md'
                    height={"38px"}
                    isDisabled={selectedEmailIds.length === 0}
                    onClick={() => openDeleteAlert()}
                  >
                    <Image src={DeleteMail} />
                  </Button>
                </>) : null}
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
      </VStack >
      <Box>
        <TableContainer
          maxH={"calc(100vh - 315px)"}
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
              <Tr>
                <Th width="70px">
                  <Checkbox
                    borderColor="#6C757D"
                    sx={{
                      ".chakra-checkbox__control": {
                        border: "1px solid #6C757D",
                      },
                    }}
                    onChange={toggleSelectAll}
                  />
                </Th>
                <Th width="600px">Email ID</Th>
                <Th>Date / Time</Th>
                <Th textAlign="end">Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {isFetchingEmailList ?
                <Tr>
                  <Td colSpan={4}>
                    <Spinner display={'flex'} alignItems={'center'} justifyContent={'center'} margin={'auto'} marginTop={'50px'} marginBottom={'50px'} />
                  </Td>
                </Tr>
                :
                (emailData?.data?.length > 0) ? emailData?.data?.map((email: any, index: number) => (
                  <Tr key={index}>
                    <Td>
                      <Checkbox
                        sx={{
                          ".chakra-checkbox__control": {
                            border: "1px solid #6C757D",
                          },
                        }}
                        borderColor="#6C757D"
                        isChecked={selectedEmailIds.includes(email._id)}
                        onChange={(e: any) => {
                          toggleSelectEmail(email._id);
                        }}
                      />
                    </Td>
                    <Td>
                      {email?.receiverEmail}
                    </Td>
                    <Td>
                      {new Date(email.createdAt).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                      {/* 12-06-2024, 21:06 */}
                    </Td>
                    <Td>
                      <Flex gap={2} alignItems={'center'} justifyContent="flex-end">
                        <Tooltip label="View Conversation" fontSize={"11px"}>
                          <Button
                            size="sm"
                            p={'4px 8px'}

                            borderColor="#6C757D"
                            onClick={() => {
                              setDateAndTime(email?.emailConversation.at(-1).dateAndTime)
                              setChatData(email?.emailConversation)
                              setReceiverEmail(email?.receiverEmail)
                              onOpen()
                            }}
                          >
                            <Image src={"/icons/eye.svg"} />
                          </Button>
                        </Tooltip>
                        <Tooltip label="Delete" fontSize={"11px"}>
                          <Button
                            colorScheme='red'
                            size="sm"
                            p={'4px 8px'}

                            _focus={{ boxShadow: "none" }}
                            onClick={(e: any) => {
                              // handleSingleDelete(email._id);
                              openDeleteAlert(email._id);

                            }}
                          >
                            <Image src={DeleteMail} />
                          </Button>
                        </Tooltip>
                      </Flex>
                    </Td>
                  </Tr>
                ))
                  : (emailData?.data?.length === 0 && searchEmailQuery.trim()) ? (
                    <Tr>
                      <Td colSpan={4} textAlign="center">
                        <Text color="#6C757D" fontSize="14px">No emails match your search criteria</Text>
                      </Td>
                    </Tr>
                  ) : (emailData?.data?.length === 0) ? (
                    <Tr>
                      <Td colSpan={4} textAlign="center">
                        <Text color="#6C757D" fontSize="14px">No emails available</Text>
                      </Td>
                    </Tr>
                  ) : null}
            </Tbody>
          </Table>
        </TableContainer>

        {
          searchEmailQuery ? "" :
            <HStack w="full" justifyContent="space-between" py={4}>
              <Flex alignItems="center">
                <Text mr="8px" fontSize="16px" fontWeight="400" color="#212529">Total {emailData?.pagination?.totalItems || 0} items</Text>
                <PaginatorTwo onPageChange={handlePageChange} pageRangeDisplayed={5} pageCount={pageCount} />
              </Flex>
              <Flex alignItems="center">
                <Select
                  defaultValue={itemsPerPages}
                  bg="white"
                  onChange={handleItemsPerPageChange}
                  width="auto"
                  color="#6C757D"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </Select>
              </Flex>
            </HStack>
        }
      </Box>
    </Box>
    <EmailChatModal isOpen={isOpen} onClose={onClose} chatData={chatData} date={date} time={time} receiverEmail={receiverEmail} />
    <DeleteAlertDialog
      isOpen={isDeleteAlertOpen}
      leastDestructiveRef={cancelRef}
      onClose={closeDeleteAlert}
      onDelete={confirmDelete}
      isBulkDelete={isBulkDelete}
      alertTitle={`Delete ${isBulkDelete ? 'Emails' : 'Email'}`}
      alertMessage={`Are you sure you want to delete ${isBulkDelete ? 'these emails' : 'this email'}? 
                  <br/><br/>If you delete the email ${isBulkDelete ? 'conversations' : 'conversation'} from here, it will be deleted from Chat Summary and Auto Reply also.`}
    />
  </>);
};

export default UserCreatedFolder;