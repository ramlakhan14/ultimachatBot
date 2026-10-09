import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Text,
  Button,
  Table,
  Tbody,
  Tr,
  Th,
  Icon,
  Td,
  VStack,
  Flex,
  Heading,
  Spinner,
  HStack,
  Tooltip,
  Thead,
  TableContainer,
  Select,
  useToast,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { FaBriefcase, FaCrown, FaGem, FaRocket } from 'react-icons/fa';
import { colors } from '../../utils/constant';
import { PaginatorTwo } from '../../widgets/Paginator/PaginatorTwo';
import { useHistory } from 'react-router-dom';
import { myInvoices } from '../../services/invoices';
import { MoneyIcon } from "@phosphor-icons/react";
import { useSelector } from 'react-redux';


interface InvoicesTableProps {
  viewAllBtn?: boolean;
}

export const InvoicesTable = ({ viewAllBtn }: InvoicesTableProps) => {
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [forcePage, setForcePage] = React.useState<number>(0);
  const [itemsPerPage, setItemsPerPage] = React.useState<number>(10);
  const currentYear = new Date().getFullYear();
  const [isInvoiceData, setIsInvoiceData] = useState<any>([]);
  const [selectedYear, setSelectedYear] = React.useState<any>("");
  const toast = useToast();
  const history = useHistory();
  const userProfile = useSelector((state: any) => state.user?.profile) || {}

  console.log("userProfile?.activeSubscription", userProfile?.activeSubscription)

  const getPlanIcon = (planType: any) => {
    let plan = planType?.toLowerCase();
    switch (plan) {
      case "starter":
        return <Icon as={FaRocket} color="#7C2FF1" boxSize={5} mr={2} />;

      case "pro":
        return <Icon as={FaCrown} color="#2977FF" boxSize={5} mr={2} />;

      case "ultimate":
        return <Icon as={FaGem} color="#524D4D" boxSize={5} mr={2} />;
      case "agency":
        return <Icon as={FaBriefcase} color="#FF8D28" boxSize={5} mr={2} />;

      case "instant topup":
        return <MoneyIcon size={16} color="green" weight="bold" style={{ marginRight: "8px" }} />;
      default:
        return;
    }
  };

  const handlePageChange = React.useCallback((page) => {
    setCurrentPage(page + 1);
    setForcePage(page);
  }, []);

  const handleItemsPerPageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(1);
    setForcePage(0);
  };

  const startYear = currentYear - 10;
  const years = Array.from(
    { length: 11 }, // 10 previous years plus current year = 11 total
    (_, index) => startYear + index
  );
  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(event.target.value, 10);
    setSelectedYear(value);
  };

  const statusConfigStatus: any = {
    active: { color: "#198754", bg: "#1987541A" },
    cancelled: { color: "#991B1B", bg: "#FEE2E2" },
    success: { color: "#256CE8", bg: "#EAF1FF" },
    expired: { color: "#1F2937", bg: "#F3F4F6" }
  };

  const getStatusTag = (status: any) => {
    const key = status?.toLowerCase();
    const config = statusConfigStatus[key] || { color: "#6C757D", bg: "#6C757A1A" };

    return (
      <Text
        as="span"
        borderRadius="50px"
        px="8px"
        py="2px"
        fontSize="14px"
        fontWeight={"500"}
        textTransform="capitalize"
        color={config?.color}
        bg={config?.bg}
      >
        {status}
      </Text>
    );
  };

  const getInvoices = async (itemsPerPage: any, currentPage: any, years: any) => {
    try {
      setIsLoadingInvoice(true);
      const showBtn = viewAllBtn ? false : true;
      const perPage = viewAllBtn ? 5 : itemsPerPage;
      const page = viewAllBtn ? 1 : currentPage;

      const response = await myInvoices(perPage, page, years, showBtn);
      setIsInvoiceData(response?.data?.data || []);
      setTotalPages(response?.data?.totalPages);
    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}` || error.message,
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsLoadingInvoice(false);
    }
  }
  const retryCountRef = useRef(0);

  useEffect(() => {
    if (!userProfile?.activeSubscription) return;

    const firstPlanName = isInvoiceData ? isInvoiceData[0]?.plan?.toLowerCase() : "";
    const activePlan = userProfile.activeSubscription?.toLowerCase();
    const firstPlanType = isInvoiceData ? isInvoiceData[0]?.planType?.toLowerCase() : "";
    const activePlanType = userProfile.billingCycle?.toLowerCase();


    if (
      firstPlanName !== activePlan &&
      window.location?.pathname == "/app/myprofile" ||
      firstPlanType !== activePlanType &&
      window.location?.pathname == "/app/myprofile" ||
      userProfile?.activeSubscription && isInvoiceData?.length == 0
    ) {


      const timer = setTimeout(() => {
        retryCountRef.current += 1;
        getInvoices(itemsPerPage, currentPage, selectedYear);
      }, 10000);

      return () => clearTimeout(timer);
    }

    // Reset counter when plans match
    if (firstPlanName === activePlan) {
      retryCountRef.current = 0;
    }
  }, [
    isInvoiceData,
    userProfile?.activeSubscription,
    userProfile?.billingCycle,
  ]);
  useEffect(() => {
    getInvoices(itemsPerPage, currentPage, selectedYear);
  }, [currentPage, itemsPerPage, selectedYear]);

  const formatText = (text: any) =>
    text?.toLowerCase().replace(/^./, (c: any) => c.toUpperCase());

  return (
    <React.Fragment>
      <VStack w="100%" spacing="2" mt={"24px"}>
        <Flex shrink={0} w="100%" justifyContent="space-between">
          <Flex alignItems="start" flexDirection={"column"} gap={3}>
            <Heading fontSize="24">Billing & Invoices</Heading>
            {
              isInvoiceData[0]?.plan?.toLowerCase() != userProfile.activeSubscription?.toLowerCase() &&
              <Alert status="info" borderRadius="md" fontSize={"12px"} padding={"5px 10px"}>
                <AlertIcon />
                Fetching the updated invoice. Please wait while the latest invoice is being retrieved.
              </Alert>
            }
          </Flex>
          <Box
            display="flex"
            flexDirection="row"
            justifyContent="space-between"
            gap={2}
            alignItems="center"
            flexWrap={'nowrap'}
          >
            {viewAllBtn ? (
              <Tooltip label="View All" fontSize={"11px"} aria-label="A tooltip">
                <Button
                  colorScheme='blue'
                  variant='outline'
                  height={"38px"}
                  fontSize={"16px"}
                  fontWeight={500}
                  size='md'
                  onClick={() => {
                    history.push("/app/all-invoices");
                  }}
                >
                  View All
                </Button>
              </Tooltip>) : <Select
                w="120px"
                h="40px"
                borderRadius="5px"
                bg="#fff"
                color="#6C757D"
                borderColor="#E2E8F0"
                value={selectedYear}
                onChange={handleYearChange}
              >

              <option selected value={""}>
                Year
              </option>
              {years?.reverse().map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>}

          </Box>
        </Flex>
        <Box w="100%" mt={"0px !important"}>
          <TableContainer
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
              }} bg={colors.tableHeadingBg}>
                <Tr>
                  <Th width="70px">#</Th>
                  <Th>Date</Th>
                  <Th>Plan</Th>
                  <Th>Plan Type</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                  <Th textAlign="end">Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {isLoadingInvoice ?
                  <Tr>
                    <Td colSpan={7}>
                      <Spinner display={'flex'} alignItems={'center'} justifyContent={'center'} margin={'auto'} marginTop={'50px'} marginBottom={'50px'} />
                    </Td>
                  </Tr>
                  :
                  isInvoiceData?.length > 0 ? (
                    isInvoiceData.map((invoice: any, index: number) => (
                      <Tr key={index}>
                        <Td width="70px">{
                          currentPage && itemsPerPage ?
                            (currentPage - 1) * itemsPerPage + index + 1 : index + 1
                        }</Td>
                        <Td>{invoice?.date}</Td>
                        <Td style={{ textTransform: "capitalize" }}>{formatText(invoice?.planType)}</Td>
                        <Td>
                          <Flex alignItems={'center'} style={{ textTransform: "capitalize" }}>
                            {getPlanIcon(invoice?.plan)}
                            {formatText(invoice?.plan)}
                          </Flex>
                        </Td>
                        <Td>
                          {String(invoice?.amount)?.toLowerCase() === "n/a"
                            ? "N/A"
                            : `$${invoice?.amount}`}
                        </Td>
                        <Td>{getStatusTag(invoice?.status)}</Td>
                        <Td>
                          <Flex gap={2} alignItems={'center'} justifyContent="flex-end">
                            <Tooltip label="Download Invoice" fontSize={"11px"} aria-label="A tooltip">
                              <Button size='sm' colorScheme="blue" className="btn-hover-pri" onClick={() => {
                                window.open(
                                  invoice?.invoiceUrl,
                                  "_blank"
                                );
                              }}>
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M9.66211 6.18848C10.1489 6.42119 10.573 6.76693 10.8984 7.19727C11.224 7.62787 11.442 8.131 11.5332 8.66309C11.6244 9.19504 11.5863 9.7415 11.4229 10.2559C11.2593 10.7702 10.9744 11.2375 10.5928 11.6191L8.53711 13.6768C7.90421 14.3097 7.04543 14.6659 6.15039 14.666C5.25521 14.666 4.39666 14.3097 3.76367 13.6768C3.13068 13.0438 2.77441 12.1852 2.77441 11.29C2.77452 10.395 3.13077 9.53622 3.76367 8.90332L5.30664 7.36035C5.27616 7.84746 5.32536 8.33507 5.45117 8.80664L4.55859 9.69824C4.13651 10.1204 3.89941 10.6931 3.89941 11.29C3.89946 11.887 4.13644 12.4597 4.55859 12.8818C4.98074 13.304 5.55339 13.541 6.15039 13.541C6.74738 13.541 7.32001 13.3039 7.74219 12.8818L9.79785 10.8252C10.0748 10.5484 10.2747 10.2039 10.3779 9.82617C10.481 9.44861 10.4835 9.05086 10.3857 8.67188C10.2879 8.29271 10.0934 7.94473 9.82031 7.66406C9.54727 7.38349 9.20537 7.17946 8.8291 7.07129C8.87721 6.98968 8.936 6.9147 9.00293 6.84766L9.66211 6.18848ZM11.8545 2.21094C12.7496 2.21094 13.6082 2.56725 14.2412 3.2002C14.8742 3.83318 15.2305 4.69173 15.2305 5.58691C15.2304 6.48201 14.8741 7.3407 14.2412 7.97363L12.6982 9.5166C12.7286 9.03077 12.6796 8.54167 12.5537 8.06934L13.4463 7.17773C13.8684 6.75556 14.1055 6.18292 14.1055 5.58594C14.1054 4.98893 13.8684 4.41629 13.4463 3.99414C13.0241 3.57199 12.4515 3.33501 11.8545 3.33496C11.2575 3.33496 10.6849 3.57206 10.2627 3.99414L8.20703 6.05078C7.92779 6.33001 7.72725 6.67814 7.625 7.05957C7.52282 7.44093 7.52288 7.84225 7.625 8.22363C7.72715 8.60511 7.92784 8.95311 8.20703 9.23242C8.48617 9.51162 8.83352 9.71313 9.21484 9.81543L8.34277 10.6885C7.85583 10.4558 7.432 10.1092 7.10645 9.67871C6.78084 9.24811 6.56293 8.74498 6.47168 8.21289C6.38052 7.68094 6.41855 7.13447 6.58203 6.62012C6.74558 6.10578 7.0305 5.6385 7.41211 5.25684L9.46777 3.2002C10.1007 2.5673 10.9595 2.21104 11.8545 2.21094Z" fill="white" />
                                </svg>
                              </Button>
                            </Tooltip>
                          </Flex>
                        </Td>
                      </Tr>
                    ))
                  ) : (
                    <Tr>
                      <Td colSpan={7} textAlign="center" py="20px">
                        No data found
                      </Td>
                    </Tr>
                  )
                }
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
        {/* {
            totalItems > 10 && */}
        {!viewAllBtn && <HStack w="full" justifyContent="space-between" py={2} mb={2}>
          <Flex alignItems="center">
            {/* <Text mr="8px" fontSize="16px" fontWeight="400" color="#212529">Total {activeTab == "projects" ? totalItems : activeTab == "admin" ? totalAdminItems : totalsScrapedLeadProject} items</Text> */}
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
      </VStack>
    </React.Fragment >
  );
};

