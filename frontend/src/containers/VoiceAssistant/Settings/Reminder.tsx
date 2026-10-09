import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Heading,
  Radio,
  RadioGroup,
  Select,
  useToast,
  Stack,
  Switch,
  Text,
  Image,
  useColorModeValue,
  Spinner,
} from '@chakra-ui/react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import DeleteIconRed from "../Images/delete.svg";
import AddIcon from "../Images/add.svg";
import saveIcon from "../Images/saveBtn.svg";
import { log } from 'console';
import { settingsGet, settingsReminder } from '../../../services/VoiceBot';
import { useLocation } from 'react-router-dom';

interface ReminderTime {
  value: string;
}

interface ReminderFormValues {
  setReminderBeforeMeeting: ReminderTime[];
  notifyUpcoming: boolean;
  reminderPreference: 'email' | 'call' | 'both';
}

const ReminderSettings: React.FC = () => {
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    register,
    formState: { errors, isSubmitting }
  } = useForm<ReminderFormValues>({
    defaultValues: {
      setReminderBeforeMeeting: [{ value: '' }]
    },
    mode: 'onChange'
  });
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const subtab = queryParams.get('subtab');
  // Use fieldArray for managing dynamic reminder fields
  const { fields: reminderFields, append: appendReminder, remove: removeReminder } = useFieldArray({
    control,
    name: "setReminderBeforeMeeting"
  });
  const reminderValues = watch("setReminderBeforeMeeting") || [];
  // Watch the notifyUpcoming value to conditionally render the preferences section
  const notifyUpcoming = watch('notifyUpcoming');

  const handleRemoveField = (index: number) => {
    if (reminderFields.length > 1) {
      removeReminder(index);
    }
  };

  const onSubmit = async (data: ReminderFormValues) => {
    // Handle form submission here
    const phoneNumbers = data.setReminderBeforeMeeting.map((item: any) => ({
      value: Number(item.value)
    }));
    const payload = { ...data, setReminderBeforeMeeting: phoneNumbers };
    try {
      const response = await settingsReminder(payload);
      toast({
        title: `${response.data.message}`,
        status: "success",
        isClosable: true,
      })

    } catch (error: any) {
      toast({
        title: `${error.response?.data?.message}`,
        status: "error",
        isClosable: true,
      });
    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response: any = await settingsGet();
      setValue("setReminderBeforeMeeting", response?.data?.data?.setReminderBeforeMeeting);
      if (Array.isArray(response?.data?.data?.setReminderBeforeMeeting)) {
        response?.data?.data?.setReminderBeforeMeeting.forEach((item: any, index: number) => {
          setValue(`setReminderBeforeMeeting.${index}.value`, item);
        });
      }
      setValue("reminderPreference", response?.data?.data?.reminderPreference);
    } catch (error: any) {

    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (subtab === 'reminder') {
      fetchData();
    }
  }, [subtab]);


  // Modified isReminderTimeSelected function
  const isReminderTimeSelected = (reminderValue: string, currentIndex: number) => {
    const allReminders = watch("setReminderBeforeMeeting") || [];

    return allReminders.some((reminder, idx) => {
      // Extract the value from the reminder object
      const reminderVal = reminder?.value?.toString();

      // Compare as strings and make sure we're only considering different indexes
      return reminderVal === reminderValue &&
        idx !== currentIndex &&
        reminderValue !== "";
    });
  };


  return (
    <Box maxW={"100%"}>
      {isLoading === true ? <Box display={"flex"} justifyContent={"center"}><Spinner /></Box> :
        <>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Heading size="md" fontWeight={600} mb={"24px"} color={"#1A202C"}>
              Reminder Settings
            </Heading>
            <FormControl mb="16px" isInvalid={!!errors.setReminderBeforeMeeting}>
              <FormLabel fontSize={"16px"} color={"#212529"} fontWeight={"400"}>Set Reminder Before Meeting</FormLabel>
              {reminderFields.map((field: any, index: number) => (
                <FormControl
                  key={field.id}
                  isInvalid={!!errors.setReminderBeforeMeeting?.[index]?.value}
                  mb="12px"
                >
                  <Box display="flex" alignItems="center" gap="10px">
                    <Controller
                      name={`setReminderBeforeMeeting.${index}.value`}
                      control={control}
                      rules={{ required: "Please select reminder time" }}
                      render={({ field }) => (
                        <Select {...field} w="full" borderRadius="md">
                          <option value="">Select Hours</option>
                          {[
                            { value: "15", label: "15 minutes" },
                            { value: "30", label: "30 minutes" },
                            { value: "45", label: "45 minutes" },
                            { value: "60", label: "1 hour" },
                            { value: "120", label: "2 hours" },
                            { value: "180", label: "3 hours" },
                            { value: "360", label: "6 hours" }
                          ].map((option, idx) => (
                            <option
                              key={idx}
                              value={option.value}
                              disabled={isReminderTimeSelected(option.value, index)}
                            >
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      )}
                    />
                    <Button
                      colorScheme="red"
                      variant="ghost"
                      onClick={() => handleRemoveField(index)}
                      disabled={reminderFields.length === 1}
                      sx={{
                        _focus: {
                          boxShadow: 'none',
                        },
                        _hover: {
                          backgroundColor: "transparent",
                        },
                        _active: {
                          backgroundColor: "transparent",
                        }
                      }}
                    >
                      <Image src={DeleteIconRed} alt="deleteicon" />
                    </Button>
                  </Box>
                  <Text fontSize="sm" color="#6C757D" fontWeight={"400"} mt="4px">
                    Choose how many hours / minutes in advance you'd like to be reminded before the meeting starts.
                  </Text>
                  {errors?.setReminderBeforeMeeting?.[index]?.value && (
                    <FormErrorMessage>{errors?.setReminderBeforeMeeting?.[index]?.value?.message}</FormErrorMessage>
                  )}
                </FormControl>
              ))}

              <Button
                size="sm"
                fontWeight={500}
                onClick={() => {
                  if (reminderFields.length < 3) {
                    appendReminder({ value: '' });
                  }
                }}
                isDisabled={reminderFields.length >= 3}
              >
                + Add
              </Button>
            </FormControl>

            {/* <FormControl display="flex" alignItems="center" mb="6">
          <FormLabel htmlFor="notify-upcoming" mb="0" fontSize={"16px"} fontWeight={"400"} color={"#1A202C"}>
            Notify of upcoming appointment
          </FormLabel>
          <Controller
            name="notifyUpcoming"
            control={control}
            render={({ field: { value, onChange } }) => (
              <Switch
                id="notify-upcoming"
                isChecked={value}
                onChange={onChange}
                colorScheme="blue"
                ml="auto"
                size="lg"
              />
            )}
          />
        </FormControl> */}
            <hr style={{ color: "#EEF4FA", marginTop: "16px", marginBottom: "16px" }} />

            {/* Conditionally render Reminder Preferences based on notifyUpcoming value */}
            <FormControl mb="24px" isInvalid={!!errors.reminderPreference}>
              <Heading size="md" fontWeight={600} mb={"4px"} color={"#1A202C"}>Reminder Preferences</Heading>
              <Text fontSize="sm" color="#6C757D" fontWeight={"400"} mb="24px">
                Choose how you want to receive reminders: Email, Voice Call, or Both.
              </Text>
              <Controller
                name="reminderPreference"
                control={control}
                rules={{ required: "Please select a reminder preference" }}
                render={({ field: { onChange, value } }) => (
                  <RadioGroup onChange={onChange} value={value}>
                    <Stack direction="row" spacing="6">
                      <Radio value="email">Email</Radio>
                      <Radio value="call">Voice Call</Radio>
                      <Radio value="both">Email / Voice Call</Radio>
                    </Stack>
                  </RadioGroup>
                )}
              />
              {errors.reminderPreference && (
                <FormErrorMessage>{errors.reminderPreference.message}</FormErrorMessage>
              )}
            </FormControl>

            <Flex justify="flex-end">
              <Button
                type="submit"
                size="md"
                isLoading={isSubmitting}
                colorScheme="blue"
              >
                <Image src={saveIcon} alt='Save & Continue' />
                <Text as="span" fontSize="16px" ms="8px" fontWeight="500">Save</Text>
              </Button>
            </Flex>
          </form>
        </>
      }
    </Box >
  );
};

export default ReminderSettings;