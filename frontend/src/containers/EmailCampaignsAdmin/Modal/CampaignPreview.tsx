import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Text,
  Select,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  InputGroup,
  Input,
  FormControl,
  FormLabel,
  Switch,
  Textarea,
  useToast,
  ModalHeader,
  Grid,
  ModalFooter,
  Spacer,
  ModalCloseButton,
  Image
} from "@chakra-ui/react";
import styles from "../EmailCampaignsAdmin.module.scss";
import ErrorImg from "./images/error.svg"
import { getCampaignDetails, pauseCampaign, triggerCampaign } from "../../../services/emailCampaigns";
import { useHistory, useLocation } from "react-router-dom";
import { CampaignTriggerShedule } from "./CampaignTriggerShedule";

// interface AddMoreTargetAudienceProps {
//   handleHeaderSteps: (step: string) => void;
//   setSourceChecks: React.Dispatch<React.SetStateAction<any>>;
//   sourceChecks: any;
// }
// Line ~15 - Update the interface
interface CampaignPreviewProps {
  handleHeaderSteps: (step: string) => void;
  setSourceChecks: React.Dispatch<React.SetStateAction<any>>;
  sourceChecks: any;
  // Add these new props
  onFinalSubmit?: () => Promise<void>;
  isSubmittingProp?: boolean;
}
export const CampaignPreview = ({ handleHeaderSteps, setSourceChecks, sourceChecks, onFinalSubmit,
  isSubmittingProp = false }: CampaignPreviewProps) => {
  const [isOpened, setIsOpened] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isPauseOpen, setPauseIsOpen] = useState<string>("");
  const [modalData, setModalData] = React.useState(null);
  const toast = useToast();
  const history = useHistory();
  const location = useLocation();
  const campaignData: any = location.state || {}
  const queryParams = new URLSearchParams(location.search);
  const id = queryParams.get('id');
  // console.log("campaignData", campaignData, sourceChecks);
  // if (!campaignData?.data?.campaignId) {
  //   return null;
  // }

  const onCloses = () => { }

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<any>(null);

  const onClose = () => {
    setIsOpened(false);
  };

  const onClosePause = () => {
    setIsOpen(false);
  }
  const handleNoClick = async () => {
    const pauseCampaignData = { campaignId: id || campaignData?.data?._id || campaignData?.data?.campaignId };
    try {
      const response = await pauseCampaign(pauseCampaignData);
      toast({
        title: `${response?.data?.message}`,
        status: "success",
        isClosable: true,
      })
      // onCloses();
      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      })
    }

  }

  const fetchCampaignDetails = async () => {
    try {
      setIsLoading(true);
      const response = await getCampaignDetails(id || campaignData?.data?.campaignId); // Your API call
      // console.log(response);
      if (response?.data?.statusCode === 200) {
        setData(response?.data?.data); // Set to your local state
      }
    } catch (error) {
      // console.error("Fetch error:", error);
      toast({
        title: "An error occurred while fetching details.",
        status: "error",
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    fetchCampaignDetails();
  }, [])


  const startNow = async () => {
    try {
      const triggerCampaignId = { campaignId: id || campaignData?.data?.campaignId }
      setIsSubmitting(true);
      // this we be decide by user trigger imidiate or want to schedule
      const responses = await triggerCampaign(triggerCampaignId);
      history.push(`/app/email-campaigns/create?subTab=complete&id=${id || campaignData?.data?.campaignId}`);
      setTimeout(() => {
        toast({
          title: `${responses?.data?.message}`,
          status: "success",
          isClosable: true,
        });
        // handleHeaderSteps("next")
      }, 3000);
    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  }


  return (
    <>
      <Box mt="16px" px="20px" py="24px" bg={'#fff'} borderRadius={'8px'} border={'1px solid #E2E8F0'}>
        {/* Campaign Information */}

        <Grid templateColumns="repeat(3, 1fr)" gap={5} mb={5}>
          <Box>
            <Text className={styles.modalTextHeding}>Campaign Name</Text>
            <Text className={styles.modalTextPara}>{data?.campaignName}</Text>
          </Box>
          <Box>
            <Text className={styles.modalTextHeding}>Campaign Project</Text>
            <Text className={styles.modalTextPara}>{data?.campaignProject?.projectName}</Text>
          </Box>
          <Box>
            <Text className={styles.modalTextHeding}>Status</Text>
            <Text as="span">
              {data?.status === "completed" ? (
                <Text as="span" className={styles.Completed}>Completed</Text>
              ) : data?.status === "running" ? (
                <Text as="span" className={styles.Running}>Running</Text>
              ) : data?.status === "scheduled" ? (
                <Text as="span" className={styles.Schedule}>Scheduled</Text>
              ) : data?.status === "initiated" ? (
                <Text as="span" className={styles.initiated}>Initiated</Text>
              ) : data?.status === "paused" ? (
                <Text as="span" className={styles.paused}>Paused</Text>
              ) : data?.status === "failed" ? (
                <Text as="span" className={styles.paused}>Failed</Text>
              ) : null}
            </Text>
          </Box>
        </Grid>
        {/* Target Audience */}
        <Box mb={5}>
          <Text className={styles.modalTextHeding}>Target Audience</Text>
          <Text className={styles.modalTextPara}>
            {data?.targetAudience?.map((item: any) => item.value).join(", ")}
          </Text>
        </Box>

        {/* Pain Points */}
        <Box mb={5}>
          <Text className={styles.modalTextHeding}>Pain-point / Problem</Text>
          {data?.painPoints?.map((item: any, index: number) => (
            <Text key={index} className={styles.modalTextPara}>
              {item.value}
            </Text>
          ))}
        </Box>
        {/* Solution / Offer */}
        <Box mb={5}>
          <Text className={styles.modalTextHeding}>Solution / Offer</Text>
          <Text className={styles.modalTextPara}>
            {data?.solutionOffer?.map((item: any) => item.value).join(", ")}
          </Text>
        </Box>

        {/* Call To Action */}
        <Box mb={5}>
          <Text className={styles.modalTextHeding} mb="5px">Call To Action (CTA)</Text>
          {data?.callOfAction && Object.entries(data?.callOfAction).map(([key, value], index) => {
            return <Text key={index} className={styles.modalTextPara}>{value}</Text>;
          })}
        </Box>

        {/* Additional Campaign Details */}
        <Grid templateColumns="repeat(3, 1fr)" gap={5} mb={5}>
          <Box>
            <Text className={styles.modalTextHeding}>Language</Text>
            <Text className={styles.modalTextPara}>{data?.campaignLanguage}</Text>
          </Box>
          <Box>
            <Text className={styles.modalTextHeding}>Email Length</Text>
            <Text className={styles.modalTextPara}>{data?.emailLength}</Text>
          </Box>
          <Box>
            <Text className={styles.modalTextHeding}>Max Emails Per Day</Text>
            <Text className={styles.modalTextPara}>{data?.maxEmailsPerDay}</Text>
          </Box>
        </Grid>

        {/* Maximum Emails Per Lead */}
        <Box mb={5}>
          <Text className={styles.modalTextHeding}>Max Emails Per Lead <Text as="span" fontSize="12px">(Auto Reply)</Text></Text>
          <Text className={styles.modalTextPara}>{data?.maxEmailsPerLead}</Text>
        </Box>

        {/* Emails for this campaign */}
        <Box>
          <Text className={styles.modalTextHeding}>Select Mailboxes</Text>
          <Text className={styles.modalTextPara}>
            {data?.emailAndSenderLimit?.map((item: any) => `${item.email} (${item.maxLimit})`)
              .join(", ")}
          </Text>
        </Box>


        <Modal
          isCentered
          onClose={() => { setPauseIsOpen("") }}
          isOpen={!!isPauseOpen}
        >
          <ModalOverlay />
          <ModalContent>
            {/* <ModalHeader>Modal Title</ModalHeader> */}
            <ModalBody>
              <Box
                textAlign="center"
                display="flex"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
              >
                <Image src={ErrorImg} alt='deleteicon' w="56px" h="56px" />
                <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" mb={5} mt="24px">Are you sure?</Text>
                <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D">{isPauseOpen || "You want to Pause this campaign?"}</Text>
              </Box>

            </ModalBody>
            <ModalFooter>
              <Button mr={3} onClick={() => {
                history.push("/app/email-campaigns")
                // handleNoClick();
              }} fontWeight="500">
                Yes
              </Button>
              <Button colorScheme="blue" mr={3} onClick={() => {
                setPauseIsOpen("")
              }} fontWeight="500"
              >
                <Text as="span" ms="4px" fontSize="16px">No</Text>
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        <CampaignTriggerShedule onCloseCampaignTrigger={() => setIsOpen(false)} isOpened={isOpen} campaignData={data} />

        {/* <ModifyYourCampaign isopenModifyYourCampaign={isopenModifyYourCampaign} isCloseModifyYourCampaign={() => setiIopenModifyYourCampaign(false)} campaignId={data._id} fetchData={fetchData} currentPage={currentPage} itemsPerPages={itemsPerPages} />
        <AddMoreTargetAudienceModal isOpened={isOpened} onClose={onClose} data={modalData} fetchData={fetchData} itemsPerPages={itemsPerPages} currentPage={currentPage} /> */}
      </Box>
      <Box pb={"16px"}>
        <Box my="10px" display="flex" justifyContent="space-between">
          <Button mr={3} fontWeight="500" color={"#2977FF"} onClick={() => {
            // history.goBack()
            handleHeaderSteps("back");
            history.push(`/app/email-campaigns/create?subTab=target-audience`);
            // handleHeaderSteps("back")
          }} >Back</Button>

          <Box>
            <Button mr={3} fontWeight="500"
              colorScheme="gray"
              onClick={() => {
                // history.push("/app/email-campaigns")
                setPauseIsOpen("You want to Cancel this campaign?")
              }}>Cancel</Button>
            <Button mr={3} fontWeight="500"
              variant="outline"
              color={"#2977FF"}
              borderColor={"#2977FF"}
              // border={"1px solid #2977FF"}
              _focus={{ boutline: "none" }}
              onClick={() => {
                // handleHeaderSteps("back")
                setIsOpen(true);
              }} >Schedule Campaign</Button>
            <Button
              onClick={() => {
                // if (!isSubmitting) {
                //   startNow()
                // }
                if (onFinalSubmit) {
                  onFinalSubmit();
                }
              }}
              colorScheme="blue" type="button" isLoading={isSubmittingProp || isSubmitting} >
              {/* {isSubmitting ? <Spinner color='gray.700' /> : ""} */}
              <Text as="span" fontSize="16px" ms="8px" fontWeight="500">{isSubmittingProp || isSubmitting ? "Starting..." : "Start Campaign"}</Text>

            </Button>
          </Box>
        </Box>

      </Box>
    </>
  )
}
