import React, { ChangeEvent } from 'react'
import { leads, leadsPagination } from '../../types/knowledgebase.type'
import { Box, Button, Flex, useToast, HStack, Input, InputGroup, InputLeftElement, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalOverlay, Select, Spinner, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tooltip, Tr, useDisclosure } from '@chakra-ui/react'
import { Paginator } from '../../widgets/Paginator/Paginator'
import styles from "./OfflineMessagesList.module.scss"
import { leadsDataSortData } from '../../services/knowledgebaseService'
import { PaginatorTwo } from '../../widgets/Paginator/PaginatorTwo'
import { verify } from 'crypto';
import { ReadIcon } from '../Icons/ReadIcon'
import ShowSummaryModal from './ShowSummaryModal'
import { set } from 'lodash'
import { colors } from '../../utils/constant'
import { useHistory, useLocation } from 'react-router-dom'
import { log } from 'console'
import { IoIosSearch } from 'react-icons/io'
// import { ReadIcon } from "../../components/Icons/ReadIcon";
type OfflineMessagesListProps = {
  isChatListLoading: boolean;
  chatSessionsPage: leadsPagination;
  selectedChat: leads;
  onPageChange: (page: number) => void;
  onSelectChat: (chatSession: leads) => void;
  knowledgeBaseId: string;
  pageNumber: number;
}

export const LeadsList = ({
  isChatListLoading,
  knowledgeBaseId,
  pageNumber,
  onSelectChat }: OfflineMessagesListProps) => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const email = queryParams.get('email');
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [crawlDatLoading, setCrawlDatLoading] = React.useState<any>('');
  const [searchValue, setSearchValue] = React.useState(email || '');
  const [leadsData, setLeadsData] = React.useState<any>([]);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [forcePage, setForcePage] = React.useState<number>(0);
  const [debouncedSearchValue, setDebouncedSearchValue] = React.useState(email || '');
  const [isSearchActive, setIsSearchActive] = React.useState<boolean>(false);
  const [isOpenSummaryModal, setIsOpenSummaryModal] = React.useState<boolean>(false);
  const [isSummaeryData, setIsSummaeryData] = React.useState<any>([]);
  const [isLeadEmail, setIsLeadEmail] = React.useState<any>('');
  const [isLeadLoading, setIsLeadLoading] = React.useState<boolean>(false);
  const history = useHistory();
  const toast = useToast();


  const handleURLClick = React.useCallback(async (data: any) => {
    onOpen();
    setCrawlDatLoading(data);
  }, [onOpen]);
  const [itemsPerPages, setItemsPerPage] = React.useState<number>(10);
  const [itemsPerPage, setItemsPerPages] = React.useState<number>(-1);

  const handleItemsPerPageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(1);
    setForcePage(0);
  };
  // console.log("knowledgeBaseId" ,knowledgeBaseId);


  const handleItemsPerPageChanges = (event: ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPages(parseInt(event.target.value, 10));
  };

  const handleInputChange = (event: any) => {
    const value = event.target.value.toLowerCase();
    setSearchValue(value);
  };

  React.useEffect(() => {
    if (email) {
      setSearchValue(email);
    }
  }, [email]);



  const handlePageChange = React.useCallback((page) => {
    setCurrentPage(page + 1);
    setForcePage(page)
  }, [setCurrentPage]);

  const fetchData = async (knowledgeBaseId: string, itemsPerPages: number, currentPage: number, itemsPerPage: number, searchValue: string) => {
    setIsLeadLoading(true);
    try {
      const userData = await leadsDataSortData(knowledgeBaseId, itemsPerPages, currentPage, itemsPerPage, searchValue);
      setLeadsData(userData.data);
    } catch (error) {
      // console.error('Failed to fetch users:', error);
    } finally {
      setIsLeadLoading(false);
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
    fetchData(knowledgeBaseId, itemsPerPages, currentPage, itemsPerPage, debouncedSearchValue);
  }, [knowledgeBaseId, itemsPerPages, currentPage, itemsPerPage, debouncedSearchValue]);

  const showSummary = async (data: any) => {
    setIsOpenSummaryModal(true);
    setIsSummaeryData(data);
  }

  // console.log("isChatListLoading", isChatListLoading);
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
      <Box display="flex" justifyContent="flex-end" mb="10px">
        <Text as="span" marginRight="8px">
          <InputGroup
            width="180px"
            borderRadius="4px"
          // borderColor="#6C757D"
          >
            <InputLeftElement pointerEvents='none'>
              <IoIosSearch color="#6C757D" />
            </InputLeftElement>

            <Input type='text' placeholder='Search by Email' color="#6C757D"
              value={searchValue}
              onChange={handleInputChange}
            />
          </InputGroup>
        </Text>
        <Text as="span">
          <Select
            value={itemsPerPage}
            onChange={handleItemsPerPageChanges}
            width="auto"
            color="#6C757D"
            mr="8px"
          >
            <option value={-1}>New to Old</option>
            <option value={1}>Old to New</option>
          </Select>
        </Text>
      </Box>
      <Text as="div" style={{ minWidth: "100%", width: "600px" }}>
        <TableContainer
          maxH="calc(100vh - 215px)"
          mt={'24px'}
          w="100%"
          boxShadow={"0px 1px 4px 0px #0C0C0D0D"}
          bg={'#fff'}
          // border="1px solid #E2E8F0"
          borderRadius="4px"
          overflowY="scroll"
          sx={{
            /* Hide ONLY vertical scrollbar */
            "&::-webkit-scrollbar:vertical": {
              width: "0px",
            },
            "&::-webkit-scrollbar-thumb:vertical": {
              background: "transparent",
            },
          }}
          overflowX="auto"

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
                <Th>Address</Th>
                <Th>Phone</Th>
                <Th>Date / Time</Th>
                <Th textAlign={'end'}>Chat Summary</Th>
              </Tr>
            </Thead>
            <Tbody>
              {isLeadLoading ? (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={10}>
                    <Spinner
                      thickness="2px"
                      speed="0.65s"
                      size="xl"
                    />
                  </Td>
                </Tr>
              ) : leadsData?.results?.length > 0 ? (
                leadsData.results.map((chatSession: any, index: number) => (
                  <Tr key={index} className={styles.tableTd}>
                    <Td>{index + 1 + (currentPage - 1) * itemsPerPages}</Td>

                    <Td
                      cursor="pointer"
                      _hover={{ color: "#2977ff" }}
                      onClick={() => {
                        if (chatSession?.chatSessionId) {
                          history.push(
                            `/app/edit-chatbot/${knowledgeBaseId}/?tab=chat-sessions&chatSessionId=${chatSession?.chatSessionId}`
                          );
                        } else {
                          toast({
                            title: "This lead has no active chat session.",
                            status: "warning",
                            isClosable: true,
                          });
                        }
                      }}
                    >
                      {chatSession?.firstName ?? chatSession?.name ?? "-"}
                    </Td>

                    <Td>{chatSession?.email ?? "-"}</Td>
                    <Td>{chatSession?.address ?? "NA"}</Td>
                    <Td>{chatSession?.phone ?? "NA"}</Td>

                    <Td>
                      {new Date(chatSession?.createdAt).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </Td>

                    <Td>
                      <Box display="flex" justifyContent="flex-end">
                        <Tooltip label="View Details" fontSize="11px">
                          <Button
                            size="sm"
                            p={'6px'}
                            fontSize={12}
                            borderColor="#6C757D"
                            _focus={{ boxShadow: "none" }}
                            onClick={() => {
                              // console.log("chatSession", chatSession);
                              if (chatSession?.messages?.length > 0) {
                                setIsLeadEmail(chatSession?.email);
                                showSummary(chatSession?.messages);
                              } else {
                                toast({
                                  title: "No messages found for this lead.",
                                  status: "warning",
                                  isClosable: true,
                                });
                              }
                            }}
                          >
                            <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M7.99976 0C12.9998 4.70071e-07 15.9998 5.5 15.9998 5.5C15.9971 5.50481 12.9976 11 7.99976 11C3.00212 11 0.00259721 5.50521 -0.000244141 5.5C-0.000244141 5.5 2.99976 0 7.99976 0ZM7.99976 1C5.87976 1 4.11976 2.16803 2.83276 3.45703C2.21241 4.08071 1.65612 4.76513 1.17261 5.5C1.65613 6.23487 2.21143 6.91928 2.83179 7.54297C4.12079 8.83197 5.87976 10 7.99976 10C10.1188 10 11.8787 8.83197 13.1677 7.54297C13.8027 6.90803 14.2976 6.26807 14.6326 5.78809C14.7056 5.68309 14.7699 5.587 14.8279 5.5C14.3444 4.76512 13.7881 4.08072 13.1677 3.45703C11.8787 2.16803 10.1198 1 7.99976 1ZM7.99976 2C8.92801 2 9.81799 2.36901 10.4744 3.02539C11.1307 3.68177 11.4998 4.57174 11.4998 5.5C11.4998 6.42826 11.1307 7.31823 10.4744 7.97461C9.81799 8.63098 8.92801 9 7.99976 9C7.0715 9 6.18152 8.63098 5.52515 7.97461C4.86877 7.31823 4.49976 6.42826 4.49976 5.5C4.49976 4.57174 4.86877 3.68177 5.52515 3.02539C6.18152 2.36901 7.0715 2 7.99976 2ZM7.99976 3C7.33671 3 6.70102 3.26358 6.23218 3.73242C5.76334 4.20126 5.49976 4.83696 5.49976 5.5C5.49976 6.16304 5.76334 6.79874 6.23218 7.26758C6.70102 7.73642 7.33672 8 7.99976 8C8.6628 8 9.29849 7.73642 9.76733 7.26758C10.2362 6.79874 10.4998 6.16304 10.4998 5.5C10.4998 4.83696 10.2362 4.20126 9.76733 3.73242C9.29849 3.26358 8.6628 3 7.99976 3Z" fill="#1A202C" />
                            </svg>

                          </Button>
                        </Tooltip>
                      </Box>
                    </Td>
                  </Tr>
                ))
              ) : (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={10}>
                    No data found
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </TableContainer>
      </Text>
      <Modal isOpen={isOpen} onClose={onClose} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalBody>
            <Table variant="simple" >
              <Tbody>
                <Tr
                  className={styles.tableTr}
                >
                  <Th>Name</Th>
                  <Td>
                    {/* {crawlDatLoading.name} */}
                  </Td>
                </Tr>
                <Tr
                  className={styles.tableTr}
                >
                  <Th>Email</Th>
                  {/* <Td>{crawlDatLoading.email}</Td> */}
                </Tr>
                <Tr
                  className={styles.tableTr}
                >
                  <Th>Message</Th>
                  {/* <Td>{crawlDatLoading.message}</Td> */}
                </Tr>
              </Tbody>
            </Table>

          </ModalBody>

          <ModalFooter>
            <Button colorScheme='blue' fontWeight="500" mr={3} onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {leadsData?.totalCount > 10 &&
        <HStack w="full" justifyContent="space-between" py={4}>
          <Flex alignItems="center">
            <Text mr="8px" fontSize="16px" fontWeight="400" color="#212529">Total {leadsData?.totalCount} items</Text>
            {/* <Paginator onPageChange={handlePageChange} pageRangeDisplayed={5} pageCount={leadsData.pages} /> */}
            <PaginatorTwo onPageChange={handlePageChange} pageRangeDisplayed={5} pageCount={leadsData?.pages} forcePage={forcePage} />
          </Flex>
          <Flex alignItems="center">
            <Select
              value={itemsPerPages}
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
      <ShowSummaryModal isLeadEmail={isLeadEmail} isOpenSummaryModal={isOpenSummaryModal} isSummaeryData={isSummaeryData} onCloseSummaryModal={() => setIsOpenSummaryModal(false)} />
    </Box >
  )
}