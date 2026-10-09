import React, { ChangeEvent, useState } from 'react';
import { format } from 'date-fns';

import {
  Box, Flex, Heading, VStack, TableContainer,
  Table,
  Thead,
  Tbody, Checkbox,
  Tr,
  Th,
  Td, Tabs, Tab, TabPanels, TabPanel,
  InputGroup,
  InputLeftElement,
  Input,
  Text,
  Image,
  Tooltip,
  Button,
  HStack,
  Select,
  // AlertDialog,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Spinner,
  useDisclosure,
  Stack,
  RadioGroup,
  Radio,
  Icon,
  TabList,
  Link,
  useToast,
  OrderedList,
  ListItem,
  PopoverArrow,
  PopoverContent,
  Popover,
  PopoverTrigger,
  Badge,
  Divider,
} from '@chakra-ui/react';
import { useHistory, useLocation } from 'react-router-dom';
import { fetchAllSetings } from '../../../services/emailassistantservice';
import WarmupSettings from './WarmupSettings';
import { IoIosSearch } from 'react-icons/io';
import { colors } from '../../../utils/constant';
import { PaginatorTwo } from '../../../widgets/Paginator/PaginatorTwo';
import { getSmtpConfig } from '../../../services/ultimamailsettings';
import CryptoJS from 'crypto-js'; // Import crypto-js for encryption
import { ENCRYPTION_DECRYPTION_KEY } from '../../../config';
import { callApi } from '../../../services/callApi';
import AddSmtp from './AddSmtp';
import { GoInfo } from 'react-icons/go';
// import EmailWarmUpEdit from './EmailWarmUpEdit';

const EmailWarmUp = () => {
  const [isFetching, setIsFetching] = React.useState(true);
  const [settingData, setSettingData] = React.useState<any>({});
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [forcePage, setForcePage] = React.useState<number>(0);
  const [itemsPerPage, setItemsPerPage] = React.useState<number>(10);
  const [smtpConfigs, setSmtpConfigs] = React.useState<any>({});
  const [deleteAlert, setdeleteAlert] = React.useState<any>("");
  const cancelRef = React.useRef<HTMLButtonElement>(null)
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");

  // console.log(settingData, "settingData");
  let history = useHistory();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [filters, setfilter] = React.useState("all");
  const [selectedEmailIds, setSelectedEmailIds] = React.useState([]);
  const [editDetails, setEditDetails] = React.useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  // your list data
  // example: const listData = [{ _id: "1", name: "A" }, { _id: "2", name: "B" }]

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedItems(smtpConfigs?.data || []);
    } else {
      setSelectedItems([]);
    }
  };


  // Search debounce effect
  React.useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(timerId);
    };
  }, [searchQuery]);

  const toggleSingleSelect = (item: any) => {
    setSelectedItems((prev) => {
      const exists = prev.some((i) => i._id === item._id);

      if (exists) {
        return prev.filter((i) => i._id !== item._id);
      } else {
        return [...prev, item];
      }
    });
  };

  const fetchData = async () => {
    try {
      setIsFetching(true);

      const query = [
        `page=${currentPage}`,
        `limit=${itemsPerPage}`,
        searchQuery && `search=${searchQuery}`,
        filters && `status=${filters}`,
      ]
        .filter(Boolean)
        .join("&");
      // const query = `?page=${currentPage}&limit=${itemsPerPage}`;

      const response: any = await callApi(
        `/mailivery-warmup/campaigns?${query}`,
        "get",
        ""
      );
      setSmtpConfigs(response.data);
      // pagination from API
      setCurrentPage(response.data.pagination.currentPage);
      setTotalPages(response.data.pagination.totalPages);
      setTotalItems(response.data.pagination.totalItems);

      setIsFetching(false);
    } catch (error: any) {
      toast({
        title: error?.response?.data?.message || "Failed to delete SMTP settings",
        status: "error",
        isClosable: true,
      });
      setIsFetching(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, [currentPage, itemsPerPage, filters, debouncedSearchQuery]);

  const handleConfirmDelete = async (item: any) => {
    try {
      setIsFetching(true)
      const response: any = await callApi(`/mailivery-warmup/campaigns/${deleteAlert}`, "delete", "");
      setIsFetching(false)
      // console.log(response?.data, "response.data.data")
      fetchData();
      setdeleteAlert("")
      toast({
        title: response?.data?.message || "SMTP settings saved successfully",
        status: "success",
        isClosable: true,
      });
      // setSmtpConfigs(response?.data);
    } catch (error: any) {
      toast({
        title: error?.response?.data?.message || "Failed to delete SMTP settings",
        status: "error",
        isClosable: true,
      });
      setIsFetching(false)
      // console.log(error);
    }
  };


  const handlePageChange = React.useCallback((page) => {
    setCurrentPage(page + 1);
    setForcePage(page);
  }, []);


  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };




  return (<>
    <Box
      w="100%"
      p="6"
      shadow="sm"
      h="100%"
      position="relative"
      overflow="auto"
    >
      <Box w="100%">
        <VStack w="100%" spacing="10">
          <Flex
            shrink={0}
            w="100%"
            direction="column"
            justifyContent="space-between"
          >
            <Flex width="100%" justifyContent="space-between">
              <Box>
                <Heading fontSize="24px" color="#1A202C">Email Warm-up Accounts </Heading>
              </Box>
              <Flex justifyContent="end" gap={"10px"} alignItems={"center"}>
                {
                  // !!totalItems &&
                  <InputGroup
                    width="190px"
                    outline={"none"}
                    height={"34px"}
                    borderColor={"#CED4DA"}                  >
                    <InputLeftElement height={"34px"} pointerEvents='none'>
                      <IoIosSearch color="#6C757D" />
                    </InputLeftElement>
                    <Input
                      height={"34px"}
                      borderColor={"#CED4DA"}
                      border={"1px solid #CED4DA"}
                      placeholder="Search"
                      bg="white"
                      value={searchQuery}
                      onChange={handleSearchChange} // // maxW="300px"
                    />
                  </InputGroup>
                }

                <Select
                  // value={campaign}
                  bg="white"
                  height={"34px"}
                  maxWidth={"146px"}
                  borderRadius="4px"
                  onChange={(e) => {
                    setfilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  width="auto"
                  borderColor={"#CED4DA"}
                  color="#6C757D"
                >
                  <option value="all">Filter: All</option>
                  <option value={"active"}>Only Active</option>
                  <option value={"paused"}>Only Paused</option>

                </Select>
                <Box>
                  <Tooltip label="Edit" placement="top" fontSize={"11px"}>
                    <Button
                      colorScheme='blue'
                      size="sm"
                      disabled={selectedItems.length != 1}
                      padding={"4px 8px"}
                      onClick={() => {
                        onOpen()
                        // setEditDetails();
                      }}
                      display={"flex"}
                      alignItems={"center"}
                      gap={"8px"}
                      fontSize={"14px"}
                      fontWeight={"500"}
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M12.1492 0.131757C12.1957 0.0851938 12.2508 0.048251 12.3116 0.0230445C12.3723 -0.00216192 12.4375 -0.0151367 12.5032 -0.0151367C12.569 -0.0151367 12.6341 -0.00216192 12.6949 0.0230445C12.7556 0.048251 12.8108 0.0851938 12.8572 0.131757L15.8572 3.13176C15.9038 3.1782 15.9407 3.23338 15.9659 3.29412C15.9911 3.35487 16.0041 3.41999 16.0041 3.48576C16.0041 3.55152 15.9911 3.61665 15.9659 3.67739C15.9407 3.73814 15.9038 3.79331 15.8572 3.83976L5.85722 13.8398C5.80924 13.8874 5.75209 13.9248 5.68922 13.9498L0.689224 15.9498C0.59836 15.9861 0.49882 15.995 0.402944 15.9754C0.307067 15.9557 0.219071 15.9083 0.149865 15.8391C0.0806583 15.7699 0.0332848 15.6819 0.0136173 15.586C-0.00605013 15.4902 0.00285338 15.3906 0.039224 15.2998L2.03922 10.2998C2.06415 10.2369 2.10157 10.1797 2.14922 10.1318L12.1492 0.131757ZM11.2102 2.48576L13.5032 4.77876L14.7962 3.48576L12.5032 1.19276L11.2102 2.48576ZM12.7962 5.48576L10.5032 3.19276L4.00322 9.69276V9.98576H4.50322C4.63583 9.98576 4.76301 10.0384 4.85678 10.1322C4.95055 10.226 5.00322 10.3531 5.00322 10.4858V10.9858H5.50322C5.63583 10.9858 5.76301 11.0384 5.85678 11.1322C5.95055 11.226 6.00322 11.3531 6.00322 11.4858V11.9858H6.29622L12.7962 5.48576ZM3.03522 10.6608L2.92922 10.7668L1.40122 14.5878L5.22222 13.0598L5.32822 12.9538C5.23284 12.9181 5.15062 12.8542 5.09254 12.7706C5.03446 12.6869 5.0033 12.5876 5.00322 12.4858V11.9858H4.50322C4.37062 11.9858 4.24344 11.9331 4.14967 11.8393C4.0559 11.7455 4.00322 11.6184 4.00322 11.4858V10.9858H3.50322C3.4014 10.9857 3.30203 10.9545 3.2184 10.8964C3.13477 10.8384 3.07086 10.7561 3.03522 10.6608Z" fill="white" />
                      </svg>
                      Edit
                    </Button>
                  </Tooltip>
                </Box>
              </Flex>

            </Flex>
          </Flex>
        </VStack>
      </Box>
      <Box minW="100%" w="600px">
        <TableContainer
          maxH={"calc(100vh - 245px)"} // height for vertical scroll
          mt={'24px'}
          w="100%"
          boxShadow={"0px 1px 4px 0px #0C0C0D0D"}
          bg={'#fff'}
          border="1px solid #E2E8F0"
          borderRadius="8px"
          sx={{
            /* Hide ONLY vertical scrollbar */
            "&::-webkit-scrollbar:vertical": {
              width: "0px",
            },
            "&::-webkit-scrollbar-thumb:vertical": {
              background: "transparent",
            },
          }}
          overflowY="auto"
          overflowX="scroll"

        >
          <Table variant="simple" sx={{
            borderCollapse: "collapse"  // ✅ important fix
          }}>
            <Thead sx={{
              position: 'sticky',
              top: -1,
              zIndex: 1,
              fontSize: '14px',
              fontWeight: '600'
            }} bg={colors.tableHeadingBg}  >
              <Tr>
                <Th>
                  <Checkbox
                    sx={{
                      ".chakra-checkbox__control": {
                        border: "1px solid #6C757D",
                      },
                    }}
                    // isChecked={isAllSelected}
                    isChecked={smtpConfigs?.data?.length > 0 && selectedItems?.length === smtpConfigs?.data?.length}
                    isIndeterminate={
                      selectedItems?.length > 0 &&
                      selectedItems?.length < smtpConfigs?.data.length
                    }
                    onChange={toggleSelectAll}
                    borderColor="#6C757D"
                  // onChange={toggleSelectAll}
                  />
                </Th>
                {/* <Th>Name</Th> */}

                <Th>Email</Th>
                <Th>
                  <Flex alignItems={'center'} gap="5px">
                    Daily Warm-up
                    <Popover strategy="fixed">
                      <PopoverTrigger>
                        <Box
                          cursor="pointer"
                          as="span"
                        >
                          <GoInfo color="#6C757D" />
                        </Box>
                      </PopoverTrigger>
                      <PopoverContent
                        bg="#efefef"
                        fontWeight={500}
                        color="#333"
                        p={2}
                        width="250px"
                        fontSize="12px"
                        border="1px solid #ccc"
                        lineHeight="20px"
                        style={{ boxShadow: 'none' }}
                        borderRadius="4px"
                      >
                        <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                        {/* <PopoverCloseButton /> */}
                        <Box whiteSpace="pre-wrap">
                          Number of warm-up emails scheduled to send for the day (0 will be displayed on non-sending days, such as weekends)

                        </Box>
                      </PopoverContent>
                    </Popover>
                  </Flex>
                </Th>
                <Th>
                  <Flex alignItems={'center'} gap="5px">
                    Reply Rate

                    <Popover strategy="fixed">
                      <PopoverTrigger>
                        <Box
                          cursor="pointer"
                          as="span"
                        >
                          <GoInfo color="#6C757D" />
                        </Box>
                      </PopoverTrigger>
                      <PopoverContent
                        bg="#efefef"
                        fontWeight={500}
                        color="#333"
                        p={2}
                        width="250px"
                        fontSize="12px"
                        border="1px solid #ccc"
                        lineHeight="20px"
                        style={{ boxShadow: 'none' }}
                        borderRadius="4px"
                        zIndex={9999}
                      >
                        <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                        {/* <PopoverCloseButton /> */}
                        <Box whiteSpace="pre-wrap">
                          % of warmup emails that will get a reply
                        </Box>
                      </PopoverContent>
                    </Popover>
                  </Flex>
                </Th>
                <Th> <Flex alignItems={'center'} gap="5px">Spam Rate
                  <Popover strategy="fixed">
                    <PopoverTrigger>
                      <Box
                        cursor="pointer"
                        as="span"
                      >
                        <GoInfo color="#6C757D" />
                      </Box>
                    </PopoverTrigger>
                    <PopoverContent
                      bg="#efefef"
                      fontWeight={500}
                      color="#333"
                      p={2}
                      width="250px"
                      fontSize="12px"
                      border="1px solid #ccc"
                      lineHeight="20px"
                      style={{ boxShadow: 'none' }}
                      borderRadius="4px"
                    >
                      <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                      {/* <PopoverCloseButton /> */}
                      <Box whiteSpace="pre-wrap">
                        Spam rate of your warmup email in last 14 days, calculated after a minimum of 50 emails are sent.

                      </Box>
                    </PopoverContent>
                  </Popover>
                </Flex>
                </Th>
                <Th> <Flex alignItems={'center'} gap="5px">Saved From Spam
                  <Popover strategy="fixed">
                    <PopoverTrigger>
                      <Box
                        cursor="pointer"
                        as="span"
                      >
                        <GoInfo color="#6C757D" />
                      </Box>
                    </PopoverTrigger>
                    <PopoverContent
                      bg="#efefef"
                      fontWeight={500}
                      color="#333"
                      p={2}
                      width="250px"
                      fontSize="12px"
                      border="1px solid #ccc"
                      lineHeight="20px"
                      style={{ boxShadow: 'none' }}
                      borderRadius="4px"
                    >
                      <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                      {/* <PopoverCloseButton /> */}
                      <Box whiteSpace="pre-wrap">
                        Number of warm-up emails moved from spam folder to inbox in last 14 days
                      </Box>
                    </PopoverContent>
                  </Popover>
                </Flex>
                </Th>
                <Th>Status</Th>
                <Th>Created At</Th>
                <Th textAlign={'end'}>Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {isFetching ? <Tr>
                <Td colSpan={9}>
                  <Spinner display={'flex'} alignItems={'center'} justifyContent={'center'} margin={'auto'} marginTop={'50px'} marginBottom={'50px'} />
                </Td>
              </Tr> : (!isFetching && (smtpConfigs?.data?.length == 0 || smtpConfigs?.data == undefined)) ?
                <Tr>
                  <Td colSpan={9} textAlign="center">
                    No data found
                  </Td>
                </Tr> : smtpConfigs?.data?.map((data: any, index: number) => (
                  <Tr key={data.id}>
                    <Td>

                      <Checkbox
                        sx={{
                          ".chakra-checkbox__control": {
                            border: "1px solid #6C757D",
                          },
                        }}
                        borderColor="#6C757D"
                        // isChecked={selectedItems.includes(data._id)}
                        isChecked={selectedItems.some((i) => i._id === data._id)}
                        onChange={(e: any) => {
                          // toggleSelectEmail(email._id);
                          toggleSingleSelect(data)
                        }}
                      />
                    </Td>
                    <Td>
                      <Flex gap="5px" minW={"300px"}>
                        <Image src="/icons/ic-email.svg" />

                        {data.email}
                      </Flex>
                    </Td>
                    <Td>{data.scheduledForToday || "-"}</Td>
                    <Td> {data.responseRate !== null &&
                      data.responseRate !== undefined &&
                      data.responseRate >= 0
                      ? `${data.responseRate}%`
                      : "-"}</Td>
                    <Td>
                      {/* {data.isWarmUpEnabled ? ( */}
                      <Text>
                        {data.spamRateInLast14Days !== null &&
                          data.spamRateInLast14Days !== undefined &&
                          data.spamRateInLast14Days >= 0
                          ? `${data.spamRateInLast14Days}%`
                          : "-"}
                      </Text>

                    </Td>
                    <Td>
                      <Text>
                        {data.savedFromSpam ? data.savedFromSpam : "NA"}
                      </Text>
                    </Td>
                    <Td>

                      <Box>
                        {
                          data?.statusCode?.toLowerCase() == "paused" ?
                            <Badge
                              px={3}
                              py={1}
                              borderRadius="full"
                              bg="#FDEDE4"
                              color="#D35400"
                              fontSize="12px"
                              fontWeight="500"
                              textTransform={"capitalize"}
                            // autoCapitalize=''
                            >
                              Paused
                            </Badge> :
                            <Badge
                              px={3}
                              py={1}
                              textTransform={"capitalize"}

                              borderRadius="full"
                              bg="#E6F4EA"
                              color="#1E7F4F"
                              fontSize="12px"
                              fontWeight="500"
                            >
                              
                              Ramp Up Active
                            </Badge>

                        }
                      </Box>
                      {/* {data?.statusCode} */}
                    </Td>
                    <Td>
                      {data.createdAt ? format(new Date(data.createdAt), 'dd/MM/yyyy, hh:mm a') : "NA"}
                    </Td>
                    <Td>
                      <Flex gap="10px" justifyContent="flex-end">
                        <Tooltip label={"Edit"} fontSize={'10px'}>
                          <Button
                            colorScheme="gray"
                            background={"#F8F9FA"}
                            padding={"4px 8px"}
                            onClick={() => {
                              setSelectedItems([data])
                              onOpen()
                            }}
                            size="sm"
                          >
                            <Image src={`/icons/edit.svg`} alt='icon' />
                          </Button>
                        </Tooltip>
                        <Tooltip label={"Delete"} fontSize={'10px'}>
                          <Button
                            padding={"4px 8px"}
                            colorScheme="red"
                            onClick={() => {
                              setdeleteAlert(data?.mailiveryCampaignId)
                            }}
                            size="sm"
                          >
                            <Image src={`/icons/delete.svg`} alt='icon' />
                          </Button>
                        </Tooltip>
                      </Flex>
                    </Td>
                  </Tr>
                ))}
            </Tbody>
          </Table>
        </TableContainer>

        {
          totalItems > 10 &&
          <HStack w="full" justifyContent="space-between" py={2} mb={2}>
            <Flex alignItems="center">
              <Text mr="8px" fontSize="16px" fontWeight="400" color="#212529">Total {totalItems} items</Text>
              <PaginatorTwo
                onPageChange={handlePageChange}
                pageRangeDisplayed={5}
                pageCount={totalPages}
                forcePage={forcePage}
              />
            </Flex>
            <Flex alignItems="center">
              <Select
                value={itemsPerPage}
                bg="white"
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                }}
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
      </Box >
    </Box >
    <AlertDialog
      isOpen={!!deleteAlert}
      leastDestructiveRef={cancelRef}
      onClose={() => { setdeleteAlert("") }}
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Delete Email Account ?
          </AlertDialogHeader>
          <AlertDialogBody>
            You can't undo this action afterwards.
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button
              ref={cancelRef}
              size='sm' onClick={() => {
                setdeleteAlert("")
              }}>
              Cancel
            </Button>
            <Button
              size="sm"
              colorScheme="red"
              disabled={isFetching}
              variant="solid" onClick={handleConfirmDelete} ml={3}>

              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>



    <Modal isOpen={isOpen}
      closeOnOverlayClick={false}
      // marginTop={"10px"}
      onClose={onClose} size="2xl" isCentered scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent p={2} borderRadius="md" h="95vh" maxH="95vh">
        <ModalHeader>
          <Box>
            <Heading fontSize={"20px"}>
              Edit Details
            </Heading>
            <Text my="2" mb="15px" lineHeight={"20px"} fontWeight={"400"} fontSize={"14px"} color={"#6C757D"}>Settings will be applied to <b>{selectedItems?.length} mailboxes</b> </Text>
            <Divider mt={"5px"} />
          </Box>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <WarmupSettings details={selectedItems} getupdatedList={fetchData} onClose={() => onClose()} />
        </ModalBody>
      </ModalContent>
    </Modal>


  </>
  );
};

export default EmailWarmUp;