import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputRightElement,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Popover,
  PopoverArrow,
  PopoverContent,
  PopoverTrigger,
  Select,
  Switch,
  Text,
  useToast
} from "@chakra-ui/react";
import React, { useEffect, useCallback } from "react";
import { Controller, useForm } from "react-hook-form";
import { sendSmtpTestEmail, smtpConfig } from "../../services/ultimamailsettings";
import { NavLink, useHistory } from "react-router-dom";
import { GoInfo } from "react-icons/go";
import { fetchKnowledgebases } from "../../services/knowledgebaseService";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
interface ProjectOption {
  _id: string;
  projectName: string;
}
interface SMTPFormData {
  host: string;
  imapHost: string;
  email: string;
  password: string;
  from: string;
  name: string;
  isStandAloneAssistant: boolean, // ✅ default
  knowledgebaseId: string,
  secure: boolean;
  port: string;
  imapPort: string;
  timeout: string;
  enableWarmup: boolean;
  warmupSettings?: {
    email_per_day?: number;
    response_rate?: number;
  };
}

interface TestEmailData {
  testEmail: string;
}

const SMTPSettings: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    control
  } = useForm<SMTPFormData>({
    mode: "onBlur",     // validate when field loses focus
    reValidateMode: "onChange",
    defaultValues: {
      host: '',
      imapHost: '',
      email: '',
      password: '',
      isStandAloneAssistant: false, // ✅ default
      knowledgebaseId: "",
      from: '',
      name: '',
      port: '',
      imapPort: '',
      timeout: '',
      enableWarmup: false,
    },
  });

  const sendEmailForm = useForm<TestEmailData>({
    defaultValues: {
      testEmail: '',
    },
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [secure, setSecure] = React.useState(false);
  const [isPopover1Open, setIsPopover1Open] = React.useState(false);
  const [showTestEmailInput, setShowTestEmailInput] = React.useState(false);
  const [isTestEmailSending, setIsTestEmailSending] = React.useState(false);
  const [projects, setProjects] = React.useState<ProjectOption[]>([]);
  const enableWarmup = watch("enableWarmup");
  const history = useHistory();
  const toast = useToast();

  // Watch form values
  const smtpHostData = watch("host");
  const smtpPortData = watch("port");
  const emailData = watch("email");
  const passwordData = watch("password");
  const imapHostData = watch("imapHost");
  const imapPortData = watch("imapPort");
  const timeoutData = watch("timeout");
  const nameData = watch("name");
  const enableWarmupValue = watch("enableWarmup");
  const warmupSettingsValue = watch("warmupSettings");

  // Auto-enable secure when port is 465
  // useEffect(() => {
  //   if (smtpPortData === "465") {
  //     setSecure(true);
  //     setValue("secure", true);
  //   }
  // }, [smtpPortData, setValue]);

  // Check if required fields for test email are filled
  const canSendTestEmail = useCallback(() => {
    return [smtpHostData, smtpPortData, emailData, passwordData]
      .every(val => val?.toString().trim() !== "");
  }, [smtpHostData, smtpPortData, emailData, passwordData]);

  const onSubmit = async (data: SMTPFormData) => {
    const trimmedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        typeof value === "string" ? value.trim() : value,
      ])
    ) as SMTPFormData;

    const payload = {
      ...trimmedData,
      port: trimmedData.port ? parseInt(trimmedData.port, 10) : null,
      imapPort: trimmedData.imapPort
        ? parseInt(trimmedData.imapPort, 10)
        : null,
      timeout: trimmedData.timeout
        ? parseInt(trimmedData.timeout, 10)
        : null,
      from: emailData?.trim() || "",
    };

    // console.log("updatedData", payload);
    // console.log("updatedData", payload);
    if (!data.enableWarmup) {
      delete payload.warmupSettings;
    }
    if (data.enableWarmup && data.warmupSettings) {
      payload.warmupSettings = {
        email_per_day: Number(data.warmupSettings.email_per_day),
        response_rate: Number(data.warmupSettings.response_rate),
      };
    }
    const cleanedPayload = Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => value !== "" && value !== null && value !== undefined
      )
    );
    try {
      setIsSubmitting(true);
      const response = await smtpConfig(cleanedPayload);

      if (response.status === 200 || response.status === 201) {
        // Reset form state
        setSecure(false);
        setShowPassword(false);
        setShowTestEmailInput(false);
        reset();
        sendEmailForm.reset();

        toast({
          title: response?.data?.message || "SMTP settings saved successfully",
          status: "success",
          isClosable: true,
        });

        history.push("/app/smtp-settings/details");
      }
    } catch (error: any) {
      toast({
        title: error?.response?.data?.message || "Failed to save SMTP settings",
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!enableWarmup) {
      setValue("warmupSettings.email_per_day", 0);
      setValue("warmupSettings.response_rate", 0);
    }
  }, [enableWarmup, setValue]);

  const sendTestEmail = async (data: TestEmailData) => {
    // Additional check to ensure required fields are still valid
    if (!canSendTestEmail()) {
      toast({
        title: "Please fill in all required SMTP fields before sending test email",
        status: "warning",
        isClosable: true,
      });
      return;
    }

    try {
      setIsTestEmailSending(true);
      // 🔁 TODO: Replace with actual API call
      const updatedData = {
        host: smtpHostData?.trim(),
        port: Number(smtpPortData),
        imapHost: imapHostData?.trim(),
        imapPort: Number(imapPortData),
        email: emailData,
        password: passwordData,
        testEmail: data.testEmail,
        name: nameData,
        from: emailData,
        timeout: Number(timeoutData),
        // secure: secure,
        enableWarmup: enableWarmupValue,
        ...(enableWarmupValue && {
          warmupSettings: {
            email_per_day: Number(warmupSettingsValue?.email_per_day),
            response_rate: Number(warmupSettingsValue?.response_rate),
          },
        }),
      }
      // console.log("updatedData", updatedData);

      // Filter out keys with empty string values
      const filteredData = Object.fromEntries(
        Object.entries(updatedData).filter(([_, value]) => value !== "")
      );

      const response = await sendSmtpTestEmail(filteredData);
      toast({
        title: `${response.data.message}`,
        status: "success",
        isClosable: true,
      });

      // // Reset form and hide input
      // reset();
      // sendEmailForm.reset();
      setShowTestEmailInput(false);

    } catch (error: any) {
      toast({
        title: error?.response?.data?.message || "Failed to send test email",
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsTestEmailSending(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleSecure = () => setSecure(!secure);
  const togglePopover = () => setIsPopover1Open(!isPopover1Open);

  const fetchProjects = async () => {
    try {
      const response = await fetchKnowledgebases(1, 10, true, "allprojectX"); // Replace with your API endpoint
      setProjects(response?.data?.data); // Assuming `response` is an array of project objects

    } catch (error) {
      // console.error("Error fetching projects:", error);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <Box
      w="100%"
      p="6"
      shadow="sm"
      h="100%"
      position="relative"
      overflow="auto"
    >
      <Box mb={"24px"}>
        <Heading as="h2" fontSize="16px" fontWeight="400">
          <NavLink to={`/app/smtp-settings/details`}>
            <Text
              as="span"
              color="#2977FF"
              borderBottom="1px solid #2977FF"
            >
              SMTP/Inbox Set-up
            </Text>
          </NavLink>

          <Text as="span" color="#6C757D" mx="8px">
            /
          </Text>

          <Text as="span" color="#6C757D">
            Custom SMTP/Inbox Set-up Settings
          </Text>
        </Heading>
      </Box>
      <Box>
        <Heading as="h1" fontSize="24px" lineHeight={"32px"} fontWeight={"700"} color="#1A202C">
          Custom SMTP / Inbox Set-up Settings
          {/* Custom SMTP Settings */}
        </Heading>
        <Text mt={'10px'} fontSize="16px" fontWeight={"400"} color="#6C757D">
          Set up your SMTP configuration to ensure reliable email delivery.
        </Text>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Box mt="24px" borderRadius="8px" bg={'#fff'} border="1px solid #E2E8F0" px="20px" py="24px">
            <Box>

              <FormControl mb="24px" isInvalid={!!errors.knowledgebaseId}>
                <FormLabel>Campaign Project <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
                <Controller
                  name="knowledgebaseId"
                  control={control}
                  rules={{ required: "Campaign Project is required" }}
                  render={({ field }: any) => (
                    <Select
                      placeholder="Please select the project / website URL for this campaign"
                      defaultValue={field.knowledgebaseId || ""}
                      color={field.knowledgebaseId ? "black" : "gray.500"}
                      onChange={(e) => {
                        const selectedProject: any = projects.find(
                          (project: any) => project._id === e.target.value
                        );
                        // validateProjectDoc(e.target.value)
                        field.onChange(e);
                      }}
                    >
                      {projects.map((project: any) => (
                        <option key={project._id} value={project._id}>
                          {project.name}
                        </option>
                      ))}
                    </Select>
                  )}
                />


                {errors.knowledgebaseId && <FormErrorMessage>{errors.knowledgebaseId.message}</FormErrorMessage>}
              </FormControl>
              <FormControl mb="24px" isInvalid={!!errors.isStandAloneAssistant}>
                <Controller
                  name="isStandAloneAssistant"
                  control={control}
                  render={({ field }) => (
                    <HStack justify="space-between">
                      <Text mb="0" display={'flex'} alignItems={'center'} gap={'4px'}>
                        Standalone Assistant
                        <Popover>
                          <PopoverTrigger>
                            <Box
                              cursor="pointer"
                              as="span"
                            >
                              <GoInfo color="#6C757D" />
                            </Box>
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
                            style={{ boxShadow: 'none' }}
                            borderRadius="4px"
                          >
                            <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                            <Box >Enable this if you want this assistant to send and receive emails using your email account.</Box>
                          </PopoverContent>
                        </Popover>
                        <Text as={"span"} fontSize="16px !important" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text>
                      </Text>

                      <Switch
                        size="lg"
                        isChecked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    </HStack>
                  )}
                />
              </FormControl>

              <Flex gap="16px">
                <FormControl mb="24px" isInvalid={!!errors.host}>
                  <FormLabel fontWeight={400} display={'flex'} alignItems={'center'} gap={'4px'}>
                    SMTP Host
                    <Popover>
                      <PopoverTrigger>
                        <Box
                          cursor="pointer"
                          as="span"
                        >
                          <GoInfo color="#6C757D" />
                        </Box>
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
                        style={{ boxShadow: 'none' }}
                        borderRadius="4px"
                      >
                        <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                        <Box >This is the server used to send emails from your email account.

                          Example: smtp.gmail.com, smtp.outlook.com</Box>
                      </PopoverContent>
                    </Popover>

                    <Text as="span" fontSize="16px" fontWeight="400" color="#DC3545">*</Text>
                  </FormLabel>
                  <Input
                    maxLength={45}
                    placeholder="Enter SMTP host name"
                    {...register("host", { required: "Host name is required" })}
                  />
                  <FormErrorMessage>{errors.host?.message}</FormErrorMessage>
                </FormControl>

                <FormControl mb="24px" isInvalid={!!errors.imapHost}>
                  <FormLabel fontWeight={400} display={'flex'} alignItems={'center'} gap={'4px'}>
                    IMAP Host
                    <Popover>
                      <PopoverTrigger>
                        <Box
                          cursor="pointer"
                          as="span"
                        >
                          <GoInfo color="#6C757D" />
                        </Box>
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
                        style={{ boxShadow: 'none' }}
                        borderRadius="4px"
                      >
                        <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                        <Box >This is the server used to receive emails from your inbox.

                          Example: imap.gmail.com, imap.outlook.com</Box>
                      </PopoverContent>
                    </Popover>

                    <Text as="span" fontSize="16px" fontWeight="400" color="#DC3545">*</Text>
                  </FormLabel>
                  <Input
                    maxLength={45}
                    placeholder="Enter IMAP host name"
                    {...register("imapHost", { required: "IMAP Host name is required" })}
                  />
                  <FormErrorMessage>{errors.imapHost?.message}</FormErrorMessage>
                </FormControl>
              </Flex>

              <Flex gap={'16px'}>
                <FormControl mb="24px" isInvalid={!!errors.port}>
                  <FormLabel display="flex" alignItems="center" gap="4px">
                    SMTP Port
                    <Popover>
                      <PopoverTrigger>
                        <Box
                          cursor="pointer"
                          as="span"
                        >
                          <GoInfo color="#6C757D" />
                        </Box>
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
                        style={{ boxShadow: 'none' }}
                        borderRadius="4px"
                      >
                        <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                        <Box >Port number used by your email provider to send emails.

                          Common values: 587 (TLS) or 465 (SSL)</Box>
                      </PopoverContent>
                    </Popover>
                    <Text as="span" fontSize="16px" fontWeight="400" color="#DC3545">*</Text>
                  </FormLabel>
                  <Controller
                    name="port"
                    // maxLength={45}
                    control={control}
                    rules={{ required: "Port is required" }}
                    render={({ field }) => (
                      <NumberInput {...field} step={1} min={1} max={65535}>
                        <NumberInputField placeholder="Enter SMTP port number" />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    )}
                  />
                  <FormErrorMessage>{errors.port?.message}</FormErrorMessage>
                </FormControl>

                <FormControl mb="24px" isInvalid={!!errors.imapPort}>
                  <FormLabel display="flex" alignItems="center" gap="4px">
                    IMAP Port
                    <Popover>
                      <PopoverTrigger>
                        <Box
                          cursor="pointer"
                          as="span"
                        >
                          <GoInfo color="#6C757D" />
                        </Box>
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
                        style={{ boxShadow: 'none' }}
                        borderRadius="4px"
                      >
                        <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                        <Box >Port number used to receive emails from your provider.

                          Common value: 993</Box>
                      </PopoverContent>
                    </Popover>
                    <Text as="span" fontSize="16px" fontWeight="400" color="#DC3545">*</Text>
                  </FormLabel>
                  <Controller
                    name="imapPort"
                    control={control}
                    rules={{ required: "IMAP Port is required" }}
                    render={({ field }) => (
                      <NumberInput {...field} step={1} min={1} max={65535}>
                        <NumberInputField placeholder="Enter IMAP port number" />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    )}
                  />
                  <FormErrorMessage>{errors.imapPort?.message}</FormErrorMessage>
                </FormControl>
              </Flex>
              <Flex gap={'16px'}>
                <FormControl mb="24px" isInvalid={!!errors.email}>
                  <FormLabel fontWeight={400} display={'flex'} alignItems={'center'} gap={'4px'}>
                    Email
                    <Popover>
                      <PopoverTrigger>
                        <Box
                          cursor="pointer"
                          as="span"
                        >
                          <GoInfo color="#6C757D" />
                        </Box>
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
                        style={{ boxShadow: 'none' }}
                        borderRadius="4px"
                      >
                        <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                        <Box >Enter the email address you want this assistant to use for sending and receiving emails.
                        </Box>
                      </PopoverContent>
                    </Popover>
                    <Text as="span" fontSize="16px" fontWeight="400" color="#DC3545">*</Text>
                  </FormLabel>
                  <Input
                    type="email"
                    maxLength={45}
                    placeholder="Enter your email"
                    autoComplete="username"
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/,
                        message: "Invalid email address",
                      },
                    })}
                  />
                  <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
                </FormControl>

                <FormControl mb="24px" isInvalid={!!errors.password}>
                  <FormLabel fontWeight={400} display={'flex'} alignItems={'center'} gap={'4px'}>
                    Password
                    <Popover>
                      <PopoverTrigger>
                        <Box
                          cursor="pointer"
                          as="span"
                        >
                          <GoInfo color="#6C757D" />
                        </Box>
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
                        style={{ boxShadow: 'none' }}
                        borderRadius="4px"
                      >
                        <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                        <Box >Enter your email App Password, not your regular email password.

                          (Generate this from your email security settings.)</Box>
                      </PopoverContent>
                    </Popover>
                    <Text as="span" fontSize="16px" fontWeight="400" color="#DC3545">*</Text>
                  </FormLabel>
                  <InputGroup>
                    <Input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      {...register("password", {
                        required: "Password is required",
                      })}
                    />
                    <InputRightElement width="3.5rem">
                      <Button
                        h="1.75rem"
                        size="sm"
                        onClick={togglePasswordVisibility}
                        type="button"
                      >
                        {/* {showPassword ? "Hide" : "Show"} */}

                        {showPassword ? (
                          <><svg width="16px" height="16px" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clip-path="url(#clip0_1003_1703)">
                              <path d="M15.9998 7.99915C15.9998 7.99915 12.9998 2.49915 7.99976 2.49915C2.99976 2.49915 -0.000244141 7.99915 -0.000244141 7.99915C-0.000244141 7.99915 2.99976 13.4991 7.99976 13.4991C12.9998 13.4991 15.9998 7.99915 15.9998 7.99915ZM1.17276 7.99915C1.65627 7.26427 2.2124 6.57983 2.83276 5.95615C4.11976 4.66715 5.87976 3.49915 7.99976 3.49915C10.1198 3.49915 11.8788 4.66715 13.1678 5.95615C13.7881 6.57983 14.3442 7.26427 14.8278 7.99915C14.7698 8.08615 14.7058 8.18215 14.6328 8.28715C14.2978 8.76715 13.8028 9.40715 13.1678 10.0421C11.8788 11.3311 10.1188 12.4991 7.99976 12.4991C5.87976 12.4991 4.12076 11.3311 2.83176 10.0421C2.2114 9.41846 1.65628 8.73402 1.17276 7.99915Z" fill="#6C757D" />
                              <path d="M7.99976 5.49915C7.33671 5.49915 6.70083 5.76254 6.23199 6.23138C5.76315 6.70022 5.49976 7.3361 5.49976 7.99915C5.49976 8.66219 5.76315 9.29807 6.23199 9.76691C6.70083 10.2358 7.33671 10.4991 7.99976 10.4991C8.6628 10.4991 9.29868 10.2358 9.76752 9.76691C10.2364 9.29807 10.4998 8.66219 10.4998 7.99915C10.4998 7.3361 10.2364 6.70022 9.76752 6.23138C9.29868 5.76254 8.6628 5.49915 7.99976 5.49915ZM4.49976 7.99915C4.49976 7.07089 4.86851 6.18065 5.52488 5.52427C6.18126 4.86789 7.0715 4.49915 7.99976 4.49915C8.92801 4.49915 9.81825 4.86789 10.4746 5.52427C11.131 6.18065 11.4998 7.07089 11.4998 7.99915C11.4998 8.9274 11.131 9.81764 10.4746 10.474C9.81825 11.1304 8.92801 11.4991 7.99976 11.4991C7.0715 11.4991 6.18126 11.1304 5.52488 10.474C4.86851 9.81764 4.49976 8.9274 4.49976 7.99915Z" fill="#6C757D" />
                            </g>
                            <defs>
                              <clipPath id="clip0_1003_1703">
                                <rect width="16" height="16" fill="white" />
                              </clipPath>
                            </defs>
                          </svg></>
                        ) : (
                          <><svg width="16px" height="16px" viewBox="0 0 22 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 1.27L2.28 0L19 16.72L17.73 18L14.65 14.92C13.5 15.3 12.28 15.5 11 15.5C6 15.5 1.73 12.39 0 8C0.69 6.24 1.79 4.69 3.19 3.46L1 1.27ZM11 5C11.7956 5 12.5587 5.31607 13.1213 5.87868C13.6839 6.44129 14 7.20435 14 8C14.0005 8.34057 13.943 8.67873 13.83 9L10 5.17C10.3213 5.05698 10.6594 4.99949 11 5ZM11 0.5C16 0.5 20.27 3.61 22 8C21.1834 10.0729 19.7966 11.8723 18 13.19L16.58 11.76C17.9629 10.8034 19.0783 9.5091 19.82 8C19.0117 6.34987 17.7565 4.95963 16.1974 3.98735C14.6382 3.01508 12.8375 2.49976 11 2.5C9.91 2.5 8.84 2.68 7.84 3L6.3 1.47C7.74 0.85 9.33 0.5 11 0.5ZM2.18 8C2.98835 9.65014 4.24345 11.0404 5.80264 12.0126C7.36182 12.9849 9.16251 13.5002 11 13.5C11.69 13.5 12.37 13.43 13 13.29L10.72 11C10.0242 10.9254 9.37482 10.6149 8.87997 10.12C8.38512 9.62518 8.07458 8.97584 8 8.28L4.6 4.87C3.61 5.72 2.78 6.78 2.18 8Z" fill="#6C757D" />
                          </svg>
                          </>
                        )}
                      </Button>
                    </InputRightElement>
                  </InputGroup>
                  <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
                </FormControl>
              </Flex>

              {/* <Flex mb="24px" justify="space-between" align="center">
                <Box>
                  <Text size="16px" fontWeight={400} color="#212529" mb="4px">
                    <Flex alignItems="center" gap="5px">
                      Secure <Text as="span" color="#6C757D" fontSize="11px">(Optional)</Text>
                      <Popover
                        isOpen={isPopover1Open}
                        onClose={() => setIsPopover1Open(false)}
                        placement="top"
                      >
                        <PopoverTrigger>
                          <Box
                            cursor="pointer"
                            as="span"
                            onClick={togglePopover}
                            aria-label="Secure connection info"
                          >
                            <GoInfo color="#6C757D" />
                          </Box>
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
                          style={{ boxShadow: 'none' }}
                          borderRadius="4px"
                        >
                          <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                          <Box whiteSpace="pre-wrap">
                            Secure access to the email through SMTP. Automatically enabled for port 465.
                          </Box>
                        </PopoverContent>
                      </Popover>
                    </Flex>
                  </Text>
                  <Text color="#8d8c8c" fontSize="14px">
                    Secure access to the email through SMTP
                  </Text>
                </Box>
                <Switch
                  colorScheme="blue"
                  size="lg"
                  isChecked={secure}
                  isDisabled={smtpPortData === "465"}
                  onChange={toggleSecure}
                />
              </Flex> */}

              <Flex gap={'16px'}>
                {/* <FormControl mb="24px" isInvalid={!!errors.from}>
                  <FormLabel fontWeight={400} display={'flex'} alignItems={'center'} gap={'4px'}>
                    From Email <Text as="span" color="#6C757D" fontSize="11px">(Optional)</Text>
                  </FormLabel>
                  <Input
                    type="email"
                    maxLength={45}
                    placeholder="Enter the email"
                    {...register("from", {
                      pattern: {
                        value: /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/,
                        message: "Invalid email address",
                      },
                    })}
                  />
                  <FormErrorMessage>{errors.from?.message}</FormErrorMessage>
                </FormControl> */}

                <FormControl mb="24px">
                  <FormLabel fontWeight={400} display={'flex'} alignItems={'center'} gap={'4px'}>
                    From Name

                    <Popover>
                      <PopoverTrigger>
                        <Box
                          cursor="pointer"
                          as="span"
                        >
                          <GoInfo color="#6C757D" />
                        </Box>
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
                        style={{ boxShadow: 'none' }}
                        borderRadius="4px"
                      >
                        <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                        <Box >This name will appear to recipients when emails are sent.

                          Example: Rahul from ABC Travels</Box>
                      </PopoverContent>
                    </Popover>
                    <Text as="span" color="#6C757D" fontSize="11px">(Optional)</Text>
                  </FormLabel>
                  <Input maxLength={45} placeholder="Enter the name" {...register("name")} />
                </FormControl>
              </Flex>

              {/* <FormControl mb="24px" isInvalid={!!errors.timeout}>
                <FormLabel>
                  Timeout <Text as="span" fontSize="14px">(in milliseconds)</Text>{" "}
                  <Text as="span" color="#6C757D" fontSize="11px">(Optional)</Text>
                </FormLabel>
                <Controller
                  name="timeout"

                  control={control}
                  render={({ field }) => (
                    <NumberInput max={3000000} {...field} step={1000} min={0}>
                      <NumberInputField placeholder="Enter timeout value" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  )}
                />
                <FormErrorMessage>{errors.timeout?.message}</FormErrorMessage>
              </FormControl> */}

              <FormControl mb="24px">
                <Controller
                  name="enableWarmup"
                  control={control}
                  render={({ field }) => (
                    <HStack justify="space-between">
                      <Text mb="0" display={'flex'} alignItems={'center'} gap={'4px'}>Add email warm-up settings

                        <Popover>
                          <PopoverTrigger>
                            <Box
                              cursor="pointer"
                              as="span"
                            >
                              <GoInfo color="#6C757D" />
                            </Box>
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
                            style={{ boxShadow: 'none' }}
                            borderRadius="4px"
                          >
                            <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                            <Box >Warm-up gradually increases daily email sending to build trust with email providers and avoid spam.</Box>
                          </PopoverContent>
                        </Popover>
                      </Text>
                      <Switch
                        size="lg"
                        isChecked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    </HStack>
                  )}
                />
              </FormControl>
              {watch("enableWarmup") && (
                <Flex gap="16px">
                  <FormControl mb="16px" isInvalid={!!errors.warmupSettings?.email_per_day}>
                    <FormLabel display={'flex'} alignItems={'center'} gap={'4px'} mb={'8px'} fontWeight={400}>
                      Email Per Day <Popover >
                        <PopoverTrigger>
                          <Box
                            cursor="pointer"
                            as="span"
                          // onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                          >
                            <GoInfo color="#6C757D" />
                          </Box>
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
                          style={{ boxShadow: 'none' }}
                          borderRadius="4px"
                        >
                          <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                          {/* <PopoverCloseButton /> */}
                          <Box >Number of emails the assistant will send daily during warm up.
                            <br />
                            Minimum recommended: 10
                            Maximum recommended: 200</Box>
                        </PopoverContent>
                      </Popover> <Text as="span" fontSize="16px" fontWeight="400" color="#DC3545">*</Text>
                    </FormLabel>
                    <Input
                      type="number"
                      placeholder="Enter email per day"
                      {...register("warmupSettings.email_per_day", {
                        required: "Email per day is required",
                        min: {
                          value: 10,
                          message: "Minimum value is 10",
                        },
                        max: {
                          value: 200,
                          message: "Maximum value is 200",
                        },
                        validate: (value: any) =>
                          value >= 0 || "Negative values are not allowed",
                      })}
                      onChange={(e) => {
                        let value = Number(e.target.value);
                        // errors.warmupSettings?.response_rate?.message = "asdfasd"
                        if (value < 0) {
                          e.target.value = "0"; // 👈 stop negative
                        }
                        if (value > 200) {
                          e.target.value = "200"; // 👈 stop above max
                        }
                      }}
                      onKeyDown={(e) => {
                        if (["e", "E", "-", "+"].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                    />
                    {
                      errors.warmupSettings?.email_per_day?.message &&
                      <FormErrorMessage>{errors.warmupSettings?.email_per_day?.message}</FormErrorMessage>
                    }
                  </FormControl>

                  <FormControl mb="16px" isInvalid={!!errors.warmupSettings?.response_rate}>
                    <FormLabel display={'flex'} alignItems={'center'} gap={'4px'} mb={'8px'} fontWeight={400}>
                      Response Rate
                      <Popover  >
                        <PopoverTrigger>
                          <Box
                            cursor="pointer"
                            as="span"
                          // onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                          >
                            <GoInfo color="#6C757D" />
                          </Box>
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
                          style={{ boxShadow: 'none' }}
                          borderRadius="4px"
                        >
                          <PopoverArrow bg="#efefef" transform="scale(1.5)" />

                          <Box >
                            Percentage of emails that will receive automated replies during warm up to improve email reputation.
                            <br />
                            Recommended: 20<br />
                            For Better Performance Please use 20-25

                          </Box>
                        </PopoverContent>
                      </Popover>
                      <Text as="span" fontSize="16px" fontWeight="400" color="#DC3545">*</Text>
                    </FormLabel>
                    <Input
                      type="number"
                      placeholder="Enter response rate"
                      {...register("warmupSettings.response_rate", {
                        required: "Response rate is required",
                        min: {
                          value: 10,
                          message: "Minimum value is 10",
                        },
                        max: {
                          value: 100,
                          message: "Maximum value is 100",
                        },
                        validate: (value: any) =>
                          value >= 0 || "Negative values are not allowed",
                      })}
                      onChange={(e) => {
                        let value = Number(e.target.value);

                        if (value < 0) {
                          e.target.value = "0"; // 👈 stop negative
                        }
                        if (value > 100) {
                          e.target.value = "100"; // 👈 stop above max
                        }
                      }}
                      onKeyDown={(e) => {
                        if (["e", "E", "-", "+"].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                    />
                    {
                      errors.warmupSettings?.response_rate?.message &&
                      <FormErrorMessage>{errors.warmupSettings?.response_rate?.message}</FormErrorMessage>
                    }
                  </FormControl>
                </Flex>
              )}
              {/* Test Email Section */}
              <Box my="20px" display={"flex"} justifyContent={"end"}>
                {!showTestEmailInput && canSendTestEmail() && (
                  <Flex justify="flex-end" mb="10px">
                    <Button
                      fontWeight={400}
                      colorScheme="blue"
                      onClick={() => setShowTestEmailInput(true)}
                      type="button"
                      isDisabled={!canSendTestEmail()}
                    >
                      Send Test Email
                    </Button>
                  </Flex>
                )}

                {showTestEmailInput && (
                  <FormControl mb="20px" isInvalid={!!sendEmailForm.formState.errors.testEmail}>
                    {/* <FormLabel fontWeight={400} display={'flex'} alignItems={'center'} gap={'4px'}>Test Email</FormLabel> */}
                    <Flex gap="10px" alignItems="flex-start">
                      <Box flex="1">
                        <Input
                          type="email"
                          placeholder="Enter email"
                          {...sendEmailForm.register("testEmail", {
                            required: "Email is required",
                            pattern: {
                              value: /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/,
                              message: "Invalid email address",
                            },
                          })}
                        />
                        <FormErrorMessage>
                          {sendEmailForm.formState.errors.testEmail?.message}
                        </FormErrorMessage>
                      </Box>
                      <Button
                        colorScheme="blue"
                        onClick={sendEmailForm.handleSubmit(sendTestEmail)}
                        isLoading={isTestEmailSending}
                        isDisabled={!canSendTestEmail() || isTestEmailSending}
                        type="button"
                        fontWeight={500}
                      >
                        Send
                      </Button>
                      <Button
                        variant="outline"
                        fontWeight={500}
                        onClick={() => {
                          setShowTestEmailInput(false);
                          // sendEmailForm.reset();
                          // reset();
                        }}
                        type="button"
                      >
                        Cancel
                      </Button>
                    </Flex>
                  </FormControl>
                )}

                <Flex justify="flex-end">
                  <Button
                    type="submit"
                    fontWeight={500}
                    colorScheme="blue"
                    isLoading={isSubmitting}
                    loadingText="Saving..."
                    ml={2}
                  >
                    Save Settings
                  </Button>
                </Flex>
              </Box>
            </Box>
          </Box>
        </form>
      </Box>
    </Box>
  );
};

export default SMTPSettings;