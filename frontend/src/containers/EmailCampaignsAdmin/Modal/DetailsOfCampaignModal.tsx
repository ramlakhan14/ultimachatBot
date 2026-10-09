import React, { useCallback, useState } from "react";
import Multiselect from "multiselect-react-dropdown";
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
import { AddMoreTargetAudienceModal } from "./AddMoreTargetAudienceModal";
import ErrorImg from "./images/error.svg"
import { pauseCampaign } from "../../../services/emailCampaigns";
import AddMoreLeads from "./images/iconAdd.svg";
import { useHistory } from "react-router-dom";
import { ModifyYourCampaign } from "./ModifyYourCampaign";
export const DetailsOfCampaignModal = ({ isOpens, onCloses, data, fetchData, itemsPerPages, currentPage }: { isOpens: boolean; onCloses: () => void, data: any, fetchData: any, itemsPerPages: number, currentPage: number }) => {
  const [isOpened, setIsOpened] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [modalData, setModalData] = React.useState(null);
  const [isopenModifyYourCampaign, setiIopenModifyYourCampaign] = useState(false)
  const toast = useToast();
  const history = useHistory();
  if (!data) {
    return null;
  }

  const handleURLClick = () => {
    onCloses(); // Close the first modal
    setIsOpened(true); // Open the second modal
    setModalData(data);
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
  const handleNoClick = async () => {
    const pauseCampaignData = { campaignId: data?._id };
    try {
      const response = await pauseCampaign(pauseCampaignData);

      toast({
        title: `${response?.data?.message}`,
        status: "success",
        isClosable: true,
      })
      onCloses();
      setIsOpen(false);
      fetchData(currentPage, itemsPerPages, '');

    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      })
    }

  }

  // console.log(data._id)

  return (
    <>
      <Modal isOpen={isOpens} size="xl" onClose={onCloses} scrollBehavior="inside" closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton _focus={{ outline: "none" }} />
          <ModalHeader textAlign="center" fontSize="18px" fontWeight="700" color="#1A202C" pb="8px">Details of Campaign</ModalHeader>
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
                  ) : null}
                </Text>
              </Box>
            </Grid>
            {/* Target Audience */}
            <Box mb="24px">
              <Text className={styles.modalTextHeding}>Target Audience</Text>
              <Text className={styles.modalTextPara}>
                {data?.targetAudience?.map((item: any) => item.value).join(", ")}
              </Text>
            </Box>

            {/* Pain Points */}
            <Box mb="24px">
              <Text className={styles.modalTextHeding}>Pain Point / Problem</Text>
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
                {data.emailAndSenderLimit
                  .map((item: any) => `${item.email} (${item.maxLimit})`)
                  .join(", ")}
              </Text>
            </Box>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" variant="ghost" onClick={onCloses} sx={{
              _focus: {
                boxShadow: 'none'
              }
            }}

            >
              Close
            </Button>
            <Spacer />
            {
              data?.status === "paused" ? <Button mr={3}
                onClick={() => {
                  setiIopenModifyYourCampaign(true);
                  onCloses()
                }}
                style={{ backgroundColor: "#6C757D", color: "#fff" }} fontSize="16px" fontWeight="400" sx={{
                  _focus: {
                    boxShadow: 'none',
                  }
                }}
              // isDisabled={data?.status === "completed" || data?.status === "failed" ? true : false}
              >
                Modify Campaign
              </Button> : <Button mr={3} onClick={handlePauseCampaign} style={{ backgroundColor: "#6C757D", color: "#fff" }} fontSize="16px" fontWeight="400" sx={{
                _focus: {
                  boxShadow: 'none',  // Removes the focus box shadow
                }

              }}
                isDisabled={data?.status === "completed" || data?.status === "failed" ? true : false}
              >
                Pause Campaign
              </Button>
            }

            {data?.status === "failed" ? <Button mr={3}
              onClick={() => {
                setiIopenModifyYourCampaign(true);
                onCloses()
              }}
              style={{ backgroundColor: "#6C757D", color: "#fff" }} fontSize="16px" fontWeight="400" sx={{
                _focus: {
                  boxShadow: 'none',
                }


              }}
            // isDisabled={data?.status === "Failed" ? true : false}
            >
              Modify Campaign
            </Button> : null}
            <Button colorScheme="blue" mr={3} onClick={handleURLClick} sx={{
              _focus: {
                boxShadow: 'none',  // Removes the focus box shadow
              }
            }}
              isDisabled={data?.status === "completed" ? true : false}
            >
              <Image src={AddMoreLeads} alt='Add More Leads' />
              <Text as="span" ms="4px" fontSize="16px" fontWeight="400">Add More Leads</Text>
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
            <Button mr={3} onClick={handleNoClick} fontWeight={"500"}>
              Yes
            </Button>
            <Button colorScheme="blue" mr={3} onClick={onClosePause}
            >
              <Text as="span" ms="4px" fontSize="16px" >No</Text>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ModifyYourCampaign isopenModifyYourCampaign={isopenModifyYourCampaign} isCloseModifyYourCampaign={() => setiIopenModifyYourCampaign(false)} campaignId={data._id} fetchData={fetchData} currentPage={currentPage} itemsPerPages={itemsPerPages} />
      <AddMoreTargetAudienceModal isOpened={isOpened} onClose={onClose} data={modalData} fetchData={fetchData} itemsPerPages={itemsPerPages} currentPage={currentPage} />

    </>
  )
}
