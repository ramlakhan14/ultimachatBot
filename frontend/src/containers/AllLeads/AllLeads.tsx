import { Box, Flex, Heading, VStack, HStack, Text, Spinner, Button, InputGroup, InputLeftElement, Select, Input, Image, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, FormControl, FormLabel, ModalFooter, Tooltip, FormErrorMessage } from '@chakra-ui/react';
import { PaginatorTwo } from '../../widgets/Paginator/PaginatorTwo';
import { ChangeEvent, useCallback, useState, useEffect } from 'react';
import SyncWithCrmModal from './SyncWithCrmModal';
import { IoIosSearch, IoMdColorFilter } from 'react-icons/io';
import axios from 'axios';
import { baseURL } from '../../config';
import TableComponent from '../TableComponent';
import PageLayout from '../../components/PageLayout';
import { fetchKnowledgebases } from '../../services/knowledgebaseService';
import SummaryModal from './SummaryModal';
import { callApi } from '../../services/callApi';
const AllLeads = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [forcePage, setForcePage] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [showFilterModal, setShowFilterModal] = useState<any>(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [leadType, setLeadType] = useState<string>("all");
  const [campaign, setCampaign] = useState<string>("all");
  const [totalItems, setTotalItems] = useState<any>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [showSummaryModal, setShowSummaryModal] = useState<any>({});
  const [isMeetingBookedOnGoogleMeet, setisMeetingBookedOnGoogleMeet] = useState("");
  const [fitlerObj, setFilterObj] = useState({
    start_date: "",
    end_date: ""
  })
  // Search debounce effect
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(timerId);
    };
  }, [searchQuery]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
    setForcePage(0);
  }, [debouncedSearchQuery]);

  // Fetch leads data from API
  const fetchLeads = useCallback(async (sd, ed) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${baseURL}dashboard/getAllLeads`, {
        params: {
          page: currentPage,
          limit: itemsPerPage,
          leadType: leadType,
          search: debouncedSearchQuery,
          campaignId: campaign,
          knowledgebaseId: campaign,
          startDate: sd || "",
          endDate: ed || "",
          isMeetingBookedOnGoogleMeet: isMeetingBookedOnGoogleMeet || ""
        }
      });

      if (response.data.status === 200) {
        setLeads(response.data.data);
        setTotalItems(response.data.pagination.totalItems);
        setTotalPages(response.data.pagination.totalPages);
        // setFilterObj({ start_date: "", end_date: "" })
      }
      setShowFilterModal(false)
    } catch (error) {
      // console.error("Error fetching leads:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, leadType, campaign, isMeetingBookedOnGoogleMeet, debouncedSearchQuery]);

  // Initial fetch and when dependencies change
  useEffect(() => {
    fetchLeads("", "");
  }, [fetchLeads]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page + 1);
    setForcePage(page);
  }, []);

  const onClose = () => {
    setIsOpen(false);
  };

  const handleItemsPerPageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(1);
    setForcePage(0);
  };


  const fetchProjects = async () => {
    try {
      const response = await fetchKnowledgebases(1, 1000);
      setProjects(response.data.data);
      // console.log("projects", projects);
    } catch (error: any) {
      // console.log(error);
    }
  }



  useEffect(() => {
    fetchProjects()
  }, [])




  const handleLeadTypeChange = (event: ChangeEvent<HTMLSelectElement>, name: any) => {
    if (name == "campaign") {
      setCampaign(event.target.value);
    } else if (name == "leadtype") {
      setLeadType(event.target.value);
    }
    setCurrentPage(1);
    setForcePage(0);
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleSync = () => {
    setIsOpen(true);
  };
  const tableHeader = [
    'Name',
    "Project / Campaign",
    'Email',
    'Phone Number',
    'Address',
    'Date',
    'Lead Type',
    'Synced to CRM',
    'Action'
  ]
  const tableDataKeys = [
    'name',
    'campaignDetails',
    'email',
    'phone',
    'address',
    'updatedAt',
    'IsLeadType',
    'isSyncedToCrm',
    'leadActions'
  ]

  const handleLeadsAction = (data: any, type: any) => {
    if (data.IsLeadType == "voiceBot") {
      setShowSummaryModal({ ...data, type: "voicebot" })
    } else {
      setShowSummaryModal({ ...data, type: "chatbot" })
    }
  }

  const downloadFilterData = async () => {
    try {
      const response = await axios.get(`${baseURL}dashboard/getAllLeads`, {
        params: {
          page: currentPage,
          limit: itemsPerPage,
          leadType: leadType,
          search: debouncedSearchQuery,
          campaignId: campaign,
          knowledgebaseId: campaign,
          startDate: fitlerObj?.start_date || "",
          endDate: fitlerObj?.end_date || "",
          isMeetingBookedOnGoogleMeet: isMeetingBookedOnGoogleMeet || "",
          export: true
        }
      });

      // console.log(response, "<<<<<<<<Asdf");

      const fileBuffer = response?.data?.fileBuffer
      setFilterObj({ start_date: "", end_date: "" })
      // console.log("fitlerObj", fitlerObj);
      const byteArray = new Uint8Array(fileBuffer.data);

      // Create a Blob (MIME type for Excel)
      const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

      // Create a download link
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `leads-${fitlerObj?.end_date}`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

    } catch (error) {
      // console.error("Error fetching leads:", error);
    }
  }


  return (<>
    <PageLayout
      pageTitle="Leads"
      pageHeaderContent={
        <Flex fontSize="12px" gap={3} fontWeight="400" color="#6C757D" pr={0}>
          <Flex alignItems="center" gap={"5px"}>
            <Button
              // mr="12px"
              colorScheme="blue"
              className="btn-hover-pri"
              size="md"
              minW={"120px"}
              onClick={handleSync}
              fontWeight={500}
              sx={{
                borderRadius: '4px',
                padding: '6px 12px',
                _focus: {
                  boxShadow: 'none',
                }
              }}
            >
              Sync with Zapier
            </Button>
            <Box>
              <InputGroup
                maxWidth="190px"
                borderRadius="4px"
                outline={"none"}
                // borderColor="#6C757D"
                // mr={"10px"}
                background={"white"}
              >
                <InputLeftElement pointerEvents='none'>
                  <IoIosSearch color="#6C757D" />
                </InputLeftElement>
                <Input
                  type='text'
                  // border={"1px solid #CED4DA"}

                  placeholder='Search'
                  color="#6C757D"
                  // borderColor="#6C757D"
                  outline={"none"}

                  value={searchQuery}
                  onChange={handleSearchChange}
                />
              </InputGroup>
            </Box>

            <Select
              value={campaign}
              bg="white"
              maxWidth={"146px"}
              borderRadius="4px"
              onChange={(e) => { handleLeadTypeChange(e, "campaign") }}
              width="auto"
              color="#6C757D"
            >
              <option value="all">Project: All</option>
              {
                projects?.map((item: any, index: any) => {
                  return (
                    <option key={index} value={item?._id}>{item?.name || "NA"}</option>
                  )
                })
              }
            </Select>
            <Box>
              <Select
                value={leadType}
                bg="white"
                minWidth={"144px"}
                borderRadius="4px"
                onChange={(e) => { handleLeadTypeChange(e, "leadtype") }}
                width="auto"
                // border="1px solid #E2E8F0"
                color="#6C757D"
              >
                <option value="all" >Lead Type: All</option>
                <option value="chatBot">ChatBot</option>
                {/* <option value="mailBot">EmailBot</option> */}
                <option value="emailAssistant">Email Assistant</option>
                <option value="emailOutreach">Email Outreach</option>
                <option value="voiceBot">VoiceBot</option>
                <option value="zapierCrm">Zapier CRM</option>

              </Select>

            </Box>


            <Select
              //  name=""
              width="130px"
              // color="white"
              backgroundColor="white"
              value={isMeetingBookedOnGoogleMeet}
              onChange={(e) => {
                setisMeetingBookedOnGoogleMeet(e.target.value)
              }}
            // placeholder="All"
            >
              {/* All corresponds to an empty string ""; placeholder already covers it, but we include for explicitness */}
              <option value="">
                {/* Meeting: All */}
                All Leads
              </option>
              <option value="true"> Leads With Booked Meetings</option>
              <option value="false">Leads Without Meetings Booked</option>
              {/* <option value="true">Meeting: With Google Calendar</option>
              <option value="false">Meeting: Without Google Calendar</option> */}
            </Select>
            <Box>
              <Tooltip label='Filter by date range' fontSize={"11px"}>
                <Button
                  color="white"
                  backgroundColor="white"
                  size="md"
                  onClick={() => setShowFilterModal(true)}
                  fontWeight={400}
                  border={"1px solid #CED4DA"}

                  sx={{
                    padding: 0,
                    borderRadius: '4px',
                    _focus: {
                      boxShadow: 'none',
                    }
                  }}
                >
                  <Image src='/icons/calender.svg' />
                </Button>
              </Tooltip>
              <Modal isOpen={showFilterModal} onClose={() => setShowFilterModal(false)}>
                <ModalOverlay />
                <ModalContent>
                  <ModalHeader>Date Filter</ModalHeader>
                  <ModalCloseButton />
                  <ModalBody pb={6}>
                    {/* <FormControl>
                      <FormLabel fontSize={14}>Start Date</FormLabel>

                      <Input type="date"

                        value={fitlerObj?.start_date} onChange={(e) => {
                          setFilterObj((prev) => ({
                            ...prev,
                            start_date: e.target.value
                          }))
                          // console.log("sadfsa", e.target.value, fitlerObj);
                        }} />
                    </FormControl>
                    <FormControl mt={4}>
                      <FormLabel fontSize={14}>End Date</FormLabel>
                      <Input type="date"
                        max={new Date().toISOString().split("T")[0]}
                        value={fitlerObj?.end_date}
                        onChange={(e) => {
                          setFilterObj((prev) => ({
                            ...prev,
                            end_date: e.target.value
                          }))
                        }} />
                    </FormControl> */}
                    <FormControl>
                      <FormLabel fontSize={14}>Start Date</FormLabel>
                      <Input
                        type="date"
                        value={fitlerObj?.start_date}
                        max={new Date().toISOString().split("T")[0]}
                        onChange={(e) => {
                          setFilterObj((prev) => ({
                            ...prev,
                            start_date: e.target.value,
                            // agar end date start date se chhoti ho to clear kar do
                            end_date:
                              prev.end_date && prev.end_date < e.target.value
                                ? ""
                                : prev.end_date,
                          }));
                        }}
                      />
                    </FormControl>
                    <FormControl mt={4}>
                      <FormLabel fontSize={14}>End Date</FormLabel>
                      <Input
                        type="date"
                        min={fitlerObj?.start_date}
                        max={new Date().toISOString().split("T")[0]}
                        value={fitlerObj?.end_date}
                        onChange={(e) => {
                          setFilterObj((prev: any) => ({
                            ...prev,
                            end_date: e.target.value,
                          }));
                        }}
                      />
                    </FormControl>
                  </ModalBody>
                  <ModalFooter>
                    <Button colorScheme='blue' mr={3} fontWeight={500} onClick={() => {
                      fetchLeads(fitlerObj?.start_date, fitlerObj?.end_date)
                    }}>
                      Apply
                    </Button>
                    <Button fontWeight={500} onClick={() => {
                      fetchLeads("", "")
                      setFilterObj({ start_date: "", end_date: "" })
                      setShowFilterModal(false)
                    }}>Cancel</Button>
                  </ModalFooter>
                </ModalContent>
              </Modal>
            </Box>
            <Tooltip label='Export Data' fontSize={"11px"}>
              <Button
                color="white"
                backgroundColor="#fff"
                border={"1px solid #CED4DA"}

                size="md"
                onClick={() => downloadFilterData()}
                fontWeight={400}
                sx={{
                  borderRadius: '4px',
                  padding: '6px 12px',
                  _focus: {
                    boxShadow: 'none',
                  }
                }}
                disabled={leads?.length == 0}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g clip-path="url(#clip0_9179_8006)">
                    <path d="M12.6666 15.1667H3.33325C2.67048 15.1658 2.03511 14.9021 1.56646 14.4335C1.09781 13.9648 0.834134 13.3295 0.833252 12.6667V3.33337C0.834134 2.6706 1.09781 2.03523 1.56646 1.56658C2.03511 1.09793 2.67048 0.834256 3.33325 0.833374H7.33325C7.46586 0.833374 7.59304 0.886052 7.6868 0.979821C7.78057 1.07359 7.83325 1.20077 7.83325 1.33337C7.83325 1.46598 7.78057 1.59316 7.6868 1.68693C7.59304 1.7807 7.46586 1.83337 7.33325 1.83337H3.33325C2.93559 1.8339 2.55437 1.99211 2.27318 2.2733C1.99199 2.55449 1.83378 2.93571 1.83325 3.33337V12.6667C1.83378 13.0644 1.99199 13.4456 2.27318 13.7268C2.55437 14.008 2.93559 14.1662 3.33325 14.1667H12.6666C13.0642 14.1662 13.4455 14.008 13.7267 13.7268C14.0078 13.4456 14.1661 13.0644 14.1666 12.6667V8.66671C14.1666 8.5341 14.2193 8.40692 14.313 8.31315C14.4068 8.21939 14.534 8.16671 14.6666 8.16671C14.7992 8.16671 14.9264 8.21939 15.0201 8.31315C15.1139 8.40692 15.1666 8.5341 15.1666 8.66671V12.6667C15.1657 13.3295 14.902 13.9648 14.4334 14.4335C13.9647 14.9021 13.3294 15.1658 12.6666 15.1667Z" fill="#6C757D" />
                    <path d="M3.99992 11.1667C3.94363 11.1666 3.88776 11.1572 3.83458 11.1387C3.73681 11.1043 3.65211 11.0405 3.59216 10.9559C3.53222 10.8714 3.49999 10.7703 3.49992 10.6667V10C3.50194 8.36322 4.12055 6.78723 5.2325 5.58608C6.34445 4.38493 7.86811 3.64678 9.49992 3.51871V1.33337C9.50001 1.23455 9.52938 1.13796 9.58432 1.05582C9.63927 0.973675 9.71733 0.909657 9.80864 0.871849C9.89995 0.834042 10.0004 0.824141 10.0973 0.843397C10.1943 0.862653 10.2833 0.910203 10.3533 0.980041L15.0199 5.64671C15.0687 5.69541 15.1068 5.75367 15.132 5.81782C15.1572 5.88197 15.1688 5.95063 15.1662 6.01949C15.1635 6.08835 15.1467 6.15593 15.1167 6.21797C15.0867 6.28002 15.0442 6.33519 14.9919 6.38004L10.3253 10.38C10.2526 10.4423 10.1637 10.4824 10.0689 10.4956C9.97421 10.5088 9.87769 10.4945 9.79081 10.4545C9.70393 10.4145 9.63035 10.3505 9.57879 10.2699C9.52723 10.1893 9.49986 10.0957 9.49992 10V7.83337C8.6831 7.83916 7.87794 8.02779 7.14354 8.38541C6.40915 8.74303 5.76416 9.26057 5.25592 9.90004L4.38925 10.982C4.34217 11.0398 4.28279 11.0864 4.21544 11.1183C4.14809 11.1503 4.07446 11.1668 3.99992 11.1667ZM10.4999 2.54071V4.00004C10.4999 4.13265 10.4472 4.25983 10.3535 4.35359C10.2597 4.44736 10.1325 4.50004 9.99992 4.50004C8.6861 4.50177 7.41616 4.97302 6.41924 5.82874C5.42232 6.68447 4.76407 7.86833 4.56325 9.16671C5.17154 8.4348 5.93388 7.84618 6.79587 7.44285C7.65785 7.03951 8.59824 6.8314 9.54992 6.83337H9.99992C10.1325 6.83337 10.2597 6.88605 10.3535 6.97982C10.4472 7.07359 10.4999 7.20077 10.4999 7.33337V8.91271L13.9333 5.97204L10.4999 2.54071Z" fill="#6C757D" />
                  </g>
                  <defs>
                    <clipPath id="clip0_9179_8006">
                      <rect width="16" height="16" fill="white" />
                    </clipPath>
                  </defs>
                </svg>

              </Button>
            </Tooltip>
          </Flex>
        </Flex >
      }
    >
      <Box minW="100%" w="600px">
        <TableComponent
          isLoading={isLoading}
          data={leads || []}
          tableDataKeys={tableDataKeys}
          tableHeader={tableHeader}
          totalItems={totalItems}
          handleLeadsAction={handleLeadsAction}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          handlePageChange={handlePageChange}
        />
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
      </Box>
    </PageLayout >
    <SyncWithCrmModal isOpen={isOpen} onClose={onClose} />
    <SummaryModal isOpen={showSummaryModal} onClose={() => { setShowSummaryModal({}) }} />
  </>);
};

export default AllLeads;