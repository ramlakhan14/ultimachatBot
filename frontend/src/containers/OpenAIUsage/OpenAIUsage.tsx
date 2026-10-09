import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Heading,
  Text,
  Table,
  TableContainer,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Flex,
  Select,
  HStack,
  useToast,
  Spinner,
} from "@chakra-ui/react";
import ChartOpenAI from "./ChartOpenAI";
import { PaginatorTwo } from "../../widgets/Paginator/PaginatorTwo";
import {
  getOpenAiUsageOverview,
  getOpenAiUsageDailyUsage,
  getOpenAiUsageUsers,
} from "../../services/OpenAIUsage/openAiUsageService";
import {
  USE_DUMMY_DATA,
  dummyYearlyOverviewData,
  dummyMonthlyOverviewData,
  dummyAllDetailsDataList,
  dummyUsersData,
} from "./dummyData";

const MONTH_MAP: Record<string, number> = {
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12,
};

const MODEL_BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  "text-embedding-ada-002": { bg: "#E7F8EF", color: "#1E9E61" },
  "gpt-5-mini": { bg: "#FCE7F3", color: "#E14B8C" },
  "gpt-4o-mini": { bg: "#FFF4DD", color: "#F59E0B" },
  "gpt-4o": { bg: "#F3E8FF", color: "#7C3AED" },
  "gpt-4": { bg: "#D1FAE5", color: "#059669" },
  "gpt-3.5-turbo": { bg: "#CFFAFE", color: "#0891B2" },
  "dall-e-3": { bg: "#FCE7F3", color: "#DB2777" },
};

const getModelBadgeStyle = (modelName: string) => {
  if (MODEL_BADGE_STYLES[modelName]) {
    return MODEL_BADGE_STYLES[modelName];
  }
  return { bg: "#F1F5F9", color: "#475569" };
};

interface UserOption {
  _id: string;
  name: string;
  email: string;
}

interface UsageDetailsItem {
  index: number;
  date: string;
  isoDate: string;
  models: string[];
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
}

const OpenAIUsage: React.FC = () => {
  const toast = useToast();

  const [selectedMonth, setSelectedMonth] = useState<string>("Month");
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [usersList, setUsersList] = useState<UserOption[]>([]);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [forcePage, setForcePage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(20);

  const [overviewData, setOverviewData] = useState<any>(null);
  const [isOverviewLoading, setIsOverviewLoading] = useState<boolean>(false);

  const [detailsData, setDetailsData] = useState<UsageDetailsItem[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isDetailsLoading, setIsDetailsLoading] = useState<boolean>(false);

  // Fetch Users List
  const fetchUsers = useCallback(async () => {
    if (USE_DUMMY_DATA) {
      setUsersList(dummyUsersData);
      return;
    }
    try {
      const res = await getOpenAiUsageUsers();
      if (res?.data?.success && Array.isArray(res.data.data)) {
        setUsersList([
          { _id: "all", name: "User Account", email: "User Account" },
          ...res.data.data,
        ]);
      } else {
        setUsersList([{ _id: "all", name: "User Account", email: "User Account" }]);
      }
    } catch {
      setUsersList([{ _id: "all", name: "User Account", email: "User Account" }]);
    }
  }, []);

  // Fetch Overview Data
  const fetchOverview = useCallback(async () => {
    setIsOverviewLoading(true);
    if (USE_DUMMY_DATA) {
      setTimeout(() => {
        if (selectedMonth === "Month") {
          setOverviewData(dummyYearlyOverviewData);
        } else {
          setOverviewData(dummyMonthlyOverviewData);
        }
        setIsOverviewLoading(false);
      }, 200);
      return;
    }
    try {
      const monthNum =
        selectedMonth !== "Month" ? MONTH_MAP[selectedMonth] : undefined;
      const res = await getOpenAiUsageOverview(
        selectedYear,
        monthNum,
        selectedUserId
      );
      if (res?.data?.success) {
        setOverviewData(res.data.data);
      }
    } catch (error: any) {
      toast({
        title: error?.response?.data?.message || "Failed to fetch usage overview",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsOverviewLoading(false);
    }
  }, [selectedMonth, selectedYear, selectedUserId, toast]);

  // Fetch Details Table Data via /openai-usage/dashboard/daily-usage
  const fetchDetails = useCallback(async () => {
    setIsDetailsLoading(true);
    if (USE_DUMMY_DATA) {
      setTimeout(() => {
        const total = dummyAllDetailsDataList.length;
        const computedPages = Math.ceil(total / pageSize);
        const startIndex = (currentPage - 1) * pageSize;
        const paginatedSlice = dummyAllDetailsDataList.slice(
          startIndex,
          startIndex + pageSize
        );

        setDetailsData(paginatedSlice);
        setTotalItems(total);
        setTotalPages(computedPages);
        setIsDetailsLoading(false);
      }, 200);
      return;
    }
    try {
      const monthNum =
        selectedMonth !== "Month" ? MONTH_MAP[selectedMonth] : undefined;
      const res = await getOpenAiUsageDailyUsage(
        currentPage,
        pageSize,
        selectedYear,
        monthNum,
        selectedUserId
      );
      if (res?.data?.success) {
        const payload = res.data.data;
        setDetailsData(payload.data || []);
        const totalCount = payload.total || 0;
        setTotalItems(totalCount);
        const pagesCount = payload.pages || Math.ceil(totalCount / pageSize) || 1;
        setTotalPages(pagesCount);
      }
    } catch (error: any) {
      toast({
        title: error?.response?.data?.message || "Failed to fetch daily usage details",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsDetailsLoading(false);
    }
  }, [currentPage, pageSize, selectedMonth, selectedYear, selectedUserId, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Handlers for Page and Page-Size changes
  const handlePageChange = (page: number) => {
    const nextCurrentPage = page + 1;
    setCurrentPage(nextCurrentPage);
    setForcePage(page);
  };

  const handleItemsPerPageChange = (event: any) => {
    const newSize = parseInt(event.target.value, 10);
    setPageSize(newSize);
    setCurrentPage(1);
    setForcePage(0);
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    setCurrentPage(1);
    setForcePage(0);
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setCurrentPage(1);
    setForcePage(0);
  };

  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
    setCurrentPage(1);
    setForcePage(0);
  };

  return (
    <Box
      w="100%"
      maxW="100%"
      p={{ base: 4, md: 6 }}
      h="100%"
      position="relative"
      overflow="auto"
      bg="#F8FAFC"
    >
      {/* Top Page Header & User Account Selector */}
      <Flex
        justify="space-between"
        align="flex-start"
        mb={6}
        wrap="wrap"
        gap={4}
      >
        <Box>
          <Heading fontSize="22px" fontWeight="700" color="#0F172A" mb={1}>
            OpenAI Usage Report
          </Heading>
          <Text fontSize="14px" color="#64748B">
            Track and monitor all OpenAI API usage and associated costs across your projects.
          </Text>
        </Box>

        <Select
          value={selectedUserId}
          onChange={(e) => handleUserChange(e.target.value)}
          w="220px"
          h="38px"
          borderRadius="md"
          borderColor="gray.300"
          bg="white"
          fontSize="14px"
          fontWeight="500"
          color="gray.700"
          cursor="pointer"
          focusBorderColor="blue.500"
        >
          {usersList.length > 0 ? (
            usersList.map((usr) => (
              <option key={usr._id} value={usr._id}>
                {usr._id === "all" ? (usr.name || "User Account") : (usr.email || usr.name)}
              </option>
            ))
          ) : (
            <option value="all">User Account</option>
          )}
        </Select>
      </Flex>

      {/* Chart Section */}
      <ChartOpenAI
        selectedMonth={selectedMonth}
        setSelectedMonth={handleMonthChange}
        selectedYear={selectedYear}
        setSelectedYear={handleYearChange}
        overviewData={overviewData}
        isLoading={isOverviewLoading}
      />

      {/* Usage Details Table Section */}
      <Box
        bg="white"
        border="1px solid"
        borderColor="gray.200"
        borderRadius="xl"
        p={{ base: 4, md: 6 }}
        shadow="sm"
        w="100%"
        mb={4}
      >
        <Heading fontSize="16px" fontWeight="600" color="#1A202C" mb={4}>
          Usage Details
        </Heading>

        <TableContainer
          w="100%"
          minH="260px"
          border="1px solid #E2E8F0"
          borderRadius="8px"
          overflowX="auto"
          position="relative"
        >
          {/* Non-bumping loading overlay */}
          {isDetailsLoading && (
            <Flex
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              bg="rgba(255, 255, 255, 0.75)"
              backdropFilter="blur(1px)"
              zIndex={10}
              justify="center"
              align="center"
              direction="column"
              gap={3}
            >
              <Spinner color="blue.500" size="lg" thickness="3px" />
              <Text fontSize="14px" color="gray.600" fontWeight="500">
                Loading usage details...
              </Text>
            </Flex>
          )}

          {detailsData.length === 0 && !isDetailsLoading ? (
            <Flex h="200px" justify="center" align="center">
              <Text color="gray.500" fontSize="14px">
                No usage details records found.
              </Text>
            </Flex>
          ) : (
            <Table variant="simple" fontSize="14px">
              <Thead bg="#EFF6FF">
                <Tr>
                  <Th color="#334155" fontWeight="600" fontSize="13px" textTransform="none">
                    #
                  </Th>
                  <Th color="#334155" fontWeight="600" fontSize="13px" textTransform="none">
                    Date
                  </Th>
                  <Th color="#334155" fontWeight="600" fontSize="13px" textTransform="none">
                    Models
                  </Th>
                  <Th color="#334155" fontWeight="600" fontSize="13px" textTransform="none">
                    Request Count
                  </Th>
                  <Th color="#334155" fontWeight="600" fontSize="13px" textTransform="none">
                    Input Tokens
                  </Th>
                  <Th color="#334155" fontWeight="600" fontSize="13px" textTransform="none">
                    Output Tokens
                  </Th>
                </Tr>
              </Thead>

              <Tbody bg="#fff">
                {detailsData.map((item, idx) => (
                  <Tr key={item.isoDate || idx} _hover={{ bg: "#F8FAFC" }}>
                    <Td color="#475569" py={3.5}>
                      {item.index || (currentPage - 1) * pageSize + idx + 1}
                    </Td>

                    <Td color="#475569" py={3.5}>
                      {item.date}
                    </Td>

                    <Td minW="260px" py={3.5}>
                      <Flex wrap="wrap" gap={2}>
                        {(item.models || []).map((model) => {
                          const badgeStyle = getModelBadgeStyle(model);
                          return (
                            <Box
                              key={model}
                              px={2.5}
                              py="3px"
                              borderRadius="full"
                              fontSize="12px"
                              fontWeight="500"
                              bg={badgeStyle.bg}
                              color={badgeStyle.color}
                            >
                              {model}
                            </Box>
                          );
                        })}
                      </Flex>
                    </Td>

                    <Td color="#475569" py={3.5}>
                      {typeof item.requestCount === "number"
                        ? item.requestCount.toLocaleString()
                        : item.requestCount}
                    </Td>

                    <Td color="#475569" py={3.5}>
                      {typeof item.inputTokens === "number"
                        ? item.inputTokens.toLocaleString()
                        : item.inputTokens}
                    </Td>

                    <Td color="#475569" py={3.5}>
                      {typeof item.outputTokens === "number"
                        ? item.outputTokens.toLocaleString()
                        : item.outputTokens}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </TableContainer>
      </Box>

      {/* Dynamic Pagination Section */}
      {totalItems > 0 && (
        <Box pt={2} pb={6}>
          <HStack w="100%" pt={2} justifyContent="space-between" flexWrap="wrap" gap={3}>
            <Flex alignItems="center" gap={2}>
              <Text fontSize="16px" fontWeight="400" color="#212529">
                Total&nbsp;{totalItems}&nbsp;items
              </Text>
              <PaginatorTwo
                forcePage={forcePage}
                onPageChange={handlePageChange}
                pageRangeDisplayed={5}
                pageCount={totalPages}
              />
            </Flex>
            <Flex alignItems="center">
              <Select
                value={pageSize}
                onChange={handleItemsPerPageChange}
                width="auto"
                bg={"#fff"}
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
      )}
    </Box>
  );
};

export default OpenAIUsage;