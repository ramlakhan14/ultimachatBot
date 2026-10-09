import React, { useEffect, useState } from 'react';
import {
  Box,
  Avatar,
  Text,
  Button,
  Input,
  IconButton,
  useColorModeValue,
  Table,
  Tbody,
  Tr,
  Th,
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
  AlertDialogOverlay,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
} from '@chakra-ui/react';
import { FaBriefcase, FaCrown, FaGem, FaRocket } from 'react-icons/fa';

import { MediaListItem } from '../../components/MediaListItem/MediaListItem';
import { deleteKnowledgebase, fetchKnowledgebases, generateEmbeddings, userProfilePreview, adminDeleteUser } from '../../services/knowledgebaseService';
import { NoDataSubscribeIcon } from '../../components/Icons/noData/NoDataSubscribeIcon';
import { Link, useHistory } from 'react-router-dom';
import { NoDataProjectIcon } from '../../components/Icons/noData/NoDataProjectIcon';
import { CurrentUser, User } from '../../services/appConfig';
import { useParams } from "react-router-dom";
import { formatNumber } from "../../utils/commonUtils";
import JoningOnFormate from '../../utils/JoningOnFormate';
let PAID_ONLY = false;




export const UserProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const { userId } = useParams<any>();
  const [profile, setProfile] = useState({
    name: 'Luisa Ashley',
    email: 'luisa.ashley.123@gmail.com',
    project: '6',
    joinedOn: '12-06-2024, 21:06',
    apiKey: '',
  });
  const toast = useToast();
  const [chatbotsList, setChatBotList] = React.useState<any>();
  const [chatbotsLoaded, setChatbotsLoaded] = React.useState<boolean>(true);
  const [user, setUser] = React.useState<User>(CurrentUser.get());
  const [userProfile, setUserProfile] = React.useState<any>();
  const [isDeleteDialogOpens, setIsDeleteDialogOpens] = React.useState(false);
  const cancelRef = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    async function fetchData() {
      try {
        // setChatbotsLoaded(true);
        const userData = await userProfilePreview(userId);
        setChatbotsLoaded(false);
        setUserProfile(userData?.data);
        setChatBotList(userData?.data?.userProjects)
      } catch (error) {
        setChatbotsLoaded(false);

      } finally {
        setChatbotsLoaded(false);
      }
    }
    fetchData();
  }, [])

  const history = useHistory();
  const [createChatBotLoading, setCreateChatBotLoading] = React.useState<any>({});


  const onMenuItemClick = React.useCallback(
    async (type, chatbot) => {
      if (type === "edit") {
        history.push(`/app/edit-bot/${chatbot._id}/`);
      } else if (type === "getCode") {
        history.push(`/app/edit-bot/${chatbot._id}/?step=add-to-site`);
      } else if (type === "customize") {
        history.push(`/app/edit-bot/${chatbot._id}/?step=customize`);
      } else if (type === "delete") {
        await deleteKnowledgebase(chatbot._id as string);
        setChatBotList(chatbotsList?.filter((_chatbot: any) => _chatbot._id !== chatbot._id));
        toast({
          title: `Project has been deleted successfully `,
          status: "success",
          isClosable: true,
        });
      }
    },
    [history, chatbotsList, toast]
  );




  const getNoDataIcon = React.useCallback(() => {
    if (user && PAID_ONLY) {
      return <VStack
        alignItems="center"
        direction="column"
        justifyContent="center"
        w="100%"
        h="100%"
        pt={32}
        pb={32}
        spacing="9"
      >
        <NoDataSubscribeIcon width="auto" height="250px" />
        <Box textAlign="center">
          <Heading
            maxW="480px"
            fontSize="xl"
            fontWeight="500"
            as="h3"
            mb="4"
            color="gray.500"
            lineHeight="medium"
            textAlign="center"
          >
            Upgrade to a paid plan or purchase credits to create UltimaBot.
          </Heading>
          <HStack justify="center">
            <Link to="/app/settings/subscription">
              <Button fontWeight="500" colorScheme='blue' size='md'>Subscribe Now</Button>
            </Link>
            <ChakraLink href={'https://ultimabot.lemonsqueezy.com/buy/881a9491-5b7b-44e2-acdf-cdf2521fb1f4?embed=1&checkout[email]=' + user.email}
              isExternal >
              <Button variant='outline' colorScheme='blue' size='md'>Buy 50K tokens for $5</Button>
            </ChakraLink>
          </HStack>
        </Box>
      </VStack>
    }
    return (
      <VStack
        alignItems="center"
        direction="column"
        justifyContent="center"
        w="100%"
        h="100%"
        pt={25}
        // pb={32}
        spacing="9"
      >
        <NoDataProjectIcon width="auto" height="250px" />
        <Box textAlign="center">
          <Heading
            maxW="580px"
            fontSize="xl"
            fontWeight="500"
            as="h3"
            mb="4"
            color="gray.500"
            lineHeight="medium"
            textAlign="center"
          >
            Create an AI-powered ChatBot trained on your website content in minutes.

          </Heading>
        </Box>
      </VStack>
    );
  }, [user]);


  const createChatBot = React.useCallback(async (id) => {
    try {
      setCreateChatBotLoading({
        [id]: true
      });
      await generateEmbeddings(id);
      setCreateChatBotLoading({
        [id]: false
      })
    } catch (error) { }
  }, []);
  const activePlanName = userProfile?.activeSubscription;

  const [selectedImage, setSelectedImage] = useState<any>(
    "https://s3-alpha-sig.figma.com/img/a1e5/78bb/c7673caaa774054931cdb776a73ef689?Expires=1723420800&Key-Pair-Id=APKAQ4GOSFWCVNEHN3O4&Signature=eoHvFmIASKYmQiIWHsy58HIQFI6UsGIBTktY43YTw6mdNvb26te74mvT8VyhkUwruHjCcAioBryjsrome8vrFeWgyaZVrCi7egB5zk6yJIZOXQQ6I6i1yP-IAXWucEW9qdc2JV0da-tDFPWtj0voZxsTwqU4Yxv4bTxxJlb-Z3U7970rdnpgwJtonhpELlCz0PPNElEH~bRcGlFoEves3rPBmbtyxxDxONnnzF1Km~crhxLfqnwPXbm7cCzWdEDoD0DhCfj3Qds92yzVfvAHGEghqMPcyISGu2PyHwgupxk~CUCuRBHp2YgJoNDV5Sau1izC4-PRS9v2pfnQk3PgZw__"
  );

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancelDeletes = () => {
    setIsDeleteDialogOpens(false);
  };

  const deleteUser = () => {
    setIsDeleteDialogOpens(true);

  }

  const formatToK = (value: number) => {
    if (value >= 1000) {
      return `${value / 1000}k`;
    }
    return value.toString();
  };
  const handleConfirmDeletes = async () => {
    setIsDeleteDialogOpens(false);
    await adminDeleteUser(userProfile._id);
    history.push(`/app/users`);
  };

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
  const maskKey = (key?: string) => {
    if (!key) return "";

    const visibleStart = key.slice(0, 4);
    const visibleEnd = key.slice(-4);
    const maskedLength = key.length - 8;

    return `${visibleStart}${"X".repeat(maskedLength)}${visibleEnd}`;
  };


  // console.log("userProfile", userProfile)

  const getChatbotsList = React.useCallback(() => {

    if (!chatbotsList?.length) {
      return getNoDataIcon();
    }

    const chatbotListItems = chatbotsList?.map((chatbot: any) => {
      return (
        <MediaListItem
          showCustomizeMenu
          name={chatbot.name}
          usage={chatbot.monthUsage === undefined ? 0 : chatbot.monthUsage.count}
          // usage={chatbot.monthUsage.count}
          owner={chatbot.owner}
          updatedAt={chatbot.updatedAt}
          websiteData={chatbot.websiteData.websiteUrl}
          imageAlt={chatbot.name}
          showGetCodeMenu
          imageUrl={chatbot.imageUrl}
          description={chatbot.description}
          key={chatbot._id}
          showWarning={chatbot.status !== 'READY'}
          showPrimaryActionButton={chatbot.status !== 'READY'}
          actionButtonLeftIcon={null}
          isPrimaryButtonLoading={createChatBotLoading[chatbot._id] || chatbot.status === 'CRAWLING'}
          onPrimaryActionButtonClick={() => {
            createChatBot(chatbot._id)
          }}
          onMenuItemClick={(type) => {
            onMenuItemClick(type, chatbot);
          }}

        ></MediaListItem>
      );
    });
    return (
      <SimpleGrid columns={[1, 1, 1, 3]} spacing="6" templateColumns={{ lg: "repeat(3, minmax(0, 1fr))", sm: "repeat(1, minmax(0, 1fr))", md: "repeat(2, minmax(0, 1fr))" }}>
        {chatbotListItems}
      </SimpleGrid>
    );
  }, [createChatBot, createChatBotLoading, chatbotsList, chatbotsLoaded, getNoDataIcon, onMenuItemClick]);

  // console.log("userProfile", userProfile)
  return (
    <Box
      w="100%"
      p="6"
      shadow="sm"
      h="100%"
      overflow="auto"
    >
      <Box>
        <Text as="span" fontSize="16px" fontWeight="400"><Link to={`/app/users`}><Text as="span" color="#2977FF" textDecoration="underline">Users</Text></Link>  / <Text as="span" color="#6C757D">Profile</Text></Text>
      </Box>
      <VStack w="100%" spacing="10" marginBottom="24px" marginTop="24px">
        <Flex w="100%" justifyContent="space-between">

          <Box>
            <Heading fontSize="30" color="#1A202C">Profile Preview</Heading>
          </Box>
          <Flex>
            {userProfile?.isActive == 2 ? null : <Button color={"white"} backgroundColor={'#DC3545'} className="btn-hover-red" marginRight="12px" onClick={deleteUser}>
              <svg width="16" height="100%" viewBox="0 0 14 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.5 5.5C4.63261 5.5 4.75979 5.55268 4.85355 5.64645C4.94732 5.74021 5 5.86739 5 6V12C5 12.1326 4.94732 12.2598 4.85355 12.3536C4.75979 12.4473 4.63261 12.5 4.5 12.5C4.36739 12.5 4.24021 12.4473 4.14645 12.3536C4.05268 12.2598 4 12.1326 4 12V6C4 5.86739 4.05268 5.74021 4.14645 5.64645C4.24021 5.55268 4.36739 5.5 4.5 5.5ZM7 5.5C7.13261 5.5 7.25979 5.55268 7.35355 5.64645C7.44732 5.74021 7.5 5.86739 7.5 6V12C7.5 12.1326 7.44732 12.2598 7.35355 12.3536C7.25979 12.4473 7.13261 12.5 7 12.5C6.86739 12.5 6.74021 12.4473 6.64645 12.3536C6.55268 12.2598 6.5 12.1326 6.5 12V6C6.5 5.86739 6.55268 5.74021 6.64645 5.64645C6.74021 5.55268 6.86739 5.5 7 5.5ZM10 6C10 5.86739 9.94732 5.74021 9.85355 5.64645C9.75979 5.55268 9.63261 5.5 9.5 5.5C9.36739 5.5 9.24021 5.55268 9.14645 5.64645C9.05268 5.74021 9 5.86739 9 6V12C9 12.1326 9.05268 12.2598 9.14645 12.3536C9.24021 12.4473 9.36739 12.5 9.5 12.5C9.63261 12.5 9.75979 12.4473 9.85355 12.3536C9.94732 12.2598 10 12.1326 10 12V6Z" fill="#fff" />
                <path fill-rule="evenodd" clip-rule="evenodd" d="M13.5 3C13.5 3.26522 13.3946 3.51957 13.2071 3.70711C13.0196 3.89464 12.7652 4 12.5 4H12V13C12 13.5304 11.7893 14.0391 11.4142 14.4142C11.0391 14.7893 10.5304 15 10 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4H1.5C1.23478 4 0.98043 3.89464 0.792893 3.70711C0.605357 3.51957 0.5 3.26522 0.5 3V2C0.5 1.73478 0.605357 1.48043 0.792893 1.29289C0.98043 1.10536 1.23478 1 1.5 1H5C5 0.734784 5.10536 0.48043 5.29289 0.292893C5.48043 0.105357 5.73478 0 6 0H8C8.26522 0 8.51957 0.105357 8.70711 0.292893C8.89464 0.48043 9 0.734784 9 1H12.5C12.7652 1 13.0196 1.10536 13.2071 1.29289C13.3946 1.48043 13.5 1.73478 13.5 2V3ZM3.118 4L3 4.059V13C3 13.2652 3.10536 13.5196 3.29289 13.7071C3.48043 13.8946 3.73478 14 4 14H10C10.2652 14 10.5196 13.8946 10.7071 13.7071C10.8946 13.5196 11 13.2652 11 13V4.059L10.882 4H3.118ZM1.5 3V2H12.5V3H1.5Z" fill="#fff" />
              </svg>
            </Button>}
          </Flex>
        </Flex>
      </VStack>

      {
        chatbotsLoaded ?
          <Flex w="100%" minH="300px" justifyContent="center" alignItems="center">
            <Spinner
              thickness="2px"
              speed="0.65s"
              emptyColor="gray.200"
              color="gray.700"
              size="xl" />
          </Flex> :
          <>
            <Box
              borderWidth="1px"
              borderRadius="lg"
              overflow="hidden"
              p="6"
              boxShadow="md"
              // bg={useColorModeValue('white', 'gray.800')}
              display="flex"
              flexDirection={{ base: 'column', md: 'row' }}
            >
              <Box pr={8} mb={{ base: 4, md: 0 }} textAlign="center" flex="1">
                <Box mb="19px" style={{ position: "relative" }} display="flex"
                  alignItems="center"
                  justifyContent="center"
                // border={"1px solid #888"}
                // borderRadius={"50%"}
                >
                  <Image
                    src={userProfile === undefined ? "/icons/Avtar.svg" : userProfile.avatarUrl}
                    height="120px"
                    width="120px"
                    borderRadius="100px"
                    cursor={isEditing ? 'pointer' : 'default'}
                    onClick={() => {
                      if (isEditing) {
                        document.getElementById('fileInput')?.click();
                      }
                    }}
                  />
                  {isEditing && (
                    <>
                      <IconButton
                        icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fill-rule="evenodd" clip-rule="evenodd" d="M12.1492 0.131757C12.1957 0.0851938 12.2508 0.048251 12.3116 0.0230445C12.3723 -0.00216192 12.4375 -0.0151367 12.5032 -0.0151367C12.569 -0.0151367 12.6341 -0.00216192 12.6949 0.0230445C12.7556 0.048251 12.8108 0.0851938 12.8572 0.131757L15.8572 3.13176C15.9038 3.1782 15.9407 3.23338 15.9659 3.29412C15.9911 3.35487 16.0041 3.41999 16.0041 3.48576C16.0041 3.55152 15.9911 3.61665 15.9659 3.67739C15.9407 3.73814 15.9038 3.79331 15.8572 3.83976L5.85722 13.8398C5.80924 13.8874 5.75209 13.9248 5.68922 13.9498L0.689224 15.9498C0.59836 15.9861 0.49882 15.995 0.402944 15.9754C0.307067 15.9557 0.219071 15.9083 0.149865 15.8391C0.0806583 15.7699 0.0332848 15.6819 0.0136173 15.586C-0.00605013 15.4902 0.00285338 15.3906 0.039224 15.2998L2.03922 10.2998C2.06415 10.2369 2.10157 10.1797 2.14922 10.1318L12.1492 0.131757ZM11.2102 2.48576L13.5032 4.77876L14.7962 3.48576L12.5032 1.19276L11.2102 2.48576ZM12.7962 5.48576L10.5032 3.19276L4.00322 9.69276V9.98576H4.50322C4.63583 9.98576 4.76301 10.0384 4.85678 10.1322C4.95055 10.226 5.00322 10.3531 5.00322 10.4858V10.9858H5.50322C5.63583 10.9858 5.76301 11.0384 5.85678 11.1322C5.95055 11.226 6.00322 11.3531 6.00322 11.4858V11.9858H6.29622L12.7962 5.48576ZM3.03522 10.6608L2.92922 10.7668L1.40122 14.5878L5.22222 13.0598L5.32822 12.9538C5.23284 12.9181 5.15062 12.8542 5.09254 12.7706C5.03446 12.6869 5.0033 12.5876 5.00322 12.4858V11.9858H4.50322C4.37062 11.9858 4.24344 11.9331 4.14967 11.8393C4.0559 11.7455 4.00322 11.6184 4.00322 11.4858V10.9858H3.50322C3.4014 10.9857 3.30203 10.9545 3.2184 10.8964C3.13477 10.8384 3.07086 10.7561 3.03522 10.6608Z" fill="white" />
                        </svg>}
                        aria-label="Edit Profile Picture"
                        position="absolute"
                        bottom="2"
                        right="2"
                        size="sm"
                        colorScheme="blue"
                        borderRadius="full"
                        onClick={() => {
                          if (isEditing) {
                            document.getElementById('fileInput')?.click();
                          }
                        }}
                      />
                      <Input
                        id="fileInput"
                        type="file"
                        accept="image/*"
                        display="none"
                        onChange={handleImageChange}
                      />
                    </>
                  )}
                </Box>

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
                {/* <Box
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
          </Box> */}
                <Box display={"flex"} alignItems="center" justifyContent={"center"} gap="8px" mb="6px">
                  <Text fontSize="12px" fontWeight="500" >
                    Status :
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
                  <Box>

                    <Text as="span" fontWeight="bold">
                      {formatToK(userProfile?.subscriptionData?.balanceAfterUsage || 0)}
                    </Text>
                    /
                    <span style={{ color: "#6C757D" }}>
                      {formatToK(userProfile?.tokenCredits || 0)}
                    </span>
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
                              w={usage >= 20 ? `${usage}%` : `${60}%`}
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
                          w={0 >= 20 ? `${0}%` : `${60}%`}
                        >
                          {0}%
                        </Box></>
                    )}
                  </Box>
                </Box>

              </Box>
              <Box width="1px" bg="gray.200" mx={8} />

              <Box flex="1 1 50%">
                <Table variant="simple" size="sm">
                  <Tbody className='profileEdit' style={{ border: "2px solid #E5E7EB" }}>
                    <Tr>
                      <Th fontSize={"16px!important"} fontWeight={"400!important"} color={"#6C757D!important"} >Name</Th>
                      <Td>
                        {isEditing ? (
                          <Input
                            value={profile?.name}
                            name="name"
                            onChange={handleInputChange}
                            placeholder="Name"
                          />
                        ) : (
                          <Text fontSize={"16px!important"} color={"#6C757D!important"}>{userProfile === undefined ? "NA" : userProfile.name || "NA"}</Text>
                        )}
                      </Td>
                    </Tr>
                    <Tr>
                      <Th fontSize={"16px!important"} fontWeight={"400!important"} color={"#6C757D!important"} >Email</Th>
                      <Td>
                        {isEditing ? (
                          <Input
                            value={profile?.email}
                            name="email"
                            onChange={handleInputChange}
                            placeholder="Email"
                          />
                        ) : (
                          <Text fontSize={"16px!important"} color={"#6C757D!important"}>{userProfile === undefined ? "NA" : userProfile?.email || "NA"}</Text>
                        )}
                      </Td>
                    </Tr>
                    <Tr>
                      <Th fontSize={"16px!important"} fontWeight={"400!important"} color={"#6C757D!important"} >Project</Th>
                      <Td>
                        {isEditing ? (
                          <Input
                            value={profile?.project}
                            name="project"
                            onChange={handleInputChange}
                            placeholder="Project"
                          />
                        ) : (
                          <Text fontSize={"16px!important"} color={"#6C757D!important"}>{userProfile === undefined ? "NA" : userProfile.userProjects.length}</Text>
                        )}
                      </Td>
                    </Tr>
                    <Tr>
                      <Th fontSize={"16px!important"} fontWeight={"400!important"} color={"#6C757D!important"} >Joined On</Th>
                      <Td>
                        {isEditing ? (
                          <Input
                            value={profile.joinedOn}
                            name="joinedOn"
                            onChange={handleInputChange}
                            placeholder="Joined On"
                          />
                        ) : (
                          <Text fontSize={"16px!important"} color={"#6C757D!important"}>
                            {userProfile === undefined ? "NA" : <JoningOnFormate date={userProfile.createdAt} />}
                          </Text>
                        )}
                      </Td>
                    </Tr>
                    <Tr>
                      <Th fontSize={"16px!important"} fontWeight={"400!important"} color={"#6C757D!important"} >OpenAI API Key</Th>
                      <Td>
                        {isEditing ? (
                          <Input
                            value={profile.apiKey}
                            name="apiKey"
                            onChange={handleInputChange}
                            placeholder="Enter API Key"
                          />
                        ) : (
                          <>
                            <Text fontSize={"16px!important"} fontWeight={"400!important"} color={"#6C757D!important"} >
                              {/* {userProfile?.openaiKeys?.apiKey} */}
                              {maskKey(userProfile?.openaiKeys?.apiKey?.substring(0, 50))}
                            </Text>
                            {
                              !userProfile?.openaiKeys?.apiKey &&
                              <p style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>Open AI API Key is not added</p>
                            }
                          </>
                          // <Text fontSize={"16px!important"} color={"#6C757D!important"}>Enter API Key</Text>
                        )}
                      </Td>
                    </Tr>
                  </Tbody>
                </Table>
              </Box>
            </Box>
            <Box
              w="100%"
              maxW="100%"
              marginTop="48px"
              // p="6"
              // shadow="sm"
              // h="100%"
              position="relative"
              overflow="auto"
              overflowX="hidden"
            >
              <VStack w="100%" spacing="10">
                <Flex shrink={0} w="100%" justifyContent="space-between">
                  <Flex alignItems="center">
                    <Heading fontSize="20" fontWeight="600">My Projects</Heading>
                  </Flex>
                </Flex>
                <Box width="100%" marginTop="24px !important">{getChatbotsList()}</Box>
              </VStack>
            </Box>
          </>
      }
      <AlertDialog
        isOpen={isDeleteDialogOpens}
        leastDestructiveRef={cancelRef}
        onClose={handleCancelDeletes}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete User
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete this user?
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} size='sm' onClick={handleCancelDeletes}>
                Cancel
              </Button>
              <Button
                size="sm"
                colorScheme="red"
                variant="solid"
                onClick={handleConfirmDeletes}
                ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box >
  );
};
