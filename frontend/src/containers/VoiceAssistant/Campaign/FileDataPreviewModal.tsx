import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
  Box,
  Flex, Alert, AlertIcon, AlertDescription,
  Text,
  Tag,
  TagLabel,
  ModalHeader,
  Select,
  HStack,
  Tr,
  Td,
  Image,
  Button,
  useToast,
  Tooltip,
} from '@chakra-ui/react';
import TableComponent from '../../TableComponent';
import React from 'react';
import { PaginatorTwo } from '../../../widgets/Paginator/PaginatorTwo';
import { Link, useHistory } from 'react-router-dom';


export default function FileDataPreviewModal({ modalData, onClose, handleHeaderSteps, setStep }: any) {
  const [tableData, setTableData] = React.useState<any>([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const history = useHistory()
  const toast = useToast();
  const tableHeader = ['Company Name', 'Email', 'Phone Number', 'Website URL'];
  const tableDataKeys = ['companyName', 'email', 'phoneNumber', 'websiteUrl'];


  React.useEffect(() => {
    setTableData(modalData?.data?.allRows || []);
    setCurrentPage(1); // Reset to page 1 when data changes
  }, [modalData?.data]);

  const [activeFilter, setActiveFilter] = React.useState<string>('allRows');

  // console.log("modalData?.data", modalData?.data);

  const handlePageChange = (page: number) => {
    setCurrentPage(page + 1);
  };

  const handleTagClick = (filterKey: string, value: boolean) => {
    const allRows = modalData?.data?.allRows || [];
    const filterFn = allRows.filter((item: any) => {
      if (filterKey === 'allRows') {
        return item;
      } else if (filterKey == "validEmail") {
        return item.isEmailInvalid == value;
      } else if (filterKey == "validPhone") {
        return item.isPhoneInvalid == value;
      } else if (filterKey == "phoneDuplicate") {
        return item.isPhoneDuplicate == value;
      } else if (filterKey == "emailDuplicate") {
        return item.isEmailDuplicate == value;
      }
      // return filterFunctions[filterKey](item);phoneDuplicate
    });
    // console.log(allRows, filterFn, "filteredData", filterKey);
    setTableData(filterFn);
    setCurrentPage(1);
    setActiveFilter(filterKey);
  };
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when items per page change
  };
  // Pagination Logic
  const totalItems = tableData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedData = tableData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <Modal isOpen={modalData.isOpen} onClose={onClose} size="full" motionPreset="scale">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader borderBottom={"1px solid #DBDFE9"}
          sx={{
            minHeight: "60px",
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box as='span' fontSize="2xl" fontWeight="bold">
            <ModalCloseButton
              onClick={() => {
                history.push(`/app/voice-campaign/create?subTab=target-audience`);
              }}
              sx={{
                top: '13px',
                right: '25px',
                _focus: {
                  boxShadow: 'none',  // Removes the focus box shadow
                  outline: 'none'
                }
              }}
            />
          </Box>
        </ModalHeader>
        <ModalBody p={6} bg="gray.50">
          <Flex justifyContent="space-between" alignItems="center">
            <Text fontSize="24px" fontWeight="600">All Leads Data</Text>
            <Flex wrap="wrap" gap={3}>
              <Tag fontSize="13px" colorScheme="green" cursor="pointer" onClick={() => handleTagClick("allRows", false)}>
                <TagLabel>All ({modalData?.data?.allRows?.length || "0"})</TagLabel>
              </Tag>
              <Tag fontSize="13px" colorScheme="green" cursor="pointer" onClick={() => handleTagClick("validPhone", false)}>
                <TagLabel>Valid Number ({modalData?.data?.validPhoneCount || "0"})</TagLabel>
              </Tag>
              <Tag fontSize="13px" colorScheme="green" cursor="pointer" onClick={() => handleTagClick("validEmail", false)}>
                <TagLabel>Valid Email ({modalData?.data?.validEmailCount || "0"})</TagLabel>
              </Tag>
              <Tag fontSize="13px" colorScheme="red" cursor="pointer" onClick={() => handleTagClick("validEmail", true)}>
                <TagLabel>Invalid Email ({modalData?.data?.invalidEmailCount || "0"})</TagLabel>
              </Tag>
              <Tag fontSize="13px" colorScheme="red" cursor="pointer" onClick={() => handleTagClick("validPhone", true)}>
                <TagLabel>Invalid Number ({modalData?.data?.invalidPhoneCount || "0"})</TagLabel>
              </Tag>
              <Tag fontSize="13px" colorScheme="orange" cursor="pointer" onClick={() => handleTagClick("phoneDuplicate", true)}>
                <TagLabel>Duplicate Number ({modalData?.data?.duplicatePhoneCount || "0"})</TagLabel>
              </Tag>
              <Tag fontSize="13px" colorScheme="orange" cursor="pointer" onClick={() => handleTagClick("emailDuplicate", true)}>
                <TagLabel>Duplicate Email ({modalData?.data?.duplicateEmailCount || "0"})</TagLabel>
              </Tag>
              {/* <Select
                fontSize="13px"
                bg="white"
                minWidth="150px"
                borderRadius="4px"
                onChange={handleFilterChange}
                width="auto"
                color="#6C757D"
              >
                <option value="allRows">Status: All</option>
                <option value="validRows">Valid</option>
                <option value="invalidRows">Invalid</option>
              </Select> */}
            </Flex>
          </Flex>

          {/* Table */}
          <Box>
            <TableComponent
              isLoading={false}
              data={paginatedData}
              tableDataKeys={tableDataKeys}
              tableHeader={tableHeader}
              customRowRenderer={(row: any, index: number) => {
                return (
                  <Tr key={index}>
                    <Td>{(currentPage - 1) * itemsPerPage + index + 1}</Td>
                    <Td>
                      <Box display="flex" maxW={"300px"} alignItems="center" gap="6px">
                        {row.companyName ? <>
                          <Tooltip label={row.companyName}>
                            <Text isTruncated flex="1">{row.companyName}</Text>
                          </Tooltip>
                        </>
                          :
                          <Text color="#888888">N/A</Text>
                        }
                      </Box>
                      {/* {row.companyName} */}
                    </Td>
                    <Td>
                      {
                        row.email ?
                          <Box display={'flex'} alignItems={'center'} gap={'8px'}>
                            {
                              row?.isEmailDuplicate ?
                                <Image src="/icons/duplicate.svg" alt='Duplicate' /> :
                                row?.isEmailInvalid ?
                                  <Image src="/icons/no.svg" alt='No' /> :
                                  <Image src="/icons/yes.svg" alt='Yes' />
                            }
                            {row.email || ""}
                          </Box> : <Text color="#888888">N/A</Text>
                      }
                    </Td>
                    <Td>
                      {
                        row.phoneNumber ?
                          <Box minW="250px" display={'flex'} alignItems={'center'} gap={'8px'}>
                            {
                              row?.isPhoneDuplicate ?
                                <Image src="/icons/duplicate.svg" alt='Duplicate' /> :
                                row?.isPhoneInvalid ?
                                  <Image src="/icons/no.svg" alt='No' /> :
                                  <Image src="/icons/yes.svg" alt='Yes' />
                            }
                            {row.phoneNumber || ""}
                          </Box> : <Text color="#888888">N/A</Text>
                      }
                    </Td>
                    <Td>
                      {
                        row.websiteUrl ?
                          <Box display={'flex'} alignItems={'center'} gap={'8px'}>
                            {
                              row?.isWebsiteInvalid ?
                                <Image src="/icons/duplicate.svg" alt='Duplicate' /> :
                                <Image src="/icons/yes.svg" alt='Yes' />
                            }
                            {row.websiteUrl}
                            <Link to="#"
                              onClick={() => {
                                window.open(row.websiteUrl, '_blank');
                              }}
                              target='_blank' color="blue.500">
                              <Image src="/icons/outgoing.svg" maxW={"40px"} alt="arrow-right" />
                            </Link>
                          </Box> : <Text color="#888888">N/A</Text>
                      }
                    </Td>
                  </Tr>
                )
              }}

            />



            <HStack w="full" justifyContent="space-between" py={2} mb={2}>
              <Flex alignItems="center">
                <Text mr="8px" fontSize="16px" fontWeight="400" color="#212529">
                  Total {totalItems} items
                </Text>
                <PaginatorTwo
                  onPageChange={handlePageChange}
                  pageCount={totalPages}
                  forcePage={currentPage - 1}
                  pageRangeDisplayed={5}
                />
              </Flex>
              <Flex alignItems="center">
                <Select
                  value={itemsPerPage}
                  bg="#fff"
                  onChange={handleItemsPerPageChange}
                  width="auto"
                  color="#6C757D"
                // mr="8px"
                >
                  <option value={2}>2 / page</option>
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </Select>
              </Flex>
            </HStack>
            {
              modalData?.data?.validRows == modalData?.data?.allRows ? "" :
                <Alert
                  status="warning"
                  variant="left-accent"
                  borderRadius="md"
                  my={2}
                  fontSize="sm"
                >
                  <AlertIcon />
                  <AlertDescription>
                    Only valid leads will be included in this campaign. Invalid leads will
                    be automatically skipped.
                  </AlertDescription>
                </Alert>
            }

            <Flex justifyContent={"end"}>
              <Button
                colorScheme="blue"
                type="button"
                fontWeight={400}
                onClick={() => {
                  if (modalData?.data?.validRows?.length == 0) {
                    toast({
                      isClosable: true,
                      title: "No valid data to proceed. Please upload a file with valid data.", status: "warning"
                    })
                    return;
                  }
                  onClose()
                  handleHeaderSteps("next")
                  history.push("/app/voice-campaign/create?subTab=prompt")
                  setStep(2);
                }}
              // disabled={websiteData === false}
              >
                Continue
              </Button>

            </Flex>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

