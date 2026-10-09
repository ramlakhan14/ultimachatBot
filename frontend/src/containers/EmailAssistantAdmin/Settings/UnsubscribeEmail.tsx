import React, { ChangeEvent } from "react";
import { Box, Input, Button, VStack, Text, InputGroup, InputLeftElement, Heading, Flex, TableContainer, Table, Thead, Tr, Th, Tbody, HStack, Select, FormControl, FormErrorMessage, useToast, Modal, ModalOverlay, ModalContent, ModalBody, Image, ModalFooter, Td } from '@chakra-ui/react';
import styles from './setting.module.scss';
import { colors } from "../../../utils/constant";
import { PaginatorTwo } from "../../../widgets/Paginator/PaginatorTwo";
import { callApi } from "../../../services/callApi";
import { add } from "lodash";
import { useLocation } from "react-router-dom";

const UnsubscribeEmail: React.FC = () => {
  const [emails, setEmails] = React.useState([]);
  const [newEmail, setNewEmail] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState<boolean>(false);
  const suggestionsRef = React.useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [forcePage, setForcePage] = React.useState<number>(0);
  const [debouncedSearchValue, setDebouncedSearchValue] = React.useState('');
  const [searchValue, setSearchValue] = React.useState('');
  const [pagination, setPagination] = React.useState<any>({ totalPages: 0 });
  const [error, setError] = React.useState("");
  const toast = useToast();
  const [isConfirm, setIsConfirm] = React.useState<string | undefined>();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);

  const subtab = queryParams.get('subtab');

  const [itemsPerPages, setItemsPerPage] = React.useState<number>(10);
  const [itemsPerPage, setItemsPerPages] = React.useState<number>(-1);

  const emailDomains = ['@gmail.com', '@yahoo.com', '@hotmail.com', '@outlook.com'];

  React.useEffect(() => {

    // Handle clicks outside suggestions box
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;  // Type assertion
      if (suggestionsRef.current && !suggestionsRef.current.contains(target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (subtab === 'unsubscribeEmail') {
      fetchData(currentPage, itemsPerPages, debouncedSearchValue)
    }
  }, [currentPage, debouncedSearchValue, itemsPerPages, subtab]);




  const fetchData = async (cp: any, pp: any, sr: any) => {
    try {
      const response = await callApi(`campaign/getUnsubscriptionEmails?page=${cp || ""}&limit=${pp || ""}&search=${sr || ""}`, "get", "")
      // console.log(response, "<<<<<<<<<ADSf");
      setEmails(response.data?.data || []);
      setPagination(response.data?.pagination || {});
      setCurrentPage(response.data?.pagination?.page || 1);
    } catch (error) {
      // console.log(error);
    }
  }


  const addUnSubscribe = async (newEmail: any) => {
    try {
      if (!newEmail) {
        setError("Email is required");
        return
      }
      const response = await callApi("campaign/addUnsubscriptionEmail", "post", { email: newEmail })
      toast({
        title: response?.data?.message || response?.message || `Oops! Something went wrong`,
        status: "success",
        isClosable: true,
      });
      setNewEmail('');
      fetchData(currentPage, itemsPerPages, debouncedSearchValue)
    } catch (error: any) {
      // console.log(error);
      toast({
        title: error?.response?.data?.message || error?.message || `Oops! Something went wrong`,
        status: "error",
        isClosable: true,
      });
    }
  }
  const deleteUnSubscribe = async (email: any) => {
    try {
      const response = await callApi(`campaign/deleteUnsubscriptionEmail/${email}`, "delete", "")
      // console.log(response, "<<<<<<<<<ADSf");
      fetchData(1, itemsPerPages, debouncedSearchValue)
      setIsConfirm("")
    } catch (error: any) {
      // console.log(error);
      setIsConfirm("")
      toast({
        title: error?.response?.data?.message || error?.message || `Oops! Something went wrong`,
        status: "error",
        isClosable: true,
      });
    }
  }



  const handleInputChange = (e: any) => {
    const value = e.target.value;
    setNewEmail(value);
    // Generate suggestions based on input

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      setError("Please enter a valid email address");
    } else {
      setError("");
    }

    if (value) {
      const newSuggestions = emailDomains.map(domain => `${value}${domain}`);
      setSuggestions(newSuggestions);
      setShowSuggestions(true);
      setError("");
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    setNewEmail(suggestion);
    setShowSuggestions(false);
  };

  const handleUnsubscribe = async () => {
    if (newEmail.trim()) {
      await addUnSubscribe(newEmail.trim())
    }
  };
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchValue(searchValue);

      if (searchValue !== "") {
        // setIsSearchActive(true);
        setCurrentPage(1);
        setForcePage(0);
      } else {
        // setIsSearchActive(false);
      }
    }, 1500);

    return () => clearTimeout(handler);
  }, [searchValue]);


  const handleItemsPerPageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(1);
    setForcePage(0);
  };

  const handleItemsPerPageChanges = (event: ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPages(parseInt(event.target.value, 10));
  };
  const handlePageChange = React.useCallback((page) => {
    setCurrentPage(page + 1);
    setForcePage(page)
  }, [setCurrentPage]);


  return (
    <Box>
      <Heading fontSize={"20px"} lineHeight={"28px"} fontWeight={600}>Customize Settings</Heading>
      <Box mt="24px">
        <VStack align="stretch">
          <Flex alignItems="center" mb={1} justifyContent={"space-between"}>
            <Flex alignItems="center" justifyContent={"space-between"}>
              <Heading fontSize="16px" fontWeight={"600"} minW={"160px"}>
                Unsubscribe Email
              </Heading>
              <InputGroup width={"210px"}>
                <InputLeftElement pointerEvents="none">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15.148 14.3519L11.6275 10.8321C12.6479 9.60705 13.1567 8.03577 13.0481 6.44512C12.9395 4.85447 12.2218 3.36692 11.0444 2.29193C9.86696 1.21693 8.32041 
                  0.637251 6.72647 0.673476C5.13253 0.709701 3.61392 1.35904 2.48654 2.48642C1.35916 3.6138 0.709823 5.13241 0.673598 6.72635C0.637373 8.32029 1.21705 9.86684 2.29205 
                  11.0443C3.36705 12.2217 4.85459 12.9394 6.44524 13.048C8.03589 13.1566 9.60717 12.6477 10.8322 11.6273L14.3521 15.1479C14.4043 15.2001 14.4664 15.2416 14.5347 
                  15.2699C14.6029 15.2982 14.6761 15.3127 14.75 15.3127C14.8239 15.3127 14.8971 15.2982 14.9654 15.2699C15.0337 15.2416 15.0957 15.2001 15.148 15.1479C15.2003 
                  15.0956 15.2417 15.0336 15.27 14.9653C15.2983 14.897 15.3129 14.8238 15.3129 14.7499C15.3129 14.676 15.2983 14.6028 15.27 14.5345C15.2417 14.4663 15.2003 
                  14.4042 15.148 14.3519ZM1.81254 6.87492C1.81254 5.87365 2.10945 4.89487 2.66572 4.06234C3.222 3.22982 4.01265 2.58094 4.9377 2.19778C5.86275 1.81461 6.88065 
                  1.71435 7.86268 1.90969C8.84471 2.10503 9.74676 2.58718 10.4548 3.29519C11.1628 4.00319 11.6449 4.90524 11.8403 5.88727C12.0356 6.8693 11.9353 7.8872 11.5522 
                  8.81225C11.169 9.7373 10.5201 10.528 9.68761 11.0842C8.85509 11.6405 7.87631 11.9374 6.87504 11.9374C5.53284 11.9359 4.24603 11.4021 3.29695 10.453C2.34787 9.50392 
                  1.81403 8.21712 1.81254 6.87492Z" fill="#6C757D" />
                  </svg>

                </InputLeftElement>
                <Input
                  placeholder="Search"
                  value={searchValue}
                  onChange={(e) => {
                    setSearchValue(e.target.value);
                  }}
                  // onFocus={() => newEmail && !newEmail.includes('@') && setShowSuggestions(true)}
                  className={styles.searchInput}
                />
              </InputGroup>

            </Flex>
            <Box pos={'relative'}>
              <Box className={styles.searchContainer}>
                <FormControl className={styles.searchContainer} gap="16px!important" isInvalid={!!error}>
                  <Box>
                    <Input
                      width={"243px"}
                      placeholder="Add unsubscribe email"
                      value={newEmail}
                      onChange={handleInputChange}
                      onFocus={() => newEmail && !newEmail.includes('@') && setShowSuggestions(true)}
                      className={styles.searchInput}
                    />
                    {error && <FormErrorMessage>{error}</FormErrorMessage>}
                  </Box>
                  {/* </InputGroup> */}
                  <Button
                    onClick={handleUnsubscribe}
                    background={"#2977ff"}
                    _hover={{
                      background: "#2977ff"
                    }}
                    color={"#fff"}
                    // px={'40px'}
                    fontWeight={500}
                  >
                    Unsubscribe
                  </Button>
                </FormControl>
              </Box>
              {showSuggestions && suggestions.length > 0 && (
                <Box
                  ref={suggestionsRef}
                  className={styles.suggestionsBox}
                >
                  {suggestions.map((suggestion, index) => (
                    <Box
                      key={index}
                      className={styles.suggestionItem}
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Flex>
          <hr style={{ marginTop: '16px', marginBottom: '16px' }} />
          <Box mt={'0px !important'}>
            <Text fontSize="18px" lineHeight={"32px"} color={"#1A202C"} fontWeight={700}>
              Unsubscribe Email List
            </Text>
            <Box >

              <TableContainer
                maxH="calc(100vh - 415px)"
                mt={'16px'}
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
                  }} bg={colors.tableHeadingBg}  >
                    <Tr
                      className={styles.tableHd}
                    >
                      <Th>#</Th>
                      <Th>Email</Th>
                      <Th textAlign={'end'}>Action</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {
                      emails.length === 0 ?
                        <Tr>
                          <Th colSpan={3}>
                            <Text textAlign="center" py={4} fontSize="16px" fontWeight="500" color="#6C757D">No records found</Text>
                          </Th>
                        </Tr> :
                        <>
                          {
                            emails?.map((item: any, index: any) => {
                              return (
                                <Tr key={index} className={styles.tableRow}>
                                  <Td>{index + 1 + (currentPage - 1) * itemsPerPages}</Td>
                                  <Td fontSize="14px" lineHeight="20px" fontWeight="400" color="#1A202C">{item?.email}</Td>
                                  <Td textAlign={'end'}>
                                    <Button
                                      colorScheme="red"
                                      size="sm"
                                      onClick={() => setIsConfirm(item?.email)}
                                    >
                                      <img src="/icons/delete.svg" alt="delete" />
                                    </Button>
                                  </Td>
                                </Tr>
                              )
                            })
                          }
                        </>
                    }

                  </Tbody>
                </Table>
              </TableContainer>
              {
                pagination?.total != "0" &&
                <HStack w="full" justifyContent="space-between" py={4}>
                  <Flex alignItems="center">
                    <Text mr="8px" fontSize="16px" fontWeight="400" color="#212529">Total {pagination?.total || 0} items</Text>
                    {/* <Paginator onPageChange={handlePageChange} pageRangeDisplayed={5} pageCount={leadsData.pages} /> */}
                    <PaginatorTwo onPageChange={handlePageChange} pageRangeDisplayed={5} pageCount={pagination?.totalPages || 0} forcePage={forcePage || 0} />
                  </Flex>
                  <Flex alignItems="center">
                    <Select
                      value={itemsPerPages}
                      onChange={handleItemsPerPageChange}
                      width="auto"
                      bg={'#fff'}
                      borderRadius="4px"
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
          </Box>
        </VStack>
      </Box>
      <Modal isCentered onClose={() => setIsConfirm("")} isOpen={!!isConfirm}>
        <ModalOverlay />
        <ModalContent>
          <ModalBody>
            <Box
              textAlign="center"
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
            >
              <Image src={"/icons/error.svg"} alt="deleteicon" w="56px" h="56px" />
              <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" mb="8px" mt="24px">
                Are you sure?
              </Text>
              <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D">
                {/* You want to delete ? */}
                Are you sure you want to delete the selected email? This action cannot be undone.
              </Text>
            </Box>
          </ModalBody>
          <ModalFooter>

            <Button
              fontWeight="500"
              // style={{ backgroundColor: "#6C757D", color: "#fff" }}
              mr={3}
              onClick={() => setIsConfirm("")}
            >
              <Text as="span" ms="4px" fontSize="16px">
                Cancel
              </Text>
            </Button>
            <Button
              mr={3}
              colorScheme="blue"
              onClick={() => {
                deleteUnSubscribe(isConfirm)
              }}
              fontSize="16px"
              fontWeight="500"
            >
              Confirm
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default UnsubscribeEmail;