import React, { useContext } from 'react';
import {
  Flex,
  Text,
  Box,
  Button,
  HStack,
  Spinner,
  useToast
} from '@chakra-ui/react'
import { Logo } from '../../components/Logo/Logo';
import { useLocation, useParams, useHistory } from 'react-router-dom';
import Lottie from 'lottie-react';
import animationData from '../EmailCampaignsAdmin/Modal/Animation.json';
import CancelData from './Cancel.json';
import { googleCalendarCallback } from '../../services/emailCampaigns';
import { baseURL } from '../../config';
import { useCalendarContext } from '../context/GoogleSigninContext';
import nookies from 'nookies';

function GoogleSigninForCalendar() {
  const [unsubscribe, setUnsubscribe] = React.useState<any>(false);
  const location = useLocation();
  const [knowledgeBaseId, setKnowledgeBaseId] = React.useState<any>("");
  const queryParams = new URLSearchParams(location.search);
  const [count, setCount] = React.useState<number>(5);
  const token = queryParams.get('code');
  const history = useHistory();
  const toast = useToast();
  const { setCalendarLoggedinData } = useCalendarContext();
  // console.log(data, "datadata")
  const fetchData = async () => {
    if (!token) {
      return;
    }
    try {
      const startCountdown = () => {
        setUnsubscribe(true);
        const interval = setInterval(() => {
          setCount((prevCount) => {
            if (prevCount > 1) {
              return prevCount - 1;
            } else {
              clearInterval(interval); // Stop the interval
              return 0; // Set count to 0 after reaching 1
            }
          });
        }, 1000);
      };
      const userData: any = await googleCalendarCallback(token); // token is guaranteed to be a string here
      if (userData?.data?.data) {
        setCalendarLoggedinData(userData?.data?.data);
        startCountdown();
      } else {
        setUnsubscribe(null);
        toast({
          title: userData?.data?.message,
          status: "error",
          isClosable: true,
        })
      }
    } catch (error: any) {
      toast({
        title: error?.response?.data?.message || error?.message || "Server Error",
        status: "error",
        isClosable: true,
      })
      setUnsubscribe(null);
    }
  };
  React.useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  React.useEffect(() => {
    const cookies = nookies.get();
    const kbID = cookies.kbID;

    // console.log(kbID, "kbID inside effect");

    setKnowledgeBaseId(kbID);
  }, []);

  React.useEffect(() => {
    if (knowledgeBaseId !== "") {
      nookies.destroy(null, 'kbID', {
        path: '/',
      });
    }
  }, [knowledgeBaseId]);
  // console.log(knowledgeBaseId, "kbID outside");


  if (count === 0) {
    // console.log(knowledgeBaseId, "kbID inside count");
    setTimeout(() => {
      history.push(`/app/edit-bot/${knowledgeBaseId}/?tab=google-calendar-integration`);
    }, 1000)
    // console.log(calendarLoggedinData, "calendarLoggedinData");
  }

  return (
    <>
      <Flex bg="#F7FAFC" h="100vh" direction="column">
        <Flex
          shrink={0}
          shadow="base"
          w="100%"
          h="60px"
          bg="white"
          pr="10"
          pb="4"
          pt="4"
          pl="10"
          zIndex="2"
          alignItems="center"
        >
          <Logo />
        </Flex>
        <Flex alignItems="center" justifyContent="center" mt={"100px"}>
          {unsubscribe === false ? < Box
            bg="#fff"
            p="24px 24px"
            shadow="md"
            width={"100%"}
            maxW="50%"
            borderRadius="md"
            m="0 auto"
            border="2px solid #DEE2E6"
            boxShadow="none"
            textAlign={"center"}
          >
            <Box
              textAlign="center"
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
            ><Spinner />
            </Box>
          </Box> : unsubscribe !== null ? < Box
            bg="#fff"
            p="24px 24px"
            shadow="md"
            width={"100%"}
            maxW="50%"
            borderRadius="md"
            m="0 auto"
            border="2px solid #DEE2E6"
            boxShadow="none"
            textAlign={"center"}
          >
            <Box
              textAlign="center"
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
            >
              <Lottie animationData={animationData} style={{ width: 130, height: 130 }} />
              <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" mb="8px" mt="24px">You've successfully verified your account.</Text>
              <Text as="p" fontSize="16px" fontWeight="400" color="#1A202C" mb="8px">You will be redirected to the previous page in {count} seconds</Text>
              {/* <Button colorScheme="blue" mr={3} onClick={() => window.location.href = `/ app / settingDetails / ${ data } `} sx={{
                _focus: {
                  boxShadow: 'none',  // Removes the focus box shadow
                }
              }}
              >
                <Text as="span" ms="4px" fontSize="16px" fontWeight="400">Back To Login</Text>
              </Button> */}
            </Box>
          </Box> : <Box
            bg="#fff"
            p="24px 24px"
            shadow="md"
            width={"100%"}
            maxW="50%"
            borderRadius="md"
            m="0 auto"
            border="2px solid #DEE2E6"
            boxShadow="none"
            textAlign={"center"}
          >
            <Box
              textAlign="center"
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
            >
              <Lottie animationData={CancelData} style={{ width: 130, height: 130 }} />
              <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" mb="8px" mt="24px">Account verification failed. Please try again.
              </Text>
              <HStack>
                <Button colorScheme="red" mr={3} onClick={() => {
                  window.location.href = `${baseURL}googleCalender/auth`;
                }} sx={{
                  _focus: {
                    boxShadow: 'none',  // Removes the focus box shadow
                  }
                }}
                >
                  <Text as="span" ms="4px" fontSize="16px" fontWeight="400">Try Again</Text>
                </Button>
                <Button color="#fff" bg={"#2977FF"} _hover={{ background: "#2977FF" }} mr={3} onClick={() =>
                // window.location.href = "/app/ultimamailSettingsHistory"
                {
                  history.goBack()
                }
                } sx={{
                  _focus: {
                    boxShadow: 'none',  // Removes the focus box shadow
                  }
                }}
                >
                  <Text as="span" ms="4px" fontSize="16px" fontWeight="400">Back To Ultimamail Settings</Text>
                </Button>
              </HStack>
            </Box>
          </Box>}
        </Flex>
      </Flex>
    </>
  )
}

export default GoogleSigninForCalendar;