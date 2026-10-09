import React, { useEffect, useState } from 'react';
import {
  Box,
  Avatar,
  Text,
  Button,
  Input,
  IconButton, Radio, RadioGroup,
  useColorModeValue,
  Table,
  Tbody,
  Tr,
  Th,
  Icon,
  Td,
  Progress,
  VStack,
  Flex,
  Heading,
  Image,
  SimpleGrid,
  Spinner,
  Link as ChakraLink,
  HStack,
  useToast,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalFooter,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  Stack,
  ListItem,
  Thead,
  List,
  TableContainer,
} from '@chakra-ui/react';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
} from "@chakra-ui/react";
import nookies from 'nookies';
import { useRef } from "react";
import { useForm } from 'react-hook-form';
import { setOpenAiApiKey } from '../../services/openAiApiKey';
import { format } from 'date-fns';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { getProfileRequest } from '../../redux/actions/globalActions';
import { callApi } from '../../services/callApi';
import GdprTimeline from './GdprTimeline';
import { MdRestore } from 'react-icons/md';
import PricingSection from './PricingSection';
import { useHistory } from 'react-router-dom';
import { GoInfo } from 'react-icons/go';
import { FaBriefcase, FaCrown, FaGem, FaRocket } from 'react-icons/fa';
import { WarningIcon } from '@phosphor-icons/react';
import { InvoicesTable } from './InvoicesTable';

type ActionPayload = {
  amount: string;
  plan: string;
};

const instruction = `<strong>Generate OpenAI API Key</strong>
1. <a href="https://platform.openai.com/signup" style="color:#2977FF" target="_blank" rel="noopener noreferrer">Sign up / Log in to OpenAI</a>.
2. Go to the <a href="https://platform.openai.com/api-keys" style="color:#2977FF" target="_blank" rel="noopener noreferrer">API Keys page</a>.
3. Click <strong>"Create new secret key"</strong>.
4. Enter a name for your key (optional but recommended).
5. Click <strong>Create</strong> → Copy the generated API key immediately.
6. ⚠️ Do not expose the API key in frontend code or public repositories.
7. You're ready to integrate OpenAI API into your application 
`;
export const MyProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const toast = useToast();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isPopoverOpen2, setIsPopoverOpen2] = useState(false);
  const history = useHistory()
  const cancelRef = useRef<HTMLButtonElement>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaveSubmitting, setSaveIsSubmitting] = useState(false);
  const [isRvSubmitting, setIsRvSubmitting] = useState(false);
  const [isItemSeleted, setItemData] = useState<any>({});
  const cookies = nookies.get(null);
  const token = cookies.accesstoken;
  // console.log("Token:", token);
  const userProfile = useSelector((state: any) => state.user?.profile) || {}

  const isloading = useSelector((state: any) => state.user) || {}
  const dispatch = useDispatch();
  React.useEffect(() => {
    // if (!userProfile.name) {
    dispatch(getProfileRequest())
    // }
  }, [])

  const activePlanName = userProfile?.activeSubscription;

  const recoverAccount = async () => {
    try {
      setIsRvSubmitting(true)
      const response = await callApi("/user/recoveraccount", "get", "")
      // console.log(response);
      toast({
        title: `${response?.message}`,
        status: "success",
        isClosable: true,
      })
      dispatch(getProfileRequest())
      setIsRvSubmitting(false)

    } catch (error: any) {
      setIsRvSubmitting(false)
      // console.log(error);
      toast({
        title: `${error?.response?.data?.message}` || error.message,
        status: "success",
        isClosable: true,
      })
    }
  }

  const [deleting, setDeleting] = useState(false)
  const [isAddLoading, setisAddLoading] = useState<string | null>(null)

  const [limitType, setLimitType] = useState(userProfile?.limitType || "Value");
  const [limitValue, setLimitValue] = useState(userProfile?.limitValue || 0);
  const [error, setError] = useState("");
  useEffect(() => {
    if (userProfile) {
      setLimitType(userProfile.limitType);
      setLimitValue(userProfile.limitValue);
    }
  }, [userProfile]);
  const confirmDelete = async () => {
    // Handle account deletion logic here
    try {
      setDeleting(true)
      const response = await callApi("user/delete", "DELETE", null);
      setItemData({})
      if (response?.statusCode === 200) {
        toast({
          title: `${response?.message}`,
          status: "success",
          isClosable: true,
        })
        // additional logic like redirecting to homepage or logout can be added here
      }
      setDeleting(false)

      dispatch(getProfileRequest())
    } catch (error: any) {
      setDeleting(false)

      toast({
        title: `${error?.response?.data?.message}` || error.message,
        status: "success",
        isClosable: true,
      })
    }
  }

  const bgColor = useColorModeValue("gray.50", "gray.900");
  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };
  const { register, handleSubmit, formState: { errors } } = useForm();
  const onSubmit = async (data: any) => {
    const submittedData = {
      ...data, useOwnKey: true, limitType,
      limitValue: limitValue || 0
    }
    if (limitType && !limitValue) {
      setError("Value is required when limit type is selected.")
      return
    }
    try {
      setSaveIsSubmitting(true);
      const response = await setOpenAiApiKey(submittedData);
      if (response?.data?.statusCode === 200) {
        dispatch(getProfileRequest())
        handleEditToggle();
        setError("")
        toast({
          title: "Profile data has been updated successfully" || `${response?.data?.message}`,
          status: "success",
          isClosable: true,
        })

      } else {
        toast({
          title: `${response?.data?.message}`,
          status: "error",
          isClosable: true,
        })
      }

    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}` || error.message,
        status: "error",
        isClosable: true,
      });

    } finally {
      setSaveIsSubmitting(false);
    }
  };

  const formatToK = (value: number) => {
    if (value >= 1000) {
      return `${value / 1000}K`;
    }
    return value.toString();
  };
  // 21-VS
  // const maskKey = (key?: string) => {
  //   if (!key) return "";

  //   const visibleStart = key.slice(0, 4);
  //   const visibleEnd = key.slice(-4);
  //   const maskedLength = key.length - 8;

  //   return `${visibleStart}${"X".repeat(maskedLength)}${visibleEnd}`;
  // };

  const maskKey = (key?: string) => {
    if (!key) return "";

    if (key.length <= 20) return key;

    const start = key.slice(0, 5);
    const end = key.slice(-8);

    return `${start}XXXXXX...${end}`;
  };

  const topUpPlan = async (payload: ActionPayload) => {
    setisAddLoading(payload?.plan)
    try {
      const response = await callApi("lemon/create-topup-checkout", "post", payload)
      // console.log("response", response);
      if (response?.checkoutUrl) {
        if ((window as any).LemonSqueezy) {
          (window as any).LemonSqueezy.Url.Open(response.checkoutUrl + "&embed=1");
        }
      } else {
        // throw new Error("Checkout URL not received");
        toast({
          title: "Checkout URL not received",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
      dispatch(getProfileRequest())
      setIsSubmitting(false)
      setisAddLoading("")
    } catch (error) {
      setisAddLoading("")
      setIsSubmitting(false)
      // console.log(error);
    }
  }

  const cancelPlan = async () => {
    setIsSubmitting(true)
    try {
      const response = await callApi("/lemon/cancel-subscription", "patch", "")
      toast({
        title: response?.message || response?.data?.message || "Success",
        status: "success"
      })
      dispatch(getProfileRequest())
      onClose()
      setIsSubmitting(false)
    } catch (error: any) {
      toast({
        title: error?.response?.data?.message || error?.message,
        status: "error"
      })
      setIsSubmitting(false)
      // console.log(error);
    }
  }

  const statusConfig = {
    active: {
      label: "Active",
      bg: "green.100",
      color: "green.700",
    },
    cancelled: {
      label: "Cancelled",
      bg: "red.100",
      color: "red.700",
    },
  };

  const status = userProfile?.subscriptionData?.status == "active" ? "active" : "cancelled";
  const { label, bg, color } = statusConfig[status];

  return (
    <Box
      w="100%"
      p="6"
      shadow="sm"
      h="100%"
      overflow="auto"

    >
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent borderRadius="lg">
            <AlertDialogHeader fontSize="lg" fontWeight="semibold">
              Cancel Subscription
            </AlertDialogHeader>

            <AlertDialogBody color="gray.600">
              Are you sure you want to cancel your subscription?
              <br />
              This will stop future billing, and you may lose access to premium
              features at the end of your current billing cycle.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose} fontWeight={500}>
                Keep Subscription
              </Button>
              <Button
                colorScheme="red"
                ml={3}
                isLoading={isSubmitting}
                onClick={cancelPlan}
                fontWeight={500}
              >
                Yes, Cancel Subscription
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {
        isloading.loading ?
          <VStack w="100%" h="100%" display="flex" alignItems="center" justifyContent="center">
            <Spinner />
          </VStack>
          : <React.Fragment>
            <VStack w="100%" spacing="10" display={"flex"} justifyContent={"start"} marginBottom="24px" marginTop="24px">
              <Flex w="100%" justifyContent="space-between" alignItems={"center"}>
                <Box>
                  <Heading fontSize="24px" color="#1A202C">My Profile</Heading>
                </Box>
                <Flex gap="10px">
                  <Tooltip label="Recover Acount" fontSize={"11px"} aria-label="A tooltip">
                    <Button
                      onClick={() => {
                        recoverAccount()
                      }}
                      disabled={!userProfile?.gdpr?.isDeleted}
                      isLoading={isRvSubmitting}
                      colorScheme="green" >
                      <MdRestore />

                    </Button>
                  </Tooltip>
                  <Tooltip label="Delete Account" fontSize={"11px"} aria-label="A tooltip">
                    <Button
                      // bg={"red.600"}
                      colorScheme='red'
                      disabled={userProfile?.gdpr?.isDeleted}
                      onClick={() => setItemData({ id: "sadf" })}
                    >
                      <img src="/icons/delete.svg" alt="delete" />
                    </Button>
                  </Tooltip>

                  {isEditing ? <>
                    <Tooltip label="Cancel" fontSize={"11px"} aria-label="A tooltip">
                      <Button type="button"
                        colorScheme="gray"
                        onClick={() => {
                          setIsEditing(false)
                        }}>
                        <Image src='/icons/ic-close.svg' alt='save changes' />
                        {/* Cancel */}
                      </Button>
                    </Tooltip>
                    <Tooltip label="Save" fontSize={"11px"} aria-label="A tooltip">
                      <Button type="button" colorScheme="blue" isLoading={isSaveSubmitting} onClick={handleSubmit(onSubmit)}>
                        <Image src='/icons/save.svg' alt='save changes' />
                      </Button>

                    </Tooltip>
                  </>
                    :
                    <Tooltip label="Edit Profile" fontSize={"11px"} aria-label="A tooltip">

                      <Button size='md' colorScheme="blue" className="btn-hover-pri" onClick={handleEditToggle}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fill-rule="evenodd" clip-rule="evenodd" d="M12.1492 0.131757C12.1957 0.0851938 12.2508 0.048251 12.3116 0.0230445C12.3723 -0.00216192 12.4375 -0.0151367 12.5032 -0.0151367C12.569 -0.0151367 12.6341 -0.00216192 12.6949 0.0230445C12.7556 0.048251 12.8108 0.0851938 12.8572 0.131757L15.8572 3.13176C15.9038 3.1782 15.9407 3.23338 15.9659 3.29412C15.9911 3.35487 16.0041 3.41999 16.0041 3.48576C16.0041 3.55152 15.9911 3.61665 15.9659 3.67739C15.9407 3.73814 15.9038 3.79331 15.8572 3.83976L5.85722 13.8398C5.80924 13.8874 5.75209 13.9248 5.68922 13.9498L0.689224 15.9498C0.59836 15.9861 0.49882 15.995 0.402944 15.9754C0.307067 15.9557 0.219071 15.9083 0.149865 15.8391C0.0806583 15.7699 0.0332848 15.6819 0.0136173 15.586C-0.00605013 15.4902 0.00285338 15.3906 0.039224 15.2998L2.03922 10.2998C2.06415 10.2369 2.10157 10.1797 2.14922 10.1318L12.1492 0.131757ZM11.2102 2.48576L13.5032 4.77876L14.7962 3.48576L12.5032 1.19276L11.2102 2.48576ZM12.7962 5.48576L10.5032 3.19276L4.00322 9.69276V9.98576H4.50322C4.63583 9.98576 4.76301 10.0384 4.85678 10.1322C4.95055 10.226 5.00322 10.3531 5.00322 10.4858V10.9858H5.50322C5.63583 10.9858 5.76301 11.0384 5.85678 11.1322C5.95055 11.226 6.00322 11.3531 6.00322 11.4858V11.9858H6.29622L12.7962 5.48576ZM3.03522 10.6608L2.92922 10.7668L1.40122 14.5878L5.22222 13.0598L5.32822 12.9538C5.23284 12.9181 5.15062 12.8542 5.09254 12.7706C5.03446 12.6869 5.0033 12.5876 5.00322 12.4858V11.9858H4.50322C4.37062 11.9858 4.24344 11.9331 4.14967 11.8393C4.0559 11.7455 4.00322 11.6184 4.00322 11.4858V10.9858H3.50322C3.4014 10.9857 3.30203 10.9545 3.2184 10.8964C3.13477 10.8384 3.07086 10.7561 3.03522 10.6608Z" fill="white" />
                        </svg>

                        {/* <Text as="span" marginLeft="8px">Edit Profile</Text> */}
                      </Button>
                    </Tooltip>

                  }
                </Flex>
              </Flex>
              {
                userProfile?.gdpr?.isDeleted &&
                <Box width={"100%"}>
                  <GdprTimeline gdpr={userProfile?.gdpr} />
                </Box>
              }
            </VStack>
            <Box
              borderWidth="1px"
              borderRadius="lg"
              overflow="hidden"
              p="6"
              boxShadow="md"
              bg={"#fff"}
              display="flex"
              flexDirection={{ base: 'column', md: 'row' }}
            >
              <Box pr={8} mb={{ base: 4, md: 0 }} textAlign="center" flex="1">
                <Box mb="19px" display="flex"
                  alignItems="center"
                  position={"relative"}
                  justifyContent="center">

                  <Image
                    src={userProfile === undefined ? null : userProfile.avatarUrl}
                    height="120px"
                    width="120px"
                    borderRadius="100px"
                  />

                </Box>
                {/* 
                <Text fontSize="14px" color="#1A202C" mb="6px" fontWeight="500" colorScheme="#1A202C">
                  {userProfile.activeSubscription ? userProfile.activeSubscription?.toLocaleString() + " " + userProfile?.subscriptionData?.BillingCycle + " PLAN" : "No Active Plan"}
                </Text> */}
                <HStack spacing="6px" align="center" justify={"center"} mb="6px">
                  {
                    activePlanName?.toLowerCase() === "pro"
                      ? <FaCrown size={"18px"} color='#F6AD55' />      // gold crown
                      : activePlanName?.toLowerCase() === "ultimate"
                        ? <FaGem size={"18px"} color='#1A202C' />      // purple gem
                        : activePlanName?.toLowerCase() === "agency"
                          ? <FaBriefcase size={"18px"} color="#3182CE" />      // blue briefcase
                          : <FaRocket size={"18px"} color="#38A169" />      // green rocket (starter)
                  }

                  <Text fontSize="14px" fontWeight="700" color="#1A202C" >
                    {activePlanName
                      ? `${activePlanName.charAt(0).toUpperCase()}${activePlanName.slice(1).toLowerCase()} ${userProfile?.subscriptionData?.BillingCycle?.charAt(0).toUpperCase()}${userProfile?.subscriptionData?.BillingCycle?.slice(1).toLowerCase()} Plan`
                      : "No Active Plan"}
                  </Text>
                </HStack>
                <Box display={"flex"} alignItems="center" justifyContent={"center"} gap="4px" mb="4px" flexWrap="wrap">
                  <Text fontSize="12px" fontWeight="500" whiteSpace="nowrap">
                    Status:
                  </Text>
                  <Box
                    my="10px"
                    display="inline-flex"
                    alignItems="center"
                    px="10px"
                    py="4px"
                    borderRadius="full"
                    bg={bg}
                  >

                    <Text fontSize="12px" fontWeight="500" color={color}>
                      {label}
                    </Text>
                  </Box>
                </Box>
                <Box>
                  <Box display={"flex"} flexWrap="wrap" alignItems="center" justifyContent={"center"} gap="4px" mb="6px">
                    <Text fontSize={{ base: "14px", sm: "16px" }} fontWeight="500" whiteSpace="nowrap">
                      Credit:
                    </Text>
                    <Box whiteSpace="nowrap">
                      <Text as="span" fontWeight="bold">
                        {formatToK(userProfile?.subscriptionData?.balanceAfterUsage || 0)}
                      </Text>
                      /
                      <span style={{ color: "#6C757D" }}>
                        {formatToK(userProfile?.tokenCredits || 0)}
                      </span>
                    </Box>
                  </Box>

                  <Box position="relative" display="inline-block" width="75%" marginTop="14px" height="14px">
                    {userProfile?.tokenCredits && userProfile?.subscriptionData?.balanceAfterUsage ? (
                      (() => {
                        const usage = ((Number(userProfile.tokenCredits || 0) - Number(userProfile.subscriptionData.balanceAfterUsage || 0)) / Number(userProfile.tokenCredits || 0)) * 100
                        return (
                          <>
                            <Progress value={usage} colorScheme="blue" borderRadius="2px" height="14px" />
                            <Box
                              position="absolute"
                              top="0"
                              left="0"
                              height="100%"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                              fontSize="10px"
                              fontWeight="500"
                              color={usage >= 20 ? "#fff" : "#000"}
                              w={usage >= 20 ? `${usage}%` : `${100}%`}
                            >
                              {usage.toFixed(2)}%
                            </Box>
                          </>
                        );
                      })()
                    ) : (
                      <>
                        <Progress value={0} colorScheme="blue" borderRadius="2px" />
                        <Box
                          position="absolute"
                          top="0"
                          left="0"
                          height="100%"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          fontSize="10px"
                          fontWeight="500"
                          color={0 >= 20 ? "#fff" : "#000"}
                          w={0 >= 20 ? `${0}%` : `${100}%`}
                        >
                          {0}%
                        </Box></>
                    )}
                  </Box>

                  <VStack spacing={3} mt={"30px"} align="stretch">
                    <Button
                      bg="green.600"
                      color="white"
                      _hover={{ bg: "green.700" }}
                      onClick={() => {
                        history.push("/pricing-plan", {
                          data: {
                            type: userProfile?.subscriptionData?.status == "active" ? "upgrade" : "newplan",
                            ...userProfile?.subscriptionData,
                            email: userProfile?.email,
                            token: token,
                          }
                        })
                      }}
                      borderRadius="md"
                      fontWeight="500"
                    >
                      {
                        userProfile?.subscriptionData?.status == "active" ? " Upgrade Plan" :
                          "Purchase New"
                      }

                    </Button>
                    {
                      userProfile?.subscriptionData?.status == "active" ?
                        <Button
                          textAlign="center"
                          isLoading={isSubmitting}
                          onClick={onOpen}
                          bg={"transparent"}
                          fontSize="14px"
                          color="red.500"
                          cursor="pointer"
                          _hover={{ textDecoration: "underline" }}
                        >
                          Cancel Subscription
                        </Button>
                        :
                        <Text color={"red.400"} fontSize={"small"}>
                          Subscription End on {userProfile?.subscriptionData?.endsAt && format(new Date(userProfile?.subscriptionData?.endsAt || ""), 'dd/MM/yyyy, hh:mm a')}
                        </Text>
                    }
                  </VStack>

                </Box>

              </Box>
              <Box width="1px" bg="#E5E7EB" mx={8} />

              <Box flex="1 1 50%">
                <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                  <Table sx={{ tableLayout: "fixed" }} variant="simple" size="sm">
                    <Tbody className='profileEdit' style={{ border: "2px solid #E5E7EB" }}>

                      <Tr>
                        <Th fontSize={"16px!important"} fontWeight={"400!important"} color={"#6C757D!important"} width="250px" >Name</Th>
                        <Td>
                          <Box>
                            {
                              isEditing ?
                                <Input
                                  type="text"
                                  id='name'
                                  maxLength={30}
                                  defaultValue={userProfile?.name || ""}
                                  placeholder="Enter your name"
                                  {...register('name', {
                                    required: 'Name is required',
                                  })}
                                /> :
                                <Text fontSize={"16px!important"} fontWeight={"400!important"} color={"#6C757D!important"} >{userProfile?.name || "NA"}</Text>
                            }
                            <p style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>{errors.name && errors.name.message}</p>

                          </Box>
                        </Td>
                      </Tr>
                      <Tr>
                        <Th fontSize={"16px!important"} fontWeight={"400!important"} color={"#6C757D!important"} width="250px">Email</Th>
                        <Td>
                          <Text fontSize={"16px!important"} fontWeight={"400!important"} color={"#6C757D!important"} >
                            {userProfile === undefined ? null : userProfile.email}
                          </Text>
                        </Td>
                      </Tr>
                      {/* <Tr>
                        <Th fontSize={"16px!important"} fontWeight={"400!important"} color={"#6C757D!important"} width="250px">Role</Th>
                        <Td>
                          <Text fontSize={"16px!important"} fontWeight={"400!important"} color={"#6C757D!important"} >
                            {userProfile === undefined ? null : userProfile.role}
                          </Text>
                        </Td>
                      </Tr> */}
                      <Tr>
                        <Th fontSize={"16px!important"} fontWeight={"400!important"} color={"#6C757D!important"} width="250px">Joined On</Th>
                        <Td>
                          <Text fontSize={"16px!important"} fontWeight={"400!important"} color={"#6C757D!important"} >
                            {userProfile === undefined ? null : format(new Date(userProfile?.createdAt), 'dd/MM/yyyy, hh:mm a')}
                          </Text>
                        </Td>
                      </Tr>
                      <Tr>
                        <Th color={"#6C757D"} width="250px" >
                          <Box display={"flex"} fontSize={"16px"} fontWeight={"400"} color={"#6C757D"} gap="4px" alignItems="center">
                            OpenAI API Key
                            <Popover placement="top" isOpen={isPopoverOpen} onClose={() => setIsPopoverOpen(false)}>
                              <PopoverTrigger>
                                <Box
                                  cursor="pointer"
                                  as="span"
                                  onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                                >
                                  <GoInfo size={"16px"} color="#6C757D" />
                                </Box>
                              </PopoverTrigger>
                              <PopoverContent

                                bg="#fff"
                                fontWeight={400}
                                color="#333"
                                p={4}
                                width="400px"
                                fontSize="14px"
                                border="1px solid #ccc"
                                lineHeight="20px"
                                style={{ boxShadow: 'rgba(12, 12, 13, 0.05) 0px 1px 4px 0px' }}
                                borderRadius="4px"
                              >
                                <PopoverArrow bg="#fff" transform="scale(1.5)" />
                                <Box whiteSpace="pre-wrap" lineHeight={"28px"} dangerouslySetInnerHTML={{ __html: instruction }}></Box>
                              </PopoverContent>
                            </Popover>
                          </Box>
                        </Th>
                        <Td>
                          {isEditing ? (<>

                            <Input
                              type="text"
                              id='apiKey'
                              // 21-VS
                              // check changes
                              // defaultValue={userProfile?.openaiKeys?.apiKey}
                              defaultValue={maskKey(userProfile?.openaiKeys?.apiKey)}
                              placeholder="Enter API Key"
                              {...register('apiKey', {
                                // required: 'Open AI API Key is required',
                                pattern: {
                                  value: /^sk-.*/, // Example regex for OpenAI API key
                                  message: 'Invalid Open AI API Key format',
                                },
                              })}
                            />
                            {/* <Button type="submit" colorScheme="purple" disabled={isSubmitting}>
                              Save
                            </Button> */}
                            {/* </form> */}
                            {
                              !userProfile?.openaiKeys?.apiKey &&
                              <p style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>Open AI API Key is required</p>
                            }

                            <p style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>{errors.apiKey && errors.apiKey.message}</p>
                          </>) : (
                            <>
                              <Text fontSize={"16px!important"} fontWeight={"400!important"} color={"#6C757D!important"} >
                                {/* {userProfile?.openaiKeys?.apiKey} */}
                                {/* 21-VS */}
                                {/* {maskKey(userProfile?.openaiKeys?.apiKey?.substring(0, 50))} */}
                                {maskKey(userProfile?.openaiKeys?.apiKey)}
                              </Text>
                              {
                                !userProfile?.openaiKeys?.apiKey &&
                                <p style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>Open AI API Key is required</p>
                              }
                            </>

                          )}
                        </Td>
                      </Tr>
                      <Tr>
                        <Th color={"#6C757D"} width="250px" >
                          <Box display={"flex"} fontSize={"16px"} fontWeight={"400"} color={"#6C757D"} gap="4px" alignItems="center">
                            Threshold Alert
                            <Popover placement="top" isOpen={isPopoverOpen2} onClose={() => setIsPopoverOpen2(false)}>
                              <PopoverTrigger>
                                <Box
                                  cursor="pointer"
                                  as="span"
                                  onClick={() => setIsPopoverOpen2(!isPopoverOpen2)}
                                >
                                  <GoInfo size={"16px"} color="#6C757D" />
                                </Box>
                              </PopoverTrigger>
                              <PopoverContent

                                bg="#fff"
                                fontWeight={400}
                                color="#333"
                                p={4}
                                width="400px"
                                fontSize="14px"
                                border="1px solid #ccc"
                                lineHeight="20px"
                                style={{ boxShadow: 'rgba(12, 12, 13, 0.05) 0px 1px 4px 0px' }}
                                borderRadius="4px"
                              >
                                <PopoverArrow bg="#fff" transform="scale(1.5)" />
                                <Box>
                                  {/* Title */}
                                  <Text fontSize="18px" fontWeight="600" mb="6px">
                                    Set a Personal Credit Threshold
                                  </Text>

                                  {/* Description */}
                                  <Text fontSize="14px" color="gray.600" mb="12px">
                                    Avoid campaign interruptions by configuring a personal credit alert threshold.
                                  </Text>

                                  {/* How It Works */}
                                  <Text fontSize="14px" fontWeight="600" mb="6px">
                                    How It Works
                                  </Text>

                                  <List spacing={2} pl="16px" styleType="disc" mb="12px">
                                    <ListItem fontSize="14px" color="gray.700">
                                      Receive an alert when your available credits drop below a specific value (e.g.,{" "}
                                      <Text as="span" fontWeight="600">
                                        500
                                      </Text>{" "}
                                      or{" "}
                                      <Text as="span" fontWeight="600">
                                        1,000 credits
                                      </Text>
                                      ).
                                    </ListItem>

                                    <ListItem fontSize="14px" color="gray.700">
                                      You can also set alerts based on a percentage of your total credit limit (e.g.,{" "}
                                      <Text as="span" fontWeight="600">
                                        2%
                                      </Text>
                                      ).
                                    </ListItem>
                                  </List>

                                  {/* Important Limits */}
                                  <Text fontSize="14px" fontWeight="600" mb="6px">
                                    Important Limits
                                  </Text>

                                  <List spacing={2} pl="16px" styleType="disc" mb="12px">
                                    <ListItem fontSize="14px" color="gray.700">
                                      The threshold value cannot exceed{" "}
                                      <Text as="span" fontWeight="600">
                                        50%
                                      </Text>{" "}
                                      of your total credit limit.
                                    </ListItem>

                                    <ListItem fontSize="14px" color="gray.700">
                                      The maximum threshold you can set is{" "}
                                      <Text as="span" fontWeight="600">
                                        2,000 credits
                                      </Text>
                                      .
                                    </ListItem>
                                  </List>

                                  {/* Footer Note */}
                                  <Text fontSize="14px" color="gray.600">
                                    Set your threshold wisely to ensure uninterrupted service and timely recharges.
                                  </Text>
                                </Box>
                              </PopoverContent>
                            </Popover>
                          </Box>
                        </Th>
                        <Td>
                          <Box display="flex" alignItems="center" gap={2}>

                            <RadioGroup
                              value={limitType}
                              onChange={(val) => {
                                if (val == "Percentage") {

                                  if (userProfile?.limitType == "Percentage") {
                                    setLimitValue(userProfile?.limitValue || 0)
                                  } else {
                                    setLimitValue(0)
                                  }
                                } else {
                                  // console.log("userProfile?.limitValue", userProfile?.limitValue, userProfile?.limitType, limitType);

                                  if (userProfile?.limitType == "Value") {
                                    setLimitValue(userProfile?.limitValue || 0)
                                  } else {
                                    setLimitValue(0)
                                  }

                                }
                                // setLimitValue(userProfile?.limitValue)
                                setError("");
                                setLimitType(val)

                              }}
                              isDisabled={!isEditing}
                            >
                              <Stack direction="row" spacing={4}>
                                <Radio value="Value">
                                  <Text as="span" fontSize="14px">Value</Text>
                                </Radio>

                                <Radio value="Percentage">
                                  <Text as="span" fontSize="14px">Percentage</Text>
                                </Radio>
                              </Stack>
                            </RadioGroup>

                            <Input
                              type="number"
                              size="sm"
                              placeholder={`Enter value ${limitType === "Percentage" ? "upto 50%" : "upto " + (userProfile?.subscriptionData?.balanceAfterUsage || 0) * 0.5}`}
                              border="1px solid #E2E8F0"
                              value={limitValue || ""}
                              disabled={!isEditing}
                              min={10}
                              isDisabled={userProfile?.subscriptionData?.balanceAfterUsage === 0}
                              onChange={(e) => {
                                let value: any = Number(e.target.value);

                                // ✅ Validation for Percentage
                                // in case of  value user can enter maximun value of 50 % of userProfile?.tokenCredits
                                if (value == "") {
                                  setLimitType("")
                                  setError("");
                                } else {
                                  if (limitType == "") {
                                    setLimitType("Value")
                                    setError("");
                                  }
                                }
                                if (limitType === "Percentage" && value > 50) {
                                  value = 50;
                                  setError(`Max allowed: 50`);
                                }
                                // if (value <= 1000) {
                                //   setLimitValue(value);
                                // }
                                if (limitType === "Value") {
                                  const maxAllowed = (userProfile?.subscriptionData?.balanceAfterUsage || 0) * 0.5;
                                  // const maxAllowed = (userProfile?.tokenCredits || 0) * 0.5;

                                  if (value > maxAllowed) {
                                    setError(`Max allowed: ${maxAllowed} (50% of remaining credits).`);
                                    return;
                                  } else {
                                    setError("");
                                  }
                                }

                                setLimitValue(value);

                              }}

                              style={{
                                border: "1px solid #E2E8F0",
                                borderRadius: "4px",
                                padding: "4px 8px",
                                width: "250px"
                              }}
                            />
                            <Button
                              colorScheme='blue'
                              size="sm"
                              minW={"50px"}
                              fontSize={"14px"}
                              fontWeight={"500"}
                              disabled={!isEditing || !limitType}
                              height={"30px"}
                              onClick={() => {
                                setLimitValue(0);
                                setLimitType("");
                                setError("");
                              }}
                            >
                              Reset
                            </Button>
                          </Box>
                          {error && (
                            <Text color="red.500" fontSize="12px" mt="1">
                              {error}
                            </Text>
                          )}
                        </Td>
                      </Tr>
                      {
                        !userProfile?.openaiKeys?.apiKey &&
                        <Tr>
                          <Td colSpan={2}>

                            <Box
                              border="1px solid #F6C453"
                              bg="#FFF7E6"
                              borderRadius="6px"
                              p="12px 16px"
                            >
                              <Flex align="center" gap="10px">
                                <WarningIcon color="#F6C453" size="30px" />
                                <Text fontSize="14px" color="#4A5568">
                                  <Text as="span" fontWeight="600">
                                    You cannot access tool features without entering a paid OpenAI API key.
                                  </Text>{" "}
                                  Please enter your key above to activate all features of this tool.
                                </Text>
                              </Flex>
                            </Box>
                          </Td>
                        </Tr>
                      }
                    </Tbody>
                  </Table>
                </form>
              </Box>
            </Box>
            <InvoicesTable viewAllBtn={true} />
            {
              userProfile?.subscriptionData?.status == "active" &&
              <Box mt={"20px"}>
                <PricingSection isAddLoading={isAddLoading} handleAction={topUpPlan} />
              </Box>
            }
          </React.Fragment>
      }
      <Modal
        isCentered
        onClose={() => {
          setItemData({})
        }}
        isOpen={isItemSeleted?.id ? true : false}
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
              <Image src={"/icons/error.svg"} alt='deleteicon' w="56px" h="56px" />
              <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" mb="8px" mt="24px">{"Are you sure?"}</Text>
              <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D">{"You want to Delete your account?"}</Text>
            </Box>

          </ModalBody>
          <ModalFooter>
            <Button colorScheme="red" mr={3} onClick={() => {
              setItemData({})
            }}
            >
              <Text as="span" ms="4px" fontSize="16px" fontWeight="500">Cancel</Text>
            </Button>
            <Button colorScheme="blue" mr={3}
              isLoading={deleting}
              onClick={() => {
                confirmDelete()
              }}
              fontWeight="500"
            >
              Confirm
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box >
  );
};

