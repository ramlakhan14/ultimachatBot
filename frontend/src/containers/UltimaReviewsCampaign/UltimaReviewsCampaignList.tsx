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
  Tooltip
} from "@chakra-ui/react";
import { IoIosSearch } from "react-icons/io";
import { useHistory } from "react-router-dom";
import CreateCampaign from "./iconCreateCampaign.svg";
import styles from "./UltimaReviews.module.scss";
import { ReadIcon } from "../../components/Icons/ReadIcon";
import { PaginatorTwo } from "../../widgets/Paginator/PaginatorTwo";
import { getUltimaReviewsCampaign } from "../../services/UltimaReviewsConnection";
import TableComponent from '../TableComponent';

const UltimaReviewsCampaignList = () => {
  const [campaignData, setCampaignData] = useState({
    ultimaReviewCampaigns: [],
    totalPages: 0,
    currentPage: 1,
    totalCount: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchValue, setSearchValue] = useState('');
  const [forcePage, setForcePage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const history = useHistory();
  const toast = useToast();

  const fetchCampaigns = async (page = 1, limit = 10, search = '') => {
    setIsLoading(true);
    try {

      const response = await getUltimaReviewsCampaign(page, limit, search);

      if (response.data.success) {
        setCampaignData(response.data.data);
      } else {
        toast({
          title: "Error",
          description: response.data.message || "Failed to fetch campaigns",
          status: "error",
          duration: 3000,
          isClosable: true
        });
      }
    } catch (error) {
      // console.error("Error fetching campaigns:", error);
      toast({
        title: "Error",
        description: "Failed to fetch campaigns. Please try again later.",
        status: "error",
        duration: 3000,
        isClosable: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns(currentPage, itemsPerPage, searchValue);
  }, [currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    const newPage = page + 1;
    setCurrentPage(newPage);
    setForcePage(page);
  };

  const handleItemsPerPageChange = (event: any) => {
    const newLimit = parseInt(event.target.value, 10);
    setItemsPerPage(newLimit);
    setCurrentPage(1);
    setForcePage(0);
  };

  // Debounce implementation
  const debounce = (func: any, delay: any) => {
    let timeoutId: NodeJS.Timeout;
    return function (...args: any[]) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchTerm: string) => {
      setCurrentPage(1);
      setForcePage(0);
      fetchCampaigns(1, itemsPerPage, searchTerm);
    }, 500),
    [itemsPerPage]
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchValue(value);
    debouncedSearch(value);
  };

  const getStatusClassName = (status: string) => {
    const statusLower = status.toLowerCase();

    if (statusLower === "completed") return styles.Completed;
    if (statusLower === "running") return styles.Running;
    if (statusLower === "scheduled") return styles.Schedule;
    if (statusLower === "initiated") return styles.initiated;
    if (statusLower === "paused") return styles.paused;
    if (statusLower === "failed") return styles.paused;

    return "";
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
      <VStack w="100%" spacing="10">
        <Flex
          shrink={0}
          w="100%"
          direction="column"
          justifyContent="space-between"
        >
          <Flex width="100%" justifyContent="space-between" alignItems="center">
            <Box>
              <Heading fontSize="24px" color="#1A202C">Ultima Reviews Campaigns</Heading>
            </Box>
            <Flex gap={"12px"}>
              <Flex justifyContent="flex-end">
                <InputGroup width="240px" height={"38px"} borderRadius="4px" outline={"none"}>
                  <InputLeftElement height={"38px"} pointerEvents="none">
                    <IoIosSearch color="#6C757D" />
                  </InputLeftElement>
                  <Input
                    height={"38px"}
                    type="text"
                    placeholder="Search"
                    color="#6C757D"
                    background={"#fff"}
                    border="1px solid #CED4DA"
                    value={searchValue}
                    onChange={handleInputChange}
                  />
                </InputGroup>
              </Flex>
              <Button
                colorScheme='blue'
                size="md"
                height={"38px"}
                width={"222px"}
                fontWeight={500}
                onClick={() => {
                  history.push(`/app/ultima-reviews/campaign/create`);
                }}

              >
                <Image src={CreateCampaign} alt="Create Campaign" />
                <Text as="span" ms="8px">
                  Create New Campaign
                </Text>
              </Button>
              <Button
                colorScheme='blue'
                size="md"
                height={"38px"}
                width={"96px"}
                fontWeight={500}
                onClick={() => {
                  history.push(`/app/ultima-reviews/campaign/all-users`);
                }}
              >
                <Text as="span" ms="8px">
                  All Leads
                </Text>
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </VStack>
      {/* <Box mt="0px">
        <Flex justifyContent="flex-end">
          <InputGroup width="400px" borderRadius="4px" borderColor="#6C757D">
            <InputLeftElement pointerEvents="none">
              <IoIosSearch color="#6C757D" />
            </InputLeftElement>
            <Input
              type="text"
              placeholder="Search"
              color="#6C757D"
              value={searchValue}
              onChange={handleInputChange}
            />
          </InputGroup>
        </Flex>
      </Box> */}
      <Box mt="24px" minW="100%" w="600px">
        <TableComponent
          isLoading={isLoading}
          data={campaignData.ultimaReviewCampaigns || []}
          // noDataText="No SMTP settings found."
          tableHeader={["Name Campaign", "Target Audience", "Status", "Created On", "Details"]}
          customRowRenderer={(data: any, index: number) => {
            return (
              <Tr key={data._id} className={styles.tableTd}>
                <Td color={"#1A202C"} fontSize={"14px!important"} fontWeight={"400!important"}>{index + 1 + (currentPage - 1) * itemsPerPage}</Td>
                <Td color={"#1A202C"} fontSize={"14px!important"} fontWeight={"400!important"}>{data?.campaignName}</Td>
                <Td color={"#1A202C"} fontSize={"14px!important"} fontWeight={"400!important"}>{data?.targetAudience}</Td>
                <Td>
                  <Text as="span" fontSize={'12px'} fontWeight={"500"} className={getStatusClassName(data?.status)}>
                    {data?.status}
                  </Text>
                </Td>
                <Td color={"#1A202C"} fontSize={"14px!important"} fontWeight={"400!important"}>
                  {new Date(data?.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  }).replace(/\//g, '/') + ', ' +
                    new Date(data?.createdAt).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                </Td>
                <Td textAlign={'end'}>
                  <Tooltip label="View" fontSize={"11px"}>
                    <Button
                      size="sm"
                      padding={'6px'}
                      background={"#F8F9FA"}
                      borderColor="#6C757D"
                      onClick={() => {
                        history.push(`/app/ultima-reviews/campaign/${data._id}/users`);
                      }}
                      className={styles.readBtn}
                      sx={{
                        _focus: {
                          outline: 'none',
                        }
                      }}
                    >
                      <Image src='/icons/eye.svg' alt='icon' />
                    </Button>
                  </Tooltip>
                </Td>
              </Tr>
            )
          }}
        />

      </Box>
      {campaignData?.totalCount > 10 && <Box>
        <HStack w="100%" justifyContent="space-between" py={4}>
          <Flex alignItems="center">
            <Text mr="8px" fontSize="16px" fontWeight="400" color="#212529">
              Total {campaignData?.totalCount} items
            </Text>
            {campaignData.totalPages > 0 && (
              <PaginatorTwo
                forcePage={forcePage}
                onPageChange={handlePageChange}
                pageRangeDisplayed={5}
                pageCount={campaignData?.totalPages}
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
    </Box>
  );
};

export default UltimaReviewsCampaignList;