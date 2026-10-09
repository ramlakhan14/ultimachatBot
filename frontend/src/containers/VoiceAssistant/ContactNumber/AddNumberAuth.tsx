import React from "react";
import HowToUseModal from "../Modal/HowToUseModal";
import { Box, Button, Flex, FormControl, FormErrorMessage, FormLabel, Heading, HStack, Image, Input, Spinner, Text, useToast } from "@chakra-ui/react";
import { Link, useHistory } from "react-router-dom";
import ScrapedHistory from "../Images/scrapedHistoryWhite.svg";
import { useForm } from "react-hook-form";
import questionMarkIcon from "../Images/questionMarkIcon.svg";
import AddCallAuthBg from '../Images/Datatable.svg';
import styles from "./ContactNumber.module.scss";
import GetNumberFromAuth from "./GetNumberFromAuth";
import { fetchConfigKey, verifyVapiKey } from "../../../services/VoiceBot";
import CryptoJS from 'crypto-js'; // Import crypto-js for encryption
import { ENCRYPTION_DECRYPTION_KEY } from '../../../config';
const AddNumberAuth = ({ callUpdateApi }: { callUpdateApi: () => void }) => {
  const toast = useToast();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showList, setShowList] = React.useState(false);
  const [showForm, setShowForm] = React.useState(true);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [isDataFetche, setIsDataFetche] = React.useState<boolean>(false);
  const history = useHistory();
  const encryptPasskey = (passkey: string) => {
    const encryptedPasskey = CryptoJS.AES.encrypt(passkey, ENCRYPTION_DECRYPTION_KEY).toString();
    return encryptedPasskey;
  };


  const fetchData = async () => {
    try {
      setIsDataFetche(true);
      const response: any = await fetchConfigKey();
      const searchParams = new URLSearchParams(window.location.search);
      const settingsdetails = searchParams.get('settingsdetails');
      if (response?.data?.data !== undefined && !settingsdetails) {
        history.push(`/app/voice-campaign/number-history`);
      }

    } catch (error: any) {

    } finally {
      setIsDataFetche(false);
    }
  };


  const onSubmit = async (data: any) => {
    const secureEmailServerData = {
      vapiKey: encryptPasskey(data.vapiKey),
      twilioAuthToken: encryptPasskey(data.twilioAuthToken),
      twilioAccountSid: encryptPasskey(data.twilioAccountSid),
      elevenLabsAPIKey: data.elevenLabsAPIKey ? encryptPasskey(data.elevenLabsAPIKey) : ""
    };
    try {
      setIsLoading(true);
      const response = await verifyVapiKey(secureEmailServerData);
      callUpdateApi()
      if (response.status === 201) {
        fetchData()
        setShowForm(false);
        toast({
          title: `${response?.data?.message}`,
          status: "success",
          isClosable: true,
        });
        history.push(`/app/voice-campaign/add-number?settingsdetails=${true}&serverId=${response?.data?.data?.userId}`);
        setShowList(true);
      }
    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      });

    } finally {
      setIsLoading(false);
    }
  }
  React.useEffect(() => {
    const init = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const settingsdetails = searchParams.get('settingsdetails');
        // If no settingsdetails param exists, reset to form view
        if (!settingsdetails) {
          reset();
          setShowForm(true);
          setShowList(false);
        } else {
          // Existing logic for when settingsdetails is present
          setShowForm(false);
          setShowList(true);
        }
      } catch (error) {
        // console.error('Error during initialization:', error);
      }
    };

    init();
  }, [window.location.search]);



  React.useEffect(() => {
    fetchData();
  }, []);

  const onClose = () => setIsOpen(false);

  return (<>
    {isDataFetche ? <Box w="100%"
      p="6"
      shadow="sm"
      h="100%"
      position="relative"
      textAlign={"center"}
      overflow="auto"><Spinner color='gray.700' /></Box> : showForm ? <Box
        w="100%"
        p="6"
        shadow="sm"
        h="100%"
        position="relative"
        overflow="auto"
      >
        <Box mt="0px">
          <Flex justifyContent="space-between" alignItems="center">
            <Box>
              <Text as="p" fontSize="24px" color="#1A202C" fontWeight="700">Number Authentication</Text>
            </Box>

          </Flex>
        </Box>
        <Box className={styles.bannerImgHeight} mt="24px" backgroundColor="white" boxShadow="sm" borderRadius="8px" minW="100%" w="600px"
          backgroundImage={`url(${AddCallAuthBg})`}
          backgroundSize="100%"
          backgroundPosition="center"
          backgroundRepeat="no-repeat"
          position={"relative"}
          overflowY={"scroll"}
          sx={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            "&::-webkit-scrollbar": {
              display: "none",
            },
          }}
        // height="calc(100vh - 180px)"
        >
          <Box
            bg='#fff'
            p='24px 24px'
            shadow='md'
            my={"50px"}
            width={476}
            maxW="90vw"
            borderRadius='md'
            border="2px solid #DEE2E6"
            boxShadow="none"
            className={styles.formContainer}
          >
            <form onSubmit={handleSubmit(onSubmit)}>
              <Heading
                textAlign='left'
                fontSize='20px'
                as='h5'
                isTruncated
                mb='4px'
                fontWeight="600"
                color="#1A202C"
              >
                Auth key
              </Heading>
              <Text as="p" fontSize="16px" fontWeight="400" color="#6C757D" mb="24px">
                Identify the application with the Auth key
              </Text>

              <FormControl mb="16px" isInvalid={!!errors.vapiKey}>
                <FormLabel mb="8px">Vapi Auth Key <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
                <Input
                  placeholder="Enter Auth Key"
                  {...register("vapiKey", {
                    required: "Vapi auth key is required",
                    // minLength: { value: 16, message: "Auth Key must be at least 16 characters long" },
                    // pattern: { value: /^[A-Za-z0-9]+$/, message: "Auth Key must be alphanumeric" }
                  })}
                />
                {errors.vapiKey && <FormErrorMessage>{errors.vapiKey.message}</FormErrorMessage>}
              </FormControl>

              <Text as="p" fontSize="16px" fontWeight="400" color="#6C757D" mb="16px">
                Enter the credentials below to authenticate the number
              </Text>

              <FormControl mb="16px" isInvalid={!!errors.twilioAuthToken}>
                <FormLabel mb="8px">Twilio Auth Token <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
                <Input
                  placeholder="Enter auth token"
                  {...register("twilioAuthToken", {
                    required: "Twilio auth token is required",
                    // minLength: { value: 16, message: "Auth Key must be at least 16 characters long" },
                    // pattern: { value: /^[A-Za-z0-9]+$/, message: "Auth Key must be alphanumeric" }
                  })}

                />
                {errors.twilioAuthToken && <FormErrorMessage>{errors.twilioAuthToken.message}</FormErrorMessage>}
              </FormControl>

              <FormControl mb="16px" isInvalid={!!errors.twilioAccountSid}>
                <FormLabel mb="8px">Twilio Secret ID <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
                <Input
                  placeholder="Enter Secret Key"
                  {...register("twilioAccountSid", {
                    required: "Twilio secret key is required",
                    // minLength: { value: 16, message: "Auth Key must be at least 16 characters long" },
                    // pattern: { value: /^[A-Za-z0-9]+$/, message: "Auth Key must be alphanumeric" }
                  })}

                />
                {errors.twilioAccountSid && <FormErrorMessage>{errors.twilioAccountSid.message}</FormErrorMessage>}
              </FormControl>
              <FormControl mb="16px" isInvalid={!!errors.elevenLabsAPIKey}>
                <FormLabel mb="8px">
                  Eleven Labs Key
                  {/* <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text> */}
                </FormLabel>
                <Input
                  placeholder="Enter Secret Key"
                  {...register("elevenLabsAPIKey")}

                />
                {errors.elevenLabsAPIKey && <FormErrorMessage>{errors.elevenLabsAPIKey.message}</FormErrorMessage>}
              </FormControl>
              <HStack >
                <Button colorScheme="blue" type="submit" disabled={isLoading} w="100%">
                  {isLoading ?
                    <Spinner color='gray.700' />
                    :
                    <Text as="span" fontSize="16px" fontWeight="500">Verify</Text>
                  }
                </Button>
              </HStack>
              <Flex justify="center" align="center" mt="24px">
                <HStack spacing="8px" cursor="pointer" align="center" onClick={() => setIsOpen(true)}>
                  <Text fontSize="14px" color={'#6c757d'}>
                    How to use
                  </Text>
                  <Image role={'button'} src={questionMarkIcon} alt="Help Icon" />
                </HStack>
              </Flex>
            </form>
          </Box>

        </Box>
      </Box > : null}
    <HowToUseModal isOpen={isOpen} onClose={onClose} />
    {showList ? <GetNumberFromAuth /> : null}
  </>);
}

export default AddNumberAuth;