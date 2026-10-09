import {
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
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
  Switch,
  Text,
  useToast
} from "@chakra-ui/react";
import React, { useEffect, useCallback } from "react";
import { Controller, useForm } from "react-hook-form";
import { sendSmtpTestEmail, smtpConfig } from "../../../services/ultimamailsettings";
import { useHistory } from "react-router-dom";
import { GoInfo } from "react-icons/go";
import { callApi } from "../../../services/callApi";

interface SMTPFormData {
  first_name: string;
  last_name: string;
  email_per_day: number,
  response_rate: number,
  host: string;
  imapHost: string;
  email: string;
  password: string;
  from: string;
  name: string;
  secure: boolean;
  port: string;
  imapPort: string;
  timeout: string;
}

interface TestEmailData {
  testEmail: string;
}
type AddSmtpProps = {
  onClose: () => void;
};

const AddSmtp: React.FC<AddSmtpProps> = ({ onClose }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    control
  } = useForm<SMTPFormData>({
    defaultValues: {
      first_name: '',
      last_name: '',
      host: '',
      email_per_day: 0,
      response_rate: 0,
      imapHost: '',
      email: '',
      password: '',
      from: '',
      name: '',
      secure: false,
      port: '',
      imapPort: '',
      timeout: '',
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
  const fromData = watch("from");
  // const nameData = watch("name");
  // Auto-enable secure when port is 465
  useEffect(() => {
    if (smtpPortData === "465") {
      setSecure(true);
      setValue("secure", true);
    }
  }, [smtpPortData, setValue]);

  // Check if required fields for test email are filled
  const canSendTestEmail = useCallback(() => {
    return [smtpHostData, smtpPortData, emailData, passwordData]
      .every(val => val?.toString().trim() !== "");
  }, [smtpHostData, smtpPortData, emailData, passwordData]);

  const onSubmit = async (data: SMTPFormData) => {

    const cleanedPayload = {
      first_name: data.first_name,   // you can make this dynamic later
      last_name: data.last_name,
      // ...data,
      email: data.email,
      email_per_day: Number(data?.email_per_day) || 0,
      response_rate: Number(data?.response_rate) || 0,
      smtp: {
        smtp_host: data.host,
        smtp_port: data.port ? parseInt(data.port, 10) : null,
        smtp_username: data.email,
        smtp_password: data.password,
      },
      imap: {
        imap_host: data.imapHost,
        imap_port: data.imapPort ? parseInt(data.imapPort, 10) : null,
        imap_email: data.email,
        imap_password: data.password,
        imap_username: data.email, // I mapped your "From Name"
      },
      campaignType: "smtp"
      // timezone: "Asia/Kolkata",
    };

    try {
      setIsSubmitting(true);
      const response = await callApi("/mailivery-warmup/campaigns/smtp", "post", cleanedPayload);

      // console.log("response", response);

      onClose()
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

        // history.push("/app/smtp-settings/details");
      }
    } catch (error: any) {
      toast({
        title: error?.response?.data?.message || "Failed to save SMTP settings",
        status: "error",
        isClosable: true,
      });
      // onClose()
    } finally {
      setIsSubmitting(false);
    }
  };

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
        host: smtpHostData,
        port: Number(smtpPortData),
        imapHost: imapHostData,
        imapPort: Number(imapPortData),
        email: emailData,
        password: passwordData,
        testEmail: data.testEmail,
        // name: nameData,
        from: fromData,
        timeout: Number(timeoutData),
        secure: secure
      }
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

  return (
    <Box>
      {/* <Heading as="h1" fontSize="20px" color="#1A202C">
          Custom SMTP Settings
        </Heading> */}

      <form onSubmit={handleSubmit(onSubmit)}>

        <Box>
          <Flex gap="16px">
            <FormControl mb="16px" isInvalid={!!errors.first_name}>
              <FormLabel mb={'8px'} fontWeight={400}>
                First Name <Text as="span" fontSize="16px" fontWeight="400" color="#DC3545">*</Text>
              </FormLabel>
              <Input
                placeholder="Enter first name"
                {...register("first_name", { required: "First name is required" })}
              />
              <FormErrorMessage>{errors.first_name?.message}</FormErrorMessage>
            </FormControl>

            <FormControl mb="16px" isInvalid={!!errors.last_name}>
              <FormLabel mb={'8px'} fontWeight={400}>
                Last Name <Text as="span" fontSize="16px" fontWeight="400" color="#DC3545">*</Text>
              </FormLabel>
              <Input
                placeholder="Enter last name"
                {...register("last_name", { required: "Last name is required" })}
              />
              <FormErrorMessage>{errors.last_name?.message}</FormErrorMessage>
            </FormControl>

          </Flex>
          {/*  email_per_day: 40,
      response_rate: 30, */}
          <Flex gap="16px">
            <FormControl mb="16px" isInvalid={!!errors.email_per_day}>
              <FormLabel mb={'8px'} fontWeight={400}>
                Email Per Day <Text as="span" fontSize="16px" fontWeight="400" color="#DC3545">*</Text>
              </FormLabel>
              <Input
                type="number"
                placeholder="Enter email per day"
                {...register("email_per_day", { required: "Email per day is required" })}
              />
              <FormErrorMessage>{errors.email_per_day?.message}</FormErrorMessage>
            </FormControl>

            <FormControl mb="16px" isInvalid={!!errors.response_rate}>
              <FormLabel mb={'8px'} fontWeight={400}>
                Response Rate <Text as="span" fontSize="16px" fontWeight="400" color="#DC3545">*</Text>
              </FormLabel>
              <Input
                type="number"
                placeholder="Enter response rate"
                {...register("response_rate", { required: "Response rate is required" })}
              />
              <FormErrorMessage>{errors.response_rate?.message}</FormErrorMessage>
            </FormControl>

          </Flex>
          <Flex gap="16px">
            <FormControl mb="16px" isInvalid={!!errors.host}>
              <FormLabel mb={'8px'} fontWeight={400}>
                SMTP Host <Text as="span" fontSize="16px" fontWeight="400" color="#DC3545">*</Text>
              </FormLabel>
              <Input
                placeholder="Enter SMTP host name"
                {...register("host", { required: "Host name is required" })}
              />
              <FormErrorMessage>{errors.host?.message}</FormErrorMessage>
            </FormControl>

            <FormControl mb="16px" isInvalid={!!errors.imapHost}>
              <FormLabel mb={'8px'} fontWeight={400}>
                IMAP Host <Text as="span" fontSize="16px" fontWeight="400" color="#DC3545">*</Text>
              </FormLabel>
              <Input
                placeholder="Enter IMAP host name"
                {...register("imapHost", { required: "IMAP Host name is required" })}
              />
              <FormErrorMessage>{errors.imapHost?.message}</FormErrorMessage>
            </FormControl>

          </Flex>

          <Flex gap="16px">
            <FormControl mb="16px" isInvalid={!!errors.port}>
              <FormLabel mb={'8px'} display="flex" alignItems="center" gap="4px">
                SMTP Port <Text as="span" fontSize="16px" fontWeight="400" color="#DC3545">*</Text>
              </FormLabel>
              <Controller
                name="port"
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

            <FormControl mb="16px" isInvalid={!!errors.imapPort}>
              <FormLabel mb={'8px'} display="flex" alignItems="center" gap="4px">
                IMAP Port <Text as="span" fontSize="16px" fontWeight="400" color="#DC3545">*</Text>
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

          <Flex gap="16px">
            <FormControl mb="16px" isInvalid={!!errors.email}>
              <FormLabel mb={'8px'} fontWeight={400}>
                Email <Text as="span" fontSize="16px" fontWeight="400" color="#DC3545">*</Text>
              </FormLabel>
              <Input
                type="email"
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

            <FormControl mb="16px" isInvalid={!!errors.password}>
              <FormLabel mb={'8px'} fontWeight={400}>
                Password <Text as="span" fontSize="16px" fontWeight="400" color="#DC3545">*</Text>
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
                <InputRightElement width="4.5rem">
                  <Button
                    h="1.75rem"
                    size="sm"
                    onClick={togglePasswordVisibility}
                    type="button"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </Button>
                </InputRightElement>
              </InputGroup>
              <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
            </FormControl>
          </Flex>

          <Flex mb="16px" justify="space-between" align="center">
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
          </Flex>

          <FormControl mb="16px" isInvalid={!!errors.from}>
            <FormLabel mb={'8px'} fontWeight={400}>
              From Email <Text as="span" color="#6C757D" fontSize="11px">(Optional)</Text>
            </FormLabel>
            <Input
              type="email"
              placeholder="Enter the email"
              {...register("from", {
                pattern: {
                  value: /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/,
                  message: "Invalid email address",
                },
              })}
            />
            <FormErrorMessage>{errors.from?.message}</FormErrorMessage>
          </FormControl>

          <Flex gap="16px">
            <FormControl mb="16px" isInvalid={!!errors.name}>
              <FormLabel mb={'8px'} fontWeight={400}>
                From Name
                <Text as="span" fontSize="11px" color="#DC3545">*</Text>
              </FormLabel>
              <Input placeholder="Enter the name" {...register("name", {
                required: "Name is required",
              })} />
              <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
            </FormControl>

            <FormControl mb="16px" isInvalid={!!errors.timeout}>
              <FormLabel mb={'8px'}>
                Timeout <Text as="span" fontSize="14px">(in milliseconds)</Text>{" "}
                <Text as="span" color="#6C757D" fontSize="11px">(Optional)</Text>
              </FormLabel>
              <Controller
                name="timeout"
                control={control}
                render={({ field }) => (
                  <NumberInput {...field} step={1000} min={0}>
                    <NumberInputField placeholder="Enter timeout value" />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                )}
              />
              <FormErrorMessage>{errors.timeout?.message}</FormErrorMessage>
            </FormControl>

          </Flex>

          {/* Test Email Section */}
          <Box display={"flex"} justifyContent={"end"}>
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
                {/* <FormLabel fontWeight={400}>Test Email</FormLabel> */}
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
                    colorScheme="green"
                    fontWeight={500}
                    onClick={sendEmailForm.handleSubmit(sendTestEmail)}
                    isLoading={isTestEmailSending}
                    isDisabled={!canSendTestEmail() || isTestEmailSending}
                    type="button"
                  >
                    Send
                  </Button>
                  <Button
                    fontWeight={500}
                    variant="outline"
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

      </form>

    </Box>
  );
};

export default AddSmtp;