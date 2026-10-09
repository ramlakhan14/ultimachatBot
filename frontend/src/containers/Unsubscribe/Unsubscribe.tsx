import React from 'react';
import {
  Flex,
  Heading,
  Text,
  Box,
  Button,
  useToast
} from '@chakra-ui/react'
import { Logo } from '../../components/Logo/Logo';
import { useHistory, useLocation } from 'react-router-dom';
import { unsubscribeEmail } from '../../services/authServices';
import Lottie from 'lottie-react';
import animationData from '../EmailCampaignsAdmin/Modal/Animation.json';

function Unsubscribe() {
  const [unsubscribe, setUnsubscribe] = React.useState(false);
  const [isSubmit, setIsSubmit] = React.useState(false);
  const toast = useToast();
  const history = useHistory();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const unsubscribeToken = queryParams.get('_t');
  const emailUnsubscribe = async () => {
    if (unsubscribeToken) {
      try {
        setIsSubmit(true);
        const res: any = await unsubscribeEmail({ token: unsubscribeToken });
        // console.log("response: ", res);
        if (res?.status === 200) {
          setUnsubscribe(true);
        }
      } catch (error: any) {
        toast({
          title: `${error?.response?.data?.message}`,
          status: "error",
          isClosable: true,
        });
      }
      finally {
        setIsSubmit(false);
      }
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
          <Box
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
            {!unsubscribe ? <>
              <Heading
                textAlign="center"
                fontSize="30px"
                as="h3"
                mt="50px"
                mb="40px"
                color="#1A202C"
                fontWeight={500}
              >
                We truly value our connection and are eager to stay in touch with you.
              </Heading>
              <Text as="p" fontSize="16px" fontWeight="400" color="#6C757D" mt="20px">
                Stay updated on the latest information and advices by subscribing to our email service.
              </Text>
              <Text as="p" fontSize="16px" mt="20px" mb="24px">
                If you wish to unsubscribe, please click the button below.
              </Text>

              <Button colorScheme="blue" maxW={"250px"} mr={3} onClick={emailUnsubscribe} sx={{
                _focus: {
                  boxShadow: 'none',  // Removes the focus box shadow
                }
              }}
              >
                <Text as="span" ms="4px" fontSize="16px" fontWeight="400">Unsubscribe</Text>
              </Button>
            </>
              :
              <>
                <Box
                  textAlign="center"
                  display="flex"
                  flexDirection="column"
                  justifyContent="center"
                  alignItems="center"
                >
                  <Lottie animationData={animationData} style={{ width: 130, height: 130 }} />
                  <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" mb="8px" mt="24px">You've successfully unsubscribed.</Text>
                  <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D" mb="24px">Thank you once again for your support. We look forward to seeing you again!</Text>
                  <Button colorScheme="blue" mr={3} onClick={() => history.push('/login')} sx={{
                    _focus: {
                      boxShadow: 'none',  // Removes the focus box shadow
                    }
                  }}
                  >
                    <Text as="span" ms="4px" fontSize="16px" fontWeight="400">BACK TO LOGIN</Text>
                  </Button>
                </Box>
              </>
            }
          </Box>
        </Flex>
      </Flex>
    </>
  )
}

export default Unsubscribe;