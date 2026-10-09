import {
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Select,
  Text,
  HStack,
  Checkbox,
  InputGroup,
  InputLeftAddon,
  VStack,
  useToast,
  Switch,
  Spinner,
  Alert,
  AlertIcon
} from "@chakra-ui/react";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import appointment from "../../components/Icons/appointment.svg";
import disable from "../../components/Icons/disable.svg";
import deleteIcon from "../../components/Icons/delete.svg";
import { CurrentUser } from "../../services/appConfig";
import { googleCalendarSettings, getGoogleCalendarSettings, revokeCalenderPermissions } from "../../services/knowledgebaseService";
import { baseURL } from "../../config";
import { useCalendarContext } from "../context/GoogleSigninContext";
import nookies from "nookies";
import { set } from "lodash";
import timezonesData from './timezone.json';

type WeekdayId = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

interface TimeSlot {
  start: string;
  end: string;
  disabled?: boolean;
}

interface WeekdayTime {
  slots: TimeSlot[];
  disabledSlots: number[];
}

interface FormData {
  name: string;
  email: string;
  timezone: string;
  service: string;
  duration: string;
  globalTime: {
    from: string;
    to: string;
  };
  availableSlotDays: {
    [K in WeekdayId]: boolean;
  };
  slotsTiming: {
    [K in WeekdayId]: WeekdayTime;
  };
}

type Slot = {
  start: string;
  end: string;
};

type SlotsTiming = {
  [day: string]: {
    slots: Slot[];
  };
};

type AvailableSlotsDays = {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
};

type GlobalTime = {
  from: string;
  to: string;
};

type UserData = {
  _id: string;
  knowledgebaseId: string;
  name: string;
  email: string;
  service: string;
  duration: string;
  slotsTiming: SlotsTiming;
  availableSlotsDays: AvailableSlotsDays;
  globalTime: GlobalTime;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  accessToken: string;
  refreshToken: string;
};


const weekdaysList: Array<{ id: WeekdayId; label: string }> = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' },
];

const generateTimeSlots = (startTime: string, endTime: string, durationMinutes: number): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const start = new Date(`2024-01-01 ${startTime}`);
  const end = new Date(`2024-01-01 ${endTime}`);

  while (start < end) {
    const slotStart = start.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    start.setMinutes(start.getMinutes() + durationMinutes);

    if (start <= end) {
      const slotEnd = start.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      slots.push({ start: slotStart, end: slotEnd });
    }
  }

  return slots;
};

const GoogleCalendarIntegration = ({ chatBotType }: any) => {
  const [selectAll, setSelectAll] = React.useState(false);
  const [initialLoad, setInitialLoad] = React.useState(true);
  const [isManualTimeUpdate, setIsManualTimeUpdate] = React.useState(false);
  const [isManualDurationUpdate, setIsManualDurationUpdate] = React.useState(false);
  const [handleIsActive, setHandleIsActive] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isFetching, setIsFetching] = React.useState(true);
  const [calendarSettingData, setCalendarSettingData] = React.useState<UserData>();

  const { calendarLoggedinData, setCalendarLoggedinData } = useCalendarContext();

  const toast = useToast();
  const kbID = window.location.pathname.split('/')[3]; // Will get '6737113956ed3a0bf406fdcd'

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      duration: '30',
      timezone: '',
      globalTime: {
        from: '10:00',
        to: '18:00'
      },
      availableSlotDays: {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      },
      slotsTiming: {
        monday: { slots: [], disabledSlots: [] },
        tuesday: { slots: [], disabledSlots: [] },
        wednesday: { slots: [], disabledSlots: [] },
        thursday: { slots: [], disabledSlots: [] },
        friday: { slots: [], disabledSlots: [] },
        saturday: { slots: [], disabledSlots: [] },
        sunday: { slots: [], disabledSlots: [] }
      }
    }
  });
  // Modified Select All handler
  const handleSelectAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setSelectAll(isChecked);

    weekdaysList.forEach((day) => {
      setValue(`availableSlotDays.${day.id}` as const, isChecked);

      if (!isChecked) {
        // Don't clear slots when unchecking, just update the available state
        setValue(`availableSlotDays.${day.id}`, false);
      } else {
        const currentSlots = watch(`slotsTiming.${day.id}.slots`);
        if (currentSlots.length === 0) {
          // Only generate new slots if there are no existing slots
          const slots = generateTimeSlots(
            watch('globalTime.from'),
            watch('globalTime.to'),
            parseInt(watch('duration'))
          );
          setValue(`slotsTiming.${day.id}.slots` as const, slots);
        }
      }
    });
  };

  const handleDayCheckboxChange = (dayId: WeekdayId, checked: boolean) => {
    setValue(`availableSlotDays.${dayId}`, checked);

    if (!checked) {
      // Don't clear slots when unchecking
      setSelectAll(false);
    } else {
      const currentSlots = watch(`slotsTiming.${dayId}.slots`);
      if (currentSlots.length === 0) {
        // Only generate new slots if there are no existing slots
        const slots = generateTimeSlots(
          watch('globalTime.from'),
          watch('globalTime.to'),
          parseInt(watch('duration'))
        );
        setValue(`slotsTiming.${dayId}.slots`, slots);
      }

      // Check if all other days are now checked
      const allDaysChecked = weekdaysList.every(day =>
        day.id === dayId ? checked : watch(`availableSlotDays.${day.id}`)
      );
      setSelectAll(allDaysChecked);
    }
  };

  // Add a utility function to check slots and update checkbox states
  const updateWeekdayCheckboxStates = () => {
    weekdaysList.forEach((day) => {
      const slots = watch(`slotsTiming.${day.id}.slots`);
      if (slots.length === 0) {
        setValue(`availableSlotDays.${day.id}`, false);
      }
    });
  };
  const handleDeleteSlot = (dayId: WeekdayId, slotIndex: number) => {
    const updatedSlots = [...watch(`slotsTiming.${dayId}.slots`)];
    updatedSlots.splice(slotIndex, 1);
    setValue(`slotsTiming.${dayId}.slots`, updatedSlots);

    // If no slots remain, uncheck the weekday
    if (updatedSlots.length === 0) {
      setValue(`availableSlotDays.${dayId}`, false);
    }
  };


  const duration = watch('duration');
  const globalTimeFrom = watch('globalTime.from');
  const globalTimeTo = watch('globalTime.to');

  // Function to handle global time changes
  // const handleGlobalTimeChange = (field: 'from' | 'to', value: string) => {
  //   setIsManualTimeUpdate(true);
  //   setValue(`globalTime.${field}`, value);
  // };

  const handleGlobalTimeChange = (field: 'from' | 'to', value: string) => {
    setIsManualTimeUpdate(true);

    const from = field === 'from' ? value : globalTimeFrom;
    const to = field === 'to' ? value : globalTimeTo;

    // ❌ Same time
    if (from && to && from === to) {
      toast({
        title: "Invalid time",
        description: "From and To time cannot be the same",
        status: "warning",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    // ❌ Invalid range
    if (from && to && from > to) {
      toast({
        title: "Invalid range",
        description: `"To" time must be greater than "From" time`,
        status: "warning",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    // ✅ Valid
    setValue(`globalTime.${field}`, value);
  };
  // Function to handle duration changes
  const handleDurationChange = (value: string) => {
    setIsManualDurationUpdate(true);
    setValue('duration', value);
  };

  // Generate time slots whenever relevant values change
  React.useEffect(() => {
    if (!initialLoad && duration && globalTimeFrom && globalTimeTo &&
      (isManualTimeUpdate || isManualDurationUpdate)) {
      const newSlots = generateTimeSlots(globalTimeFrom, globalTimeTo, parseInt(duration));

      weekdaysList.forEach((day) => {
        const isDayChecked = watch(`availableSlotDays.${day.id}`);
        if (isDayChecked) {
          setValue(`slotsTiming.${day.id}.slots` as const, newSlots);
        }
      });

      setIsManualTimeUpdate(false);
      setIsManualDurationUpdate(false);
    }
  }, [duration, globalTimeFrom, globalTimeTo, isManualTimeUpdate, isManualDurationUpdate, initialLoad, setValue]);

  // Add effect to monitor slots changes
  React.useEffect(() => {
    const subscription = watch((value, { name }) => {
      // Check if the change was to a slotsTiming slots array
      if (name && name.includes('slotsTiming') && name.includes('slots')) {
        updateWeekdayCheckboxStates();
      }
    });

    return () => subscription.unsubscribe();
  }, [watch]);

  // Add effect to monitor weekday checkbox changes
  React.useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name && name.startsWith('availableSlotDays.')) {
        const allChecked = weekdaysList.every(day => watch(`availableSlotDays.${day.id}`));
        setSelectAll(allChecked);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch]);


  // console.log("vcalendarLoggedinData", calendarLoggedinData?.userInfo);


  const [isCalenderData, setisCalenderData] = React.useState({})

  const getCalendarSettings = async (id: string) => {
    try {
      setIsFetching(true);
      const response = await getGoogleCalendarSettings(id);
      // if (response.data.data && response.data.data.length > 0) {
      const settings = response.data.data[0];

      // console.log("response.data", response.data);

      setCalendarSettingData(settings);
      setisCalenderData(settings)
      // Find the earliest start time and latest end time from existing slots
      let earliestStart = '23:59';
      let latestEnd = '00:00';

      Object.values(settings?.slotsTiming || {}).forEach((dayData: any) => {
        (dayData.slots || []).forEach((slot: any) => {
          if (slot.start < earliestStart) earliestStart = slot.start;
          if (slot.end > latestEnd) latestEnd = slot.end;
        });
      });

      // Set global time based on existing slots, or use defaults if no slots exist
      const globalTime = {
        from: earliestStart !== '23:59' ? earliestStart : '10:00',
        to: latestEnd !== '00:00' ? latestEnd : '18:00'
      };

      // console.log("vcalendarLoggedinData", calendarLoggedinData?.userInfo, settings);


      reset({
        name: Object.keys(calendarLoggedinData).length === 0
          ? settings?.name || ''
          : calendarLoggedinData?.userInfo?.name || '',
        email: Object.keys(calendarLoggedinData).length === 0
          ? settings?.email || ''
          : calendarLoggedinData?.userInfo?.email || '',
        service: settings?.service || '',
        timezone: settings?.timezone || '',
        duration: settings?.duration || '30',
        globalTime,
        availableSlotDays: settings?.availableSlotsDays || {
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        },
        slotsTiming: {
          monday: { slots: settings?.slotsTiming?.monday?.slots || [], disabledSlots: [] },
          tuesday: { slots: settings?.slotsTiming?.tuesday?.slots || [], disabledSlots: [] },
          wednesday: { slots: settings?.slotsTiming?.wednesday?.slots || [], disabledSlots: [] },
          thursday: { slots: settings?.slotsTiming?.thursday?.slots || [], disabledSlots: [] },
          friday: { slots: settings?.slotsTiming?.friday?.slots || [], disabledSlots: [] },
          saturday: { slots: settings?.slotsTiming?.saturday?.slots || [], disabledSlots: [] },
          sunday: { slots: settings?.slotsTiming?.sunday?.slots || [], disabledSlots: [] }
        }
      });

      const SlotsDays = settings?.availableSlotsDays || {};
      const allDaysSelected =
        Object.keys(SlotsDays).length > 0 && // Check if the object has any keys
        Object.values(SlotsDays).every(value => value); // Ensure all values are truthy

      setSelectAll(allDaysSelected);
      // console.log(settings.isActive, 'settings.isActive');
      setHandleIsActive(settings?.isActive);

      // }else{
      //   setCalendarSettingData({});
      // }
    } catch (error) {
      // console.error('Error fetching calendar settings:', error);
      toast({
        title: 'Error fetching calendar settings',
        status: 'error',
        isClosable: true,
      });
    } finally {
      setInitialLoad(false);
      setIsFetching(false);
    }
  };


  // console.log("calendarSettingData", calendarSettingData?.accessToken);

  const revokeCalendarAccess = async (id: string, refreshToken: string) => {
    try {
      const response = await revokeCalenderPermissions({
        kbId: id,
        token: refreshToken
      });
      if (response.status === 200) {
        getCalendarSettings(id);
        toast({
          title: `Google calendar permissions have been successfully revoked.`,
          status: "success",
          isClosable: true,
        })
      }
    } catch (error) {
      toast({
        title: `Something went wrong please try again`,
        status: "error",
        isClosable: true,
      });
    }
  }

  React.useEffect(() => {
    if (kbID) {
      getCalendarSettings(kbID);
    }
  }, [kbID]);

  const getEnabledSlots = (dayId: WeekdayId): TimeSlot[] => {
    const slots = watch(`slotsTiming.${dayId}.slots`);
    const disabledSlots = watch(`slotsTiming.${dayId}.disabledSlots`) || [];

    return slots.filter((_, index) => !disabledSlots.includes(index))
      .map(({ start, end }) => ({ start, end })); // Only include start and end times
  };

  const onSubmit = async (data: FormData) => {
    const formattedData = {
      ...data,
      slotsTiming: Object.keys(data.slotsTiming).reduce((acc, day) => {
        const dayId = day as WeekdayId;
        // Only include days that are checked and have slots
        if (data.availableSlotDays[dayId] && data.slotsTiming[dayId].slots.length > 0) {
          acc[dayId] = {
            slots: getEnabledSlots(dayId)
          };
        }
        return acc;
      }, {} as { [K in WeekdayId]: { slots: TimeSlot[] } }),
      knowledgebaseId: kbID,
      isActive: handleIsActive
    };


    // console.log("Form submitted:", formattedData);
    // console.log(chatBotType, 'chatBotType');
    try {
      setIsSubmitting(true);
      const userRole = CurrentUser.get();
      // if (userRole.role == "admin" && chatBotType !== "vakmangids") {
      //   toast({
      //     title: `You cannot change the specific settings of the admin's project.`,
      //     status: "error",
      //     isClosable: true,
      //   });
      // } else {
      const response = await googleCalendarSettings(formattedData);
      // console.log(response, 'response');
      if (response.status === 200) {
        setCalendarLoggedinData({});
        getCalendarSettings(kbID);
        toast({
          title: `The settings have been successfully updated.`,
          status: "success",
          isClosable: true,
        })
        reset();
      }
      // }
    } catch (error) {
      toast({
        title: `Something went wrong please try again`,
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update handleDisableSlot to properly handle the slot state
  const handleDisableSlot = (dayId: WeekdayId, slotIndex: number) => {
    const currentSlots = [...watch(`slotsTiming.${dayId}.slots`)];
    const currentDisabledSlots = [...(watch(`slotsTiming.${dayId}.disabledSlots`) || [])];

    // Update UI state
    currentSlots[slotIndex] = {
      ...currentSlots[slotIndex],
      disabled: true
    };

    // Add to disabled slots array if not already present
    if (!currentDisabledSlots.includes(slotIndex)) {
      currentDisabledSlots.push(slotIndex);
      currentDisabledSlots.sort((a, b) => a - b); // Keep array sorted for consistency
    }

    // Update form state
    setValue(`slotsTiming.${dayId}.slots`, currentSlots);
    setValue(`slotsTiming.${dayId}.disabledSlots`, currentDisabledSlots);

    // If all slots are disabled, uncheck the weekday
    if (currentDisabledSlots.length === currentSlots.length) {
      setValue(`availableSlotDays.${dayId}`, false);
    }
  };

  return (<>
    {isFetching ? (
      < Box
        bg="#fff"
        p="24px 24px"
        shadow="md"
        width={"100%"}
        borderRadius="md"
        m="0 auto"
        boxShadow="none"
        textAlign={"center"}
      >
        <Box
          textAlign="center"
          display="flex"
          flexDirection="column"
          minHeight={"400px"}
          justifyContent="center"
          alignItems="center"
        ><Spinner />
        </Box>
      </Box>
    )
      :
      (
        <form>
          <Flex direction="column" width="100%">
            <Box width="100%" gap="16px">
              <Alert
                status="warning"
                borderRadius="8px"
                bg="#FFF3CD"
                border="1px solid #EFE0B0"
                color="#888"
                mb="16px"
              >
                <Box>

                  {/* <Text fontSize="16px">
                  Sign in with Google, Enable Calendar & Click Save.
                </Text> */}
                  <Flex gap={"8px"} mb="8px" alignItems={"center"}>
                    <AlertIcon m={0} boxSize={"17px"} />
                    <Text fontSize="14px" fontWeight="600" color="gray.700">
                      To integrate and save your calendar details:
                    </Text>
                  </Flex>
                  <Box>


                    <VStack align="start" spacing={1}>
                      <HStack align="start">
                        <Text
                          bg="blue.500"
                          color="white"
                          borderRadius="full"
                          boxSize="18px"
                          fontSize="10px"
                          fontWeight="bold"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          1
                        </Text>
                        <Text fontSize="12px" color="gray.600">
                          Sign in using your Google account.
                        </Text>
                      </HStack>

                      <HStack align="start">
                        <Text
                          bg="blue.500"
                          color="white"
                          borderRadius="full"
                          boxSize="18px"
                          fontSize="10px"
                          fontWeight="bold"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          2
                        </Text>
                        <Text fontSize="12px" color="gray.600">
                          Enable the <b>“Google Integration”</b> toggle button.
                        </Text>
                      </HStack>

                      <HStack align="start">
                        <Text
                          bg="blue.500"
                          color="white"
                          borderRadius="full"
                          boxSize="18px"
                          fontSize="10px"
                          fontWeight="bold"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          3
                        </Text>
                        <Text fontSize="12px" color="gray.600">
                          Fill in all required details and click the <b>“Save”</b> button.
                        </Text>
                      </HStack>
                    </VStack>
                  </Box>
                </Box>
              </Alert>

              <Flex justifyContent="space-between" w="100%" mt={"5px"} alignItems="center">
                <Text as="p" fontWeight={'500 !important'} fontSize={'16px !important'} color={'#212529'}>
                  Google Calendar Integration
                </Text>
                {(calendarSettingData && calendarSettingData?.refreshToken) || calendarLoggedinData?.userInfo?.name ?
                  <Button
                    size="md"
                    color="#fff" bg={"#2977FF"} _hover={{ background: "#2977FF" }}
                    variant="solid"
                    fontWeight={"500"}
                    // onClick={(e: any) => {
                    //   e.preventDefault();
                    //   if (calendarSettingData.refreshToken) {
                    //     revokeCalendarAccess(kbID, calendarSettingData.refreshToken);
                    //   } else {
                    //     reset({
                    //       name: "",
                    //       email: '',
                    //     })
                    //     if (kbID) {
                    //       getCalendarSettings(kbID);
                    //     }
                    //   }
                    // }}
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.preventDefault();

                      if (calendarSettingData?.refreshToken) {
                        revokeCalendarAccess(kbID, calendarSettingData.refreshToken);
                        return;
                      } else {
                        setCalendarLoggedinData({});
                        reset({
                          name: "",
                          email: "",
                        });
                        // if (kbID) {
                        //   getCalendarSettings(kbID);
                        // }

                      }

                    }}
                  >
                    <Text ml="8px" as={"span"}>Disconnect Calendar</Text>
                  </Button>
                  :
                  <Button
                    size="md"
                    colorScheme="blue" className="btn-hover-pri"
                    variant="solid"
                    fontWeight={"500"}
                    onClick={() => {
                      if (kbID) {
                        getCalendarSettings(kbID);
                        nookies.set(null, 'kbID', kbID, {
                          maxAge: 30 * 24 * 60 * 60, // 30 days
                          path: '/',
                        });
                      }
                      window.location.href = `${baseURL}googleCalender/auth`;
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M10.7677 8.33236H7V5.66569H13V5.69336H13.537C13.6207 6.11569 13.6667 6.55202 13.6667 6.99902C13.6667 9.91813 11.8698 11.6115 11.5213 11.8981C10.333 12.9953 8.74473 13.6657 7 13.6657C6.94247 13.6657 6.88512 13.665 6.82794 13.6635C3.22578 13.5722 0.333333 10.6232 0.333333 6.99902C0.333333 3.37488 3.22578 0.425808 6.82794 0.334534C6.87082 0.333448 6.91381 0.332766 6.95689 0.332493L7 0.332357C8.756 0.332357 10.3487 1.01669 11.5393 2.12636L9.65367 4.01202C9.56538 3.93348 9.47363 3.85875 9.37867 3.7881C8.71398 3.29353 7.89221 2.99902 7 2.99902L6.97413 2.99911C6.90907 2.99952 6.84438 3.00148 6.78009 3.00497C5.19584 3.09088 3.85896 4.09949 3.29233 5.50236L3.29011 5.50073C3.10302 5.96349 3 6.46923 3 6.99902C3 7.47438 3.08294 7.93038 3.23513 8.35334L3.239 8.35036C3.77573 9.84345 5.17171 10.927 6.83258 10.9956C6.8881 10.9979 6.94392 10.999 7 10.999C7.09708 10.999 7.19335 10.9956 7.28867 10.9887C8.05512 10.9335 8.79139 10.6567 9.40633 10.189L9.40809 10.1905C9.40816 10.1905 9.40823 10.1904 9.4083 10.1904L9.40633 10.1887L9.40533 10.1894C10.0311 9.71675 10.5047 9.07116 10.7677 8.33236Z" fill="white" />
                    </svg>
                    <Text ml="8px" as={"span"}>Signin with Google</Text>
                  </Button>
                }
              </Flex>

              <hr style={{ marginTop: "24px" }} />


              <FormControl my="24px">
                <Flex justifyContent="space-between" w="100%" alignItems="center">
                  <FormLabel fontWeight={'500 !important'} fontSize={'16px !important'} color={'#212529'} mb={'0px !important'}>
                    Enable Google Calendar Integration
                  </FormLabel>
                  <Switch
                    isChecked={handleIsActive}
                    onChange={(event) => { setHandleIsActive(event.target.checked) }}
                    colorScheme="blue"
                    size="lg"
                  />
                </Flex>
              </FormControl>
              {
                calendarSettingData?.accessToken && handleIsActive &&
                <Text my={"15px"} fontSize={"12px"}>
                  An appointment email reminder will be sent either 30 or 60 minutes before the scheduled date and time.
                </Text>
              }
              <FormControl my="24px" isInvalid={!!errors.name}>
                <FormLabel color={'#212529'} mb="8px">
                  Employee Name <span style={{ color: "#DC3545" }}>*</span>
                </FormLabel>
                <Input
                  type="text"
                  {...register("name", { required: "Employee name is required" })}
                  placeholder="Enter your employee name"
                  backgroundColor={"#efefef"}
                  readOnly
                />
                <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
              </FormControl>

              <FormControl mb="24px" isInvalid={!!errors.email}>
                <FormLabel color={'#212529'} mb="8px">
                  Email <span style={{ color: "#DC3545" }}>*</span>
                </FormLabel>
                <Input
                  type="email"
                  {...register("email", {
                    required: "Employee email is required",
                    pattern: {
                      value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                      message: "Invalid email address",
                    },
                  })}
                  placeholder="Enter your email address"
                  backgroundColor={"#efefef"}
                  readOnly
                />
                <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
              </FormControl>

              <FormControl mb="24px" isInvalid={!!errors.timezone} isRequired>
                <FormLabel color={'#212529'} htmlFor="timezone">Timezone</FormLabel>
                <Controller
                  name="timezone"
                  control={control}
                  defaultValue=""
                  rules={{ required: "Timezone is required" }}
                  render={({ field }) => (
                    <Select {...field} id="timezone" placeholder="Select Timezone">
                      {timezonesData.map((tz) => (
                        <option key={tz.origin} value={tz.origin}>
                          {tz.name}
                        </option>
                      ))}
                    </Select>
                  )}
                />
                <FormErrorMessage>
                  {errors.timezone && errors.timezone?.message}
                </FormErrorMessage>
              </FormControl>


              <FormControl isInvalid={!!errors.service}>
                <FormLabel color={'#212529'} mb="8px">
                  Service <span style={{ color: "#DC3545" }}>*</span>
                </FormLabel>
                <Input
                  type="text"
                  {...register("service", { required: "Service is required" })}
                  placeholder="Enter your service type"
                />
                <FormErrorMessage>{errors.service?.message}</FormErrorMessage>
              </FormControl>

              <hr style={{ margin: "16px 0" }} />

              <Box style={{ background: "#F8F8F8" }} p={4} borderRadius={"6px"}>
                <Box display="flex" justifyContent="space-between" alignItems={"center"}>
                  <Box flex="1" mr={4} display="flex" alignItems="center" gap={4}>
                    <img src={appointment} alt="Google Calendar Icon" />
                    <Box>
                      <Text fontWeight="500 !important" fontSize={'14px !important'} color={'#1A202C'}>Appointment Duration <span style={{ color: "#DC3545" }}>*</span></Text>
                      <Text fontSize={'14px'} color={'#6C757D'} fontWeight={400}>How long should each appointment last?</Text>
                    </Box>
                  </Box>
                  <Box flex="1">
                    <FormControl isInvalid={!!errors.duration} mb="0">
                      <Controller
                        name="duration"
                        control={control}
                        rules={{ required: 'Duration is required' }}
                        render={({ field }) => (
                          <Select {...field} background={"#fff"} onChange={(e) => {
                            field.onChange(e);
                            handleDurationChange(e.target.value);
                          }}>
                            <option value="30">30 minutes</option>
                            <option value="45">45 minutes</option>
                            <option value="60">60 minutes</option>
                            <option value="75">75 minutes</option>
                            <option value="90">90 minutes</option>
                            <option value="105">105 minutes</option>
                            <option value="120">120 minutes</option>
                          </Select>
                        )}
                      />
                      <FormErrorMessage>{errors.duration?.message}</FormErrorMessage>
                    </FormControl>
                  </Box>
                </Box>
              </Box>

              <hr style={{ margin: "16px 0" }} />

              <Box>
                {/* <HStack spacing={4} align="flex-start"> */}
                <Box width={"100%"}>
                  <HStack spacing={4} align="center" justify="space-between" mb={4}>
                    <Checkbox
                      onChange={handleSelectAllChange}
                      size="md"
                      isChecked={selectAll}
                      borderColor="#6C757D"
                    >
                      <Text as={'span'} fontSize={'14px'} fontWeight={500}>Select All</Text>
                    </Checkbox>

                    <HStack spacing={4} align="center" mb={4}>
                      <FormControl display="flex" alignItems="center">
                        <InputGroup size="md" borderRadius={'3.2px'} maxW="200px">
                          <InputLeftAddon children="From" fontSize={'14px'} fontWeight={400} color={'#212529'} bg="#EAF1FF" />
                          <Input
                            type="time"
                            // value={globalTimeFrom}
                            value={globalTimeFrom || ""}
                            max={globalTimeTo || undefined}   // 👈 prevent selecting after "To"

                            onChange={(e) => handleGlobalTimeChange('from', e.target.value)}
                            bg="white"
                            fontSize={"14px"}
                          />
                        </InputGroup>
                      </FormControl>

                      <FormControl display="flex" alignItems="center">
                        <InputGroup size="md" borderRadius={'3.2px'} maxW="200px">
                          <InputLeftAddon children="To" fontSize={'14px'} fontWeight={400} color={'#212529'} bg="#EAF1FF" />
                          <Input
                            type="time"
                            // value={globalTimeTo}
                            value={globalTimeTo || ""}
                            min={globalTimeFrom || undefined}   // 👈 restrict based on "From"

                            onChange={(e) => handleGlobalTimeChange('to', e.target.value)}
                            // {...register("globalTime.to")}
                            bg="white"
                            fontSize={"14px"}
                          />
                        </InputGroup>
                      </FormControl>
                    </HStack>
                  </HStack>
                </Box>
                <hr />
                <Box mt={"16px"}>
                  <Box gap={2} display={"flex"} justifyContent={"space-between"} mb={4}>
                    <Box maxWidth={"180px"}>
                      {weekdaysList.map((day) => (
                        <Checkbox
                          key={day.id}
                          isChecked={watch(`availableSlotDays.${day.id}` as const)}
                          size="md"
                          width={"100%"}
                          mb={'10px'}
                          borderColor="#6C757D"
                          // {...register(`availableSlotDays.${day.id}` as const)}
                          onChange={(e) => handleDayCheckboxChange(day.id, e.target.checked)}
                        >
                          <Text as={'span'} fontSize={'14px'} color={'#212529'} >{day.label}</Text>
                        </Checkbox>
                      ))}
                    </Box>
                    <Box>
                      {weekdaysList.map((day) => {
                        const slots = watch(`slotsTiming.${day.id}.slots`);
                        const isSelected = watch(`availableSlotDays.${day.id}`);

                        if (!isSelected) return null;

                        return (
                          <VStack key={day.id} align="flex-start" spacing={'14px'} mb={4}>
                            <Text fontWeight="500" fontSize={'14px'}>{day.label}</Text>
                            {slots.map((slot: any, index: number) => (
                              <HStack key={`${day.id}-slot-${index}`} spacing={4} align="center">
                                <FormControl display="flex" alignItems="center">
                                  <Input
                                    type="time"
                                    value={slot.start}
                                    bg="white"
                                    size="sm"
                                    fontSize={"14px"}
                                    readOnly
                                    opacity={slot.disabled ? 0.5 : 1}
                                  />
                                </FormControl>

                                <FormControl display="flex" alignItems="center">
                                  <Input
                                    type="time"
                                    value={slot.end}
                                    size="sm"
                                    bg="white"
                                    fontSize={"14px"}
                                    readOnly
                                    opacity={slot.disabled ? 0.5 : 1}
                                  />
                                </FormControl>

                                {/* <Button
                                colorScheme={slot.disabled ? "gray" : "red"}
                                size="sm"
                                onClick={() => handleDisableSlot(day.id, index)}
                                disabled={slot.disabled}
                              >
                                {slot.disabled ? "Disabled" : "Disable"}
                              </Button> */}
                                <img role="button" src={disable} alt="Disable Icon" height={61} width={61} onClick={() => handleDisableSlot(day.id, index)} />
                                <img role="button" style={{ marginLeft: "6px" }} src={deleteIcon} alt="Delete Icon" height={61} width={61} onClick={() => handleDeleteSlot(day.id, index)} />
                                {/* <Button
                                colorScheme="blue"
                                size="sm"
                                onClick={() => handleDeleteSlot(day.id, index)}
                              >
                                Delete
                              </Button> */}
                              </HStack>
                            ))}
                          </VStack>
                        );
                      })}
                    </Box>
                  </Box>
                </Box>
                {/* </HStack> */}
              </Box>

              <Button type="submit" marginLeft={"auto"} display={"flex"} colorScheme="blue" variant="solid" mt={4} onClick={handleSubmit(onSubmit)} isLoading={isSubmitting}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.7069 2.49903L9.5 0.292153C9.40748 0.198891 9.29734 0.124949 9.17599 0.0746279C9.05464 0.0243065 8.9245 -0.00139121 8.79313 -0.000971503H1C0.734784 -0.000971503 0.48043 0.104385 0.292893 0.291922C0.105357 0.479458 0 0.733812 0 0.999028V10.999C0 11.2642 0.105357 11.5186 0.292893 11.7061C0.48043 11.8937 0.734784 11.999 1 11.999H11C11.2652 11.999 11.5196 11.8937 11.7071 11.7061C11.8946 11.5186 12 11.2642 12 10.999V3.2059C12.0004 3.07453 11.9747 2.94439 11.9244 2.82304C11.8741 2.70169 11.8001 2.59155 11.7069 2.49903ZM8.5 10.999H3.5V7.49903H8.5V10.999ZM11 10.999H9.5V7.49903C9.5 7.23381 9.39464 6.97946 9.20711 6.79192C9.01957 6.60439 8.76522 6.49903 8.5 6.49903H3.5C3.23478 6.49903 2.98043 6.60439 2.79289 6.79192C2.60536 6.97946 2.5 7.23381 2.5 7.49903V10.999H1V0.999028H8.79313L11 3.2059V10.999ZM8 2.49903C8 2.63164 7.94732 2.75881 7.85355 2.85258C7.75979 2.94635 7.63261 2.99903 7.5 2.99903H4C3.86739 2.99903 3.74021 2.94635 3.64645 2.85258C3.55268 2.75881 3.5 2.63164 3.5 2.49903C3.5 2.36642 3.55268 2.23924 3.64645 2.14548C3.74021 2.05171 3.86739 1.99903 4 1.99903H7.5C7.63261 1.99903 7.75979 2.05171 7.85355 2.14548C7.94732 2.23924 8 2.36642 8 2.49903Z" fill="white" />
                </svg>

                <Text ml={'8px'} as={"span"} fontWeight={"500"}>Save</Text>
              </Button>
            </Box>
          </Flex>
        </form>
      )}
  </>);
};

export default GoogleCalendarIntegration;