import React, { useEffect } from "react";
import { format } from 'date-fns';

import {
  Box,
  Flex,
  Heading,
  VStack,
  Tr,
  Td,
  Text,
  Button,
  Input,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Image,
  Select,
  useToast,
  Tooltip,
  Switch,
  FormControl,
  FormErrorMessage,
} from "@chakra-ui/react";
import { useHistory } from 'react-router-dom';
import { getSmtpConfig, deleteSmtpConfig, editSetting } from "../../services/ultimamailsettings";
import CryptoJS from 'crypto-js'; // Import crypto-js for encryption
import { ENCRYPTION_DECRYPTION_KEY } from '../../config';
import TableComponent from "../TableComponent";
import { is } from "date-fns/locale";
import { fetchKnowledgebases } from "../../services/knowledgebaseService";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
interface ProjectOption {
  _id: string;
  projectName: string;
}
const SMTPSettingsDetails = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [smtpConfigs, setSmtpConfigs] = React.useState<any>([]);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editFormData, setEditFormData] = React.useState<any>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const history = useHistory();
  const toast = useToast();
  const [projects, setProjects] = React.useState<ProjectOption[]>([]);
  const [warmupErrors, setWarmupErrors] = React.useState<{ emailPerDay?: string; responseRate?: string }>({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState<string | undefined>(undefined);
  // const cancelRef = useRef();
  const cancelRef = React.useRef<HTMLButtonElement>(null)
  // file
  const handleConfirmDelete = () => {
    if (isDeleteDialogOpen) {
      handleDelete(isDeleteDialogOpen);
    }
    // onSelect("delete");
  };

  const fetchProjects = async () => {
    try {
      const response = await fetchKnowledgebases(1, 10, true, "allprojectX"); // Replace with your API endpoint
      setProjects(response?.data?.data); // Assuming `response` is an array of project objects

    } catch (error: any) {
      // console.error("Error fetching projects:", error);
      toast({
        title: "Error",
        description: `${error?.response?.data?.message || error?.message || "Failed to fetch SMTP configurations"}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const decryptPasskey = (encryptedPasskey: string) => {
    const bytes = CryptoJS.AES.decrypt(encryptedPasskey, ENCRYPTION_DECRYPTION_KEY);
    const decryptedPasskey = bytes.toString(CryptoJS.enc.Utf8);
    return decryptedPasskey;
  };
  const encryptPasskey = (passkey: string) => {
    const encryptedPasskey = CryptoJS.AES.encrypt(passkey, ENCRYPTION_DECRYPTION_KEY).toString();
    return encryptedPasskey;
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response: any = await getSmtpConfig();
      const decryptedUsers = response?.data?.data?.map((user: any) => ({
        ...user,
        password: decryptPasskey(user?.password), // Decrypt the passkey here
      }));
      setSmtpConfigs(decryptedUsers);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `${error?.response?.data?.message || error?.message || "Failed to fetch SMTP configurations"}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await deleteSmtpConfig(id);
      setSmtpConfigs(smtpConfigs.filter((config: any) => config._id !== id));
      setIsDeleteDialogOpen(undefined)
      toast({
        title: "Success",
        description: `${response?.data?.message || "SMTP configuration deleted successfully"}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      // console.error("Error deleting SMTP config:", error);
      toast({
        title: "Error",
        description: `${error?.response?.data?.message || error?.message || "Failed to delete SMTP configuration"}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  const [showPasswordId, setShowPasswordId] = React.useState<string | null>(null);
  const handleEdit = (config: any) => {
    setEditingId(config._id);

    setEditFormData({
      host: config.host,
      email: config.email,
      port: config.port,
      imapHost: config.imapHost,
      imapPort: config.imapPort,
      // secure: config.secure,
      password: config.password,
      knowledgebaseId: config?.knowledgebaseId,
      isStandAloneAssistant: config?.isStandAloneAssistant,
      enableWarmup: config?.enableWarmup,
      warmupSettings: {
        emailPerDay: config?.warmupSettings?.emailPerDay,
        responseRate: config?.warmupSettings?.responseRate,
      },
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setEditFormData((prev: any) => {
      // ✅ Handle nested fields
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        const updated = {
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value,
          },
        };
        return updated;
      }

      const updated = { ...prev, [field]: value };

      if (field === 'enableWarmup' && !value) {
        updated.warmupSettings = {
          ...updated.warmupSettings,
          emailPerDay: 0,
          responseRate: 0,
        };
      }

      return updated;
    });
  };

  const handleSave = async (id: string) => {
    try {
      setIsSaving(true);
      if (editFormData?.enableWarmup) {
        const emailPerDay = Number(editFormData?.warmupSettings?.emailPerDay);
        const responseRate = Number(editFormData?.warmupSettings?.responseRate);
        const errors: { emailPerDay?: string; responseRate?: string } = {};

        if (!emailPerDay || emailPerDay < 10 || emailPerDay > 200) {
          errors.emailPerDay = "Must be between 10 and 200";
        }
        if (!responseRate || responseRate < 10 || responseRate > 100) {
          errors.responseRate = "Must be between 10 and 100";
        }

        if (Object.keys(errors).length > 0) {
          setWarmupErrors(errors);
          return;
        }
      }
      setWarmupErrors({});
      setSmtpConfigs((prevConfigs: any) =>
        prevConfigs?.map((config: any) =>
          config._id === id
            ? { ...config, ...editFormData }
            : config
        )
      );
      const UpdateData = {
        ...editFormData,
        password: editFormData?.password ? encryptPasskey(editFormData?.password) : "",
      }
      if (!UpdateData.enableWarmup) {
        delete UpdateData.warmupSettings;
      } else {
        UpdateData.warmupSettings = {
          email_per_day: editFormData?.warmupSettings?.emailPerDay,
          response_rate: editFormData?.warmupSettings?.responseRate,
        };
      }
      const response: any = await editSetting(UpdateData, id);
      toast({
        title: "Success",
        description: `${response?.data?.message || "SMTP configuration updated successfully"}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      // Reset editing state
      setEditingId(null);
      setEditFormData({});
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `${error?.response?.data?.message || error?.message || "Failed to update SMTP configuration"}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditFormData({});
    setWarmupErrors({});
    fetchData();
  };

  const getNestedValue = (obj: any, path: string) =>
    path.split('.').reduce((acc, key) => acc?.[key], obj);

  const renderTableCell = (config: any, field: string, type: 'text' | 'number' | 'select' = 'text') => {
    if (editingId === config._id) {
      if (type === 'select' && field === 'secure' || field === 'enableWarmup') {
        return (
          <Select
            value={editFormData[field] ? 'true' : 'false'}
            onChange={(e) => handleInputChange(field, e.target.value === 'true')}
            size="sm"
            w="80px"
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </Select>
        );
      }
      if ((field === 'warmupSettings.emailPerDay' || field === 'warmupSettings.responseRate') && !editFormData.enableWarmup) {
        return getNestedValue(config, field) ?? "NA";
      }
      return (
        <Box>
          <Input
            value={getNestedValue(editFormData, field) || ''}
            onChange={(e) => {
              const val = type === 'number' ? parseInt(e.target.value) || '' : e.target.value;
              handleInputChange(field, val);
              // ✅ clear error on change
              if (field === 'warmupSettings.emailPerDay') setWarmupErrors((prev) => ({ ...prev, emailPerDay: undefined }));
              if (field === 'warmupSettings.responseRate') setWarmupErrors((prev) => ({ ...prev, responseRate: undefined }));
            }}
            onBlur={(e) => {
              if (field === 'warmupSettings.emailPerDay' && type === 'number') {
                const val = parseInt(e.target.value);
                if (val < 10) handleInputChange(field, 10);
                if (val > 200) handleInputChange(field, 200);
              }
              if (field === 'warmupSettings.responseRate' && type === 'number') {
                const val = parseInt(e.target.value);
                if (val < 10) handleInputChange(field, 10);
                if (val > 100) handleInputChange(field, 100);
              }
            }}
            isInvalid={
              field === 'warmupSettings.emailPerDay' ? !!warmupErrors.emailPerDay :
                field === 'warmupSettings.responseRate' ? !!warmupErrors.responseRate : false
            }
            type={type === 'number' ? 'number' : 'text'}
            size="sm"
            width={'150px'}
            placeholder={
              field === 'warmupSettings.emailPerDay'
                ? 'Min 10 - Max 200'
                : field === 'warmupSettings.responseRate'
                  ? 'Min 10 - Max 100'
                  : `Enter ${field}`
            }
          />
          {/* ✅ show error text below input */}
          {field === 'warmupSettings.emailPerDay' && warmupErrors.emailPerDay && (
            <Text color="red.500" fontSize="11px" mt="1">{warmupErrors.emailPerDay}</Text>
          )}
          {field === 'warmupSettings.responseRate' && warmupErrors.responseRate && (
            <Text color="red.500" fontSize="11px" mt="1">{warmupErrors.responseRate}</Text>
          )}
        </Box>
      );
    }


    if (field === 'enableWarmup') {
      return config[field] ? "Yes" : "No";
    }

    return getNestedValue(config, field) ?? "NA";
  };


  const tableHeader = [
    'SMTP Host',
    'Email',
    'Password',
    'SMTP Port',
    'IMAP Host',
    'IMAP Port',
    'Project Name',
    'Standalone Assistant',
    // 'Secure',
    'Warm-up service',
    'Email Per Day',
    'Response Rate',
    'Created At',
    'Action',
  ]
  const tableDataKeys = [
    'name',
    'email',
    'password',
    'phone',
    'address',
    'updatedAt',
  ]



  return (

    <Box w="100%" p="6" shadow="sm" h="100%" position="relative" overflow="auto">
      <VStack w="100%" spacing="10">
        <Flex w="100%" justifyContent="space-between" alignItems={"center"}>
          <Box>
            <Heading fontSize="24px" fontWeight={"700"} lineHeight={"32px"} color="#1A202C">
              SMTP / Inbox Set-up
              {/* SMTP Settings */}
            </Heading>
          </Box>
          <Box display="flex" alignItems="center" gap="12px">
            <Button
              colorScheme="blue"
              size="md"
              fontWeight={500}
              onClick={() => {
                history.push(`/app/smtp-settings/create`);
              }}

              gap="5px" >
              <Image src="/icons/plusicon.svg" />
              <Text as="span">
                Create New Setup
              </Text>
            </Button>
          </Box>
        </Flex>
      </VStack>

      <Box minW="100%" width={"600px"} >
        <TableComponent
          isLoading={isLoading}
          data={smtpConfigs || []}
          noDataText="No SMTP settings found."
          tableDataKeys={tableDataKeys}
          tableHeader={tableHeader}
          customRowRenderer={(config: any, index: number) => {
            return (
              <Tr key={config._id}>
                <Td>{index + 1}</Td>
                <Td>{renderTableCell(config, 'host')}</Td>
                <Td>{renderTableCell(config, 'email')}</Td>
                <Td>
                  {editingId === config._id ? <>
                    {renderTableCell(config, 'password')}
                  </> :
                    <Flex alignItems="center" gap="8px">
                      <Text>
                        {showPasswordId === config._id
                          ? config.password
                          : "****************"}
                      </Text>

                      <Box
                        cursor="pointer"
                        onClick={() =>
                          setShowPasswordId((prev) =>
                            prev === config._id ? null : config._id
                          )
                        }
                      >
                        {showPasswordId === config._id ? (
                          <MdVisibilityOff size={18} />
                        ) : (
                          <MdVisibility size={18} />
                        )}
                      </Box>
                    </Flex>
                  }

                </Td>
                <Td>{renderTableCell(config, 'port', 'number')}</Td>
                <Td>{renderTableCell(config, 'imapHost')}</Td>
                <Td >{renderTableCell(config, 'imapPort', 'number')}</Td>
                <Td> {editingId === config._id ? (
                  <FormControl isInvalid={!editFormData?.knowledgebaseId}>
                    <Select
                      minW="220px"
                      // placeholder="Select project"
                      value={editFormData?.knowledgebaseId || ""}
                      onChange={(e) =>
                        handleInputChange("knowledgebaseId", e.target.value)
                      }
                    >
                      <option value="" disabled>
                        Select project
                      </option>

                      {projects.map((project: any) => (
                        <option key={project._id} value={project._id}>
                          {project.name}
                        </option>
                      ))}
                    </Select>

                    {!editFormData?.knowledgebaseId && (
                      <FormErrorMessage>
                        Project is required
                      </FormErrorMessage>
                    )}
                  </FormControl>
                ) : (
                  config?.projectName || "NA"
                )}

                </Td>
                <Td>
                  {editingId === config._id ? (
                    <Switch
                      colorScheme="gray"
                      isChecked={editFormData.isStandAloneAssistant}
                      onChange={(e) =>
                        handleInputChange("isStandAloneAssistant", e.target.checked)
                      }
                    />
                  ) : (
                    <Switch
                      colorScheme="gray"
                      isChecked={!!config?.isStandAloneAssistant}
                      isDisabled
                    />
                  )}
                </Td>
                {/* <Td>{renderTableCell(config, 'secure', 'select')}</Td> */}
                <Td>
                  {
                    config?.enableWarmup ?
                      <Text>{config.enableWarmup ? "Yes" : "No"}</Text> :
                      <>
                        {renderTableCell(config, 'enableWarmup', 'select')}
                      </>
                  }

                </Td>
                <Td>{renderTableCell(config, 'warmupSettings.emailPerDay', 'number')}</Td>
                <Td>{renderTableCell(config, 'warmupSettings.responseRate', 'number')}</Td>
                <Td>
                  {config.createdAt ? format(new Date(config.createdAt), 'dd/MM/yyyy, hh:mm a') : "NA"}
                </Td>
                <Td>
                  {editingId === config._id ? (
                    <Flex gap="8px">
                      <Button
                        size="sm"
                        // colorScheme="green"
                        colorScheme="blue"
                        fontWeight={500}
                        onClick={() => handleSave(config._id)}
                        isLoading={isSaving}
                        loadingText="Saving"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        // variant="outline"
                        colorScheme="gray"
                        fontWeight={500}
                        onClick={handleCancel}
                        isDisabled={isSaving}
                      >
                        Cancel
                      </Button>
                    </Flex>
                  ) : (
                    <Flex gap="12px">
                      <Tooltip label="Edit" fontSize={"11px"}>
                        <Button
                          p={'4px 8px'}
                          background={"#F8F9FA"}
                          onClick={() => handleEdit(config)}
                        >
                          <Image src={"/icons/edit.svg"} alt='editIcon' />
                        </Button>
                      </Tooltip>
                      <Tooltip label="Delete" fontSize={"11px"}>
                        <Button
                          colorScheme="red"
                          p={'4px 8px'}

                          onClick={() => {
                            setIsDeleteDialogOpen(config._id)
                            // handleDelete(config._id)
                          }}
                        >
                          <svg width="13" height="15" viewBox="0 0 13 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7.5 -0.000976562C7.76522 -0.000976562 8.0195 0.104456 8.20703 0.291992C8.39457 0.479528 8.5 0.733809 8.5 0.999023H12C12.2652 0.999023 12.5195 1.10446 12.707 1.29199C12.8946 1.47953 13 1.73381 13 1.99902V2.99902C13 3.26423 12.8946 3.51853 12.707 3.70605C12.5195 3.89357 12.2652 3.99902 12 3.99902H11.5V12.999C11.5 13.5294 11.2891 14.038 10.9141 14.4131C10.539 14.7881 10.0304 14.999 9.5 14.999H3.5C2.96958 14.999 2.461 14.7881 2.08594 14.4131C1.71087 14.038 1.50001 13.5294 1.5 12.999V3.99902H1C0.734795 3.99902 0.480498 3.89358 0.292969 3.70605C0.10544 3.51853 8.94585e-06 3.26423 0 2.99902V1.99902C0 1.73382 0.105451 1.47953 0.292969 1.29199C0.480499 1.10446 0.734793 0.999031 1 0.999023H4.5C4.5 0.733821 4.60545 0.479526 4.79297 0.291992C4.9805 0.104462 5.23479 -0.000969345 5.5 -0.000976562H7.5ZM2.5 4.05762V12.999C2.50001 13.2642 2.60544 13.5185 2.79297 13.7061C2.9805 13.8936 3.23479 13.999 3.5 13.999H9.5C9.7652 13.999 10.0195 13.8936 10.207 13.7061C10.3946 13.5185 10.5 13.2642 10.5 12.999V4.05762L10.3818 3.99902H2.61816L2.5 4.05762ZM4 5.49902C4.13261 5.49902 4.25975 5.55174 4.35352 5.64551C4.44728 5.73928 4.5 5.86642 4.5 5.99902V11.999C4.49999 12.1316 4.44728 12.2588 4.35352 12.3525C4.25975 12.4463 4.13259 12.499 4 12.499C3.8674 12.499 3.74025 12.4463 3.64648 12.3525C3.55272 12.2588 3.50001 12.1316 3.5 11.999V5.99902C3.5 5.86643 3.55274 5.73927 3.64648 5.64551C3.74025 5.55175 3.8674 5.49903 4 5.49902ZM6.5 5.49902C6.63261 5.49902 6.75975 5.55174 6.85352 5.64551C6.94728 5.73928 7 5.86642 7 5.99902V11.999C6.99999 12.1316 6.94728 12.2588 6.85352 12.3525C6.75975 12.4463 6.63259 12.499 6.5 12.499C6.3674 12.499 6.24025 12.4463 6.14648 12.3525C6.05272 12.2588 6.00001 12.1316 6 11.999V5.99902C6 5.86643 6.05274 5.73927 6.14648 5.64551C6.24025 5.55175 6.3674 5.49903 6.5 5.49902ZM9 5.49902C9.13261 5.49902 9.25975 5.55174 9.35352 5.64551C9.44728 5.73928 9.5 5.86642 9.5 5.99902V11.999C9.49999 12.1316 9.44728 12.2588 9.35352 12.3525C9.25975 12.4463 9.13259 12.499 9 12.499C8.8674 12.499 8.74025 12.4463 8.64648 12.3525C8.55272 12.2588 8.50001 12.1316 8.5 11.999V5.99902C8.5 5.86643 8.55274 5.73927 8.64648 5.64551C8.74025 5.55175 8.8674 5.49903 9 5.49902ZM1 1.99902V2.99902H12V1.99902H1Z" fill="white" />
                          </svg>
                        </Button>
                      </Tooltip>
                    </Flex>
                  )}
                </Td>
              </Tr>
            )
          }}
        />
      </Box>

      <AlertDialog
        isOpen={!!isDeleteDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => {
          setIsDeleteDialogOpen(undefined)
        }}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Are you sure you want to delete this?
            </AlertDialogHeader>
            <AlertDialogBody>
              This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} size='sm' onClick={() => {
                setIsDeleteDialogOpen(undefined)
              }}>
                Cancel
              </Button>
              <Button
                size="sm"
                colorScheme="red"
                variant="solid" onClick={handleConfirmDelete} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default SMTPSettingsDetails;