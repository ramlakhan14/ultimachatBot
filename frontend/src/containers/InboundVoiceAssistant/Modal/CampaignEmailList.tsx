import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  useToast,
  Button,
  Text,
  Input,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
  Flex,
  InputGroup,
  InputLeftElement,
  Spinner
}
  from '@chakra-ui/react';
import { IoIosSearch } from 'react-icons/io';
import { getAllCSVUploadedData, deleteUnverifiedEmail } from '../../../services/emailCampaigns';

const CampaignEmailList = ({ isEmailModalOpens, onEmailModalCloses, campaignId }: any) => {
  const [parsedEmails, setParsedEmails] = useState<any>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isEmailListLoading, setIsEmailListLoading] = useState<boolean>(true);
  const toast = useToast();
  const getAllUploadedData = async (id: string) => {
    try {
      setIsEmailListLoading(true);
      const response: any = await getAllCSVUploadedData(id);
      const allData = response?.data?.data;
      setParsedEmails(allData); // Updated here

    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      });
    }
    finally {
      setIsEmailListLoading(false);
    }
  }

  // async function delCampaignEmail(emailid: string, campaignId: string) {
  //   try {
  //     const response = await deleteUnverifiedEmail({ email: emailid, campaignId: campaignId });
  //     // setSearchQuery("");

  //       // getAllUploadedData(campaignId);
  //       setParsedEmails(response?.data?.data);

  //     toast({
  //       title: `${response?.data?.message}`,
  //       status: "success",
  //       isClosable: true,
  //     });
  //   } catch (error: any) {
  //     toast({
  //       title: `${error?.response?.data?.message}`,
  //       status: "error",
  //       isClosable: true,
  //     })
  //   } 
  // }

  useEffect(() => {
    if (campaignId !== null) {
      getAllUploadedData(campaignId);
    }
  }, [campaignId]);

  const filteredEmails = parsedEmails.filter((email: any) =>
    email?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal isOpen={isEmailModalOpens} size="xl" onClose={onEmailModalCloses}>
      <ModalOverlay />
      <ModalContent padding="0px 20px">
        <ModalHeader textAlign="center" mt="20px">Details Email List</ModalHeader>
        <Text fontSize="15px" textAlign="center">View the list of emails for this campaign, these are the recipients your emails will be sent to.</Text>
        <ModalBody>
          {
            isEmailListLoading ? <Flex
              pos="absolute"
              align="center"
              justify="center"
              top={0}
              bottom={0}
              right={0}
              left={0}
              bg="whiteAlpha.700"
            >
              <Spinner />
            </Flex>
              :
              parsedEmails.length > 0 ? (<>
                <Box textAlign="right" mt={4} mb={4}>
                  <Flex justifyContent="center">
                    <InputGroup
                      width="400px"
                      // border="1px solid #6C757D"
                      borderRadius="4px"
                      borderColor="#6C757D"
                    >
                      <InputLeftElement pointerEvents='none'>
                        <IoIosSearch color="#6C757D" />
                      </InputLeftElement>
                      <Input
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      // maxW="300px"
                      />
                    </InputGroup>
                  </Flex>

                </Box>

                <TableContainer overflow="auto" overflowY={"auto"} maxHeight={"50vh"} w="100%" borderRadius="8px" boxShadow="0px 4px 8px rgba(0, 0, 0, 0.05)">
                  <Table variant="simple" >
                    <Thead>
                      <Tr >
                        <Th>#</Th>
                        <Th>Email ID</Th>
                        <Th>Email Status</Th>
                        {/* <Th>Action</Th> */}
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredEmails.length > 0 ? (
                        filteredEmails.map((data: any, index: number) => (
                          <Tr key={data?._id}>
                            <Td>{index + 1}</Td>
                            <Td>{data?.email}</Td>
                            <Td>
                              {data?.isVerified ? (
                                <Text
                                  as="span"
                                  borderRadius={"50px"}
                                  padding={"2px 10px"}
                                  fontSize={"13px"}
                                  color="#198754"
                                  bg="#1987541A"
                                >
                                  Verified
                                </Text>
                              ) : (
                                <Text
                                  as="span"
                                  borderRadius={"50px"}
                                  padding={"2px 10px"}
                                  fontSize={"13px"}
                                  color="#991B1B"
                                  bg="#FEE2E2"
                                >
                                  Unverified
                                </Text>
                              )}
                            </Td>
                            {/* <Td>
                            <Button
                              size="sm"
                              fontSize={12}
                              variant="outline"
                              borderColor="transparent"
                              onClick={() =>
                                delCampaignEmail(data?.email, data?.campaignId)
                              }
                              mr={2}
                              sx={{
                                _focus: {
                                  boxShadow: "none", // Removes the focus box shadow
                                },
                              }}
                            >
                              <svg
                                width="14"
                                height="16"
                                viewBox="0 0 14 16"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M4.5 5.99921C4.63261 5.99921 4.75979 6.05189 4.85355 6.14565C4.94732 6.23942 5 6.3666 5 6.49921V12.4992C5 12.6318 4.94732 12.759 4.85355 12.8528C4.75979 12.9465 4.63261 12.9992 4.5 12.9992C4.36739 12.9992 4.24021 12.9465 4.14645 12.8528C4.05268 12.759 4 12.6318 4 12.4992V6.49921C4 6.3666 4.05268 6.23942 4.14645 6.14565C4.24021 6.05189 4.36739 5.99921 4.5 5.99921ZM7 5.99921C7.13261 5.99921 7.25979 6.05189 7.35355 6.14565C7.44732 6.23942 7.5 6.3666 7.5 6.49921V12.4992C7.5 12.6318 7.44732 12.759 7.35355 12.8528C7.25979 12.9465 7.13261 12.99921 7 12.99921C6.86739 12.99921 6.74021 12.9465 6.64645 12.8528C6.55268 12.759 6.5 12.6318 6.5 12.4992V6.49921C6.5 6.3666 6.55268 6.23942 6.64645 6.14565C6.74021 6.05189 6.86739 5.99921 7 5.99921ZM10 6.49921C10 6.3666 9.94732 6.23942 9.85355 6.14565C9.75979 6.05189 9.63261 5.99921 9.5 5.99921C9.36739 5.99921 9.24021 6.05189 9.14645 6.14565C9.05268 6.23942 9 6.3666 9 6.49921V12.4992C9 12.6318 9.05268 12.759 9.14645 12.8528C9.24021 12.9465 9.36739 12.99921 9.5 12.99921C9.63261 12.99921 9.75979 12.9465 9.85355 12.8528C9.94732 12.759 10 12.6318 10 12.4992V6.49921Z"
                                  fill="#DC3545"
                                />
                                <path
                                  fillRule="evenodd"
                                  clipRule="evenodd"
                                  d="M13.5 3.49921C13.5 3.76442 13.3946 4.01878 13.2071 4.20631C13.0196 4.39385 12.7652 4.49921 12.5 4.49921H12V13.4992C12 14.0296 11.7893 14.5383 11.4142 14.9134C11.0391 15.2885 10.5304 15.4992 10 15.4992H4C3.46957 15.4992 2.96086 15.2885 2.58579 14.9134C2.21071 14.5383 2 14.0296 2 13.4992V4.49921H1.5C1.23478 4.49921 0.98043 4.39385 0.792893 4.20631C0.605357 4.01878 0.5 3.76442 0.5 3.49921V2.49921C0.5 2.23399 0.605357 1.97964 0.792893 1.7921C0.98043 1.60456 1.23478 1.49921 1.5 1.49921H5C5 1.23399 5.10536 0.979636 5.29289 0.7921C5.48043 0.604563 5.73478 0.499207 6 0.499207H8C8.26522 0.499207 8.51957 0.604563 8.70711 0.7921C8.89464 0.979636 9 1.23399 9 1.49921H12.5C12.7652 1.49921 13.0196 1.60456 13.2071 1.7921C13.3946 1.97964 13.5 2.23399 13.5 2.49921V3.49921ZM3.118 4.49921L3 4.55821V13.4992C3 13.7644 3.10536 14.0188 3.29289 14.2063C3.48043 14.3938 3.73478 14.4992 4 14.4992H10C10.2652 14.4992 10.5196 14.3938 10.7071 14.2063C10.8946 14.0188 11 13.7644 11 13.4992V4.55821L10.882 4.49921H3.118ZM1.5 3.49921V2.49921H12.5V3.49921H1.5Z"
                                  fill="#DC3545"
                                />
                              </svg>
                            </Button>
                          </Td> */}
                          </Tr>
                        ))
                      ) : (
                        <Tr>
                          <Td colSpan={4} textAlign="center">No data available</Td>
                        </Tr>
                      )}
                      {parsedEmails.length > 0 && parsedEmails.length === 0 && (
                        parsedEmails.map((data: any, index: number) => (
                          <Tr key={data?._id}>
                            <Td> {index + 1}</Td>
                            <Td>{data?.email}</Td>
                            <Td>
                              {data?.isVerified === true ? (
                                <Text as="span" borderRadius={'50px'} padding={"2px 10px"} fontSize={"13px"} color="#198754" bg="#1987541A">Verified</Text>
                              ) : (
                                <Text as="span" borderRadius={'50px'} padding={"2px 10px"} fontSize={"13px"} color="#991B1B" bg="#FEE2E2">Unverified</Text>
                              )}

                            </Td>
                            {/* <Td>
                            <Button
                              size="sm"
                              fontSize={12}
                              variant="outline"
                              borderColor="transparent"
                              // onClick={() => {
                              //   delCampaignEmail(data?.email, data?.campaignId);
                              // }}
                              mr={2}
                              
                              sx={{
                                _focus: {
                                  boxShadow: 'none',  // Removes the focus box shadow
                                }
                              }}
                            >
                              <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4.5 5.99921C4.63261 5.99921 4.75979 6.05189 4.85355 6.14565C4.94732 6.23942 5 6.3666 5 6.49921V12.4992C5 12.6318 4.94732 12.759 4.85355 12.8528C4.75979 12.9465 4.63261 12.9992 4.5 12.9992C4.36739 12.9992 4.24021 12.9465 4.14645 12.8528C4.05268 12.759 4 12.6318 4 12.4992V6.49921C4 6.3666 4.05268 6.23942 4.14645 6.14565C4.24021 6.05189 4.36739 5.99921 4.5 5.99921ZM7 5.99921C7.13261 5.99921 7.25979 6.05189 7.35355 6.14565C7.44732 6.23942 7.5 6.3666 7.5 6.49921V12.4992C7.5 12.6318 7.44732 12.759 7.35355 12.8528C7.25979 12.9465 7.13261 12.9992 7 12.9992C6.86739 12.9992 6.74021 12.9465 6.64645 12.8528C6.55268 12.759 6.5 12.6318 6.5 12.4992V6.49921C6.5 6.3666 6.55268 6.23942 6.64645 6.14565C6.74021 6.05189 6.86739 5.99921 7 5.99921ZM10 6.49921C10 6.3666 9.94732 6.23942 9.85355 6.14565C9.75979 6.05189 9.63261 5.99921 9.5 5.99921C9.36739 5.99921 9.24021 6.05189 9.14645 6.14565C9.05268 6.23942 9 6.3666 9 6.49921V12.4992C9 12.6318 9.05268 12.759 9.14645 12.8528C9.24021 12.9465 9.36739 12.9992 9.5 12.9992C9.63261 12.9992 9.75979 12.9465 9.85355 12.8528C9.94732 12.759 10 12.6318 10 12.4992V6.49921Z" fill="#DC3545"/>
                                <path fillRule="evenodd" clipRule="evenodd" d="M13.5 3.49921C13.5 3.76442 13.3946 4.01878 13.2071 4.20631C13.0196 4.39385 12.7652 4.49921 12.5 4.49921H12V13.4992C12 14.0296 11.7893 14.5383 11.4142 14.9134C11.0391 15.2885 10.5304 15.4992 10 15.4992H4C3.46957 15.4992 2.96086 15.2885 2.58579 14.9134C2.21071 14.5383 2 14.0296 2 13.4992V4.49921H1.5C1.23478 4.49921 0.98043 4.39385 0.792893 4.20631C0.605357 4.01878 0.5 3.76442 0.5 3.49921V2.49921C0.5 2.23399 0.605357 1.97964 0.792893 1.7921C0.98043 1.60456 1.23478 1.49921 1.5 1.49921H5C5 1.23399 5.10536 0.979636 5.29289 0.7921C5.48043 0.604563 5.73478 0.499207 6 0.499207H8C8.26522 0.499207 8.51957 0.604563 8.70711 0.7921C8.89464 0.979636 9 1.23399 9 1.49921H12.5C12.7652 1.49921 13.0196 1.60456 13.2071 1.7921C13.3946 1.97964 13.5 2.23399 13.5 2.49921V3.49921ZM3.118 4.49921L3 4.55821V13.4992C3 13.7644 3.10536 14.0188 3.29289 14.2063C3.48043 14.3938 3.73478 14.4992 4 14.4992H10C10.2652 14.4992 10.5196 14.3938 10.7071 14.2063C10.8946 14.0188 11 13.7644 11 13.4992V4.55821L10.882 4.49921H3.118ZM1.5 3.49921V2.49921H12.5V3.49921H1.5Z" fill="#DC3545"/>
                              </svg>
                            </Button>
                          </Td> */}
                          </Tr>
                        ))
                      )
                      }
                    </Tbody>
                  </Table>
                </TableContainer>
              </>)

                : (
                  <Text textAlign="center" fontWeight="600" fontSize={"18px"} color="#6d48e7" padding="20px" boxShadow="0px 4px 8px rgba(0, 0, 0, 0.05)" mt={4}>No Email Found!</Text>
                )}


        </ModalBody>

        <ModalFooter padding="20px 0px">
          <Button colorScheme='blue' fontWeight="500" mr={3} onClick={onEmailModalCloses}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default CampaignEmailList;