import React, { useEffect, useState } from "react";
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
  ModalCloseButton,
} from "@chakra-ui/react";
import styles from "../VoiceAssistant.module.scss";
import { format } from "date-fns";
export const DetailsOfVoiceBotCampaign = ({ isOpens, handleClose, campaignData }: { isOpens: boolean; campaignData: any; handleClose: () => void }) => {
  const [userData, setUserData] = useState<any>({});

  useEffect(() => {
    const fetchData = async () => {

      try {
        setUserData(campaignData);
      } catch (error: any) {

      }
    };
    if (isOpens) {
      fetchData();
    }
  }, [isOpens]);

  const formattedDate = userData?.scheduledAt
    ? new Date(userData.scheduledAt).toLocaleString("en-IN", {
      timeZone: "UTC",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    : "-";


  return (
    <>
      <Modal isOpen={isOpens} size="xl" onClose={handleClose} scrollBehavior="inside" closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton _focus={{ outline: "none" }} />
          <ModalHeader textAlign="center" fontSize="18px" fontWeight="700" color="#1A202C" pb="8px">Details of Campaign</ModalHeader>
          <ModalBody>
            <Text textAlign="center" mb="24px" fontSize="14px" fontWeight="400" color="#6C757D">
              This campaign is crafted to effectively connect with the target audience through personalized voice messaging, delivering tailored solutions that address specific pain points and drive meaningful engagement.
            </Text>
            {/* Campaign Information */}
            <Grid templateColumns="repeat(3, 1fr)" gap={6} mb="24px">
              <Box>
                <Text className={styles.modalTextHeding}>Campaign Name</Text>
                <Text className={styles.modalTextPara}>{userData?.campaignName}</Text>
              </Box>
              <Box>
                <Text className={styles.modalTextHeding}>Voice Character</Text>
                <Text className={styles.modalTextPara}>{userData?.voiceCharacter}</Text>
              </Box>
              <Box>
                <Text className={styles.modalTextHeding}>Status</Text>
                {userData?.status === "completed" || userData?.status === "Completed" ? (
                  <Text as="span" className={styles.Completed}>Completed</Text>
                ) : userData?.status === "running" || userData?.status === "Running" ? (
                  <Text as="span" className={styles.Running}>Running</Text>
                ) : userData?.status === "scheduled" || userData?.status === "Scheduled" ? (
                  <Text as="span" className={styles.Schedule}>Scheduled</Text>
                ) : userData?.status === "initiated" || userData?.status === "Initiated" ? (
                  <Text as="span" className={styles.initiated}>Initiated</Text>
                ) : userData?.status === "paused" || userData?.status === "Paused" ? (
                  <Text as="span" className={styles.paused}>Paused</Text>
                ) : userData?.status === "failed" || userData?.status === "Failed" ? (
                  <Text as="span" className={styles.paused}>Failed</Text>
                ) : null}

              </Box>
            </Grid>


            {/* Additional Campaign Details */}
            <Grid templateColumns="repeat(3, 1fr)" gap={6} mb={4}>
              <Box>
                <Text className={styles.modalTextHeding}>Language Campaign</Text>
                <Text className={styles.modalTextPara}>{userData?.language}</Text>
              </Box>
              <Box>
                <Text className={styles.modalTextHeding}>Max Call Per Day</Text>
                <Text className={styles.modalTextPara}>{userData?.maxPerDayCall}</Text>
              </Box>
              {userData?.scheduledAt && <Box>
                <Text className={styles.modalTextHeding}>Scheduled At</Text>
                <Text className={styles.modalTextPara}>
                  {formattedDate || "NA"}
                  {/* {format(new Date(userData?.scheduledAt || ""), 'dd/MM/yyyy HH:mm')} */}

                </Text>
              </Box>}
            </Grid>



            {/* Target Audience */}
            <Box mb="24px">
              <Text className={styles.modalTextHeding}>Target Audience</Text>
              <Text className={styles.modalTextPara}>
                {userData?.targetAudience?.map((item: any) => item.value).join(", ")}
              </Text>
            </Box>

            <Box mb="24px">
              <Text className={styles.modalTextHeding}>Pain Point / Problem</Text>
              <Text className={styles.modalTextPara}>
                {userData?.painPointSolution?.map((item: any) => item.painPoint).join(", ")}
              </Text>
            </Box>

            <Box mb="24px">
              <Text className={styles.modalTextHeding}>Solution / Offer</Text>
              <Text className={styles.modalTextPara}>
                {userData?.painPointSolution?.map((item: any) => item.solution).join(", ")}
              </Text>
            </Box>

            {/* Maximum Emails Per Lead */}
            <Box mb="24px">
              <Text className={styles.modalTextHeding}>Base Prompt</Text>
              <Text className={styles.modalTextPara}>{userData?.prompt}</Text>
            </Box>

            {/* Emails for this campaign */}
            <Box mb="24px">
              <Text className={styles.modalTextHeding}>Phone Number for this campaign</Text>
              <Text className={styles.modalTextPara}>
                {userData?.phoneNumbers?.map((item: any) => `${item.phoneNumber} (${item.maxLimit})`)
                  .join(", ")}
              </Text>
            </Box>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" variant="ghost" onClick={handleClose} sx={{
              _focus: {
                boxShadow: 'none'
              }
            }}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal >

    </>
  )
}
