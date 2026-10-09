import React from 'react';
import {
  Flex,
  Heading,
  Text,
  Box,
  Button,
  useToast,
  HStack,
  Spinner
} from '@chakra-ui/react'
import { Logo } from '../../components/Logo/Logo';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { unsubscribeEmail } from '../../services/authServices';
import Lottie from 'lottie-react';
import animationData from '../EmailCampaignsAdmin/Modal/Animation.json';
import CancelData from './Cancel.json';
import { googleCallback, outlookCallback, yahooCallback } from '../../services/emailCampaigns';
import { set } from 'lodash';
import { baseURL } from '../../config';

function PassKeyForGmail() {
  const [unsubscribe, setUnsubscribe] = React.useState<any>(false);
  const [isSubmit, setIsSubmit] = React.useState(false);
  const toast = useToast();
  const history = useHistory();
  const location = useLocation();
  const [data, seData] = React.useState<string>("");
  const queryParams = new URLSearchParams(location.search);
  const [count, setCount] = React.useState<number>(5);
  const unsubscribeToken = queryParams.get('code');
  const { provider } = useParams<{ provider: string }>();

  const fetchData = async () => {
    if (!unsubscribeToken) {
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
      if (provider === "google") {
        const userData: any = await googleCallback(unsubscribeToken); // unsubscribeToken is guaranteed to be a string here
        seData(userData?.data.serverId);
        startCountdown();
      } else if (provider === "microsoft" || provider === "hotmail") {
        const userData: any = await outlookCallback(unsubscribeToken); // unsubscribeToken is guaranteed to be a string here
        seData(userData?.data.serverId);
        startCountdown();
      } else if (provider === "yahoo") {
        const userData: any = await yahooCallback(unsubscribeToken); // unsubscribeToken is guaranteed to be a string here
        seData(userData?.data.serverId);
        startCountdown();
      }
    } catch (error: any) {
      if (error?.response?.data?.statusCode === 422) {
        setUnsubscribe(null);
      }
    }
  };
  React.useEffect(() => {
    if (unsubscribeToken) {
      fetchData();
    }
  }, [unsubscribeToken]);


  if (count === 0) {
    setTimeout(() => {
      window.location.href = `/app/settingDetails/${data}`;
    }, 1000)
  }

  const tryAgain = () => {
    if (provider === "google") {
      window.location.href = `${baseURL}campaign/google/auth`;
    } else if (provider === "microsoft" || provider === "Hotmail") {
      window.location.href = `${baseURL}campaign/microsoft/auth`;
    } else if (provider === "yahoo") {
      window.location.href = `${baseURL}campaign/yahoo/auth`;
    }
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
                <Button colorScheme="red" mr={3} onClick={tryAgain} sx={{
                  _focus: {
                    boxShadow: 'none',  // Removes the focus box shadow
                  }
                }}
                >
                  <Text as="span" ms="4px" fontSize="16px" fontWeight="400">Try Again</Text>
                </Button>
                <Button colorScheme="blue" mr={3} onClick={() => {
                  history.goBack()
                }
                  // window.location.href = "/app/ultimamailSettingsHistory"
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

export default PassKeyForGmail;