import {
  Box, Button, Flex, Heading, AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Image,
  useToast, Spinner, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tr, VStack, Input
} from "@chakra-ui/react";
import React, { useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { ReadIcon } from "../../../components/Icons/ReadIcon";
import styles from "./VoiceAssistant.module.scss";
import { fetchConfigKey, verifyVapiKey } from "../../../services/VoiceBot";
import { ENCRYPTION_DECRYPTION_KEY } from '../../../config';
import CryptoJS from 'crypto-js'; // Import crypto-js for encryption
import editIcon from "../Images/icon-edit-white.svg";
import PageLayout from "../../../components/PageLayout";
import { colors } from "../../../utils/constant";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr";

const CallNumberHistory = () => {
  const [isHistoryData, setHistoryData] = useState<any>();
  const toast = useToast();
  const history = useHistory();
  const [isLoading, setIsLoading] = React.useState(false);
  const [postmarkId, setPostmarkId] = React.useState<any>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedData, setEditedData] = React.useState<any>(null);
  const [isUpdated, setIsUpdated] = React.useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = React.useState<any>(false);
  const cancelRef = React.useRef<any>();

  const handleCancelSave = () => {
    setIsSaveDialogOpen(false);
  };

  const decryptPasskey = (encryptedPasskey: string) => {
    const bytes = CryptoJS.AES.decrypt(encryptedPasskey, ENCRYPTION_DECRYPTION_KEY);
    const decryptedPasskey = bytes.toString(CryptoJS.enc.Utf8);
    return decryptedPasskey;
  };

  const encryptPasskey = (passkey: string) => {
    const encryptedPasskey = CryptoJS.AES.encrypt(passkey, ENCRYPTION_DECRYPTION_KEY).toString();
    return encryptedPasskey;
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const userData = await fetchConfigKey();
      const user = userData.data.data;
      const decryptedUsers = {
        ...user,
        configKey: decryptPasskey(user?.configKey), // Decrypt the passkey here
        twilioAuthToken: decryptPasskey(user?.twilioAuthToken),
        twilioAccountSid: decryptPasskey(user?.twilioAccountSid),
        elevenLabsAPIKey: user?.elevenLabsAPIKey ? decryptPasskey(user?.elevenLabsAPIKey) : ""
      };
      setHistoryData(decryptedUsers);
      setEditedData(decryptedUsers); // Initialize edited data
      setPostmarkId(decryptedUsers._id);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      setIsUpdated(true);
      // Here you would implement the save logic
      // For example, encrypt the keys and send to API
      const updateData = {
        vapiKey: editedData.configKey ? encryptPasskey(editedData.configKey) : "",
        twilioAccountSid: editedData.twilioAccountSid ? encryptPasskey(editedData.twilioAccountSid) : "",
        twilioAuthToken: editedData.twilioAuthToken ? encryptPasskey(editedData.twilioAuthToken) : "",
        elevenLabsAPIKey: editedData.elevenLabsAPIKey ? encryptPasskey(editedData.elevenLabsAPIKey) : "",
        serverConfigId: editedData._id,
      }

      // console.log("updateData", updateData, editedData);

      const response = await verifyVapiKey(updateData);
      toast({
        title: `${response?.data?.message}`,
        status: "success",
        isClosable: true,
      });
      setHistoryData(editedData);
      setIsEditing(false);
      setIsSaveDialogOpen(false)

    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsUpdated(false);
    }
  }

  const handleCancel = () => {
    // Reset edited data to original data
    setEditedData(isHistoryData);
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: string) => {

    setEditedData((prev: any) => ({
      ...prev,
      [field]: value
    }));

    // console.log(field, value, editedData);
  };

  React.useEffect(() => {
    fetchData(); // Call your fetchData function when settingsdetailsId is set.
  }, []);


  return (
    <React.Fragment>
      <PageLayout
        pageTitle="Number  Authentication History"
        breadCrums={
          <VStack w="100%" spacing="10">
            <Flex
              shrink={0}
              w="100%"
              direction="column"
              justifyContent="space-between"
            >
              <Flex width="100%" mb="6" justifyContent="space-between">
                <Box>
                  <Heading as="h2" fontSize="16px" color="#2977FF">
                    <Link to={`/app/voice-campaign/add-number`}><Text as="span" borderBottom="1px solid #2977FF">Number Authentication</Text>
                    </Link> / <Text as="span" color="#6C757D">Number Authentication History</Text></Heading>
                </Box>
                <Box>
                </Box>
              </Flex>
            </Flex>
          </VStack>
        }
        pageHeaderContent={
          <Box ml="auto">
            {isEditing ? (
              <>
                <Button
                  mr="12px"
                  size='md'
                  isLoading={isUpdated}
                  colorScheme="blue"
                  fontWeight={500}
                  // className="btn-hover-sec"
                  onClick={() => { setIsSaveDialogOpen(true) }}
                >
                  <Text as="span">Save</Text>

                </Button>
                <Button
                  size='md'
                  colorScheme="gray"
                  onClick={handleCancel}
                  fontWeight={500}
                  sx={{
                    _focus: {
                      boxShadow: 'none',
                    }
                  }}
                >
                  <Text as="span" ms="8px">Cancel</Text>
                </Button>
              </>
            ) : (
              <>
                <Button
                  colorScheme={'blue'}
                  variant={'outline'}
                  fontWeight={500}
                  mr="12px"
                  size='md'
                  // className="btn-hover-sen"
                  onClick={() => {
                    handleEdit();
                  }}
                  sx={{
                    _focus: {
                      boxShadow: 'none',
                    }
                  }}
                >
                  <svg width="15" height="14" viewBox="0 0 15 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.2531 0.317993C11.3079 0.317993 11.3626 0.329215 11.4132 0.35022C11.4637 0.371217 11.5093 0.402307 11.548 0.44104L14.048 2.94104C14.0867 2.97969 14.1178 3.02528 14.1388 3.07581C14.1598 3.12642 14.171 3.18116 14.171 3.23596C14.171 3.29059 14.1597 3.34467 14.1388 3.39514C14.1178 3.44576 14.0868 3.49218 14.048 3.53088L5.71497 11.8639C5.67503 11.9035 5.62761 11.935 5.57532 11.9557L1.40833 13.6217C1.33268 13.6519 1.24986 13.6596 1.17005 13.6432C1.09021 13.6268 1.01675 13.5875 0.959112 13.5299C0.901482 13.4723 0.86224 13.3988 0.845831 13.319C0.829462 13.2392 0.8371 13.1563 0.867315 13.0807L2.53333 8.9137C2.55406 8.86141 2.58553 8.81399 2.62513 8.77405L10.9581 0.44104C10.9968 0.402239 11.0433 0.371224 11.0939 0.35022C11.1444 0.329312 11.1984 0.31802 11.2531 0.317993ZM3.27552 9.30334L2.00208 12.4869L5.18567 11.2135L5.27454 11.1256C5.19506 11.0959 5.12665 11.042 5.07825 10.9723C5.02992 10.9026 5.00312 10.8198 5.00306 10.735V10.319H4.58704C4.47655 10.319 4.37025 10.275 4.29212 10.1969C4.21398 10.1188 4.17005 10.0125 4.17005 9.90198V9.48499H3.75403C3.66927 9.48492 3.58637 9.45907 3.51673 9.41077C3.44704 9.36237 3.39311 9.29396 3.36341 9.21448L3.27552 9.30334ZM4.17005 8.40784V8.65198H4.58704C4.69749 8.65202 4.80386 8.69595 4.88196 8.77405C4.95999 8.85217 5.00306 8.95855 5.00306 9.06897V9.48499H5.42005C5.5305 9.48499 5.63685 9.52899 5.71497 9.60706C5.79309 9.68517 5.83702 9.79151 5.83704 9.90198V10.319H6.08118L11.4972 4.90198L9.58704 2.99182L4.17005 8.40784ZM10.1759 2.40198L12.087 4.31311L13.1642 3.23596L11.2531 1.32483L10.1759 2.40198Z" fill="#2977FF" />
                  </svg>
                  <Text as="span" ms="8px">Edit</Text>
                </Button>
                <Button
                  colorScheme="blue"
                  fontWeight={500}
                  onClick={() => {
                    history.push(`/app/voice-campaign/number-history-details/${postmarkId}`);
                  }}
                  size='md'
                >
                  <ReadIcon />
                  <Text as="span" ms="8px"> View</Text>
                </Button>
              </>
            )}
          </Box>
        }
      >
        <Box mt="24px" minW={"100%"} w="600px">
          <TableContainer
            maxH="calc(100vh - 215px)"// height for vertical scroll
            mt={'20px'}
            w="100%"
            boxShadow={"0px 1px 4px 0px #0C0C0D0D"}
            bg={'#fff'}
            border="1px solid #E2E8F0"
            borderRadius="4px"
            overflowY="scroll"
            overflowX="auto"
            sx={{
              /* Hide ONLY vertical scrollbar */
              "&::-webkit-scrollbar:vertical": {
                width: "0px",
              },
              "&::-webkit-scrollbar-thumb:vertical": {
                background: "transparent",
              },
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
                <Tr>
                  {/* <Th>#</Th> */}
                  <Th>Vapi Auth Key</Th>
                  <Th >Twilio Auth Token</Th>
                  <Th>Twilio Secret ID</Th>
                  <Th>Elevenlabs ID</Th>
                </Tr>
              </Thead>
              <Tbody>
                {isLoading ? (
                  <Tr><Td colSpan={4} textAlign="center"><Spinner /></Td></Tr>
                ) : isHistoryData !== undefined ? (
                  <Tr>
                    {/* <Td>{1}</Td> */}
                    <Td>
                      {isEditing ? (
                        <Input
                          value={editedData?.configKey || ''}
                          onChange={(e) => handleInputChange('configKey', e.target.value)}
                          size="sm"
                        />
                      ) : (
                        isHistoryData?.configKey
                      )}
                    </Td>
                    <Td>
                      {isEditing ? (
                        <Input
                          value={editedData?.twilioAuthToken || ''}
                          onChange={(e) => handleInputChange('twilioAuthToken', e.target.value)}
                          size="sm"
                        />
                      ) : (
                        isHistoryData?.twilioAuthToken
                      )}
                    </Td>
                    <Td>
                      {isEditing ? (
                        <Input
                          value={editedData?.twilioAccountSid || ''}
                          onChange={(e) => handleInputChange('twilioAccountSid', e.target.value)}
                          size="sm"
                        />
                      ) : (
                        isHistoryData?.twilioAccountSid
                      )}
                    </Td>
                    <Td>
                      {isEditing ? (
                        <Input
                          value={editedData?.elevenLabsAPIKey || ''}
                          onChange={(e) => {
                            // console.log("sadfaskf", e.target.value);

                            handleInputChange('elevenLabsAPIKey', e.target.value)
                          }}
                          size="sm"
                        />
                      ) : (
                        isHistoryData?.elevenLabsAPIKey
                      )}
                    </Td>

                  </Tr>
                ) : (
                  <Tr>
                    <Td colSpan={5} textAlign="center">
                      <Text color="gray.500">No data found</Text>
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      </PageLayout>

      <AlertDialog
        isOpen={isSaveDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={handleCancelSave}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>
              Alert !
            </AlertDialogHeader>
            <AlertDialogBody fontSize={"small"}>
              Changing the Vapi API key will update your assistant and phone number IDs. This may affect all running and scheduled campaigns. Do you want to proceed with this change?
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} fontWeight="500" size='sm' onClick={handleCancelSave}>
                Cancel
              </Button>
              <Button
                size="sm"
                colorScheme="red"
                variant="solid" onClick={handleSave} ml={3} fontWeight="500">
                Save
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </React.Fragment>

  );
}

export default CallNumberHistory;