import { Box, Button, Flex, Heading, Image, Input, InputGroup, InputLeftElement, Text, VStack, Menu, MenuButton, MenuList, MenuItem, TableContainer, Table, Tr, Th, Td, Thead, Tbody, Checkbox, HStack, Select, useToast, Spinner, Tooltip } from '@chakra-ui/react';
import React, { ChangeEvent } from 'react';
import { Link, useParams, useHistory } from 'react-router-dom';
// import MoveTo from "../../../../components/Icons/email-assistant/moveto.svg";
import DeleteMail from "../../../../components/Icons/email-assistant/deletemail.svg";
import MailView from "../../../../components/Icons/email-assistant/mailview.svg";
import MailSendBlack from "../../../../components/Icons/email-assistant/mailsendblack.svg";
import MailDeleteBlack from "../../../../components/Icons/email-assistant/maildeleteblack.svg";
import MailSend from "../../../../components/Icons/email-assistant/mailsend.svg";
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
import { emailConversationListing, deleteEmailsFromChatSummary, approveDraftEMail, moveEmailsToFolder } from '../../../../services/emailassistantservice';
import { colors } from '../../../../utils/constant';
import EditEmailFormate from './EditEmailFormate';

interface Params {
  id?: string;
  mailType?: string; // Optional in case it's sometimes missing
}

const OtherMail = () => {
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
  const [isApproving, setIsApproving] = React.useState<boolean>(false);

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState<boolean>(false);
  const [emailToDelete, setEmailToDelete] = React.useState<string | null>(null);
  const [isBulkDelete, setIsBulkDelete] = React.useState<boolean>(false);
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const history = useHistory();
  const toast = useToast();
  // console.log("selectedEmailIds", selectedEmailIds)

  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);

  const { id, mailType } = useParams<Params>();

  const formattedMailType = mailType?.replace(/-/g, " ") ?? "";

  const validMailTypes = ["draft", "unresolved", "followup conversations"];
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
  const formatHeading = (text: string) => {
    return text
      .split('-') // Split by hyphen
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
      .join(' '); // Join with space
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

  const getEmailConversationListing = async () => {
    try {
      setIsFetchingEmailList(true);
      const response: any = await emailConversationListing(currentPage, itemsPerPages, id as string, formattedMailType, debouncedSearchQuery);
      setEmailData(response.data);
      setPageCount(response.data.pagination.totalPages)
    } catch (error: any) {

    } finally {
      setIsFetchingEmailList(false);
    }
  }
  React.useEffect(() => {
    if (validMailTypes.includes(formattedMailType)) {
      getEmailConversationListing();
    } else {
      history.push('/app/email/email-conversation');
    }
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
        ids: selectedEmailIds,
        folderName: formattedMailType
      };

      const response = await deleteEmailsFromChatSummary(deletePayload);
      if (response.status === 200) {
        toast({
          title: "Emails deleted successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });

        const updatedResponse: any = await emailConversationListing(currentPage, itemsPerPages, id as string, formattedMailType, debouncedSearchQuery);
        setEmailData(updatedResponse.data);

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
        ids: [emailId],
        folderName: formattedMailType
      };

      const response = await deleteEmailsFromChatSummary(deletePayload);

      if (response.status === 200) {
        toast({
          title: "Email deleted successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });

        const updatedResponse: any = await emailConversationListing(currentPage, itemsPerPages, id as string, formattedMailType, debouncedSearchQuery);
        setEmailData(updatedResponse.data);

        setSelectedEmailIds(selectedEmailIds.filter(id => id !== emailId));

        if (allSelected && updatedResponse.data.data.length !== selectedEmailIds.length - 1) {
          setAllSelected(false);
        }
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

  const handleApproveEmails = async () => {
    if (selectedEmailIds.length === 0) return;

    setIsApproving(true);

    try {
      // Prepare payload for multiple email approvals
      const emailPayload = {
        emails: selectedEmailIds.map(emailId => {
          const email = emailData.data.find((e: any) => e._id === emailId);
          return {
            _id: email._id,
            campaignId: email.campaignId,
            senderEmail: email.senderEmail,
            receiverEmail: email.receiverEmail,
            emailConversation: email.emailConversation.map((conversation: any) => ({
              subject: conversation.subject,
              emailTextContent: conversation.emailTextContent,
              isReceivedEmail: conversation.isReceivedEmail,
              isSentEmail: conversation.isSentEmail,
              dateAndTime: conversation.dateAndTime
            }))
          };
        })
      };

      const response: any = await approveDraftEMail(emailPayload);

      if (response.status === 201) {
        toast({
          title: "Selected emails approved successfully",
          status: "success",
          isClosable: true,
        });

        const updatedResponse: any = await emailConversationListing(currentPage, itemsPerPages, id as string, formattedMailType, debouncedSearchQuery);
        setEmailData(updatedResponse.data);

        // Reset selection
        setSelectedEmailIds([]);
        setAllSelected(false);
      }
    } catch (error: any) {
      toast({
        title: `Error approving emails: ${error.response?.data?.message || 'Unknown error'}`,
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleApproveSingleEmail = async (emailData: any) => {
    setIsApproving(true);
    const emailPayload = {
      emails: [
        {
          _id: emailData._id,
          campaignId: emailData.campaignId,
          senderEmail: emailData.senderEmail,
          receiverEmail: emailData.receiverEmail,
          emailConversation: emailData.emailConversation.map((email: any) => ({
            subject: email.subject,
            emailTextContent: email.emailTextContent,
            isReceivedEmail: email.isReceivedEmail,
            isSentEmail: email.isSentEmail,
            dateAndTime: email.dateAndTime
          }))
        }
      ]
    };

    try {
      const res: any = await approveDraftEMail(emailPayload);
      if (res.status === 201) {
        toast({
          title: "Email approved successfully",
          status: "success",
          isClosable: true,
        });
        const updatedResponse: any = await emailConversationListing(currentPage, itemsPerPages, id as string, formattedMailType, debouncedSearchQuery);
        setEmailData(updatedResponse.data);


      }
    } catch (error: any) {
      toast({
        title: `${error.response.data.message}`,
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsApproving(false);
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
  const [editDetails, setEditDetails] = React.useState<any>({ isOpen: false, data: null });

  // const handleEdit(id: string) => {


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
                {
                  mailType?.includes("followup") ? "Follow-Up Conversations" :
                    formatHeading(mailType as string)
                }
                {/* {formatHeading(mailType as string)} */}
              </Text>
            </Text>
          </Box>
          <Box mt="24px">
            <Flex w="100%" justifyContent="space-between" alignItems="center">
              <Box>
                <Heading fontSize="24px" color="#1A202C" style={{ textTransform: "capitalize" }}>
                  {
                    mailType?.includes("followup") ? "Follow-Up Conversations" :
                      formatHeading(mailType as string)
                  }
                </Heading>
              </Box>
              <Flex fontSize="12px" gap={3} alignItems="center" fontWeight="400" color="#6C757D">

                {mailType?.toLowerCase() === 'draft' ? <Menu>
                  <MenuButton as={Button} colorScheme="blue" fontWeight={500} bg="#2977ff" borderRadius="4px" _focus={{ boxShadow: "none" }} width="200px" isDisabled={selectedEmailIds.length === 0}>
                    Select Action
                  </MenuButton>
                  <MenuList zIndex={10}>
                    <MenuItem color="#333" fontSize="14px" fontWeight={500} role="button" onClick={handleApproveEmails}><Image src={MailSendBlack} mr={2} />Send</MenuItem>
                    <MenuItem color="#333" fontSize="14px" fontWeight={500} role="button" onClick={handleDeleteEmails}><Image src={MailDeleteBlack} mr={2} />Delete</MenuItem>
                  </MenuList>
                </Menu>
                  : null}
                {mailType?.toLowerCase() !== 'draft' ? (<>

                  <Button
                    colorScheme='red'
                    padding={'5px'}
                    // size="md"
                    _focus={{ boxShadow: "none" }}
                    isDisabled={selectedEmailIds.length === 0}
                    // onClick={handleDeleteEmails}
                    onClick={() => openDeleteAlert()}
                  >
                    <Image src={DeleteMail} />
                  </Button>
                </>) : null}
                <InputGroup
                  // border="1px solid #6C757D"
                  borderRadius="4px"
                  width="190px"
                  // borderColor="#6C757D"
                  bg={'white'}
                >
                  <InputLeftElement pointerEvents='none'>
                    <IoIosSearch color="#6C757D" />
                  </InputLeftElement>
                  <Input
                    placeholder="Search"
                    color="#000"
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
          maxH={"calc(100vh - 215px)"}
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
              <Tr>
                <Th width="70px">
                  <Checkbox
                    sx={{
                      ".chakra-checkbox__control": {
                        border: "1px solid #6C757D",
                      },
                    }}
                    borderColor="#6C757D"
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
                (emailData?.data?.length > 0) ?
                  emailData && emailData?.data.map((email: any, index: number) => (
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
                        {email.createdAt ? new Date(email.createdAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        }) : "NA"}
                        {/* 12-06-2024, 21:06 */}
                      </Td>
                      <Td>
                        <Flex gap={2} alignItems={'center'} justifyContent="flex-end">
                          {
                            mailType?.toLowerCase() === 'draft' &&
                            <Tooltip label="Edit" placement="top" fontSize={"11px"}>
                              <Button
                                colorScheme='gray.500'
                                bg="#F8F9FA"
                                padding={'5px'}
                                size="sm"
                                _focus={{ boxShadow: "none" }}
                                _hover={{
                                  bg: "#E9ECEF",
                                }}
                                onClick={() => {
                                  setEditDetails({ isOpen: true, data: email, fetch: getEmailConversationListing });
                                }}
                              >
                                <Image src="/icons/edit.svg" />
                              </Button>
                            </Tooltip>
                          }
                          <Tooltip label="View" placement="top" fontSize={"11px"}>
                            <Button
                              colorScheme='gray.500'
                              bg="#F8F9FA"
                              size="sm"
                              padding={'5px'}
                              _focus={{ boxShadow: "none" }}
                              _hover={{
                                bg: "#E9ECEF",
                              }}
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
                          {mailType?.toLowerCase() === 'draft' ? <Tooltip label="Send Mail" placement="top" fontSize={"11px"}>
                            <Button
                              // colorScheme='blue'
                              padding={'5px'}
                              bg="#F8F9FA"
                              size="sm"
                              _focus={{ boxShadow: "none" }}
                              disabled={isApproving}
                              // isLoading={isApproving}
                              onClick={() => handleApproveSingleEmail(email)}
                            >
                              <Image src={"/icons/sendmaildark.svg"} />
                            </Button>
                          </Tooltip> : null}
                          <Tooltip label="Delete" placement="top" fontSize={"11px"}>
                            <Button
                              colorScheme='red'
                              padding={'5px'}
                              size="sm"
                              _focus={{ boxShadow: "none" }}
                              onClick={(e: any) => {
                                // handleSingleDelete(email._id);
                                openDeleteAlert(email._id);
                              }}
                            >
                              <Image src={"/icons/delete.svg"} />
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

        {emailData && emailData?.pagination?.totalItems > 10 && <HStack w="full" justifyContent="space-between" py={4}>
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
        </HStack>}
      </Box>
    </Box >
    <EditEmailFormate onClose={() => {
      setEditDetails({ isOpen: false, data: null });
    }} data={editDetails} />
    <EmailChatModal isOpen={isOpen} onClose={onClose} chatData={chatData} date={date} time={time} receiverEmail={receiverEmail} />
    <DeleteAlertDialog
      isOpen={isDeleteAlertOpen}
      leastDestructiveRef={cancelRef}
      onClose={closeDeleteAlert}
      onDelete={confirmDelete}
      isBulkDelete={isBulkDelete}
      alertTitle={`Delete ${isBulkDelete ? 'Emails' : 'Email'}`}
      alertMessage={`Are you sure you want to delete ${isBulkDelete ? 'these emails' : 'this email'}? 
                      This action cannot be undone.`}
    />
  </>);
};

export default OtherMail;