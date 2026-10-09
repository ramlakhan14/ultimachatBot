import React, { useCallback, useState, useEffect, useRef } from "react";
import Multiselect from "multiselect-react-dropdown";
import {
  Box,
  Button,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  useToast,
  ModalHeader,
  Grid,
  ModalFooter,
  Spacer,
  Image,
  ModalCloseButton
} from "@chakra-ui/react";
import Lottie from "lottie-react";
import animationData from './Animation.json';
import styles from "../EmailCampaignsAdmin.module.scss";
import ErrorImg from "./images/error.svg"
import { getCampaignDetails, triggerCampaign } from "../../../services/emailCampaigns";
import { Link, useHistory } from "react-router-dom";
import { ModifyYourCampaign } from "./ModifyYourCampaign";

interface CampaignProject {
  projectName?: string;
}

interface AudienceItem {
  value: string;
}

interface PainPoint {
  value: string;
}

interface SolutionOffer {
  value: string;
}

interface CallToAction {
  [key: string]: string;
}

interface EmailAndSenderLimit {
  email: string;
  maxLimit: number;
}

interface ScheduleDateAndTimeLimit {
  scheduleDate: string;
  scheduleTime: number;
}


interface CampaignData {
  campaignName?: string;
  campaignProject?: CampaignProject;
  status?: "completed" | "running" | "scheduled";
  targetAudience?: AudienceItem[];
  painPoints?: PainPoint[];
  solutionOffer?: SolutionOffer[];
  callOfAction?: CallToAction;
  campaignLanguage?: string;
  emailLength?: string;
  maxEmailsPerDay?: number;
  maxEmailsPerLead?: number;
  emailAndSenderLimit?: EmailAndSenderLimit[];
  scheduleDateAndTime?: ScheduleDateAndTimeLimit;
}


export const ReviewTheCampaign = ({ isReviewOpen, onCloseReview, campaignId, campaignName, fetchData, currentPage, itemsPerPages }: any) => {
  const [isOpened, setIsOpened] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isOpens, setIsOpens] = useState(false);
  const [data, setData] = useState<CampaignData | null>(null);
  const [isopenModifyYourCampaign, setiIopenModifyYourCampaign] = useState(false)
  const history = useHistory();
  const mountedRef = useRef(false);
  const toast = useToast();

  const handleURLClick = async () => {
    const campaignData = {
      campaignId: campaignId// Convert to string if needed
    };
    try {


      const response = await triggerCampaign(campaignData);
      if (response?.data?.statusCode === 200) {
        onCloseReview(); // Close the first modal
        setIsOpens(true); // Open the second modal
        // toast({
        //   title: `${response?.data?.message}`,
        //   status: "success",
        //   isClosable: true,
        // })
      }
    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      })
    } finally {
    }

  };

  const onClose = () => {
    setIsOpened(false);
  };
  const handlePauseCampaign = () => {
    setIsOpen(true);
  }
  const onClosePause = () => {
    setIsOpen(false);
  }
  const handleNoClick = () => {
    onCloseReview();
    setIsOpen(false);
    history.push(`/app/email-campaigns`);
  }

  const onCloseOkay = () => {
    setIsOpens(false);
    onCloseReview();
    fetchData(currentPage, itemsPerPages, '');
    history.push(`/app/email-campaigns`);
  }

  const isCloseModifyYourCampaign = () => {
    setiIopenModifyYourCampaign(false);
  }

  React.useEffect(() => {
    const fetchProjects = async () => {
      try {
        if (isReviewOpen === true && campaignId !== undefined) {

          const response: any = await getCampaignDetails(campaignId); // Replace with your API endpoint
          setData(response?.data?.data)
        }
        // setProjects(response.data); // Assuming `response` is an array of project objects
      } catch (error) {
        // console.error("Error fetching projects:", error);
      }
    };

    fetchProjects();
  }, [isReviewOpen, campaignId]);

  const modifyCampaign = () => {
    onCloseReview();
    history.push(`/app/email-campaigns?campaignId=${campaignId}&campaignName=${campaignName}&targetAudience=${true}&review=${true}&modify=${true}`);
    setiIopenModifyYourCampaign(true);
  }


  useEffect(() => {
    mountedRef.current = true;

    const handleReviewParam = () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('modify') === 'true' && mountedRef.current) {
          onCloseReview();
          setiIopenModifyYourCampaign(true);
        }
      } catch (error) {
        // console.error('Error handling review parameter:', error);
      }
    };

    handleReviewParam();

    return () => {
      mountedRef.current = false;
    };
  }, [onCloseReview]);

  return (
    <>
      <Modal isOpen={isReviewOpen} size="xl" onClose={onCloseReview} closeOnOverlayClick={false} scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton _focus={{ outline: "none" }} as={Link} to="/app/email-campaigns" />
          <ModalHeader textAlign="center" fontSize="18px" fontWeight="700" color="#1A202C" pb="8px">Review The Campaign</ModalHeader>
          <ModalBody>
            <Text textAlign="center" mb="24px" fontSize="14px" fontWeight="400" color="#6C757D">
              Please add more target audience for this campaign
            </Text>
            {/* Campaign Information */}
            <Grid templateColumns="repeat(3, 1fr)" gap={6} mb="24px">
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
                  ) :
                    null}
                </Text>
              </Box>
            </Grid>
            {data?.scheduleDateAndTime === undefined ? null :
              <Grid templateColumns="repeat(3, 1fr)" gap={6} mb="24px">
                <Box>
                  <Text className={styles.modalTextHeding}>Campaign Date</Text>
                  <Text className={styles.modalTextPara}>{data?.scheduleDateAndTime?.scheduleDate}</Text>
                </Box>
                <Box>
                  <Text className={styles.modalTextHeding}>Campaign Time</Text>
                  <Text className={styles.modalTextPara}>{data?.scheduleDateAndTime?.scheduleTime}</Text>
                </Box>
              </Grid>
            }
            {/* Target Audience */}
            <Box mb="24px">
              <Text className={styles.modalTextHeding}>Target Audience</Text>
              <Text className={styles.modalTextPara}>
                {data?.targetAudience?.map((item: any) => item.value).join(", ")}
              </Text>
            </Box>

            {/* Pain Points */}
            <Box mb="24px">
              <Text className={styles.modalTextHeding}>Pain-point / problem</Text>
              {data?.painPoints?.map((item: any, index: number) => (
                <Text key={index} className={styles.modalTextPara}>
                  {item.value}
                </Text>
              ))}
            </Box>
            {/* Solution / Offer */}
            <Box mb="24px">
              <Text className={styles.modalTextHeding}>Solution / Offer</Text>
              <Text className={styles.modalTextPara}>
                {data?.solutionOffer?.map((item: any) => item.value).join(", ")}
              </Text>
            </Box>

            {/* Call To Action */}
            <Box mb="24px">
              <Text className={styles.modalTextHeding} mb="5px">Call To Action (CTA)</Text>
              {data?.callOfAction && Object.entries(data?.callOfAction).map(([key, value], index) => {
                return <Text key={index} className={styles.modalTextPara}>{value}</Text>;
              })}
            </Box>

            {/* Additional Campaign Details */}
            <Grid templateColumns="repeat(3, 1fr)" gap={6} mb={4}>
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
            <Box mb="24px">
              <Text className={styles.modalTextHeding}>Max Emails Per Lead <Text as="span" fontSize="12px">(Auto Reply)</Text></Text>
              <Text className={styles.modalTextPara}>{data?.maxEmailsPerLead}</Text>
            </Box>

            {/* Emails for this campaign */}
            <Box mb="24px">
              <Text className={styles.modalTextHeding}>Select Mailboxes</Text>
              <Text className={styles.modalTextPara}>
                {data?.emailAndSenderLimit
                  ?.map((item) => `${item.email} (${item.maxLimit})`)
                  .join(", ") || "No emails specified"}
              </Text>
            </Box>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" variant="ghost"
              onClick={handlePauseCampaign}
              sx={{
                _focus: {
                  boxShadow: 'none'
                }
              }}

            >
              Close
            </Button>
            <Spacer />
            <Button mr={3} onClick={modifyCampaign} fontWeight="500">
              Modify Campaign
            </Button>
            <Button colorScheme="blue" mr={3} onClick={handleURLClick} fontWeight="500">
              <Text as="span" ms="4px" fontSize="16px">Add To Campaign</Text>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal
        isCentered
        onClose={onClose}
        isOpen={isOpen}
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
              <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" mb="8px" mt="24px">Are you sure?</Text>
              <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D">You want to Pause this campaign?</Text>
            </Box>

          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={handleNoClick} fontWeight="500">
              Yes
            </Button>
            <Button colorScheme="blue" mr={3} onClick={onClosePause} fontWeight="500">
              <Text as="span" ms="4px" fontSize="16px" >No</Text>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal
        isCentered
        onClose={onClose}
        isOpen={isOpens}
      >
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

              <Lottie animationData={animationData} style={{ width: 130, height: 130 }} />

              <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" mb="8px" mt="24px">Great!</Text>
              <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D" mb="24px">New Audience has been added successfully to the campaign</Text>
              <Button colorScheme="blue" mr={3} onClick={onCloseOkay} sx={{
                _focus: {
                  boxShadow: 'none',  // Removes the focus box shadow
                }
              }}
              >
                <Text as="span" ms="4px" fontSize="16px" fontWeight="400">Okay</Text>
              </Button>
            </Box>

          </ModalBody>

        </ModalContent>
      </Modal>
      <ModifyYourCampaign isopenModifyYourCampaign={isopenModifyYourCampaign} isCloseModifyYourCampaign={isCloseModifyYourCampaign} campaignId={campaignId} fetchData={fetchData} currentPage={currentPage} itemsPerPages={itemsPerPages} />
    </>
  )
}
