import * as React from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  VStack,
  Table,
  Thead,
  Tr,
  useToast,
  Tbody,
  Td,
  Th,
  TableContainer,
  Button,
  Spinner,
  Image,
  Input
} from "@chakra-ui/react";
import editIcon from "./images/icon-edit-white.svg";
import styles from "./UltimamailSettings.module.scss";
import { Link } from "react-router-dom";
import { ReadIcon } from "../../components/Icons/ReadIcon";
import { useHistory } from "react-router-dom";
import { emailServerConfig, verifyPostmarkAuthAndSecretKey } from "../../services/ultimamailsettings";
import CryptoJS from 'crypto-js'; // Import crypto-js for encryption
import { ENCRYPTION_DECRYPTION_KEY } from '../../config';
import TableComponent from "../TableComponent";


export const PostmarkSettingsHistory = () => {
  const history = useHistory();
  const toast = useToast();
  const [inviteUsersData, setInviteUsersData] = React.useState<any>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [postmarkId, setPostmarkId] = React.useState<any>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedData, setEditedData] = React.useState<any>();
  const [isLoadingVerify, setIsLoadingVerify] = React.useState(false);
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
      const response: any = await emailServerConfig();
      const decryptedUsers = response?.data?.data?.map((user: any) => ({
        ...user,
        emailAccountAuthKey: decryptPasskey(user?.emailAccountAuthKey), // Decrypt the passkey here
        emailServerApiKey: decryptPasskey(user?.emailServerApiKey)
      }));
      // Find the user with 'postmark' provider and set ID
      const postmarkUser = decryptedUsers?.find(
        (user: any) => user.emailServiceProviderName === 'postmark'
      );
      setPostmarkId(postmarkUser._id);
      setInviteUsersData(decryptedUsers);
      setEditedData(decryptedUsers); // Initialize edited data

    } catch (error: any) {

    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      setIsLoadingVerify(true);
      // Here you would implement the save logic
      const secureEmailServerData = editedData.map((user: any) => ({
        emailServer: user.emailServiceProviderName,
        authKey: encryptPasskey(user.emailAccountAuthKey),
        secretKey: encryptPasskey(user.emailServerApiKey),
      }));

      // For example, encrypt the keys and send to API
      try {
        const response = await verifyPostmarkAuthAndSecretKey(secureEmailServerData[0]);

        toast({
          title: `${response?.data?.message}`,
          status: "success",
          isClosable: true,
        });
        setInviteUsersData(editedData);
        setIsEditing(false);
      } catch (error: any) {
        toast({
          title: `${error?.response?.data?.message}`,
          status: "error",
          isClosable: true,
        })
      } finally {
        setIsLoadingVerify(false);
      }
      // Update the original data with edited data


      // You might want to call an API to save the changes
      // await saveEmailServerConfig(editedData);

    } catch (error) {
      // console.error('Error saving data:', error);
    }
  };

  const handleCancel = () => {
    // Reset edited data to original data
    setEditedData(inviteUsersData);
    setIsEditing(false);
  };

  const handleInputChange = (index: number, field: string, value: string) => {
    const updatedData = [...editedData];
    updatedData[index] = {
      ...updatedData[index],
      [field]: value
    };
    setEditedData(updatedData);
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const tableHeader = [
    "Email",
    "Email Server",
    "Auth Key",
    "Secret Key",
  ]
  const tableDataKeys = [
    "adminEmail",
    "emailServiceProviderName",
    "emailAccountAuthKey",
    "emailServerApiKey",
  ]

  return (
    <>
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
            <Flex width="100%" mb="4" justifyContent="space-between">
              <Box>
                <Heading as="h2" fontSize="16px" color="#2977FF">
                  <Link to={`/app/postmark-settings`}><Text as="span" borderBottom="1px solid #2977FF">Postmark Settings</Text>
                  </Link> / <Text as="span" color="#6C757D">Settings History</Text></Heading>
              </Box>
            </Flex>
          </Flex>
        </VStack>
        <Box mt="0px">
          <Flex justifyContent="space-between" alignItems="center">
            <Box>
              <Text as="p" fontSize="24px" color="#1A202C" fontWeight="600">Postmark Settings History</Text>
            </Box>
            <Box ml="auto">
              {isEditing ? (
                <>
                  <Button
                    color={"#2977FF"}
                    mr="12px"
                    backgroundColor={'transparent'}
                    border="1px solid #2977FF"
                    size='md'
                    className="btn-hover-sec"
                    onClick={handleSave}
                    sx={{
                      _focus: {
                        boxShadow: 'none',
                      }
                    }}
                  >
                    {isLoadingVerify ?
                      <Spinner color='gray.700' />
                      :
                      <>
                        {/* <Image src={saveIcon} alt='Save & Continue' /> */}
                        <Text as="span" ms="8px">Save</Text>
                      </>
                    }

                  </Button>
                  <Button
                    color={"#2977FF"}
                    backgroundColor={'transparent'}
                    border="1px solid #2977FF"
                    size='md'
                    className="btn-hover-sec"
                    onClick={handleCancel}
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
                    color={"white"}
                    mr="12px"
                    backgroundColor={'#2977FF'}
                    className="btn-hover-pri"
                    onClick={handleEdit}
                    sx={{
                      _focus: {
                        boxShadow: 'none',
                      }
                    }}
                  >
                    <Image src={editIcon} alt="edit" width={"16px"} />
                    <Text as="span" fontWeight={"500"} ms="8px">Edit</Text>
                  </Button>
                  <Button
                    color={"white"}
                    onClick={() => {
                      history.push(`/app/postmark-settings-details/${postmarkId}`);
                    }}
                    mr="12px"
                    backgroundColor={'#2977FF'}
                    // size='md'
                    className="btn-hover-pri"
                    sx={{
                      _focus: {
                        boxShadow: 'none',
                      }
                    }}
                  >
                    <ReadIcon />
                    <Text as="span" fontWeight={"500"} ms="8px">View</Text>
                  </Button>
                </>
              )}
            </Box>
          </Flex>
        </Box>
        <Box mt="24px" minW={"100%"} w={"600px"}>
          <TableComponent
            isLoading={isLoading}
            data={(isEditing ? editedData : inviteUsersData) || []}
            tableHeader={tableHeader}
            customRowRenderer={(data: any, index: number) => {
              return (
                <Tr key={data._id}>
                  <Td>{index + 1}</Td>
                  <Td>{data?.adminEmail}</Td>
                  <Td>{data?.emailServiceProviderName}</Td>
                  <Td>
                    {isEditing ? (
                      <Input
                        value={data?.emailAccountAuthKey}
                        onChange={(e) => handleInputChange(index, 'emailAccountAuthKey', e.target.value)}
                        size="sm"
                      />
                    ) : (
                      data?.emailAccountAuthKey
                    )}
                  </Td>
                  <Td>
                    {isEditing ? (
                      <Input
                        value={data?.emailServerApiKey}
                        onChange={(e) => handleInputChange(index, 'emailServerApiKey', e.target.value)}
                        size="sm"
                      />
                    ) : (
                      data?.emailServerApiKey
                    )}
                  </Td>
                </Tr>
              );
            }}

          />

        </Box>
      </Box>
    </>
  );
};