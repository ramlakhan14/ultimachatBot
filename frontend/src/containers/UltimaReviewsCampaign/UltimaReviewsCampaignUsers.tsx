import React, { useEffect, useState, useCallback } from 'react';
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
  Image,
  Spinner,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure
} from "@chakra-ui/react";
import { IoIosSearch } from "react-icons/io";
import { Link, useHistory, useParams } from "react-router-dom";
import styles from "./UltimaReviews.module.scss";
import { PaginatorTwo } from "../../widgets/Paginator/PaginatorTwo";
import checkIcon from "./SignedUpTrue.svg";
import crossIcon from "./SignedUpFailed.svg";
import iconWarning from "./iconWarning.png";
import axios from 'axios';
import { getUltimaReviewsCampaignLeads, LeadStatusChange } from '../../services/UltimaReviewsConnection';
import TableComponent from '../TableComponent';

const UltimaReviewsCampaignUsers = () => {
  const { id: campaignId } = useParams<{ id: string }>();
  const [leadsData, setLeadsData] = useState({
    ultimaReviewLeadsCampaigns: [],
    totalPages: 0,
    currentPage: 1,
    totalCount: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchValue, setSearchValue] = useState('');
  const [forcePage, setForcePage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState({
    email: '',
    status: ''
  });

  const history = useHistory();
  const toast = useToast();

  // Debounce implementation
  const debounce = (func: (...args: any[]) => void, delay: number) => {
    let timeoutId: NodeJS.Timeout | null = null;
    return function (this: unknown, ...args: any[]) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  };

  const fetchLeads = async (page = 1, limit = 10, search = '') => {
    // if (!campaignId) return;

    setIsLoading(true);
    try {
      const response = await getUltimaReviewsCampaignLeads(campaignId, page, limit, search);
      if (response.status === 200) {
        setLeadsData(response.data.data);
      } else {
        toast({
          title: "Error",
          description: response.data.message || "Failed to fetch leads",
          status: "error",
          duration: 3000,
          isClosable: true
        });
      }
    } catch (error) {
      // console.error("Error fetching leads:", error);
      toast({
        title: "Error",
        description: "Failed to fetch leads. Please try again later.",
        status: "error",
        duration: 3000,
        isClosable: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchTerm: string) => {
      setCurrentPage(1);
      setForcePage(0);
      fetchLeads(1, itemsPerPage, searchTerm);
    }, 500),
    [itemsPerPage, campaignId]
  );

  useEffect(() => {
    fetchLeads(currentPage, itemsPerPage, searchValue);
  }, [currentPage, itemsPerPage, campaignId]);

  const handlePageChange = (page: number) => {
    const newPage = page + 1;
    setCurrentPage(newPage);
    setForcePage(page);
  };

  const handleItemsPerPageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = parseInt(event.target.value, 10);
    setItemsPerPage(newLimit);
    setCurrentPage(1);
    setForcePage(0);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchValue(value);
    debouncedSearch(value);
  };

  const handleLeadStatusClick = (email: string, status: string) => {
    setPendingStatusChange({ email, status });
    onOpen();
  };

  const handleLeadStatusChange = async () => {
    setIsUpdatingStatus(true);
    try {
      const response = await LeadStatusChange({
        email: pendingStatusChange.email,
        LeadStatus: pendingStatusChange.status
      });

      if (response.status === 201) {
        toast({
          title: "Success",
          description: "Lead status updated successfully",
          status: "success",
          duration: 3000,
          isClosable: true
        });

        // Refresh leads data after status update
        fetchLeads(currentPage, itemsPerPage, searchValue);
      } else {
        toast({
          title: "Error",
          description: response.data.message || "Failed to update lead status",
          status: "error",
          duration: 3000,
          isClosable: true
        });
      }
    } catch (error) {
      // console.error("Error updating lead status:", error);
      toast({
        title: "Error",
        description: "Failed to update lead status. Please try again later.",
        status: "error",
        duration: 3000,
        isClosable: true
      });
    } finally {
      setIsUpdatingStatus(false);
      onClose();
    }
  };

  return (
    <Box
      w="100%"
      p="6"
      shadow="sm"
      h="100%"
      position="relative"
      overflow="auto"
    >
      <Box mb={4}>
        <Text as="span" fontSize="16px" fontWeight="400"><Link to="/app/ultima-reviews/campaign">
          <Text as="span" color="#2977FF" textDecoration="underline">Ultima Reviews Campaign</Text></Link>  / <Text as="span" color="#6C757D">
            Leads
          </Text></Text>
      </Box>
      <VStack w="100%" spacing="10">
        <Flex
          shrink={0}
          w="100%"
          direction="column"
          justifyContent="space-between"
        >
          <Flex width="100%" justifyContent="space-between" alignItems="center">
            <Box>
              <Heading fontSize="24px" color="#1A202C">Ultima Reviews {campaignId === undefined ? 'All Leads' : 'Leads'}</Heading>
            </Box>
            <Box>
              <Flex justifyContent="flex-end">
                <InputGroup
                  width="240px"
                  borderRadius="4px"
                  outline="none"
                >
                  <InputLeftElement pointerEvents="none">
                    <IoIosSearch color="#6C757D" />
                  </InputLeftElement>
                  <Input
                    type="text"
                    placeholder="Search"
                    color="#6C757D"
                    border="1px solid #6C757D"
                    value={searchValue}
                    onChange={handleInputChange}
                  />
                </InputGroup>
              </Flex>
            </Box>
          </Flex>
        </Flex>
      </VStack>

      <Box mt="20px" minW="100%" w="600px">

        <TableComponent
          isLoading={isLoading}
          data={leadsData.ultimaReviewLeadsCampaigns || []}
          // tableDataKeys={tableDataKeys}
          tableHeader={["Email ID", "Business Name", "Campaign Name", "Lead Type", "Sign Up Status", "Email Status", "Lead Status"]}
          customRowRenderer={(data: any, index: number) => {
            return (
              <Tr key={data._id} className={styles.tableTd}>
                <Td>{index + 1 + (currentPage - 1) * itemsPerPage}</Td>
                <Td>{data?.email}</Td>
                <Td minW={'300px'} whiteSpace={"break-spaces"}>{data?.businessName}</Td>
                <Td>{data?.campaignName}</Td>
                <Td>{data?.leadType}</Td>
                <Td minW={'200px'}>
                  {data?.signUpStatus === "Signed Up" ? (
                    <Box display="flex" alignItems="center" gap={2}>
                      <img src={checkIcon} alt="Signed Up" />
                      <Text as="span">Signed Up</Text>
                    </Box>
                  ) : data?.signUpStatus === "Didn't Sign Up" ? (
                    <Box display="flex" alignItems="center" gap={2}>
                      <img src={crossIcon} alt="Didn't Sign Up" />
                      <Text as="span">Didn't Sign Up</Text>
                    </Box>
                  ) : data?.signUpStatus === "Already Signed Up" ? (
                    <Box display="flex" alignItems="center" gap={2}>
                      <img src={iconWarning} alt="Already Signed Up" />
                      <Text as="span">Already Signed Up</Text>
                    </Box>
                  ) : null}
                </Td>
                <Td minW={'200px'}>
                  {data?.emailSendStatus === "Sent" ? (
                    <Box display="flex" alignItems="center" gap={2}>
                      <img src={checkIcon} alt="Sent" />
                      <Text as="span">Sent</Text>
                    </Box>
                  ) : data?.emailSendStatus === "Failed" ? (
                    <Box display="flex" alignItems="center" gap={2}>
                      <img src={crossIcon} alt="Not Sent" />
                      <Text as="span">Failed</Text>
                    </Box>
                  ) : data?.emailSendStatus === "Already Sent" ? (
                    <Box display="flex" alignItems="center" gap={2}>
                      <img src={iconWarning} alt="Already Sent" />
                      <Text as="span">Already Sent</Text>
                    </Box>
                  ) : null}
                </Td>
                <Td textAlign="center">
                  {data?.signUpStatus !== "Didn't Sign Up" ? (
                    <Select
                      value={data?.LeadStatus}
                      width="150px"
                      onChange={(e) => {
                        handleLeadStatusClick(data?.email, e.target.value);
                      }}
                      color="#6C757D"
                      size='sm'
                    >
                      <option value="Active" disabled={true}>Active</option>
                      <option value="Suspended">Suspend</option>
                      <option value="Reactivate" disabled={data.LeadStatus === "Active"}>Reactivate</option>
                    </Select>
                  ) : (
                    "——"
                  )}
                </Td>
              </Tr>
            )
          }}
        />

        {/* {isLoading ? (
          <Flex justify="center" align="center" h="300px">
            <Spinner />
          </Flex>
        ) : (
          <TableContainer overflow="auto" w="100%">
            <Table variant="simple">
              <Thead>
                <Tr className={styles.tableHd}>
                  <Th>#</Th>
                  <Th>Email ID</Th>
                  <Th width={'300px'} maxW={'300px'} whiteSpace={"break-spaces"}>Business Name</Th>
                  <Th>Campaign Name</Th>
                  <Th>Lead Type</Th>
                  <Th>Sign Up Status</Th>
                  <Th>Email Status</Th>
                  <Th width="180px">Lead Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {leadsData?.ultimaReviewLeadsCampaigns?.length > 0 ? (
                  leadsData.ultimaReviewLeadsCampaigns.map((data: any, index: number) => (
                    <Tr key={data._id} className={styles.tableTd}>
                      <Td>{index + 1 + (currentPage - 1) * itemsPerPage}</Td>
                      <Td>{data?.email}</Td>
                      <Td width={'300px'} maxW={'300px'} whiteSpace={"break-spaces"}>{data?.businessName}</Td>
                      <Td>{data?.campaignName}</Td>
                      <Td>{data?.leadType}</Td>
                      <Td>
                        {data?.signUpStatus === "Signed Up" ? (
                          <Box display="flex" alignItems="center" gap={2}>
                            <img src={checkIcon} alt="Signed Up" />
                            <Text as="span">Signed Up</Text>
                          </Box>
                        ) : data?.signUpStatus === "Didn't Sign Up" ? (
                          <Box display="flex" alignItems="center" gap={2}>
                            <img src={crossIcon} alt="Didn't Sign Up" />
                            <Text as="span">Didn't Sign Up</Text>
                          </Box>
                        ) : data?.signUpStatus === "Already Signed Up" ? (
                          <Box display="flex" alignItems="center" gap={2}>
                            <img src={iconWarning} alt="Already Signed Up" />
                            <Text as="span">Already Signed Up</Text>
                          </Box>
                        ) : null}
                      </Td>
                      <Td>
                        {data?.emailSendStatus === "Sent" ? (
                          <Box display="flex" alignItems="center" gap={2}>
                            <img src={checkIcon} alt="Sent" />
                            <Text as="span">Sent</Text>
                          </Box>
                        ) : data?.emailSendStatus === "Failed" ? (
                          <Box display="flex" alignItems="center" gap={2}>
                            <img src={crossIcon} alt="Not Sent" />
                            <Text as="span">Failed</Text>
                          </Box>
                        ) : data?.emailSendStatus === "Already Sent" ? (
                          <Box display="flex" alignItems="center" gap={2}>
                            <img src={iconWarning} alt="Already Sent" />
                            <Text as="span">Already Sent</Text>
                          </Box>
                        ) : null}
                      </Td>
                      <Td textAlign="center">
                        {data?.signUpStatus !== "Didn't Sign Up" ? (
                          <Select
                            value={data?.LeadStatus}
                            width="150px"
                            onChange={(e) => {
                              handleLeadStatusClick(data?.email, e.target.value);
                            }}
                            color="#6C757D"
                            mr="8px"
                          >
                            <option value="Active" disabled={true}>Active</option>
                            <option value="Suspended">Suspend</option>
                            <option value="Reactivate" disabled={data.LeadStatus === "Active"}>Reactivate</option>
                          </Select>
                        ) : (
                          "——"
                        )}
                      </Td>
                    </Tr>
                  ))
                ) : (
                  <Tr>
                    <Td colSpan={7} textAlign="center">No data found</Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </TableContainer>
        )} */}
      </Box>

      {leadsData?.totalCount > 10 && <Box>

        <HStack w="100%" justifyContent="space-between" py={4}>
          <Flex alignItems="center">
            <Text mr="8px" fontSize="16px" fontWeight="400" color="#212529">
              Total {leadsData?.totalCount} items
            </Text>
            {leadsData.totalPages > 0 && (
              <PaginatorTwo
                forcePage={forcePage}
                onPageChange={handlePageChange}
                pageRangeDisplayed={5}
                pageCount={leadsData?.totalPages}
              />
            )}
          </Flex>
          <Flex alignItems="center">
            <Select
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              width="auto"
              color="#6C757D"
              bg={'#fff'}
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </Select>
          </Flex>
        </HStack>
      </Box>}

      <Box
        w="100%"
        p="6"
        shadow="sm"
        // h="100%"
        position="relative"
        overflow="auto"
      >
        {/* ... existing JSX content */}

        {/* Add this confirmation dialog */}
        <AlertDialog
          isOpen={isOpen}
          leastDestructiveRef={cancelRef}
          onClose={onClose}
        >
          <AlertDialogOverlay>
            <AlertDialogContent>
              <AlertDialogHeader fontSize="lg" fontWeight="bold">
                Change Lead Status
              </AlertDialogHeader>

              <AlertDialogBody>
                Are you sure you want to change this lead's status to {pendingStatusChange.status}?
              </AlertDialogBody>

              <AlertDialogFooter>
                <Button ref={cancelRef} onClick={onClose} fontWeight="500">
                  Cancel
                </Button>
                <Button colorScheme="blue" onClick={handleLeadStatusChange} ml={3} fontWeight="500" isLoading={isUpdatingStatus} disabled={isUpdatingStatus}>
                  Confirm
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>
      </Box>
    </Box>
  );
};

export default UltimaReviewsCampaignUsers;