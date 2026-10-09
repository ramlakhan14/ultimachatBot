import * as React from "react";
import {
  Box,
  Flex,
  HStack,
  Heading,
  Text,
  VStack,
  Tr,
  Td,
  Select,
  useDisclosure,
  InputGroup,
  InputLeftElement,
  Input,
  useToast,
} from "@chakra-ui/react";
import styles from "./LeadsHistory.module.scss";
import { IoIosSearch } from "react-icons/io";
import { Link } from "react-router-dom";
import { getAllLeads } from "../../services/emailCampaigns";
import { PaginatorTwo } from "../../widgets/Paginator/PaginatorTwo";
import { format } from "date-fns";
import PageLayout from "../../components/PageLayout";
import TableComponent from "../TableComponent";


export const LeadsHistory = () => {
  const toast = useToast();
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [itemsPerPages, setItemsPerPage] = React.useState<number>(10);
  const [searchValue, setSearchValue] = React.useState('');
  const [forcePage, setForcePage] = React.useState<number>(0);
  const [inviteUsersData, setInviteUsersData] = React.useState<any>();
  const [debouncedSearchValue, setDebouncedSearchValue] = React.useState(searchValue);
  const [isSearchActive, setIsSearchActive] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState(false);


  const handlePageChange = (page: number) => {
    let pages: number = page + 1;
    setCurrentPage(pages);
    setForcePage(page);
  };
  const handleItemsPerPageChange = (event: any) => {
    setItemsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(1);
    setForcePage(0);
  };

  const handleInputChange = (event: any) => {
    setSearchValue(event.target.value); // Update state with the input value
  };

  const fetchData = async (page: number, pageSize: number, searchKeyword: string) => {
    try {
      setIsLoading(true);
      const response: any = await getAllLeads(pageSize, page, searchKeyword, "");
      setInviteUsersData(response);
    } catch (error: any) {
      // console.log(error);

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
    fetchData(currentPage, itemsPerPages, debouncedSearchValue);
  }, [debouncedSearchValue, itemsPerPages, currentPage]);

  const tableHeader = [
    `Lead Creation(Date & Time)`,
    "Website URL",
    "Email ID",
    "Campaign Name",
    "Email Status",
  ]

  return (
    <PageLayout
      pageTitle="Campaign Audience History"
      breadCrums={
        <VStack w="100%" spacing="10">
          <Flex
            shrink={0}
            w="100%"
            direction="column"
            justifyContent="space-between"
          >
            <Flex width="100%" mb="8" justifyContent="space-between">
              <Box>
                <Heading as="h2" fontSize="16px" color="#2977FF">
                  <Link to={`/app/email-campaigns`}><Text as="span" borderBottom="1px solid #2977FF">Ultimamail Campaign</Text>
                  </Link> / <Text as="span" color="#6C757D">Campaign Audience History</Text>
                </Heading>
              </Box>
              <Box>
              </Box>
            </Flex>

          </Flex>
        </VStack>
      }
      pageHeaderContent={
        <Box ml="auto">
          <InputGroup
            width="400px"
            borderRadius="4px"
            borderColor="#6C757D"
          >
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
        </Box>
      }
    >

      <Box mt="24px" minW={"100%"} w="600px">
        <TableComponent
          isLoading={isLoading}
          data={inviteUsersData?.data?.data || []}
          tableHeader={tableHeader}
          customRowRenderer={(data: any, index: number) => {
            return (
              <Tr key={data._id}>
                <Td> {index + 1 + (currentPage - 1) * itemsPerPages}</Td>
                <Td fontSize="14px" fontWeight="400" color="#6C757D" >{format(new Date(data?.updatedAt), 'dd/MM/yyyy, hh:mm a')}</Td>
                <Td style={{ width: '350px', maxWidth: '350px', wordWrap: "break-word", wordBreak: "break-all", whiteSpace: 'normal' }}>
                  {data?.websiteUrl || "-"}
                </Td>
                <Td sx={{ textTransform: "lowercase!important" }}>
                  {data?.email || "-"}
                </Td>
                <Td>
                  {data?.campaignName || "-"}
                </Td>
                <Td>
                  {data?.emailStatus === "sent" ? (
                    <Text as="span" className={styles.Completed}>Sent</Text>
                  ) : data?.emailStatus === "failed" ? (
                    <Text as="span" className={styles.paused}>Failed</Text>
                  ) : data?.emailStatus === "initiated" ? (
                    <Text as="span" className={styles.Schedule}>Initiated</Text>
                  ) : null}
                </Td>

              </Tr>
            )
          }}
        />

        <HStack w="100%" justifyContent="space-between" py={4}>
          <Flex alignItems="center">
            <Text mr="8px" fontSize="16px" fontWeight="400" color="#212529">Total&nbsp;{inviteUsersData?.data?.pagination?.totalCount}&nbsp;items</Text>
            <PaginatorTwo forcePage={forcePage} onPageChange={handlePageChange} pageRangeDisplayed={5} pageCount={inviteUsersData?.data?.pagination?.totalPages} />
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
      </Box>
    </PageLayout>
  );
};
