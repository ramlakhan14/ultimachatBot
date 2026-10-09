import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  Text,
  VStack,
  Input,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Image,
  Spinner, Divider, Radio, RadioGroup,
  useToast,
  TabPanel,
  Tabs,
  TabList,
  Tab,
  Checkbox,
  TabPanels,
  keyframes,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  Alert, AlertIcon, AlertDescription
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import saveIcon from "./saveBtn.svg";
// import CsvFile from "./csv_data_sample.csv";
import CsvFile from './Ultima-leads.csv';

import ExcelLogo from "../EmailCampaignsAdmin/Modal/images/excelLogo.svg"
import { createReviewCampaign, csvParseAndSaveLeadData } from "../../services/UltimaReviewsConnection";
import { useHistory, useLocation } from "react-router-dom";
import { csvParseAndSaveData } from '../../services/emailCampaigns';
import { GMBSearchForDetailsCampaign } from '../EmailCampaignsAdmin/Modal/GMBSearchForDetailsCampaign';
import { callApi } from '../../services/callApi';
import LinkedInLeads from '../VoiceAssistant/Campaign/LinkedInLeads';
import FacebookLeadsForDetailsCampaign from '../EmailCampaignsAdmin/FacebookLeadsForDetailsCampaign';
// import downloadCsvFile from "./csv_sample.csv";

import UploadLeads from "./UploadLeads";
import ScrapeLeads from "./ScrapeLeads";
// import FacebookLeads from "./FacebookLeads";
import EmailDataPreviewModal from '../VoiceAssistant/Campaign/EmailDataPreviewModal';
import VoiceGMBSearch from '../VoiceAssistant/Campaign/VoiceGMBSearch';
import FacebookLeads from '../VoiceAssistant/Campaign/FacebookLeads';

const moveStripes = keyframes`
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 56.57px 0;
  }
`;
interface FormData {
  campaignName: string;
  targetAudience: string;
}

type FilePreviewType = {
  isOpen: boolean;
  data: Object | null;
  campaingType: string;
}

const UltimaReviewsCreateCampaign = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOption, setSelectedOption] = useState("1");
  const [emailLeads, setEmailLeads] = useState([]);
  const toast = useToast();
  const history = useHistory();
  const [filePreview, setFilePreview] = useState<FilePreviewType>({ isOpen: false, data: {}, campaingType: "reviewSales" });

  const [CSVErrMsg, setCSVErrMsg] = useState(false);
  const [currentStep, setCurrentStep] = React.useState('uploadLeads');
  const [dragActive, setDragActive] = React.useState(false);
  const [uploadingFile, setUploadingFile] = React.useState<boolean>(false);
  const [allmergedLeads, setAllMergedLeads] = React.useState<any>({});
  const [mergeLoading, setmergeLoading] = useState<any>(false);
  const [isUnsubscribedModalOpen, setisUnsubscribedModalOpen] = React.useState<any>({
    isOpen: false,
    forceContinue: false,
    skipDuplicatesFromActiveCampaigns: false,
  });
  const [parsedData, setParsedData] = useState<any>({ validRows: [] });

  const [sourceChecks, setSourceChecks] = useState<any>({
    duplicateAudiance: false,
    csvUploadsAudiance: false,
    facebookAudiance: false,
    gmbAudiance: false,
    linkedinAudiance: false,
  })
  const today = new Date().toISOString().split('T')[0];
  const currentDate = new Date().toISOString().split('T')[0];
  const toastIdsRef = React.useRef<string[]>([]);
  const fileInputRef: React.MutableRefObject<HTMLInputElement | null> = React.useRef(null);
  const [fileData, setfileData] = useState<any>({ allRows: [], validRows: [] });
  const [leadsForFacebook, setLeadsForFacebook] = useState<any>([]);
  const [isLoading, setIsLoading] = useState<any>(false);
  const [mergedVerifieddata, setmergedVerifieddata] = useState<any>({});
  const [camformdata, setcamformdata] = useState<any>({});

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      campaignName: "",
      targetAudience: "",
    }
  });

  const onSubmit = async (data: FormData) => {
    setcamformdata({ ...data })
    validateMergedLeads(allmergedLeads, "true", false, false)
    // const payload = {
    //   ...data,
    //   targetLeads: emailLeads,
    // };
    // if (emailLeads?.length === 0) {
    //   toast({
    //     title: "Error",
    //     description: "Please add leads to create a campaign.",
    //     status: "error",
    //     duration: 3000,
    //     isClosable: true,
    //   });
    //   return;
    // }
    // console.log("Form Data: ", payload);
    // try {
    //   setIsSubmitting(true);
    //   const response: any = await createReviewCampaign(payload);
    //   if (response.status === 201) {
    //     toast({
    //       title: "Campaign Created Successfully",
    //       status: "success",
    //       duration: 3000,
    //       isClosable: true,
    //     });
    //     reset();
    //     setEmailLeads([]);
    //     history.push("/app/ultima-reviews/campaign/");
    //   }

    // } catch (error: any) {
    //   toast({
    //     title: error?.response?.data?.message,
    //     status: "error",
    //     isClosable: true,
    //   });
    // } finally {
    //   setIsSubmitting(false);
    // }
  };



  const handleTabChanges = (index: any) => {
    // 'uploadLeads',
    const steps = ['uploadLeads', 'scrapeNewLeads', 'facebookLeads', "linkedinLeads"];
    const newStep: any = steps[index];
    setCurrentStep(newStep);
    // history.push(`?subtab=${newStep}`);
  };


  const handleMergeLeads = (data: any, sourceName: string) => {
    // console.log(data, sourceName);

    setAllMergedLeads((prev: any) => {
      return {
        ...prev,
        [sourceName]: data
      }
    })
  }
  const location = useLocation()
  const params = new URLSearchParams(location.search);
  const previewOpened = params.get("preview-tab");
  const animation = `${moveStripes} 1s linear infinite`;




  const validateMergedLeads = async (payloadData: any, isAction: any, fc: any, sdAC: any) => {
    try {
      setIsLoading(true)
      setmergeLoading(sdAC ? "yes" : "no")
      // console.log("payloadData to merge", payloadData, sourceArray);
      const targetLeads: any = {
        forceContinue: fc || false,
        skipDuplicatesFromActiveCampaigns: sdAC || false,
      };
      // Check which sources exist in the sourceArray and add accordingly
      targetLeads.csvUploadLeads = (sourceChecks?.csvUploadsAudiance && payloadData?.csvUploadLeads?.length > 0) ? payloadData.csvUploadLeads : [];
      targetLeads.facebookLeads = (sourceChecks?.facebookAudiance && payloadData?.facebookLeads?.length > 0) ? payloadData.facebookLeads : [];
      targetLeads.linkedinLeads = (sourceChecks?.linkedinAudiance && payloadData?.linkedinLeads?.length > 0) ? payloadData.linkedinLeads : [];
      targetLeads.gmbLeads = (sourceChecks?.gmbAudiance && payloadData?.gmbLeads?.length > 0) ? payloadData.gmbLeads : [];

      // console.log("mer", allmergedLeads);
      const response = await callApi("ultima-reviews/merge-leads", "post", { targetLeads: targetLeads })
      // console.log("response", response);
      setIsLoading(false)
      if (isAction === "true") {
        toast({
          title: `Leads merged and validated successfully!`,
          status: "success",
          isClosable: true,
        });

        setFilePreview({
          isOpen: true,
          data: response?.data, campaingType: "reviewSales"
        })
      }
      setmergedVerifieddata(response?.data)

      setisUnsubscribedModalOpen((prev: any) => ({
        isOpen: false,
      }))

      setmergeLoading(false)
      // if (response?.data?.validRows)

    } catch (error: any) {
      setmergeLoading(false)
      setIsLoading(false)

      // console.log(error);
      // console.log(error?.response, "<<<<<<<<sdfs");
      if (error?.response?.status == 409) {
        setisUnsubscribedModalOpen((prev: any) => ({
          ...prev,
          isOpen: true,
          message: error.response?.data?.message
        }))
      }
      if (error?.response?.status == 400) {
        setisUnsubscribedModalOpen((prev: any) => ({
          ...prev,
          isOpen: false,
          message: error.response?.data?.message
        }))
      }
      toast({
        title: error.response?.data?.message || error?.message,
        status: "warning",
        isClosable: true,
      });

    }
  }


  const handleSourceCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setSourceChecks((prev: any) => ({
      ...prev,
      [name]: checked,
    }));
  };
  // Process file dropped via drag and drop
  const processDroppedFile = async (file: File) => {
    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append("file", file);
      // try {
      const response: any = await csvParseAndSaveLeadData(formData);
      // setParsedEmails(response?.data?.data?.parsedEmails);
      setfileData(response?.data?.data)
      handleMergeLeads(response?.data?.data?.allRows || response?.data?.data?.allEmails || [], "csvUploadLeads");
      if (response?.data?.statusCode === 200) {
        toast({
          title: `${response?.data?.message}`,
          status: "success",
          isClosable: true,
        });
      } else {
        toast({
          title: `${response?.data?.message}`,
          status: "error",
          isClosable: true,
        });
      }
    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      });
    } finally {
      setUploadingFile(false);
    }
  };


  const handleExcelButton = () => {
    fileInputRef.current?.click(); // Safely calls click if fileInputRef.current is not null
  };





  // Handle drag events
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    // Only process drag events if upload is enabled
    if (sourceChecks?.csvUploadsAudiance) {
      if (e.type === 'dragenter' || e.type === 'dragover') {
        setDragActive(true);
      } else if (e.type === 'dragleave') {
        setDragActive(false);
      }
    }
  }, [sourceChecks?.csvUploadsAudiance]);

  // Handle drop event
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    // Only process drop if upload is enabled
    if (sourceChecks?.csvUploadsAudiance) {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        // Check if file is CSV
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          processDroppedFile(file);
        } else {
          toast({
            title: "Invalid file format",
            description: "Please upload a CSV file",
            status: "error",
            isClosable: true,
          });
        }
      }
    }
  }, [sourceChecks?.csvUploadsAudiance, processDroppedFile, toast]);

  // Handle file input change
  const handleFileChange = async (e: any) => {
    const fileInput = e.target;
    const file = fileInput.files?.[0];
    // setSelectedFileName("");
    if (file) {
      // setSelectedFileName(file.name);
      const formData = new FormData();
      formData.append("file", file);
      try {
        const response: any = await csvParseAndSaveLeadData(formData);
        // console.log("Response from API:", response);
        setCSVErrMsg(false);
        // console.log("response.data", response.data);
        handleMergeLeads(response.data.data.allRows || response?.data?.data?.allEmails || [], "csvUploadLeads");
        setfileData(response?.data?.data)
        toast({
          title: `${response?.data?.message}` || "Done",
          status: "success",
          isClosable: true,
        })

      } catch (error: any) {
        toast({
          title: error?.response?.data?.message,
          status: "error",
          isClosable: true,
        });
      } finally {
        fileInput.value = null; // Clear the file input value after processing
      }
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
      <VStack w="100%" spacing="10">
        <Flex
          shrink={0}
          w="100%"
          direction="column"
          justifyContent="space-between"
        >
          <Flex width="100%" justifyContent="space-between">
            <Box>
              <Heading fontSize="24px" color="#1A202C">Create Campaign</Heading>
            </Box>
          </Flex>
        </Flex>
      </VStack>

      <Box bg={"white"} mt={'24px'} border="1px solid #DEE2E6" borderRadius="8px" p={5} minW="100%">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Box >
            <FormControl isInvalid={!!errors.campaignName} mb={4}>
              <FormLabel>Campaign Name <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
              <Input placeholder='Enter your campaign name' {...register('campaignName', { required: 'Campaign name is required' })} />
              <FormErrorMessage>{errors.campaignName?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.targetAudience}>
              <FormLabel>Target Audience <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
              <Input placeholder='Enter target audience' {...register('targetAudience', { required: 'Target Audience is required' })} />
              <FormErrorMessage>{errors.targetAudience?.message}</FormErrorMessage>
            </FormControl>


            <Box>
              <Heading fontSize="16px" color="#212529" fontWeight={600} mt={'24px'}>Choose how you want to add leads to your campaign</Heading>

              <Box mt={'24px'}>
                <Tabs
                  variant="enclosed"
                  w="100%"
                  colorScheme="gray"
                  size="md"
                  position="relative"
                  onChange={handleTabChanges}
                  index={['uploadLeads', 'scrapeNewLeads', 'facebookLeads', `linkedinLeads`].indexOf(
                    currentStep,
                  )}
                >
                  <TabList position="relative" w="100%" >

                    <Tab
                      id="tab-uploadLeads"
                      // border="none!important"
                      _focus={{ outline: 'none' }}
                      _disabled={{ cursor: 'not-allowed', opacity: '0.4' }}
                      style={{
                        backgroundColor:
                          currentStep === 'uploadLeads' ? '#fff' : '',
                        color:
                          currentStep === 'uploadLeads' ? '#2977FF' : '#495057',
                      }}
                      onClick={() => setCurrentStep('uploadLeads')}
                    >

                      <Flex fontSize={'14px'} fontWeight={500} gap="10px">
                        <Checkbox
                          name="csvUploadsAudiance"
                          isChecked={sourceChecks.csvUploadsAudiance}
                          onChange={handleSourceCheck}
                          size="md"
                        ></Checkbox>
                        Upload Leads
                      </Flex>
                    </Tab>
                    <Tab
                      id="tab-scrapeNewLeads"
                      // border="none"
                      _focus={{ outline: 'none' }}
                      _disabled={{ cursor: 'not-allowed', opacity: '0.4' }}
                      style={{
                        backgroundColor: currentStep === 'scrapeNewLeads' ? '#fff' : '',
                        color: currentStep === 'scrapeNewLeads' ? '#2977FF' : '#495057',
                      }}
                      onClick={() => setCurrentStep('scrapeNewLeads')}
                    >
                      <Flex gap="10px" fontSize={'14px'} fontWeight={500} >
                        <Checkbox
                          name="gmbAudiance"
                          isChecked={sourceChecks.gmbAudiance}
                          onChange={handleSourceCheck}
                          size="md"
                        ></Checkbox>
                        {/* Scrape New Leads */}
                        GMB Leads
                      </Flex>
                    </Tab>
                    <Tab
                      id="tab-facebookLeads"
                      // border="none"
                      _focus={{ outline: 'none' }}
                      _disabled={{ cursor: 'not-allowed', opacity: '0.4' }}
                      style={{
                        backgroundColor: currentStep === 'facebookLeads' ? '#fff' : '',
                        color: currentStep === 'facebookLeads' ? '#2977FF' : '#495057',
                      }}
                      onClick={() => setCurrentStep('facebookLeads')}
                    >
                      <Flex gap={"10px"} fontSize={'14px'} fontWeight={500} >
                        <Checkbox
                          name="facebookAudiance"
                          isChecked={sourceChecks.facebookAudiance}
                          onChange={handleSourceCheck}
                          size="md"
                        ></Checkbox>
                        Facebook Leads
                      </Flex>
                    </Tab>
                    <Tab
                      id="tab-linkedinLeads"
                      // border="none"
                      _focus={{ outline: 'none' }}
                      _disabled={{ cursor: 'not-allowed', opacity: '0.4' }}
                      style={{
                        backgroundColor: currentStep === 'linkedinLeads' ? '#fff' : '',
                        color: currentStep === 'linkedinLeads' ? '#2977FF' : '#495057',
                      }}
                      onClick={() => setCurrentStep('linkedinLeads')}
                    >
                      <Flex gap="10px" fontSize={'14px'} fontWeight={500} >
                        <Checkbox
                          name="linkedinAudiance"
                          isChecked={sourceChecks.linkedinAudiance}
                          onChange={handleSourceCheck}
                          size="md"
                        ></Checkbox>
                        Linkedin Leads
                      </Flex>
                    </Tab>
                  </TabList>



                  <TabPanels>
                    <TabPanel border="1px solid #DEE2E6" bg="#fff" pt="16px">


                      <Box>
                        <Box textAlign="start"
                          display="flex"
                          flexDirection="column"
                          justifyContent="start"
                          alignItems="start">
                          <Text as="p" fontSize="16px" fontWeight="600" color="#1A202C" pb="4px">Upload Leads</Text>
                          <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D" pb="24px">The uploaded CSV must follow the format of the sample file. </Text>

                        </Box>
                        <Box textAlign="center"
                          display="flex"
                          flexDirection="column"
                          justifyContent="center"
                          alignItems="center"
                          position="relative"
                          onDragEnter={handleDrag}>

                          <Input
                            type="file"
                            disabled={!sourceChecks?.csvUploadsAudiance}
                            ref={fileInputRef}
                            display="none" // Hide the file input
                            onChange={handleFileChange}
                            accept=".csv" // Only allow CSV files
                          />
                          {!uploadingFile ? (
                            <Box
                              w="100%"
                              h="100%"
                              pt={4}
                              borderRadius="md"
                              border={dragActive ? "2px dashed #2977FF" : "2px dashed #E2E8F0"}
                              bg={dragActive ? "rgba(124, 47, 241, 0.05)" : "transparent"}
                              transition="all 0.2s"
                              opacity={!sourceChecks?.csvUploadsAudiance ? 0.5 : 1}
                              cursor={!sourceChecks?.csvUploadsAudiance ? "not-allowed" : "default"}
                              onDragEnter={handleDrag}
                              onDragLeave={handleDrag}
                              onDragOver={handleDrag}
                              onDrop={handleDrop}>
                              <Flex justifyContent="center" py="5px">

                                <Image src={ExcelLogo} alt='excel uploads' />
                              </Flex>
                              <Button
                                colorScheme="blue"
                                onClick={handleExcelButton}
                                mb="12px"
                                disabled={!sourceChecks?.csvUploadsAudiance}
                                mt="12px"
                                _focus={{
                                  boxShadow: 'none'
                                }}
                              >
                                <Text as="span" ms="4px" fontSize="16px" fontWeight="500">
                                  Upload file
                                </Text>
                              </Button>

                              <Text
                                as="p"
                                fontSize="12px"
                                fontWeight="400"
                                color="#6C757D"
                                pb="24px"
                              >
                                or drag and drop it here
                              </Text>

                              <Text
                                as="p"
                                fontSize="14px"
                                fontWeight="400"
                                color="#6C757D"
                                pb="24px"
                              >
                                Download a{' '}
                                <Text
                                  as="a"
                                  href={CsvFile}
                                  download="sample.csv"
                                  color="#2977FF"
                                  _hover={{
                                    color: "#2977FF"
                                  }}
                                >
                                  sample CSV
                                </Text>
                              </Text>
                            </Box>
                          ) : (<>
                            <Box w="full" maxW="md" mx="auto" p={4}>
                              <Box
                                w="200px"
                                margin="auto"
                                h="4"
                                overflow="hidden"
                                bg="repeating-linear-gradient(45deg, #2977ff 0px, #2977ff 9px, #efefef 2px, #efefef 15px) 0% 0% / 42.57px 30.87px"
                                bgSize="20.57px 19.57px"
                                animation={animation}
                              />
                            </Box>
                            <Box><Text textAlign="center" color="gray" fontSize={"14px"} mb="10px">Uploading file...</Text></Box>
                          </>
                          )}

                        </Box>

                        {
                          fileData?.allRows?.length > 0 && (
                            <Box
                              border="1px solid #2a77ff29"
                              bg="#e3f3ff"
                              my="15px"
                              p={"4px 8px"}
                              w="fit-content"
                              color={"#6C757D"}
                              borderRadius="md"
                            >
                              <Flex wrap="wrap" gap={4} align="center">
                                <Text fontWeight={"400"} fontSize={"14px"}>
                                  Valid Number: <Text as="span" color="green.500" fontWeight="semibold">
                                    ({fileData?.validPhoneCount || "0"})
                                  </Text>
                                </Text>
                                <Text fontWeight={"400"} fontSize={"14px"}>
                                  Valid Email: <Text as="span" color="green.500" fontWeight="semibold">
                                    ({fileData?.validEmailCount || "0"})
                                  </Text>
                                </Text>
                                <Text fontWeight={"400"} fontSize={"14px"}>
                                  Invalid Number: <Text as="span" color="red.500" fontWeight="semibold">
                                    ({fileData?.invalidPhoneCount || "0"})
                                  </Text>
                                </Text>
                                <Text fontWeight={"400"} fontSize={"14px"}>
                                  Invalid Email: <Text as="span" color="red.500" fontWeight="semibold">
                                    ({fileData?.invalidEmailCount || "0"})
                                  </Text>
                                </Text>
                                <Text fontWeight={"400"} fontSize={"14px"}>
                                  Duplicate Number: <Text as="span" color="orange.400" fontWeight="semibold">
                                    ({fileData?.duplicatePhoneCount || "0"})
                                  </Text>
                                </Text>
                                <Text fontWeight={"400"} fontSize={"14px"}>
                                  Duplicate Email: <Text as="span" color="orange.400" fontWeight="semibold">
                                    ({fileData?.duplicateEmailCount || "0"})
                                  </Text>
                                </Text>
                              </Flex>
                            </Box>
                          )
                        }


                        {/* {
                          fileData?.allRows?.length == 0 || (fileData?.allRows?.length > 0 && fileData?.validRows?.length === fileData?.allRows?.length) ? "" :
                            <Alert
                              status="warning"
                              variant="left-accent"
                              borderRadius="md"
                              mt={3}
                              fontSize="sm"
                            >
                              <AlertIcon />
                              <AlertDescription>
                                The uploaded CSV contains{" "}
                                <Text as="span" fontWeight="bold">
                                  {Number(fileData?.allRows?.length) - Number(fileData?.validRows?.length)} invalid entries
                                </Text>
                                . These entries will be excluded, and the campaign will be processed using only the valid data.

                              </AlertDescription>
                            </Alert>
                        } */}

                      </Box>


                      {/* <UploadLeads emailLeads={emailLeads} setEmailLeads={setEmailLeads} /> */}
                    </TabPanel>

                    <TabPanel border="1px solid #DEE2E6" bg="#fff" pt="16px">
                      <Box>
                        <VoiceGMBSearch disabled={!sourceChecks.gmbAudiance} CSVErrMsg={CSVErrMsg} handleMergeLeads={handleMergeLeads} setCSVErrMsg={setCSVErrMsg} setParsedData={setParsedData} />
                      </Box>

                    </TabPanel>
                    <TabPanel border="1px solid #DEE2E6" bg="#fff" pt="16px">
                      <Box>
                        <FacebookLeads disabled={!sourceChecks.facebookAudiance} CSVErrMsg={CSVErrMsg} handleMergeLeads={handleMergeLeads}
                          setCSVErrMsg={setCSVErrMsg} emailLeads={parsedData?.validRows} setEmailLeads={setParsedData} />
                      </Box>
                    </TabPanel>
                    <TabPanel border="1px solid #DEE2E6" bg="#fff" px={'20px'} py={'24px'}>
                      <Box>
                        <LinkedInLeads disabled={!sourceChecks?.linkedinAudiance} type="emails" handleMergeLeads={handleMergeLeads} />
                      </Box>
                    </TabPanel>

                  </TabPanels>
                </Tabs>
              </Box>

            </Box>

            <Flex justifyContent="space-between" mt={8}>
              <Button
                colorScheme='gray'
                fontWeight={500}
                onClick={() => {
                  history.push("/app/ultima-reviews/campaign")
                }}
              >

                Cancel
              </Button>
              <Button colorScheme="blue" type="submit"

                isLoading={isLoading}
                disabled={isLoading}>

                {/* <Image src={saveIcon} alt='Save' /> */}
                <Text as="span" fontSize="16px" ms="8px" fontWeight="500">Preview Data</Text>

              </Button>
            </Flex>
          </Box>
        </form>
      </Box>

      <EmailDataPreviewModal payload={camformdata} modalData={filePreview} onClose={() => { setFilePreview({ isOpen: false, data: {}, campaingType: "reviewSales" }) }} />


      <Modal isOpen={isUnsubscribedModalOpen?.isOpen} onClose={() => {
        setisUnsubscribedModalOpen({ isOpen: false })
      }} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Notice</ModalHeader>
          <ModalBody>
            <Text fontSize="14px" color="gray.700">
              {/* {unsubscribedModalMessage} */}
              {isUnsubscribedModalOpen?.message || ""}
            </Text>
            <Box mt={6} display="flex" justifyContent="flex-end" gap={3}>
              <Button
                isLoading={mergeLoading == "no"}
                variant="outline" onClick={() => {

                  setTimeout(() => {
                    validateMergedLeads(allmergedLeads, "true", true, false);
                  }, 500);

                }}>
                No
              </Button>
              <Button
                isLoading={mergeLoading == "yes"}
                colorScheme="blue" onClick={() => {
                  setisUnsubscribedModalOpen((prev: any) => ({
                    ...prev,
                    forceContinue: true,
                    skipDuplicatesFromActiveCampaigns: true,
                  }))
                  setTimeout(() => {
                    validateMergedLeads(allmergedLeads, "true", true, true);
                  }, 500);
                }}>
                Yes
              </Button>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>


    </Box>
  );
};

export default UltimaReviewsCreateCampaign;