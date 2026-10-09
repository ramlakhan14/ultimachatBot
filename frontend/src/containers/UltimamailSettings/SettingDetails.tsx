import * as React from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Input,
  useToast,
  Button,
  Image,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  FormControl,
  FormErrorMessage,
  VStack,
  FormLabel,
  Select,
  Spinner,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverCloseButton,
  Tooltip,
} from "@chakra-ui/react";
import styles from "./UltimamailSettings.module.scss";
import { allEmailAndPasskeyConfig, deleteEmailAndPasskeyConfig, updatePasskeyAndEmailHost } from "../../services/ultimamailsettings";
import CryptoJS from 'crypto-js'; // Import crypto-js for encryption
import editIcon from "./images/EditIcon.svg";
import deleteIcon from "./images/DeleteIcon.svg";
import { Link, useParams } from "react-router-dom";
import addIcon from "./images/Addicon.svg";
import { AddNewModal } from "./Modal/AddNewModal";
import XIcon from "./images/xIcon.svg";
import { DeleteModal } from "./Modal/DeleteModal";
import { GoInfo } from "react-icons/go";
import { baseURL } from '../../config';
import { colors } from "../../utils/constant";

interface User {
  email?: string;
  status?: 'verified' | 'pending' | 'invalid';
  passkey?: string;
  emailHost?: string;
  userId?: string;
  _id?: string;
}
export const SettingDetails = () => {
  const toast = useToast();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isDispaly, setIsDispaly] = React.useState<boolean>(true);
  const [isEditable, setIsEditable] = React.useState<any>(null);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const campaignEmailServerId: any = useParams(); // Access the :id from the URL
  const [accountAuthToken, setAccountAuthToken] = React.useState<any>();
  const [isOpenDeleteModal, setIsOpenDeleteModal] = React.useState<boolean>(false);
  const [isDeleteUserData, setDeleteUserData] = React.useState<any>();
  const [isPopoverOpen, setIsPopoverOpen] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const onClose = () => {
    setIsOpen(false);
  };


  // allEmailAndPasskeyConfig
  const encryptPasskey = (passkey: string | undefined): string => {
    if (!passkey) return ''; // Handle empty or undefined passkey by returning an empty string
    const encrypted = CryptoJS.AES.encrypt(passkey, 'your-encryption-key').toString();
    return encrypted;
  };

  // Decrypting function
  const decryptPasskey = (encryptedPasskey: string) => {
    const bytes = CryptoJS.AES.decrypt(encryptedPasskey, 'your-encryption-key');
    const decryptedPasskey = bytes.toString(CryptoJS.enc.Utf8);
    return decryptedPasskey;
  };


  const onSubmit = async (formData: any) => {
    const secureEmailServerData = {
      ...formData,
      passkey: encryptPasskey(formData.passkey),
      isPasskeyAdded: true
    };
    try {
      // const response = await updatePasskeyAndEmailHost();
    } catch (error) {

    }
  }
  const [users, setUsers] = React.useState<User[]>([]);

  // State for form errors
  const [errors, setErrors] = React.useState<{ [key: string]: string }>({});

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate passkey (example: minimum 6 characters)
  const validatePasskey = (passkey: string): boolean => {
    return passkey.length >= 40;
  };

  // Validate email host (simple check for non-empty)
  const validateEmailHost = (host: string): boolean => {
    return host.trim().length > 0;
  };

  // Handle input changes
  const handleInputChange = (index: number, field: keyof User, value: string) => {
    const newUsers = [...users];
    newUsers[index] = {
      ...newUsers[index],
      [field]: value
    };

    setUsers(newUsers);

    // Validate input
    const newErrors = { ...errors };
    switch (field) {
      case 'email':
        newErrors[`email_${index}`] = validateEmail(value) ? '' : 'Invalid email format';
        break;
      case 'passkey':
        newErrors[`passkey_${index}`] = validateEmailHost(value) ? '' : 'Passkey is required';
        break;
      case 'emailHost':
        newErrors[`emailHost_${index}`] = validateEmailHost(value) ? '' : 'Email host is required';
        break;
    }
    setErrors(newErrors);
  };

  const onDeleteModal = () => {
    setIsOpenDeleteModal(false);
  }

  // Save handler for individual row
  const handleSave = async (index: number) => {
    const user = users[index];
    const newErrors = { ...errors };

    // Validate all fields
    if (!user.email || !validateEmail(user.email)) {
      newErrors[`email_${index}`] = 'Invalid email format';
    }
    if (!user.emailHost || !validateEmailHost(user.emailHost)) {
      newErrors[`emailHost_${index}`] = 'Email host is required';
    }

    // If no errors, proceed with save
    if (Object.values(newErrors).every(error => error === '')) {
      const encryptedUsers = {
        id: user?._id, // Replace with your desired ID
        userId: user.userId,
        emailHost: user.emailHost// Replace with "string" if not present
      };

      try {
        const response = await updatePasskeyAndEmailHost(encryptedUsers);
        fetchData();
        toast({
          title: `${response?.data?.message}`,
          status: "success",
          isClosable: true,
        })
      } catch (error: any) {
        toast({
          title: `${error?.response?.data?.message}`,
          status: "error",
          isClosable: true,
        })
      } finally {
        setIsEditable(null)
      }
      // Here you would typically make an API call to save the data
      // Example: saveUserData(user)
    } else {
      setErrors(newErrors);
    }
  };



  const fetchData = async () => {
    try {
      setIsLoading(true);
      const userData = await allEmailAndPasskeyConfig(campaignEmailServerId?.id);
      // Assuming userData?.data?.data is an array of users
      const decryptedUsers = userData?.data?.data?.map((user: any) => ({
        ...user,
        // passkey: user?.passkey !== null && user?.passkey !== "" ? decryptPasskey(user.passkey) : "--", // Decrypt the passkey here
      }));
      setUsers(userData?.data?.data);
      setIsEditable(null);
      setAccountAuthToken(userData?.data?.authToken);
    } catch (error) {
      // console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const deleteUser = async (data: any) => {
    setIsOpenDeleteModal(true);
    setDeleteUserData(data)
  }
  const handlePasskeyClick = async (index: number, data: any) => {
    if (data === "imap.gmail.com" || data === "Gmail") {
      window.location.href = `${baseURL}campaign/google/auth`;
    } else if (data === "outlook.office365.com" || data === "Microsoft") {
      window.location.href = `${baseURL}campaign/microsoft/auth`;
    } else if (data === "imap.mail.yahoo.com" || data === "Yahoo") {
      window.location.href = `${baseURL}campaign/yahoo/auth`;
    }
  }

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
          <Flex width="100%" mb="8" justifyContent="space-between">
            <Box>
              <Heading as="h2" fontSize="16px" color="#2977FF">
                <Link to={`/app/postmark-settings`}><Text as="span" borderBottom="1px solid #2977FF">Postmark Settings</Text>
                </Link> / <Link to={`/app/postmark-settings-history`}><Text as="span" borderBottom="1px solid #2977FF">Settings History</Text></Link> / <Text as="span" color="#6C757D">Setting Details</Text></Heading>
            </Box>
            <Box>
            </Box>
          </Flex>
        </Flex>
      </VStack>
      <Box mt="0px">
        <Flex justifyContent="space-between" alignItems="center">
          <Box>
            <Text as="p" fontSize="30px" color="#1A202C" fontWeight="600">Postmark Settings Details</Text>
          </Box>
          <Box ml="auto">
            <Button color={"white"} mr="12px" backgroundColor={'#2977FF'} size='md' className="btn-hover-pri"
              onClick={() => {
                setIsOpen(true)
              }}
              sx={{
                _focus: {
                  boxShadow: 'none',  // Removes the focus box shadow
                }
              }}
            >
              <Image src={addIcon} alt='addIcon' />


              <Text as="span" ms="8px">Add New Email
              </Text>
            </Button>
          </Box>
        </Flex>
      </Box>
      <Box mt="20px" minW="100%" w="600px">
        <TableContainer
          maxH="calc(100vh - 230px)" // height for vertical scroll
          mt={'20px'}
          w="100%"
          boxShadow={"0px 1px 4px 0px #0C0C0D0D"}
          bg={'#fff'}
          border="1px solid #E2E8F0"
          borderRadius="4px"
          sx={{
            overflow: "scroll!important",
            "::-webkit-scrollbar": {
              display: "none"
            }
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
                <Th w="50px">#</Th>
                <Th w="300px">Admin's Email ID</Th>
                <Th w="250px" >Email Status</Th>
                <Th w="300px">
                  <Box display="flex" alignItems={"center"} gap="10px">
                    Pass Key
                    <Popover isOpen={isPopoverOpen} onClose={() => setIsPopoverOpen(!isPopoverOpen)}>
                      <PopoverTrigger>
                        <Box
                          cursor="pointer"
                          as="span"
                          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                          ml="10px"
                        ><GoInfo /></Box>
                      </PopoverTrigger>
                      <PopoverContent
                        bg="#efefef"
                        fontWeight={500}
                        color="#333"
                        p={4}
                        width="250px"
                        fontSize="12px"
                        border="1px solid #ccc"
                        lineHeight="20px"
                        style={{ boxShadow: "none" }}
                        borderRadius="4px"
                      >
                        <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                        <Box whiteSpace="pre-wrap">Generate your passkey using the button below.</Box>
                      </PopoverContent>
                    </Popover>
                  </Box>
                </Th>
                <Th w="300px">Email Host</Th>
                <Th w="250px">Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {isLoading ? <Tr><Td colSpan={6} textAlign="center"><Spinner /></Td></Tr> : isSubmitting ? <Tr><Td colSpan={6} textAlign="center"><Spinner /></Td></Tr> :
                users?.length > 0 ? (
                  users?.map((user: any, index: number) => (
                    <Tr key={index}>
                      <Td verticalAlign={"top"}>{index + 1}</Td>
                      <Td verticalAlign={"top"}> {isEditable === index ? <FormControl isInvalid={!!errors[`email_${index}`]}>
                        <Input
                          type="email"
                          placeholder="Enter Email"
                          defaultValue={user.email || ''}
                          readOnly
                          onChange={(e) => handleInputChange(index, 'email', e.target.value)}
                        />
                        <FormErrorMessage>
                          {errors[`email_${index}`]}
                        </FormErrorMessage>
                      </FormControl> : <Text as="span" className={styles.passkey}>{user.email}</Text>}

                      </Td>
                      <Td verticalAlign={"top"}>
                        {user?.status === "verified" ? (
                          <Text as="span" className={styles.Verified}>Verified</Text>
                        ) : user?.status === "pending" ? (
                          <Text as="span" className={styles.Pending}>Pending</Text>
                        ) : user?.status === "invalid" ? (
                          <Text as="span" className={styles.paused}>Invalid</Text>
                        ) : null}
                      </Td>
                      <Td verticalAlign={"top"}>
                        {isEditable === index ? <FormControl isInvalid={!!errors[`passkey_${index}`]}>
                          {user?.emailHost !== null && user?.emailHost !== "" ? user?.passkey !== null && user?.passkey !== "" ? `${user?.passkey.slice(0, 15)}...` :
                            // <Button color={"white"} mr="12px" backgroundColor={'#2977FF'} size='md' sx={{
                            //   _focus: {
                            //     boxShadow: 'none',
                            //     backgroundColor: 'none !important'
                            //   },
                            //   _active: {
                            //     boxShadow: 'none',
                            //   },
                            //   _hover: {
                            //     _disabled: {
                            //       backgroundColor: '#6120C5 !important',
                            //     },
                            //   }
                            // }} className={styles.passkey} onClick={() => handlePasskeyClick(index, user.emailHost)}>
                            //   {user.emailHost === "imap.gmail.com" ? "Gmail" :
                            //     user.emailHost === "outlook.office365.com" ? "Microsoft" :
                            //       // user.emailHost === "outlook.office365.com" ? "Hotmail" :
                            //       user.emailHost === "imap.mail.yahoo.com" ? "Yahoo" : null}
                            // </Button> 
                            null : null}
                          <FormErrorMessage>
                            {/* {errors[`passkey_${index}`]} */}
                          </FormErrorMessage>
                        </FormControl> : <Text as="span" className={styles.passkey} title={user?.passkey}>{user?.passkey !== null && user?.passkey !== "" ? `${user?.passkey.slice(0, 15)}...` : user.emailHost !== "" ? <Button color={"white"} mr="12px" backgroundColor={'#2977FF'} size='md' sx={{
                          _focus: {
                            boxShadow: 'none',
                            backgroundColor: 'none !important'
                          },
                          _hover: {
                            _disabled: {
                              backgroundColor: '#6120C5 !important',
                            },
                          }
                        }} className={styles.passkey} onClick={() => handlePasskeyClick(index, user.emailHost)}>{user.emailHost === "imap.gmail.com" ? "Gmail" :
                          user.emailHost === "outlook.office365.com" ? "Microsoft" :
                            // user.emailHost === "outlook.office365.com" ? "Hotmail" :
                            user.emailHost === "imap.mail.yahoo.com" ? "Yahoo" : null} </Button> : "--"}</Text>}
                      </Td>
                      <Td verticalAlign={"top"}>
                        {isEditable === index ? (
                          <FormControl isInvalid={!!errors[`emailHost_${index}`]}>
                            {/* <FormLabel>IMAP Host</FormLabel> */}
                            <Select
                              placeholder="Select Email Host"
                              value={user.emailHost || ""}
                              onChange={(e) => handleInputChange(index, "emailHost", e.target.value)}
                            >
                              <option value="imap.gmail.com">Gmail</option>
                              <option value="outlook.office365.com">Microsoft</option>
                              <option value="imap.mail.yahoo.com">Yahoo</option>
                              {/* <option value="outlook.office365.com">Hotmail</option> */}
                            </Select>
                            <FormErrorMessage>{errors[`emailHost_${index}`]}</FormErrorMessage>
                          </FormControl>
                        ) : (
                          <Text as="span" className={styles.passkey}>
                            {user.emailHost === "imap.gmail.com" ? "Gmail" :
                              user.emailHost === "outlook.office365.com" ? "Microsoft" :
                                // user.emailHost === "outlook.office365.com" ? "Hotmail" :
                                user.emailHost === "imap.mail.yahoo.com" ? "Yahoo" :
                                  user.emailHost !== null && user.emailHost !== "" ? user.emailHost : "--"}
                          </Text>
                        )}
                      </Td>
                      <Td verticalAlign={"top"}>
                        <Button
                          color={"white"} mr="4px" backgroundColor={'#2977FF'}
                          onClick={() => handleSave(index)}
                          isDisabled={isEditable === index ? isDispaly : true}
                          className="btn-hover-pri"
                          sx={{
                            _focus: {
                              boxShadow: 'none',
                              backgroundColor: 'none !important'
                            },
                            _hover: {
                              _disabled: {
                                backgroundColor: '#6120C5 !important',
                              },
                            }
                          }}
                        >
                          <Text as="span" fontSize={'14px'} fontWeight={'400'}  >Save</Text>
                        </Button>
                        {isEditable === index ?
                          <Tooltip label="Cancel" fontSize={"11px"}>

                            <Button
                              isDisabled={user?.status !== "verified"}
                              mr="4px"
                              backgroundColor="#F8F9FA"
                              onClick={() => {
                                // setIsDispaly(false)
                                setIsEditable(null);
                              }}
                              sx={{
                                _focus: {
                                  boxShadow: 'none',
                                  backgroundColor: 'none !important'
                                },
                                _hover: {
                                  _disabled: {
                                    backgroundColor: 'unset !important',
                                  },
                                }
                              }}
                            >
                              <Image src={XIcon} alt='XIcon' />
                            </Button>
                          </Tooltip>
                          :
                          <Tooltip label="Edit" fontSize={"11px"}>
                            <Button
                              isDisabled={user?.status !== "verified"}
                              mr="4px"
                              backgroundColor="#F8F9FA"
                              onClick={() => {
                                setIsDispaly(false);
                                setIsEditable(index);
                              }}
                              sx={{
                                _focus: {
                                  boxShadow: 'none',
                                  backgroundColor: 'none !important'
                                },
                                _hover: {
                                  _disabled: {
                                    backgroundColor: 'unset !important',
                                  },
                                }
                              }}
                            >
                              <Image src={editIcon} alt='editIcon' />
                            </Button></Tooltip>}
                        <Tooltip label="Delete" fontSize={"11px"}>
                          <Button
                            // isDisabled={user?.status !== "verified"}
                            backgroundColor="#F8F9FA"
                            onClick={() => deleteUser(user)}
                            sx={{
                              _focus: {
                                boxShadow: 'none',
                                backgroundColor: 'none !important'
                              },
                              _hover: {
                                _disabled: {
                                  backgroundColor: 'unset !important',
                                },
                              }
                            }}
                          >
                            <Image src={deleteIcon} alt='deleteIcon' />
                          </Button>
                        </Tooltip>
                      </Td>
                    </Tr>

                  ))
                ) : (
                  <Tr>
                    <Td colSpan={6} textAlign="center">
                      <Text color="gray.500">No data found</Text>
                    </Td>
                  </Tr>
                )
              }
            </Tbody>
          </Table>
        </TableContainer>

      </Box>
      <AddNewModal isOpen={isOpen} accountAuthToken={accountAuthToken} fetchData={fetchData} onClose={onClose} />
      <DeleteModal isOpenDeleteModal={isOpenDeleteModal} onDeleteModal={onDeleteModal} fetchData={fetchData} isDeleteUserData={isDeleteUserData} accountAuthToken={accountAuthToken} />
    </Box>
  );
};
