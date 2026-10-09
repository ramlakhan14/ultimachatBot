import React, { ChangeEvent } from 'react'
import { OfflineMessagePagination, OfflineMessage, OfflineMessageData } from '../../types/knowledgebase.type'
import { Badge, Box, Button, Flex, HStack, Input, InputGroup, InputLeftElement, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Select, Spinner, Table, TableContainer, Tbody, Td, Text, Textarea, Th, Thead, Tr, useDisclosure, useToast, VStack } from '@chakra-ui/react'
import { Paginator } from '../../widgets/Paginator/Paginator'
import styles from "./OfflineMessagesList.module.scss"
import { ReadIcon } from '../Icons/ReadIcon'
import { SearchOffLineMessage, sendResponseEmail } from '../../services/knowledgebaseService'
import { PaginatorTwo } from '../../widgets/Paginator/PaginatorTwo'
import { colors } from '../../utils/constant'
import { IoIosSearch } from 'react-icons/io'
type OfflineMessagesListProps = {
    isChatListLoading: boolean;
    chatSessionsPage: OfflineMessagePagination;
    selectedChat: OfflineMessage;
    onPageChange: (page: number) => void;
    onSelectChat: (chatSession: OfflineMessage) => void;
    knowledgeBaseId: string;
    pageNumber: number;
}

export const OfflineMessagesList = ({
    isChatListLoading,
    chatSessionsPage,
    selectedChat,
    onPageChange,
    knowledgeBaseId,
    pageNumber,
    onSelectChat }: OfflineMessagesListProps) => {
    const { isOpen, onOpen, onClose } = useDisclosure()
    const [isOpens, setIsOpens] = React.useState(false);

    const onOpens = () => {
        setIsOpens(true);
    };

    const onCloses = () => {
        setIsOpens(false);
    };

    const [crawlDatLoading, setCrawlDatLoading] = React.useState<any>('');
    const [searchValue, setSearchValue] = React.useState('');
    const [offLineMessage, setOffLineMessage] = React.useState(chatSessionsPage);
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const [itemsPerPage, setItemsPerPages] = React.useState<number>(-1);
    const [message, setMessage] = React.useState("");
    const [messages, setMessages] = React.useState("");
    const [debouncedSearchValue, setDebouncedSearchValue] = React.useState(searchValue);
    const [currentPage, setCurrentPage] = React.useState<number>(1);
    const [subject, setSubject] = React.useState('');
    const [errors, setErrors] = React.useState({ subject: '', message: '' });
    const [isLoadingText, setIsLoadingText] = React.useState<boolean>(false);
    const [forcePage, setForcePage] = React.useState<number>(0);
    const [isSearchActive, setIsSearchActive] = React.useState<boolean>(false);

    const toast = useToast();
    const validate = () => {
        const newErrors = { subject: '', message: '' };
        let isValid = true;

        if (!subject) {
            newErrors.subject = 'Subject is required.';
            isValid = false;
        }

        if (!message) {
            newErrors.message = 'Response is required.';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSend = async () => {
        if (validate()) {
            const data = {
                email: crawlDatLoading.email,
                subject: subject,
                emailContent: `<p><b>Query</b>: ${crawlDatLoading.message}<br/><b>Message</b>: ${messages}</p>`
            };
            try {
                setIsLoadingText(true);
                const response = await sendResponseEmail(knowledgeBaseId, crawlDatLoading._id, data);
                setMessage("");
                fetchData(knowledgeBaseId, itemsPerPages, currentPage, itemsPerPage, debouncedSearchValue);
                setIsOpens(false);
                setSubject("");
                toast({
                    title: `${(response?.data?.message)}`,
                    status: "success",
                    isClosable: true,
                });
            } catch (error: any) {
                // setMessage("");
                // setSubject("");
                toast({
                    title: `${(error?.response?.data?.message || "Failed to send email response")}`,
                    status: "error",
                    isClosable: true,
                });
            } finally {
                setIsLoadingText(false)
                // setIsOpens(false);

            }
        }
    };
    const handleURLClick = React.useCallback(async (data: any) => {
        onOpen();
        setCrawlDatLoading(data);
    }, [onOpen]);

    const handleURLClicks = React.useCallback(async (data: any) => {
        setIsOpens(true);
        setCrawlDatLoading(data);
    }, [onOpen]);

    const [itemsPerPages, setItemsPerPage] = React.useState<number>(10);

    const handleItemsPerPageChange = (event: ChangeEvent<HTMLSelectElement>) => {
        setItemsPerPage(parseInt(event.target.value, 10));
        setCurrentPage(1);
        setForcePage(0);
    };


    const handleInputChange = (event: any) => {

        const value = event.target.value.toLowerCase();
        setSearchValue(value);
    };




    const handleItemsPerPageChanges = (event: ChangeEvent<HTMLSelectElement>) => {
        setItemsPerPages(parseInt(event.target.value, 10));
    };


    const fetchData = async (knowledgeBaseId: string, itemsPerPages: number, currentPage: number, itemsPerPage: number, searchValue: string) => {

        try {
            const userData = await SearchOffLineMessage(knowledgeBaseId, itemsPerPages, currentPage, itemsPerPage, searchValue);
            setOffLineMessage(userData.data);
        } catch (error) {
            // console.error('Failed to fetch users:', error);
        } finally {

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
    }, [searchValue,]);


    React.useEffect(() => {
        fetchData(knowledgeBaseId, itemsPerPages, currentPage, itemsPerPage, debouncedSearchValue);
    }, [knowledgeBaseId, itemsPerPages, currentPage, itemsPerPage, debouncedSearchValue]);


    const handlePageChange = React.useCallback((page) => {
        setCurrentPage(page + 1);
        setForcePage(page)
    }, [setCurrentPage]);

    return (
        <Box w="100%"
            pos="relative"
        >
            {
                isChatListLoading && <Flex
                    pos="absolute"
                    align="center"
                    justify="center"
                    top={0}
                    bottom={0}
                    right={0}
                    left={0}
                    bg="whiteAlpha.700"
                >
                    <Spinner />
                </Flex>
            }


            <Box display="flex" justifyContent="flex-end" mb="20px">
                <Text as="span" marginRight="8px">
                    <InputGroup
                        width="180px"
                        borderRadius="4px"
                    // borderColor="#6C757D"
                    >
                        <InputLeftElement pointerEvents='none'>
                            <IoIosSearch color="#6C757D" />
                        </InputLeftElement>

                        <Input type='text' placeholder='Search' color="#6C757D"
                            value={searchValue}
                            onChange={handleInputChange}
                        />
                    </InputGroup>
                </Text>
                <Text as="span" >
                    <Select
                        value={itemsPerPage}
                        onChange={handleItemsPerPageChanges}
                        width="auto"
                        color="#6C757D"
                    >
                        <option value={-1}>New to Old</option>
                        <option value={1}>Old to New</option>
                    </Select>
                </Text>
            </Box>
            <Text as="div" style={{ minWidth: "100%", width: "600px" }}>
                <TableContainer
                    maxH={"calc(100vh - 215px)"}
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
                            <Tr
                                className={styles.tableHd}
                            >
                                <Th>#</Th>
                                <Th>Name</Th>
                                <Th>Email</Th>
                                <Th>Messages</Th>
                                <Th>Date / Time</Th>
                                <Th>Status</Th>
                                <Th textAlign={'end'}>Action</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {offLineMessage?.results?.map((chatSession: OfflineMessageData, index: number) => (
                                <Tr key={index}
                                    className={styles.tableTd}
                                >
                                    <Td>{index + 1 + (currentPage - 1) * itemsPerPages}</Td>
                                    <Td>
                                        {chatSession?.name}


                                    </Td>
                                    <Td>{chatSession?.email}</Td>
                                    <Td>{chatSession?.message.slice(0, 30)}{chatSession?.message?.length > 30 && '...'}</Td>
                                    <Td color={"#6C757D"}>{new Date(chatSession.createdAt).toLocaleString('en-GB', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                    })}</Td>
                                    <Td>

                                        {chatSession?.emailStatus === undefined ? <Badge colorScheme='red' borderRadius={"50px"} p={"0px 4px"} >unsent</Badge> : chatSession?.emailStatus === "sent" ? <Badge colorScheme='green' borderRadius={"50px"} p={"0px 4px"}>sent</Badge> : <Badge colorScheme='red' borderRadius={"50px"} p={"0px 4px"} >unsent</Badge>}

                                    </Td>
                                    <Td>
                                        <Flex alignItems={'center'} justifyContent={'flex-end'}>
                                            <Button
                                                size="sm"
                                                p={"6px"}
                                                fontSize={12}
                                                variant="outline"
                                                borderColor="#6C757D"
                                                // onClick={(e) => {
                                                //     e.stopPropagation();
                                                //     updateChatSessionReadStatus(chatSessionData._id, !chatSessionData.isUnread)
                                                // }}
                                                onClick={() => {
                                                    handleURLClick(chatSession)
                                                }}
                                                mr={2} // Add some space between the buttons
                                                className={styles.readBtn}
                                            >
                                                <ReadIcon />
                                            </Button>
                                            <Button
                                                size="sm"
                                                p={"6px"}
                                                fontSize={12}
                                                variant="outline"
                                                colorScheme="#2977FF"
                                                borderColor="#2977FF"
                                                onClick={() => {
                                                    handleURLClicks(chatSession)
                                                }}
                                                disabled={chatSession.emailStatus === "sent"}

                                                className={styles.readBtn}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M0.585786 2.58579C0.960859 2.21071 1.46957 2 2 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V8.5C16 8.63261 15.9473 8.75979 15.8536 8.85355C15.7598 8.94732 15.6326 9 15.5 9C15.3674 9 15.2402 8.94732 15.1464 8.85355C15.0527 8.75979 15 8.63261 15 8.5V5.383L8 9.583L6.674 8.788L1.034 12.259C1.09101 12.4716 1.21658 12.6595 1.39124 12.7934C1.5659 12.9274 1.77988 13 2 13H7.5C7.63261 13 7.75979 13.0527 7.85355 13.1464C7.94732 13.2402 8 13.3674 8 13.5C8 13.6326 7.94732 13.7598 7.85355 13.8536C7.75979 13.9473 7.63261 14 7.5 14H2C1.4713 14 0.964097 13.7907 0.58931 13.4178C0.214524 13.0448 0.00264352 12.5387 0 12.01V4C0 3.46957 0.210714 2.96086 0.585786 2.58579ZM1 11.105L5.708 8.208L1 5.383V11.105ZM1 4V4.217L8 8.417L15 4.217V4C15 3.73478 14.8946 3.48043 14.7071 3.29289C14.5196 3.10536 14.2652 3 14 3H2C1.73478 3 1.48043 3.10536 1.29289 3.29289C1.10536 3.48043 1 3.73478 1 4Z" fill="#2977FF" />
                                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M14.9749 14.9749C15.6313 14.3185 16 13.4283 16 12.5C16 11.5717 15.6313 10.6815 14.9749 10.0251C14.3185 9.36875 13.4283 9 12.5 9C11.5717 9 10.6815 9.36875 10.0251 10.0251C9.36875 10.6815 9 11.5717 9 12.5C9 13.4283 9.36875 14.3185 10.0251 14.9749C10.6815 15.6313 11.5717 16 12.5 16C13.4283 16 14.3185 15.6313 14.9749 14.9749Z" fill="#2977FF" />
                                                    <path d="M15 14.0595C15 14.1068 14.9797 14.1523 14.9437 14.1858C14.9076 14.2192 14.8587 14.2381 14.8077 14.2381C14.7567 14.2381 14.7078 14.2192 14.6717 14.1858C14.6357 14.1523 14.6154 14.1068 14.6154 14.0595C14.6148 13.5387 14.3917 13.0395 13.9951 12.6712C13.5986 12.303 13.0609 12.0958 12.5001 12.0953H10.6566L11.4823 12.8618C11.5184 12.8953 11.5387 12.9407 11.5387 12.9881C11.5387 13.0355 11.5184 13.0809 11.4823 13.1144C11.4462 13.1479 11.3973 13.1668 11.3463 13.1668C11.2952 13.1668 11.2463 13.1479 11.2102 13.1144L10.0564 12.043C10.0385 12.0264 10.0243 12.0067 10.0147 11.9851C10.005 11.9634 10 11.9402 10 11.9167C10 11.8932 10.005 11.87 10.0147 11.8483C10.0243 11.8266 10.0385 11.8069 10.0564 11.7904L11.2102 10.719C11.2463 10.6854 11.2952 10.6666 11.3463 10.6666C11.3973 10.6666 11.4462 10.6854 11.4823 10.719C11.5184 10.7525 11.5387 10.7979 11.5387 10.8453C11.5387 10.8927 11.5184 10.9381 11.4823 10.9716L10.6566 11.7381H12.5001C13.1629 11.7388 13.7983 11.9836 14.267 12.4188C14.7357 12.854 14.9993 13.444 15 14.0595Z" fill="white" />
                                                </svg>

                                            </Button>
                                        </Flex>
                                    </Td>

                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </TableContainer>
            </Text>
            <Modal isOpen={isOpen} onClose={onClose} size="6xl" isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader textAlign="center" fontSize="18px" fontWeight="700" color="#1A202C" py="24px">
                        Offline Message Query
                    </ModalHeader>
                    <ModalCloseButton />
                    <ModalBody py={0}>
                        <Table variant="simple" >
                            <Tbody>
                                <Tr
                                    className={styles.tableTr}
                                >
                                    <Th>Name</Th>
                                    <Td>
                                        {crawlDatLoading?.name}
                                    </Td>
                                </Tr>
                                <Tr
                                    className={styles.tableTr}
                                >
                                    <Th>Email</Th>
                                    <Td>{crawlDatLoading?.email}</Td>
                                </Tr>
                                <Tr
                                    className={styles.tableTr}
                                >
                                    <Th>Message</Th>
                                    <Td>{crawlDatLoading?.message}</Td>
                                </Tr>
                            </Tbody>
                        </Table>

                    </ModalBody>

                    <ModalFooter>
                        <Button color="#fff" bg={"#2977FF"} _hover={{ background: "#2977FF" }} fontWeight={500} onClick={onClose}>
                            Close
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
            <Modal isOpen={isOpens} onClose={onCloses} size="6xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalCloseButton />
                    <ModalBody>
                        <Box pt={4} mt="30px">
                            {/* To field */}
                            <HStack mb={4} justifyContent="space-between">
                                <Text fontWeight="500" width="100px">To:</Text>
                                <Input placeholder="To" value={crawlDatLoading.email} isReadOnly />
                            </HStack>

                            <VStack mb={4} align="stretch"> {/* Use VStack for vertical stacking */}
                                <HStack justifyContent="space-between">
                                    <Text fontWeight="500" width="100px">Subject: <span style={{ color: "red" }}>*</span></Text>
                                    <Input
                                        placeholder="Subject"

                                        variant="unstyled"
                                        border="1px solid #dee2e6"
                                        p={2}
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                    />
                                </HStack>
                                {errors.subject && <Text color="red.500" ml="100px !important">{errors.subject}</Text>} {/* Show error message below input */}
                            </VStack>

                            <HStack mb={4} justifyContent="space-between">
                                <Text fontWeight="500" width="100px">Query:</Text>
                                <Input placeholder="Query" value={crawlDatLoading.message} isReadOnly />
                            </HStack>

                            {/* Message textarea */}
                            <Box display="flex">
                                <Text fontWeight="500" width="100px">Response:<span style={{ color: "red" }}>*</span></Text>
                                <Textarea
                                    placeholder="Compose your message..."

                                    p={2}
                                    variant="unstyled"
                                    border="1px solid #dee2e6"
                                    rows={5}
                                    value={message}
                                    marginInline="0.5rem 0px"
                                    onChange={(e) => {
                                        const formattedMessage = e.target.value.replace(/\n/g, "<br>");
                                        setMessage(e.target.value);
                                        setMessages(formattedMessage);
                                    }}
                                />
                            </Box>
                            {errors.message && <Text color="red.500" ml="100px !important">{errors.message}</Text>}
                            {/* Action toolbar */}
                        </Box>
                    </ModalBody>

                    <ModalFooter>
                        <Button colorScheme='blue' fontWeight={500} onClick={handleSend} isLoading={isLoadingText}>Send</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
            {(offLineMessage?.totalCount ?? 0) > 10 &&
                <HStack w="full" justifyContent="space-between" p={4}>
                    <Flex alignItems="center">
                        <Text mr="8px" fontSize="16px" fontWeight="400" color="#212529">Total {offLineMessage?.totalCount} items</Text>
                        {/* <Paginator onPageChange={handlePageChange} pageRangeDisplayed={5} pageCount={offLineMessage.pages} /> */}
                        <PaginatorTwo onPageChange={handlePageChange} pageRangeDisplayed={5} pageCount={offLineMessage.pages} forcePage={forcePage} />

                    </Flex>
                    <Flex alignItems="center">
                        <Select
                            value={itemsPerPages}
                            onChange={handleItemsPerPageChange}
                            width="auto"
                            color="#6C757D"
                            mr="8px"
                        >
                            <option value={10}>10 / page</option>
                            <option value={20}>20 / page</option>
                            <option value={50}>50 / page</option>
                        </Select>
                    </Flex>
                </HStack>
            }

        </Box >
    )
}