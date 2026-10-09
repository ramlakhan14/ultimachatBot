import React, { ChangeEvent } from 'react';
import { Box, Button, Flex, Heading, Image, Input, InputGroup, InputLeftElement, Text, VStack, Menu, MenuButton, MenuList, MenuItem, TableContainer, Table, Tr, Th, Td, Thead, Tbody, Checkbox, HStack, Select, useToast, Spinner, Tooltip } from '@chakra-ui/react';
import { IoIosSearch } from 'react-icons/io';
import DeleteMail from "../../components/Icons/email-assistant/deletemail.svg";
import { PaginatorTwo } from "../../widgets/Paginator/PaginatorTwo";
import MailView from "../../components/Icons/email-assistant/mailview.svg";
import Outgoing from "./Images/outgoing.svg";
import Incoming from "./Images/incoming.svg";
import { NumberHistory } from './Modal/NumberHistory';
import { Link } from 'react-router-dom';
import { campaignRecordings, inboundCallRecords } from '../../services/VoiceBot';
import { format } from 'date-fns';
import { useParams, useLocation } from "react-router-dom";
import TableComponent from '../TableComponent';
const CallRecords = () => {
  const id: any = useParams();
  const location = useLocation();
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [forcePage, setForcePage] = React.useState<number>(0);
  const [pageCount, setPageCount] = React.useState<number>(0);
  const [itemsPerPages, setItemsPerPage] = React.useState<number>(10);
  const [isFetchingEmailList, setIsFetchingEmailList] = React.useState<boolean>(true);
  const [tableHeader, setTableheader] = React.useState<string[]>([
    'Phone Number',
    'Bot Number',
    'Call Type',
    'Duration',
    'Voice Records',
    'Date',
    // 'Action',
  ]);
  const [allSelected, setAllSelected] = React.useState<boolean>(false);
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [historyData, setHistoryData] = React.useState<any[]>([]);
  const [inviteUsersData, setInviteUsersData] = React.useState<any>();
  const [searchValue, setSearchValue] = React.useState('');
  const [debouncedSearchValue, setDebouncedSearchValue] = React.useState(searchValue);
  const [isSearchActive, setIsSearchActive] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const handlePageChange = React.useCallback((page) => {
    setCurrentPage(page + 1);
    setForcePage(page)
  }, [setCurrentPage]);

  const handleItemsPerPageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(1);
    setForcePage(0);
  };
  const onClose = () => {
    setIsOpen(false);
  }

  const handleOpenModal = (data: any) => {
    setHistoryData(data); // Set the data before opening the modal
    setIsOpen(true);
  };

  const fetchData = async (id: string, page: number, pageSize: number, searchKeyword: string) => {

    try {
      setInviteUsersData([]);
      setIsLoading(true);
      if (id) {
        const response: any = await campaignRecordings(id, pageSize, page, searchKeyword);
        setInviteUsersData(response);
      } else {
        const response: any = await inboundCallRecords(pageSize, page, searchKeyword);
        setInviteUsersData(response);
      }
    } catch (error: any) {
      // toast({
      //   title: `${error?.response?.data?.message}`,
      //   status: "error",
      //   isClosable: true,
      // })
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
    fetchData(id.id, currentPage, itemsPerPages, debouncedSearchValue);
  }, [id, debouncedSearchValue, itemsPerPages, currentPage]);


  const tableDataKeys = [
    "campaignName",
    "totalCalls",
    "status",
  ]

  React.useEffect(() => {
    if (id?.id) {
      setTableheader(["Campaign Name", ...tableHeader])
    }
  }, [])


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
        <Flex
          shrink={0}
          w="100%"
          direction="column"
          justifyContent="space-between"
        >
          <Flex width="100%" justifyContent="space-between">
            <Box>
              <Heading as="h2" fontSize="16px" color="#2977FF">
                <Link to={`/app/voice-campaign`}><Text as="span" borderBottom="1px solid #2977FF">VoiceBot Campaign</Text></Link> / <Text as="span" color="#6C757D">{id.id ? location.state : "Call History"}</Text></Heading>
            </Box>
            <Box>
            </Box>
          </Flex>

        </Flex>
      </VStack>
      <VStack w="100%" spacing="10">
        <Box w="100%">
          <Flex w="100%" justifyContent="space-between" alignItems="center">
            <Box>
              <Heading fontSize="24px" color="#1A202C" style={{ textTransform: "capitalize" }}>
                {id.id ? location.state : "Call History"}
              </Heading>
            </Box>
            <Flex fontSize="12px" gap={3} fontWeight="400" color="#6C757D" p={"10px"}>
              <InputGroup
                // border="1px solid #6C757D"
                borderRadius="4px"
                background={"#fff"}
                borderColor="#6C757D"
                bg={'white'}
              >
                <InputLeftElement pointerEvents='none'>
                  <IoIosSearch color="#6C757D" />
                </InputLeftElement>
                <Input
                  placeholder="Search"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  maxW="300px"
                />
              </InputGroup>
            </Flex>
          </Flex>
        </Box>
      </VStack >
      <Box>
        <Box minW="100%" width={"600px"}>
          <TableComponent
            isLoading={isLoading}
            data={inviteUsersData?.data?.data?.recordings || []}
            tableDataKeys={tableDataKeys}
            tableHeader={tableHeader}
            customRowRenderer={(data: any, index: number) => {
              return (
                <Tr key={data?._id}>
                  <Td> {index + 1 + (currentPage - 1) * itemsPerPages}</Td>
                  {id.id && (<Td>{data?.campaignName}</Td>)}
                  <Td minW={"170px"}>{data?.phoneNumber}</Td>
                  <Td minW={"170px"}>{data?.botNumber}</Td>
                  <Td>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {data?.callType === "Outgoing" || data?.callType === "outgoing" ? <img src={Outgoing} alt='outgoing' width={"16px"} height={"16px"} style={{ display: "inline" }} /> : <img src={Incoming} alt='incoming' width={"16px"} height={"16px"} style={{ display: "inline" }} />}
                      <span style={{ marginLeft: "4px" }}>{data?.callType}</span>
                    </div>
                  </Td>
                  <Td>{data?.callDuration}</Td>
                  <Td>{data?.recordingUrl === "N/A" ? "N/A" : <a style={{ textDecoration: "underline" }} href={data?.recordingUrl} target='_blank'>Listen Recording</a>}</Td>
                  <Td>{format(new Date(data?.createdAt), 'dd/MM/yyyy, hh:mm a')}</Td>
                  {/* <Td>
                    <Flex gap={2} alignItems={'center'}>
                      <Tooltip label="View" fontSize="11px">
                        <Button
                          size="sm"
                          _focus={{ boxShadow: "none", outline: "none" }}
                          onClick={() => handleOpenModal(data)}
                        >
                          <Image src={"/icons/eye.svg"} alt='icon' />
                        </Button>
                      </Tooltip>
                    </Flex>
                  </Td> */}
                </Tr>
              );
            }}
          />

          {/* <TableContainer overflow="auto" w="100%" boxShadow={"0px 1px 4px 0px #0C0C0D0D"} p={'12px'} bg={'#fff'} border="1px solid #E2E8F0" borderRadius="8px">
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th width="70px">
                    #
                  </Th>
                  {id.id && (<Th>Campaign Name</Th>)}
                  <Th>Phone Number</Th>
                  <Th>Bot Number</Th>
                  <Th>Call Type</Th>
                  <Th>Duration</Th>
                  <Th>Voice Records</Th>
                  <Th>Date</Th>
                  <Th>Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {isLoading ? <Tr><Td colSpan={9} textAlign="center"><Spinner /></Td></Tr> : inviteUsersData?.data?.data?.recordings.length > 0 ? inviteUsersData?.data?.data?.recordings.map((data: any, index: number) => (
                  <Tr key={data._id}>
                    <Td> {index + 1 + (currentPage - 1) * itemsPerPages}</Td>
                    {id.id && (<Td>{data?.campaignName}</Td>)}
                    <Td>{data?.phoneNumber}</Td>
                    <Td>{data?.botNumber}</Td>
                    <Td>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        {data?.callType === "Outgoing" || data?.callType === "outgoing" ? <img src={Outgoing} alt='outgoing' width={"16px"} height={"16px"} style={{ display: "inline" }} /> : <img src={Incoming} alt='incoming' width={"16px"} height={"16px"} style={{ display: "inline" }} />}
                        <span style={{ marginLeft: "4px" }}>{data?.callType}</span>
                      </div>
                    </Td>
                    <Td>{data?.callDuration}</Td>
                    <Td>{data?.recordingUrl === "N/A" ? "N/A" : <a style={{ textDecoration: "underline" }} href={data?.recordingUrl} target='_blank'>Listen Recording</a>}</Td>
                    <Td>{format(new Date(data?.createdAt), 'dd/MM/yyyy, HH:mm')}</Td>
                    <Td>
                      <Flex gap={2} alignItems={'center'}>
                        <Button
                          colorScheme='gray.500'
                          bg="#1A1E21"
                          padding={'5px'}
                          _focus={{ boxShadow: "none" }}
                          onClick={() => handleOpenModal(data)}
                        >
                          <Image src={MailView} />
                        </Button>
                      </Flex>
                    </Td>
                  </Tr>
                )) : <Tr><Td colSpan={9} textAlign="center">No data found</Td></Tr>}
              </Tbody>
            </Table>
          </TableContainer>*/}
        </Box>
        <HStack w="full" justifyContent="space-between" py={4}>
          <Flex alignItems="center">
            <Text mr="8px" fontSize="16px" fontWeight="400" color="#212529">Total&nbsp;{inviteUsersData?.data?.data?.total}&nbsp;items</Text>
            <PaginatorTwo onPageChange={handlePageChange} pageRangeDisplayed={5} pageCount={inviteUsersData?.data?.data?.totalPages} />
          </Flex>
          <Flex alignItems="center">
            <Select
              defaultValue={itemsPerPages}
              bg="white"
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
      </Box>
      <NumberHistory isOpen={isOpen} onClose={onClose} historyData={historyData} />
    </Box >
  </>);
};

export default CallRecords;