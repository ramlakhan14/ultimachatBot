import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton, Alert, AlertIcon, AlertDescription,
  Box,
  Flex,
  Text,
  Tag,
  TagLabel,
  SlideFade,
  ModalHeader,
  Select,
  HStack,
  Tr,
  Td,
  Image,
  useToast,
  Button,
  Tooltip,
} from '@chakra-ui/react';
import { GoInfo } from "react-icons/go";

import TableComponent from '../../TableComponent';
import React from 'react';
import { PaginatorTwo } from '../../../widgets/Paginator/PaginatorTwo';
import { callApi } from '../../../services/callApi';
import { useHistory, useLocation } from 'react-router-dom';
import { createReviewCampaign } from '../../../services/UltimaReviewsConnection';


export default function EmailDataPreviewModal({ modalData, onClose, payload }: any) {
  const [tableData, setTableData] = React.useState<any>([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const history = useHistory();

  const tableHeader = [
    'Email',
    ...(modalData?.campaingType === "reviewSales" ? ['Business Name'] : []),
    'Verification Status'
  ]; const tableDataKeys = ['email', 'verification'];




  // console.log("modalData", modalData, payload);


  const getAllLeadsData = React.useCallback(() => {
    const base = modalData?.data?.allEmails || modalData?.data?.allRows || [];
    const dupsInSources = modalData?.data?.duplicateEmailsInSources || modalData?.data?.duplicatesInOtherCampaigns || [];
    const dupEmails = modalData?.data?.duplicateEmails || [];

    const existingEmails = new Set(base.map((item: any) => (typeof item === 'string' ? item : item?.email)?.toLowerCase()).filter(Boolean));
    const combined = [...base];

    [...dupsInSources, ...dupEmails].forEach((item: any) => {
      const emailStr = typeof item === 'string' ? item : item?.email;
      if (emailStr && !existingEmails.has(emailStr.toLowerCase())) {
        existingEmails.add(emailStr.toLowerCase());
        combined.push(typeof item === 'string' ? { email: emailStr, duplicate: true, duplicateOther: true } : { ...item, duplicate: true, duplicateOther: true });
      }
    });

    return combined;
  }, [modalData?.data]);

  React.useEffect(() => {
    setTableData(getAllLeadsData());
    setCurrentPage(1); // Reset to page 1 when data changes
  }, [modalData?.data, getAllLeadsData]);

  const [activeFilter, setActiveFilter] = React.useState<string>('allRows');
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const campId = queryParams.get('id');
  const CampName = queryParams.get('campaignName') || "";
  const subTab = queryParams.get('subTab');

  const data = { campaignId: campId || "", campaignName: CampName || "" };
  // console.log("Campaign Name from state: campaignId ,campaignName", data);

  const toast = useToast();

  const handlePageChange = (page: number) => {
    setCurrentPage(page + 1);
  };

  const isRowValid = (item: any) => {
    if (item?.duplicate || item?.duplicateOther || item?.isEmailDuplicate || item?.isDuplicate) return false;
    if (item?.isValid === false || item?.isVerified === false || item?.verificationStatus === "not_receiving" || item?.isEmailInvalid === true || item?.isEmailInvalid === "true" || item?.isInvalid === true) {
      return false;
    }
    if (item?.isValid === true || item?.isVerified === true || item?.verificationStatus === "receiving") {
      return true;
    }
    return item?.isEmailInvalid === false || item?.isEmailInvalid === "false";
  };

  const handleTagClick = (filterKey: string, value: boolean) => {
    const allLeads = getAllLeadsData();
    let filtered: any[] = [];

    if (filterKey === "valid") {
      filtered = allLeads.filter((item: any) => isRowValid(item));
    } else if (filterKey === "invalidEmail") {
      filtered = (modalData?.data?.invalidEmails && modalData.data.invalidEmails.length > 0)
        ? modalData.data.invalidEmails
        : allLeads.filter((item: any) => !isRowValid(item) && !item?.duplicate && !item?.duplicateOther && !item?.isEmailDuplicate);
    } else if (filterKey === "emailDuplicate") {
      const dups = modalData?.data?.duplicateEmails || [];
      filtered = (dups.length > 0)
        ? dups.map((item: any) => (typeof item === 'string' ? { email: item, duplicate: true } : { ...item, duplicate: true }))
        : allLeads.filter((item: any) => item?.duplicate === true || item?.isDuplicate === true || item?.isEmailDuplicate === true);
    } else if (filterKey === "duplicateother") {
      const dupsInSources = modalData?.data?.duplicateEmailsInSources || modalData?.data?.duplicatesInOtherCampaigns || [];
      filtered = (dupsInSources.length > 0)
        ? dupsInSources.map((item: any) => (typeof item === 'string' ? { email: item, duplicate: true, duplicateOther: true } : { ...item, duplicate: true, duplicateOther: true }))
        : allLeads.filter((item: any) => item?.duplicateOther === true || item?.isDuplicateOther === true || item?.duplicate === true);
    } else {
      filtered = allLeads;
    }

    setTableData(filtered || []);
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

  const addAudience = async () => {
    try {
      // console.log("mergedVerifieddata", mergedVerifieddata);

      if (modalData?.data?.allEmails?.length == 0) {
        toast({
          title: "Leads can not be empty. Please atlest one !",
          status: "warning",
          isClosable: true,
        });
        return
      }
      const payload = {
        campaignId: data?.campaignId || "",
        leads: modalData?.data?.allEmails || []
      }
      setIsSubmitting(true)
      const response = await callApi("campaign/insertCampaignAudience", "post", payload)
      setIsSubmitting(false)
      // console.log(response, "<<<<<<<<<<SADf");
      toast({
        title: response?.message,
        status: "success",
        isClosable: true,
      });
      onClose()
      if (subTab == "add-more-lead") {
        history.push("/app/email-campaigns")
      } else {
        history.push(`/app/email-campaigns/create?subTab=set-up-review&id=${data?.campaignId}`);
      }

    } catch (error: any) {
      // console.log(error, "<<<<<SADf");
      setIsSubmitting(false)

      toast({
        title: error?.response?.data?.message || error?.message,
        status: "error",
        isClosable: true,
      });
    }
  }


  const createReviewSalesCam = async () => {
    const payloadNew = {
      ...payload,
      targetLeads: modalData?.data?.validRows,
    };
    if (modalData?.data?.validRows?.length === 0) {
      toast({
        title: "Error",
        description: "Please add leads to create a campaign.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    // console.log("Form Data: ", payloadNew);
    try {
      setIsSubmitting(true);
      const response: any = await createReviewCampaign(payloadNew);
      setIsSubmitting(false);
      if (response.status === 201) {
        toast({
          title: "Campaign Created Successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        // reset();
        // setEmailLeads([]);
        // onClose()
        history.push("/app/ultima-reviews/campaign/");
      }

    } catch (error: any) {
      toast({
        title: error?.response?.data?.message,
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  }


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
                // history.push(`/app/email-campaigns/create?subTab=target-audience&id=${data?.campaignId}&campaignName=${modalData?.data?.campaignName || CampName}`);
                if (modalData?.campaingType == "reviewSales") {
                  onClose()
                } else {
                  history.goBack()
                }
                // push(`/app/email-campaigns/create?subTab=target-audience&id=${data?.campaignId}&campaignName=${modalData?.data?.campaignName || CampName}`);

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
            <Text fontSize="24px" fontWeight="600">All Leads </Text>
            <Flex wrap="wrap" gap={3}>
              <Tag fontSize="13px" colorScheme="green" cursor="pointer" onClick={() => handleTagClick("allRows", false)}>
                <TagLabel>All ({getAllLeadsData().length})</TagLabel>
              </Tag>
              <Tag fontSize="13px" colorScheme="green" cursor="pointer" onClick={() => handleTagClick("valid", false)}>
                <TagLabel>Outscrapper Verified ({modalData?.data?.validEmailsCount || modalData?.data?.validEmailCount || "0"})</TagLabel>
              </Tag>
              <Tag fontSize="13px" colorScheme="red" cursor="pointer" onClick={() => handleTagClick("invalidEmail", true)}>
                <TagLabel>Invalid Email ({modalData?.data?.invalidEmailsCount || modalData?.data?.invalidEmailCount || "0"})</TagLabel>
              </Tag>
              <Tag fontSize="13px" colorScheme="orange" cursor="pointer" onClick={() => handleTagClick("emailDuplicate", true)}>
                <TagLabel>Duplicate Email ({modalData?.data?.duplicateEmailCount || modalData?.data?.duplicateEmailCount || "0"})</TagLabel>
              </Tag>
              {
                (modalData?.data?.duplicatesInOtherCampaignsCount > 0 || (modalData?.data?.duplicateEmailsInSources && modalData?.data?.duplicateEmailsInSources?.length > 0)) &&
                <Tag fontSize="13px" colorScheme="orange" cursor="pointer" onClick={() => handleTagClick("duplicateother", true)} >
                  <TagLabel>Emails Duplicated Across Campaigns ({modalData?.data?.duplicatesInOtherCampaignsCount || modalData?.data?.duplicateEmailsInSources?.length || "0"})</TagLabel>
                </Tag>
              }

            </Flex>
          </Flex>

          {/* Table */}
          <Box>
            <TableComponent
              isLoading={false}
              data={paginatedData}
              // tableDataKeys={tableDataKeys}
              tableHeader={tableHeader}
              customRowRenderer={(row: any, index: number) => {
                const isEmailValid = isRowValid(row);
                const isDup = row?.duplicate || row?.duplicateOther || row?.isDuplicateOther || row?.isEmailDuplicate;
                return (
                  <Tr key={index}>
                    <Td>{(currentPage - 1) * itemsPerPage + index + 1}</Td>
                    <Td>
                      <Box display={'flex'} alignItems={'center'} gap={'8px'}>

                        {isDup ?
                          <Image src="/icons/duplicate.svg" alt='Duplicate' /> :
                          isEmailValid ?
                            <Image src="/icons/yes.svg" alt='Yes' /> :
                            <Image src="/icons/no.svg" alt='No' />
                        }
                        {row?.email ? (typeof row.email === 'string' ? row.email : row) : <Text as="span" color="#888888">N/A</Text>}
                      </Box>
                    </Td>

                    {
                      modalData?.campaingType == "reviewSales" &&
                      <Td>
                        <Box display={'flex'} alignItems={'center'} gap={'8px'}>
                          {row?.businessName ? row?.businessName : <Text as="span" color="#888888">N/A</Text>}
                        </Box>
                      </Td>
                    }
                    <Td>
                      <Box display={'flex'} alignItems={'center'} gap={'8px'}>

                        {
                          isDup ?
                            <Flex alignItems="center" gap={"4px"}>
                              <Text color="orange.500" fontWeight="500">Duplicate Across Campaigns</Text>
                              <Tooltip label="This email is duplicate / already present in another campaign.">
                                <Box>
                                  <GoInfo color="#6C757D" />
                                </Box>
                              </Tooltip>
                            </Flex> :
                            isEmailValid ?
                              <Flex alignItems="center" gap={"4px"}>
                                Outscrapper Verified
                                <Tooltip label="Email verified via Outscrapper.">
                                  <Box>
                                    <GoInfo color="#6C757D" />
                                  </Box>
                                </Tooltip>
                              </Flex> :
                              <Flex alignItems="center" gap={"4px"}>
                                Outscrapper Not Verified
                                <Tooltip label="Email not verified via Outscrapper.">
                                  <Box>
                                    <GoInfo color="#6C757D" />
                                  </Box>
                                </Tooltip>
                              </Flex>

                        }
                      </Box>
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
                  bg="white"
                  onChange={handleItemsPerPageChange}
                  width="auto"
                  color="#6C757D"
                >
                  <option value={2}>2 / page</option>
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </Select>
              </Flex>
            </HStack>
            <Box>
              {
                // modalData?.data?.allEmails == modalData?.data?.validEmails ? "" :
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
            </Box>

            <Flex justifyContent={modalData?.campaingType == "reviewSales" ? "space-between" : "end"}>

              {
                modalData?.campaingType == "reviewSales" ?
                  <>
                    <Button role="button" colorScheme="gray"
                      fontWeight={500}
                      onClick={() => {
                        onClose()
                      }}
                    >
                      Cancel
                    </Button>

                    <Button role="button" colorScheme="blue"
                      fontWeight={500}
                      isLoading={isSubmitting}
                      disabled={!(modalData?.data?.validRows?.length > 0)}
                      onClick={() => {
                        createReviewSalesCam()
                      }}
                    >
                      Continue
                    </Button>
                  </> :
                  <Box textAlign="right">
                    <Button role="button" colorScheme="blue"
                      fontWeight={500}
                      isLoading={isSubmitting}
                      disabled={!(modalData?.data?.allEmails?.length > 0)}
                      onClick={() => {
                        addAudience()
                      }}
                    >
                      {
                        subTab == "add-more-lead" ? "Add" : "Continue"}


                    </Button>
                  </Box>
              }
            </Flex>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

