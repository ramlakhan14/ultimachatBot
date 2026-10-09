import * as React from "react";
import {
  Box,
  Flex,
  HStack,
  Heading,
  Text,
  Input,
  useToast,
  Button,
  Image,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Spinner,
} from "@chakra-ui/react";
import styles from "./UltimamailSettings.module.scss";
import { Link, useHistory } from "react-router-dom";
import ScrapedHistory from "./images/scrapedHistory.svg";
import { useForm } from "react-hook-form";
import questionMarkIcon from "./images/questionMarkIcon.svg";
import UltimamailSettingsbg from './images/UltimamailSettingsbg.svg';
import { HowToUseModal } from "./Modal/HowToUseModal";
import { emailServerConfig, verifyPostmarkAuthAndSecretKey } from "../../services/ultimamailsettings";
import { UltimamailSettingsDetails } from "./UltimamailSettingsDetails";
import CryptoJS from 'crypto-js'; // Import crypto-js for encryption
import { ENCRYPTION_DECRYPTION_KEY } from '../../config';

type FormValues = {
  authKey: string;
  secretKey: string;
  emailServer: string;
};

export const PostmarkSettings = () => {
  const toast = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isFormOpen, setisFormOpen] = React.useState<boolean>(true);
  const [isUltimamailSettingsDetails, setIsUltimamailSettingsDetails] = React.useState<boolean>(false);
  const [accountAuthToken, setAccountAuthToken] = React.useState<string>("");
  const [data, setData] = React.useState<any>([])
  const { register, handleSubmit, formState: { errors }, setError, clearErrors, control, reset } = useForm<FormValues>();
  const [isSubmited, setIsSubmited] = React.useState<boolean>(false);
  const [isDataFetche, setIsDataFetche] = React.useState<boolean>(false);
  const history = useHistory();
  // Encryption function

  const encryptPasskey = (passkey: string) => {
    const encryptedPasskey = CryptoJS.AES.encrypt(passkey, ENCRYPTION_DECRYPTION_KEY).toString();
    return encryptedPasskey;
  };
  const onSubmit = async (formData: any) => {
    const secureEmailServerData = {
      ...formData,
      authKey: encryptPasskey(formData.authKey),
      secretKey: encryptPasskey(formData.secretKey),
    };
    // Log the secured data for debugging (remove in production)
    setAccountAuthToken(secureEmailServerData);
    try {
      setIsLoading(true)
      const response = await verifyPostmarkAuthAndSecretKey(secureEmailServerData);
      if (response.status === 200) {
        setisFormOpen(false);
        if (!isSubmited) {
          toast({
            title: `${response?.data?.message}`,
            status: "success",
            isClosable: true,
          });
        }
        setIsSubmited(true);
        setData(response?.data)
        setIsUltimamailSettingsDetails(true);
        history.push(`/app/postmark-settings?settingsdetails=${true}&serverId=${response?.data?.campaignEmailServerId}`);
      }
    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      })
    } finally {
      setIsLoading(false);
    }
  };



  const onClose = () => {
    setIsOpen(false);
  };




  React.useEffect(() => {
    const init = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const settingsdetails = searchParams.get('settingsdetails');
        // If no settingsdetails param exists, reset to form view
        if (!settingsdetails) {
          reset();
          setisFormOpen(true);
          setIsUltimamailSettingsDetails(false);
        } else {
          // Existing logic for when settingsdetails is present
          setisFormOpen(false);
          setIsUltimamailSettingsDetails(true);
        }
      } catch (error) {
        // console.error('Error during initialization:', error);
      }
    };

    init();
  }, [window.location.search]);



  const fetchData = async () => {
    try {
      setIsDataFetche(true);
      const searchParams = new URLSearchParams(window.location.search);
      const settingsdetails = searchParams.get('settingsdetails');
      const response: any = await emailServerConfig();
      if (response?.data?.data?.length > 0 && !settingsdetails) {
        history.push(`/app/postmark-settings-history`);
      }

    } catch (error: any) {

    } finally {
      setIsDataFetche(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);


  return (
    <>{isDataFetche ? <Box w="100%"
      p="6"
      shadow="sm"
      h="100%"
      position="relative"
      textAlign={"center"}
      overflow="auto"><Spinner color='gray.700' /></Box> : isFormOpen ?
      <Box
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
              <Text as="p" fontSize="30px" color="#1A202C" fontWeight="600">Postmark Settings</Text>
            </Box>
            {/* <Box ml="auto">
              <Link to="/app/postmark-settings-history">
                <Button color={"white"} mr="12px" backgroundColor={'#2977FF'} size='md' className="btn-hover-pri"
                  sx={{
                    _focus: {
                      boxShadow: 'none',  // Removes the focus box shadow
                    }
                  }}
                >
                  <Image src={ScrapedHistory} alt='Dan Abramov' />
                  <Text as="span" ms="8px">History
                  </Text>
                </Button>
              </Link>
            </Box> */}
          </Flex>
        </Box>
        <Box className={styles.bannerImgHeight} mt="24px" backgroundColor="white" boxShadow="sm" borderRadius="8px" minW="100%" w="600px"
          backgroundImage={`url(${UltimamailSettingsbg})`} // Use the imported image
          backgroundSize="100%" // Adjust how the image is scaled
          backgroundPosition="center" // Center the image
          backgroundRepeat="no-repeat" // Prevent image repetition
          position={"relative"}
        // height="calc(100vh - 180px)"
        >
          <Box
            bg='#fff'
            p='24px 24px'
            shadow='md'
            width={476}
            maxW="90vw"
            borderRadius='md'
            m='0 auto'
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
              <FormControl mb="26px" isInvalid={!!errors.emailServer}>
                <Input
                  placeholder="Enter Auth Key"
                  {...register("emailServer", {
                    required: "Auth Key is required",
                  })}
                  value="postmark"
                  isReadOnly
                  sx={{
                    background: "#CED4DA",
                    color: "#6C757D",
                    fontSize: "16px",
                    fontWeight: "400",
                    _focus: { boxShadow: "none" },
                  }}
                />
                {errors.emailServer && <FormErrorMessage>{errors.emailServer.message}</FormErrorMessage>}
              </FormControl>
              <FormControl mb="26px" isInvalid={!!errors.authKey}>
                <FormLabel>Auth Key  <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
                <Input
                  placeholder="Enter Auth Key"
                  {...register("authKey", {
                    required: "Auth Key is required",
                    // minLength: { value: 16, message: "Auth Key must be at least 16 characters long" },
                    // pattern: { value: /^[A-Za-z0-9]+$/, message: "Auth Key must be alphanumeric" }
                  })}
                />
                {errors.authKey && <FormErrorMessage>{errors.authKey.message}</FormErrorMessage>}
              </FormControl>

              <FormControl mb="26px" isInvalid={!!errors.secretKey}>
                <FormLabel>Secret Key  <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
                <Input
                  placeholder="Enter Secret Key"
                  {...register("secretKey", {
                    required: "Secret Key is required",
                    // minLength: { value: 16, message: "Auth Key must be at least 16 characters long" },
                    // pattern: { value: /^[A-Za-z0-9]+$/, message: "Auth Key must be alphanumeric" }
                  })}

                />
                {errors.secretKey && <FormErrorMessage>{errors.secretKey.message}</FormErrorMessage>}
              </FormControl>
              <HStack>
                <Button colorScheme="blue" type="submit" disabled={isLoading} w="100%">
                  {isLoading ?
                    <Spinner color='gray.700' />
                    :
                    <>
                      {/* <Image src={saveIcon} alt='Save & Continue' /> */}
                      <Text as="span" fontSize="16px" ms="8px" fontWeight="400">Verify</Text>
                    </>
                  }
                </Button>
              </HStack>
              <Flex justify="center" align="center" mt="24px">
                <HStack spacing="8px" align="center">
                  <Text>
                    How to use
                  </Text>
                  <Image cursor={'pointer'} src={questionMarkIcon} alt="Help Icon" onClick={() => setIsOpen(true)} />
                </HStack>
              </Flex>
            </form>
          </Box>

        </Box>
        <HowToUseModal isOpen={isOpen} onClose={onClose} />
      </Box > : null}
      {isUltimamailSettingsDetails ?
        <UltimamailSettingsDetails />
        : null}
    </>
  );
};
