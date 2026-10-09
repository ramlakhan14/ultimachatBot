import React, { useEffect, useRef, useState } from 'react';
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
  IconButton,
  HStack,
  Checkbox,
  Grid,
  GridItem,
  Input,
} from '@chakra-ui/react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import DeleteIconRed from "../Images/delete.svg";
import AddIcon from "../Images/add.svg";
import saveIcon from "../Images/saveBtn.svg";
import { log } from 'console';
import { settingsFollowUp, settingsGet, settingsReminder } from '../../../services/VoiceBot';
import { useLocation } from 'react-router-dom';

interface ReminderInterval {
  type: 'hours' | 'days';
  amount: number;
  startTime?: string;
  endTime?: string;
}

interface WorkDay {
  day: string;
  startTime: string;
  endTime: string;
  isSelected: boolean;
}

interface ReminderFormValues {
  firstFollowUp: string;
  secondFollowUp: string;
  secondStartTime: string;
  secondEndTime: string;
  thirdFollowUp: string;
  thirdStartTime: string;
  thirdEndTime: string;
  lunchStart: string;
  lunchEnd: string;
  workDays: WorkDay[];
}

const FollowUps: React.FC = () => {
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    register,
    formState: { errors, isSubmitting }
  } = useForm<ReminderFormValues>({
    defaultValues: {
      firstFollowUp: '4',
      secondFollowUp: '1',
      secondStartTime: '09:30',
      secondEndTime: '11:00',
      thirdFollowUp: '2',
      thirdStartTime: '17:30',
      thirdEndTime: '18:45',
      lunchStart: '12:00',
      lunchEnd: '14:00',
      workDays: [
        { day: 'Monday', startTime: '09:00', endTime: '19:00', isSelected: true },
        { day: 'Tuesday', startTime: '09:00', endTime: '19:00', isSelected: true },
        { day: 'Wednesday', startTime: '09:00', endTime: '19:00', isSelected: true },
        { day: 'Thursday', startTime: '09:00', endTime: '19:00', isSelected: true },
        { day: 'Friday', startTime: '09:00', endTime: '19:00', isSelected: true },
        { day: 'Saturday', startTime: '10:00', endTime: '16:00', isSelected: true },
        { day: 'Sunday', startTime: '10:00', endTime: '14:00', isSelected: false }
      ]
    },
    mode: 'onChange'
  });
  const toastIdsRef = useRef<string[]>([]); // to track active toast IDs

  const watchedWorkDays = watch('workDays') || [];

  const handleSelectAll = () => {
    if (!watchedWorkDays || watchedWorkDays.length === 0) return;

    const allSelected = watchedWorkDays.every(day => day.isSelected);
    const updatedDays = watchedWorkDays.map(day => ({
      ...day,
      isSelected: !allSelected
    }));
    setValue('workDays', updatedDays);
  };




  const handleDayToggle = (dayIndex: number) => {
    if (!watchedWorkDays || watchedWorkDays.length === 0) return;

    const updatedDays = [...watchedWorkDays];
    updatedDays[dayIndex].isSelected = !updatedDays[dayIndex].isSelected;
    setValue('workDays', updatedDays);
  };

  const handleTimeChange = (dayIndex: number, field: 'startTime' | 'endTime', value: string) => {
    if (!watchedWorkDays || watchedWorkDays.length === 0) return;

    const updatedDays = [...watchedWorkDays];
    updatedDays[dayIndex][field] = value;
    setValue('workDays', updatedDays);
  };

  const generateTimeOptions = () => {
    return Array.from({ length: 24 }, (_, i) => {
      const hour = i.toString().padStart(2, '0');
      return `${hour}:00`;
    });
  };

  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const subtab = queryParams.get('subtab');

  const showLimitedToast = (options: any) => {
    if (toastIdsRef.current.length >= 3) {
      const oldestToastId = toastIdsRef.current.shift();
      if (oldestToastId) {
        toast.close(oldestToastId);
      }
    }

    const id: any = toast(options);
    toastIdsRef.current.push(id);
  };
  const onSubmit = async (data: ReminderFormValues) => {
    // Transform form data into reminderIntervals format
    const reminderIntervals: ReminderInterval[] = [];

    // First follow-up (hours) - no time range needed
    if (data.firstFollowUp) {
      reminderIntervals.push({
        type: 'hours',
        amount: parseInt(data.firstFollowUp)
      });
    }

    // Second follow-up (days) - with time range
    if (data.secondFollowUp) {
      reminderIntervals.push({
        type: 'days',
        amount: parseInt(data.secondFollowUp),
        startTime: data.secondStartTime,
        endTime: data.secondEndTime
      });
    }

    if (data.thirdFollowUp) {
      reminderIntervals.push({
        type: 'days',
        amount: parseInt(data.thirdFollowUp),
        startTime: data.thirdStartTime,
        endTime: data.thirdEndTime
      });
    }
    const submitData = {
      reminderIntervals,
      lunchHour: {
        start: data.lunchStart,
        end: data.lunchEnd
      },
      workDaysAndHours: data.workDays
        .filter(day => day.isSelected)
        .map(day => ({
          day: day.day,
          startTime: day.startTime,
          endTime: day.endTime
        }))
    };

    try {
      const response = await settingsFollowUp(submitData);
      showLimitedToast({
        title: `${response.data.message}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      showLimitedToast({
        title: `${error.response.data.message}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });

    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await settingsGet();
      const followUpSetting = response?.data?.data?.followUpSetting;

      if (!followUpSetting) return;

      const { reminderIntervals, lunchHour, workDaysAndHours } = followUpSetting;

      // Parse reminder intervals
      if (reminderIntervals?.length) {
        const hoursInterval = reminderIntervals.find((i: any) => i.type === 'hours');
        const daysIntervals = reminderIntervals.filter((i: any) => i.type === 'days');

        hoursInterval && setValue("firstFollowUp", hoursInterval.amount.toString());
        daysIntervals[0] && setValue("secondFollowUp", daysIntervals[0].amount.toString());
        daysIntervals[0] && setValue("secondStartTime", daysIntervals[0].startTime);
        daysIntervals[0] && setValue("secondEndTime", daysIntervals[0].endTime);
        daysIntervals[1] && setValue("thirdFollowUp", daysIntervals[1].amount.toString());
        daysIntervals[1] && setValue("thirdStartTime", daysIntervals[1].startTime);
        daysIntervals[1] && setValue("thirdEndTime", daysIntervals[1].endTime);
      }

      // Set lunch hours
      if (lunchHour) {
        setValue("lunchStart", lunchHour.start);
        setValue("lunchEnd", lunchHour.end);
      }

      // Set work days and hours
      if (workDaysAndHours?.length) {
        const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const workDaysMap = new Map(workDaysAndHours.map((wd: any) => [wd.day, wd]));

        const workDaysData = allDays.map(day => {
          const existingDay: any = workDaysMap.get(day);
          return {
            day,
            startTime: existingDay?.startTime,
            endTime: existingDay?.endTime,
            isSelected: !!existingDay
          };
        });

        setValue("workDays", workDaysData);
      }
    } catch (error) {
      // console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (subtab === 'followUp') {
      fetchData();
    }
  }, [subtab]);

  return (
    <Box maxW={"100%"}>
      {isLoading === true ? <Box display={"flex"} justifyContent={"center"}><Spinner /></Box> :
        <>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Heading size="md" fontWeight={600} mb={"24px"} color={"#1A202C"}>
              Follow-up Settings
            </Heading>

            <FormControl mb={'16px'} isInvalid={!!errors.firstFollowUp}>
              <FormLabel mb={"8px"} fontWeight={400} fontSize="18px" color={"#212529"}>First Follow-up</FormLabel>
              <Controller
                name="firstFollowUp"
                control={control}
                rules={{ required: "Please select First Follow-up" }}
                render={({ field }) => (
                  <Select {...field} w="full" borderRadius="md" placeholder="Select Hours">
                    {[
                      { value: "4", label: "4 hours" },
                      { value: "6", label: "6 hours" },
                      { value: "8", label: "8 hours" },
                      { value: "10", label: "10 hours" },
                    ].map((option, idx) => (
                      <option
                        key={idx}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </Select>
                )}
              />
              {errors.firstFollowUp && (
                <FormErrorMessage>{errors.firstFollowUp.message}</FormErrorMessage>
              )}
            </FormControl>


            <Box display="flex" width="100%" gap={6}>
              {/* Second Follow-up */}
              <Box flex={1}>
                <FormControl mb={"16px"} isInvalid={!!errors.secondFollowUp}>
                  <FormLabel mb="8px" fontWeight={400} fontSize="18px" color="#212529">
                    Second Follow-up
                  </FormLabel>
                  <Controller
                    name="secondFollowUp"
                    control={control}
                    rules={{ required: "Please select Second Follow-up" }}
                    render={({ field }) => (
                      <Select {...field} w="100%" borderRadius="md" placeholder="Select Days">
                        {[1, 2, 3, 4, 5].map((day) => (
                          <option key={day} value={day}>
                            {day} {day === 1 ? 'day' : 'days'}
                          </option>
                        ))}
                      </Select>
                    )}
                  />
                  {errors.secondFollowUp && (
                    <FormErrorMessage>{errors.secondFollowUp.message}</FormErrorMessage>
                  )}
                </FormControl>
              </Box>

              {/* Start and End Time */}
              <Box flex={2} display="flex" gap={4}>
                <FormControl mb="16px" isInvalid={!!errors.lunchStart} flex={1}>
                  <FormLabel mb="8px" fontWeight={400} fontSize="18px" color="#212529">
                    Start Time
                  </FormLabel>
                  <Input
                    type="time"
                    {...register("secondStartTime", { required: "Please select start time" })}
                  />
                  {errors.lunchStart && (
                    <FormErrorMessage>{errors.lunchStart.message}</FormErrorMessage>
                  )}
                </FormControl>

                <FormControl mb="16px" isInvalid={!!errors.lunchEnd} flex={1}>
                  <FormLabel mb="8px" fontWeight={400} fontSize="18px" color="#212529">
                    End Time
                  </FormLabel>
                  <Input
                    type="time"
                    {...register("secondEndTime", { required: "Please select end time" })}
                  />
                  {errors.lunchEnd && (
                    <FormErrorMessage>{errors.lunchEnd.message}</FormErrorMessage>
                  )}
                </FormControl>
              </Box>
            </Box>

            <Box display="flex" width="100%" gap={6}>
              {/* Third Follow-up */}
              <Box flex={1}>
                <FormControl mb={'16px'} isInvalid={!!errors.thirdFollowUp}>
                  <FormLabel mb={"8px"} fontWeight={400} fontSize="18px" color={"#212529"}>Third Follow-up</FormLabel>
                  <Controller
                    name="thirdFollowUp"
                    control={control}
                    rules={{ required: "Please select Third Follow-up" }}
                    render={({ field }) => (
                      <Select {...field} w="full" borderRadius="md" placeholder="Select Days">
                        {[1, 2, 3, 4, 5].map((day) => (
                          <option key={day} value={day}>
                            {day} {day === 1 ? 'day' : 'days'}
                          </option>
                        ))}
                      </Select>
                    )}
                  />
                  {errors.thirdFollowUp && (
                    <FormErrorMessage>{errors.thirdFollowUp.message}</FormErrorMessage>
                  )}
                </FormControl>
              </Box>

              {/* Start and End Time */}
              <Box flex={2} display="flex" gap={4}>
                <FormControl mb="16px" isInvalid={!!errors.lunchStart} flex={1}>
                  <FormLabel mb="8px" fontWeight={400} fontSize="18px" color="#212529">
                    Start Time
                  </FormLabel>
                  <Input
                    type="time"
                    {...register("thirdStartTime", { required: "Please select start time" })}
                  />
                  {errors.lunchStart && (
                    <FormErrorMessage>{errors.lunchStart.message}</FormErrorMessage>
                  )}
                </FormControl>

                <FormControl mb="16px" isInvalid={!!errors.lunchEnd} flex={1}>
                  <FormLabel mb="8px" fontWeight={400} fontSize="18px" color="#212529">
                    End Time
                  </FormLabel>
                  <Input
                    type="time"
                    {...register("thirdEndTime", { required: "Please select end time" })}
                  />
                  {errors.lunchEnd && (
                    <FormErrorMessage>{errors.lunchEnd.message}</FormErrorMessage>
                  )}
                </FormControl>
              </Box>
            </Box>

            {/* Lunch Hours */}
            <Heading fontSize="18px" fontWeight={600} mb={"16px"} mt={"8px"} color={"#1A202C"}>
              Lunch Hours
            </Heading>

            <Flex gap={4}>
              <FormControl mb="16px" isInvalid={!!errors.lunchStart}>
                <FormLabel mb={"8px"} fontWeight={400} fontSize="18px" color={"#212529"}>Start Time</FormLabel>
                <Input
                  type='time'
                  {...register("lunchStart", { required: "Please select start time" })}
                />
                {errors.lunchStart && (
                  <FormErrorMessage>{errors.lunchStart.message}</FormErrorMessage>
                )}
              </FormControl>

              <FormControl mb="16px" isInvalid={!!errors.lunchEnd}>
                <FormLabel mb={"8px"} fontWeight={400} fontSize="18px" color={"#212529"}>End Time</FormLabel>
                <Input
                  type='time'
                  {...register("lunchEnd", { required: "Please select end time" })}
                />
                {errors.lunchEnd && (
                  <FormErrorMessage>{errors.lunchEnd.message}</FormErrorMessage>
                )}
              </FormControl>
            </Flex>

            <hr style={{ color: "#EEF4FA", marginTop: "8px" }} />

            {/* Work Days and Hours */}
            <Heading fontSize="18px" fontWeight={600} mb={"16px"} mt={"24px"} color={"#1A202C"}>
              Work Days & Hours
            </Heading>

            {watchedWorkDays && watchedWorkDays.length > 0 && (
              <>
                <Box mb={'24px'}>
                  <Button
                    size="sm"
                    variant="outline"
                    border="1px solid"
                    borderColor="#6C757D"
                    color={'#6C757D'}
                    height="33px"
                    fontWeight={500}
                    onClick={handleSelectAll}
                  >
                    {watchedWorkDays.every(day => day.isSelected) ? 'Deselect All' : 'Select All'}
                  </Button>
                </Box>

                <Box border="1px" borderColor="#CED4DA" borderRadius="4px" p={'20px'} mb={6}>
                  {watchedWorkDays.map((workDay, index) => (
                    <Box key={workDay.day} mb={4}>
                      <Flex align="center" mb={3}>
                        <Checkbox
                          isChecked={workDay.isSelected}
                          onChange={() => handleDayToggle(index)}
                          sx={{
                            '& .chakra-checkbox__control': {
                              width: '14px',
                              height: '14px',
                            },
                          }}
                        >
                          <Text fontWeight={400} fontSize="14px">
                            {workDay.day}
                          </Text>
                        </Checkbox>
                      </Flex>

                      {workDay.isSelected && (
                        <Grid templateColumns="1fr 1fr" gap={4} ml={6}>
                          <GridItem>
                            <FormLabel fontSize="14px" color="#666" mb={1}>Start Time</FormLabel>
                            <Input
                              type='time'
                              value={workDay.startTime}
                              onChange={(e) => handleTimeChange(index, 'startTime', e.target.value)}
                            />
                          </GridItem>
                          <GridItem>
                            <FormLabel fontSize="14px" color="#666" mb={1}>End Time</FormLabel>
                            <Input
                              type='time'
                              value={workDay.endTime}
                              onChange={(e) => handleTimeChange(index, 'endTime', e.target.value)}
                            />
                          </GridItem>
                        </Grid>
                      )}
                    </Box>
                  ))}
                </Box>
              </>
            )}

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

export default FollowUps;