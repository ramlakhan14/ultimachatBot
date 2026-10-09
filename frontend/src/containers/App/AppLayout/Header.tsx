import React, { useState } from 'react'
import {
  Box,
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Text,
  Image,
  Circle,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  useDisclosure,
  FormControl,
  FormLabel,
  InputGroup,
  Input,
  InputRightElement,
  IconButton,
  FormErrorMessage,
  useToast,
  Spinner
} from '@chakra-ui/react';
import { Logo } from '../../../components/Logo/Logo';
import { Link, useLocation } from 'react-router-dom';
import { destroyCookie } from "nookies";
import { useForm } from "react-hook-form";
import { changePassword } from '../../../services/userServices';
import { useSelector } from 'react-redux';

interface HeaderStep {
  label: string;
  status: 'active' | 'complete' | 'upcoming';
}

interface HeaderProps {
  userData: any; // ideally type this better
  handler: () => void;
  headerSteps: HeaderStep[];
}
function Header({ userData, handler, headerSteps }: HeaderProps) {
  let headingStepsShow = ["email-campaigns/create", "voice-campaign/create", "inbound-voice-calls/create"]?.some((item: any) => window.location.pathname.includes(item))
  // console.log("headingStepsShow", userData);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const currentPath = window.location.pathname;
  const subTab = queryParams.get("subTab"); // e.g., 'step-up-review'
  const isInbound = currentPath.startsWith('/app/inbound-voice-calls/create');

  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const logOut = () => {
    // props.onLoginOut();
    localStorage.clear();
    sessionStorage.clear();
    destroyCookie(null, "accesstoken", {
      path: "/",
    });

    window.location.href = '/login';
  };

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isProfileDataLoading = useSelector((state: any) => state?.user?.loading);

  const password = watch("newPassword");

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true)
      const response: any = await changePassword({
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
      // console.log("Password change response:", response?.data);
      if (response?.data?.statusCode === 200) {
        toast({
          title: response?.data?.message,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onClose();
        reset();
      } else {
        toast({
          title: response?.data?.message,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }

    } catch (error: any) {
      // console.error("Error changing password:", error);
      toast({
        title: error?.response?.data?.message || "Something went wrong",
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (<>
    <Flex
      shrink={0}
      // shadow="base"
      w="100%"
      h="60px"
      bg="white"
      justifyContent="space-between"
      pr="5"
      pb="4"
      pt="4"
      pl="5"
      zIndex="4"
      alignItems="center"
    >
      <Box display={"flex"} gap={5} alignItems="center" >
        <Button sx={{
          "_focus": {
            outline: "none",
          }
        }} variant="unstyled" size="xs" onClick={handler}>
          <Image src="/icons/ic-menu.svg" alt="hamburger-icon" />
        </Button>
        <Link to="/app/dashboard" style={{ textDecoration: 'none' }}>
          <Logo></Logo>
        </Link>
      </Box>
      {!headingStepsShow &&
        userData?.isLowBalance &&
        <Box borderColor="red.200" textAlign="center" p={2}>
          <Text fontSize="sm" color="red.700" fontWeight="medium">
            ⚠️ Threshold Alert: Your available credits have dropped below the set limit. Please recharge or upgrade your plan to avoid service interruption.
          </Text>
        </Box>
      }
      {
        subTab == "add-more-lead" ? "" :
          <>
            {
              headingStepsShow &&
              <Box>
                <Flex align="center" gap={0}>
                  {headerSteps?.map((step, index) => {
                    const iscompleted = step.status === "active" && step?.label == "Complete Campaign"
                    return (
                      <Flex align="center" key={index}>
                        {/* Circle with number or check */}
                        <Circle
                          size="22px"
                          bg={step.status === "complete" || iscompleted ? "#2977FF" : "white"}
                          border="1px solid"
                          fontSize={'12px'}
                          borderColor={step.status === "active" ? "#2977FF" : "#2977FF"}
                          color={step.status === "complete" || iscompleted ? "white" : "#2977FF"}
                        >
                          {step.status === "complete" || iscompleted ? (
                            <Image src="/icons/righttick.svg" alt="check-icon" />
                          ) : (
                            index + 1
                          )}
                        </Circle>

                        {/* Text */}
                        <Text
                          ml={2}
                          fontWeight={step.status === "complete" || step.status === "active" ? "medium" : "normal"}
                          color={step.status === "complete" || step.status === "active" ? "#2977FF" : "gray.500"}
                          fontSize={'13px'}
                        >
                          {step.label}
                        </Text>

                        {/* Divider */}
                        {
                          index < headerSteps.length - 1 && (
                            <Box
                              w="40px"
                              h="2px"
                              bg={
                                headerSteps[index + 1].status === "active" || headerSteps[index + 1].status === "complete"
                                  ? "#2977FF"
                                  : "gray.200"
                              }
                              mx={3}
                            />
                          )
                        }
                      </Flex>
                    )
                  })}
                </Flex>
              </Box>
            }
          </>
      }
      <Box>
        <Menu>
          <MenuButton
          // background={"#E0ECFF"}
          >
            {/* <Avatar size="sm" bg="teal.500" /> */}
            {isProfileDataLoading ? <Box width="24px" height="24px" borderRadius="999px" bg="#ccc">
              <Spinner size="xs" />
            </Box> :
              <Image
                src={userData?.avatarUrl}
                height="24px"
                width="24px"
                borderRadius="999px"
              />}
          </MenuButton>
          <MenuList minW="180px">
            <MenuItem fontSize="small">
              {/* <Avatar mr={2} size="sm" bg="teal.500" /> */}
              <Image
                src={userData?.avatarUrl}
                height="40px"
                width="40px"
                borderRadius="999px"
                mr={2}
              />
              <Text as="p" color={'#1F2937'} fontSize={'14px'} fontWeight={500}>{userData?.email}</Text>
              {/* <Box>
                {userData?.role === "admin" ? <Text as="p" color={'#6B7280'} fontSize={'14px'}> Admin Dashboard</Text> : <Text as="p" color={'#6B7280'} fontSize={'14px'}>User Dashboard</Text>}
                <Text as="p" color={'#1F2937'} fontSize={'14px'} fontWeight={500}>{userData?.name || userData?.email}</Text>
              </Box> */}
            </MenuItem>
            <MenuDivider />
            <Link to="/app/myprofile">
              <MenuItem fontSize="14px" fontWeight={500} color={'#1A202C'}>
                <Image
                  src={"/icons/profileIcon.svg"}
                  alt="profle-icon"
                  height="18px"
                  style={{ marginRight: '12px' }}
                />
                My Profile
              </MenuItem>
            </Link>

            {/* <Link to="/app/change-password"> */}
            <MenuItem fontSize="14px" fontWeight={500} color={'#1A202C'} onClick={onOpen}>
              <Image
                src={"/icons/change-password.svg"}
                alt="change password"
                height="12px"
                style={{ marginRight: '12px' }}
              />
              Change Password
            </MenuItem>
            {/* </Link> */}

            <MenuItem onClick={logOut} fontSize="14px" fontWeight={500} color={'#1A202C'}>
              <Image
                src={"/icons/logoutIcon.svg"}
                alt="Log-Out-icon"
                height="18px"
                style={{ marginRight: '12px' }}
              />
              Log Out
            </MenuItem>
          </MenuList>
        </Menu>
      </Box>
    </Flex >

    {/* Modal */}
    <Modal isOpen={isOpen} onClose={onClose} isCentered closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader textAlign={'center'} fontSize={'20px'} pb={'10px'} fontWeight={600} color={'#1A202C'}>Change your current password</ModalHeader>
        <Text as={'p'} textAlign={'center'} color={'#6C757D'}>Please update your password to continue.</Text>
        {/* <ModalCloseButton /> */}
        <ModalBody py={6}>
          <form onSubmit={handleSubmit(onSubmit)}>

            {/* New Password */}
            <FormControl isInvalid={!!errors.newPassword} mb={4}>
              <FormLabel fontSize="sm">
                New Password <span style={{ color: "red" }}>*</span>
              </FormLabel>

              <InputGroup>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  {...register("newPassword", {
                    minLength: {
                      value: 8,
                      message: "Password must be at least 8 characters"
                    },
                    maxLength: {
                      value: 16,
                      message: "Password must not exceed 16 characters"
                    },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,16}$/,
                      message:
                        "Password must include uppercase, lowercase, number & special character"
                    }
                  })}
                />
                <InputRightElement>
                  <IconButton
                    variant="ghost"
                    aria-label="toggle password"
                    icon={showPassword ? <><svg width="16px" height="16px" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g clip-path="url(#clip0_1003_1703)">
                        <path d="M15.9998 7.99915C15.9998 7.99915 12.9998 2.49915 7.99976 2.49915C2.99976 2.49915 -0.000244141 7.99915 -0.000244141 7.99915C-0.000244141 7.99915 2.99976 13.4991 7.99976 13.4991C12.9998 13.4991 15.9998 7.99915 15.9998 7.99915ZM1.17276 7.99915C1.65627 7.26427 2.2124 6.57983 2.83276 5.95615C4.11976 4.66715 5.87976 3.49915 7.99976 3.49915C10.1198 3.49915 11.8788 4.66715 13.1678 5.95615C13.7881 6.57983 14.3442 7.26427 14.8278 7.99915C14.7698 8.08615 14.7058 8.18215 14.6328 8.28715C14.2978 8.76715 13.8028 9.40715 13.1678 10.0421C11.8788 11.3311 10.1188 12.4991 7.99976 12.4991C5.87976 12.4991 4.12076 11.3311 2.83176 10.0421C2.2114 9.41846 1.65628 8.73402 1.17276 7.99915Z" fill="#6C757D" />
                        <path d="M7.99976 5.49915C7.33671 5.49915 6.70083 5.76254 6.23199 6.23138C5.76315 6.70022 5.49976 7.3361 5.49976 7.99915C5.49976 8.66219 5.76315 9.29807 6.23199 9.76691C6.70083 10.2358 7.33671 10.4991 7.99976 10.4991C8.6628 10.4991 9.29868 10.2358 9.76752 9.76691C10.2364 9.29807 10.4998 8.66219 10.4998 7.99915C10.4998 7.3361 10.2364 6.70022 9.76752 6.23138C9.29868 5.76254 8.6628 5.49915 7.99976 5.49915ZM4.49976 7.99915C4.49976 7.07089 4.86851 6.18065 5.52488 5.52427C6.18126 4.86789 7.0715 4.49915 7.99976 4.49915C8.92801 4.49915 9.81825 4.86789 10.4746 5.52427C11.131 6.18065 11.4998 7.07089 11.4998 7.99915C11.4998 8.9274 11.131 9.81764 10.4746 10.474C9.81825 11.1304 8.92801 11.4991 7.99976 11.4991C7.0715 11.4991 6.18126 11.1304 5.52488 10.474C4.86851 9.81764 4.49976 8.9274 4.49976 7.99915Z" fill="#6C757D" />
                      </g>
                      <defs>
                        <clipPath id="clip0_1003_1703">
                          <rect width="16" height="16" fill="white" />
                        </clipPath>
                      </defs>
                    </svg></> : <><svg width="16px" height="16px" viewBox="0 0 22 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1.27L2.28 0L19 16.72L17.73 18L14.65 14.92C13.5 15.3 12.28 15.5 11 15.5C6 15.5 1.73 12.39 0 8C0.69 6.24 1.79 4.69 3.19 3.46L1 1.27ZM11 5C11.7956 5 12.5587 5.31607 13.1213 5.87868C13.6839 6.44129 14 7.20435 14 8C14.0005 8.34057 13.943 8.67873 13.83 9L10 5.17C10.3213 5.05698 10.6594 4.99949 11 5ZM11 0.5C16 0.5 20.27 3.61 22 8C21.1834 10.0729 19.7966 11.8723 18 13.19L16.58 11.76C17.9629 10.8034 19.0783 9.5091 19.82 8C19.0117 6.34987 17.7565 4.95963 16.1974 3.98735C14.6382 3.01508 12.8375 2.49976 11 2.5C9.91 2.5 8.84 2.68 7.84 3L6.3 1.47C7.74 0.85 9.33 0.5 11 0.5ZM2.18 8C2.98835 9.65014 4.24345 11.0404 5.80264 12.0126C7.36182 12.9849 9.16251 13.5002 11 13.5C11.69 13.5 12.37 13.43 13 13.29L10.72 11C10.0242 10.9254 9.37482 10.6149 8.87997 10.12C8.38512 9.62518 8.07458 8.97584 8 8.28L4.6 4.87C3.61 5.72 2.78 6.78 2.18 8Z" fill="#6C757D" />
                    </svg>
                    </>}
                    onClick={() => setShowPassword(!showPassword)}
                    size="sm"
                  />
                </InputRightElement>
              </InputGroup>

              <FormErrorMessage>
                {errors.newPassword && errors.newPassword.message as string}
              </FormErrorMessage>
            </FormControl>

            {/* Confirm Password */}
            <FormControl isInvalid={!!errors.confirmPassword} mb={6}>
              <FormLabel fontSize="sm">
                Confirm Password <span style={{ color: "red" }}>*</span>
              </FormLabel>

              <InputGroup>
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  {...register("confirmPassword", {
                    required: "Confirm password is required",
                    validate: (value) =>
                      value === password || "Passwords do not match"
                  })}
                />
                <InputRightElement>
                  <IconButton
                    variant="ghost"
                    aria-label="toggle confirm password"
                    icon={showConfirmPassword ? <><svg width="16px" height="16px" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g clip-path="url(#clip0_1003_1703)">
                        <path d="M15.9998 7.99915C15.9998 7.99915 12.9998 2.49915 7.99976 2.49915C2.99976 2.49915 -0.000244141 7.99915 -0.000244141 7.99915C-0.000244141 7.99915 2.99976 13.4991 7.99976 13.4991C12.9998 13.4991 15.9998 7.99915 15.9998 7.99915ZM1.17276 7.99915C1.65627 7.26427 2.2124 6.57983 2.83276 5.95615C4.11976 4.66715 5.87976 3.49915 7.99976 3.49915C10.1198 3.49915 11.8788 4.66715 13.1678 5.95615C13.7881 6.57983 14.3442 7.26427 14.8278 7.99915C14.7698 8.08615 14.7058 8.18215 14.6328 8.28715C14.2978 8.76715 13.8028 9.40715 13.1678 10.0421C11.8788 11.3311 10.1188 12.4991 7.99976 12.4991C5.87976 12.4991 4.12076 11.3311 2.83176 10.0421C2.2114 9.41846 1.65628 8.73402 1.17276 7.99915Z" fill="#6C757D" />
                        <path d="M7.99976 5.49915C7.33671 5.49915 6.70083 5.76254 6.23199 6.23138C5.76315 6.70022 5.49976 7.3361 5.49976 7.99915C5.49976 8.66219 5.76315 9.29807 6.23199 9.76691C6.70083 10.2358 7.33671 10.4991 7.99976 10.4991C8.6628 10.4991 9.29868 10.2358 9.76752 9.76691C10.2364 9.29807 10.4998 8.66219 10.4998 7.99915C10.4998 7.3361 10.2364 6.70022 9.76752 6.23138C9.29868 5.76254 8.6628 5.49915 7.99976 5.49915ZM4.49976 7.99915C4.49976 7.07089 4.86851 6.18065 5.52488 5.52427C6.18126 4.86789 7.0715 4.49915 7.99976 4.49915C8.92801 4.49915 9.81825 4.86789 10.4746 5.52427C11.131 6.18065 11.4998 7.07089 11.4998 7.99915C11.4998 8.9274 11.131 9.81764 10.4746 10.474C9.81825 11.1304 8.92801 11.4991 7.99976 11.4991C7.0715 11.4991 6.18126 11.1304 5.52488 10.474C4.86851 9.81764 4.49976 8.9274 4.49976 7.99915Z" fill="#6C757D" />
                      </g>
                      <defs>
                        <clipPath id="clip0_1003_1703">
                          <rect width="16" height="16" fill="white" />
                        </clipPath>
                      </defs>
                    </svg></> : <><svg width="16px" height="16px" viewBox="0 0 22 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1.27L2.28 0L19 16.72L17.73 18L14.65 14.92C13.5 15.3 12.28 15.5 11 15.5C6 15.5 1.73 12.39 0 8C0.69 6.24 1.79 4.69 3.19 3.46L1 1.27ZM11 5C11.7956 5 12.5587 5.31607 13.1213 5.87868C13.6839 6.44129 14 7.20435 14 8C14.0005 8.34057 13.943 8.67873 13.83 9L10 5.17C10.3213 5.05698 10.6594 4.99949 11 5ZM11 0.5C16 0.5 20.27 3.61 22 8C21.1834 10.0729 19.7966 11.8723 18 13.19L16.58 11.76C17.9629 10.8034 19.0783 9.5091 19.82 8C19.0117 6.34987 17.7565 4.95963 16.1974 3.98735C14.6382 3.01508 12.8375 2.49976 11 2.5C9.91 2.5 8.84 2.68 7.84 3L6.3 1.47C7.74 0.85 9.33 0.5 11 0.5ZM2.18 8C2.98835 9.65014 4.24345 11.0404 5.80264 12.0126C7.36182 12.9849 9.16251 13.5002 11 13.5C11.69 13.5 12.37 13.43 13 13.29L10.72 11C10.0242 10.9254 9.37482 10.6149 8.87997 10.12C8.38512 9.62518 8.07458 8.97584 8 8.28L4.6 4.87C3.61 5.72 2.78 6.78 2.18 8Z" fill="#6C757D" />
                    </svg>
                    </>}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    size="sm"
                  />
                </InputRightElement>
              </InputGroup>

              <FormErrorMessage>
                {errors.confirmPassword && errors.confirmPassword.message as string}
              </FormErrorMessage>
            </FormControl>

            {/* Buttons */}
            <Flex justify="flex-end" gap={3}>
              <Button bg={'#6C757D'} color={'#fff'} variant="ghost" fontWeight={500} onClick={() => {
                reset();       // ✅ reset form
                onClose();     // close modal
              }} _hover={{
                bg: "#5a6268", // slightly darker shade
                color: "#fff"
              }}>
                Cancel
              </Button>
              <Button colorScheme="blue" fontWeight={500} type="submit" disabled={isLoading} isLoading={isLoading}>
                Change Password
              </Button>
            </Flex>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  </>)
}

export default Header
